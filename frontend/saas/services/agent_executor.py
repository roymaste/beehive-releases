"""
CDP-based RPA execution engine with element-level detection.

Provides stable element selection via DOMSnapshot.captureSnapshot + AXTree,
replacing coordinate-based click/type operations.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from cdp_use import CDPClient
from cdp_use.cdp.dom import types as dom_types
from cdp_use.cdp.domsnapshot import types as snapshot_types
from cdp_use.cdp.input import commands as input_cmds
from cdp_use.cdp.page import commands as page_cmds

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class InteractiveElement:
    """A single interactive element extracted from the DOM snapshot."""

    index: int  # 1-based number shown to the AI
    tag_name: str
    role: str | None
    name: str  # accessible name / text content
    ax_role: str | None  # accessibility role
    backend_node_id: int
    node_id: int  # DOM nodeId
    frame_id: str | None
    is_disabled: bool
    is_readonly: bool
    input_type: str | None  # 'text', 'password', 'email', etc. for <input>
    has_js_click_listener: bool
    cursor_style: str | None
    # Bounding box in CSS pixels (set lazily after resolve_box)
    bounds_x: float | None = None
    bounds_y: float | None = None
    bounds_width: float | None = None
    bounds_height: float | None = None

    @property
    def center_x(self) -> float | None:
        if self.bounds_x is None or self.bounds_width is None:
            return None
        return self.bounds_x + self.bounds_width / 2

    @property
    def center_y(self) -> float | None:
        if self.bounds_y is None or self.bounds_height is None:
            return None
        return self.bounds_y + self.bounds_height / 2

    def display_label(self) -> str:
        """Human-readable label for the element, used in the numbered list."""
        label_parts = [self.tag_name.upper()]
        if self.name:
            name_truncated = self.name[:60].replace("\n", " ").strip()
            label_parts.append(f"'{name_truncated}'")
        if self.role and self.role not in ("unknown", ""):
            label_parts.append(f"[{self.role}]")
        if self.is_disabled:
            label_parts.append("(disabled)")
        if self.input_type and self.tag_name.upper() == "INPUT":
            label_parts.append(f"[{self.input_type}]")
        return " ".join(label_parts)


@dataclass
class ElementList:
    """Container for a numbered list of interactive elements."""

    elements: list[InteractiveElement] = field(default_factory=list)
    page_url: str = ""
    page_title: str = ""

    def numbered_list(self) -> str:
        """Format as a numbered list string for the AI prompt."""
        if not self.elements:
            return "(no interactive elements found)"
        lines = []
        for el in self.elements:
            lines.append(f"[{el.index}] {el.display_label()}")
        return "\n".join(lines)

    def __len__(self) -> int:
        return len(self.elements)

    def by_index(self, idx: int) -> InteractiveElement | None:
        """Get element by its 1-based index."""
        for el in self.elements:
            if el.index == idx:
                return el
        return None


# ---------------------------------------------------------------------------
# CDP Client wrapper
# ---------------------------------------------------------------------------


class CDPConnection:
    """
    Manages a CDP WebSocket connection to a CloakBrowser tab.

    Usage::

        conn = CDPConnection(cdp_url="ws://127.0.0.1:9222/cdp/tab1")
        await conn.connect()
        elements = await conn.get_interactive_elements()
        await conn.click_element(elements.by_index(3))
        await conn.type_into_element(elements.by_index(1), "hello")
        await conn.disconnect()
    """

    def __init__(self, cdp_url: str):
        """
        Args:
            cdp_url: Full CDP WebSocket URL, e.g.
                     ws://127.0.0.1:9222/cdp/tab1
                     Or just the base WS URL and we resolve via CDP websocket handler.
        """
        self._cdp_url = cdp_url
        self._client: CDPClient | None = None
        self._session_id: str | None = None
        self._target_id: str | None = None
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        """Establish the CDP WebSocket connection and attach to the target."""
        self._client = CDPClient(self._cdp_url)

        try:
            # Start the underlying websocket connection
            await self._client.start()

            # Extract target_id from URL path if present
            # URL format: ws://host:port/cdp/targetId
            target_id = self._extract_target_id(self._cdp_url)

            if target_id:
                # Attach to the browser target to get a session ID
                result = await self._client.send.Target.attachToTarget(
                    params={"targetId": target_id, "flatten": True}
                )
                self._session_id = result.get("sessionId")
                self._target_id = target_id

                # Enable required CDP domains
                await asyncio.gather(
                    self._client.send.Page.enable(session_id=self._session_id),
                    self._client.send.DOM.enable(session_id=self._session_id),
                    self._client.send.Runtime.enable(session_id=self._session_id),
                    self._client.send.Network.enable(session_id=self._session_id),
                    self._client.send.Input.enable(session_id=self._session_id),
                )
                logger.debug("CDPConnection: attached to target %s, session %s", target_id, self._session_id)
            else:
                logger.warning("CDPConnection: no targetId in URL, direct mode")

        except Exception as e:
            logger.error("CDPConnection.connect failed: %s", e)
            await self._safe_disconnect()
            raise

    async def disconnect(self) -> None:
        """Close the CDP connection."""
        await self._safe_disconnect()

    async def _safe_disconnect(self) -> None:
        """Non-raising disconnect."""
        try:
            if self._client:
                await self._client.stop()
        except Exception:
            pass
        finally:
            self._client = None
            self._session_id = None

    @staticmethod
    def _extract_target_id(cdp_url: str) -> str | None:
        """Pull the targetId segment from the CDP WS URL path."""
        # ws://127.0.0.1:9222/cdp/tab1  →  "tab1"
        parts = cdp_url.rstrip("/").split("/")
        if len(parts) >= 5 and parts[-2] == "cdp":
            return parts[-1]
        return None

    # ------------------------------------------------------------------
    # DOM helpers
    # ------------------------------------------------------------------

    def _require_session(self) -> str:
        if not self._session_id:
            raise RuntimeError("CDPConnection not connected — call connect() first")
        return self._session_id

    async def _snapshot(
        self,
        include_computed_styles: bool = True,
        include_paint_order: bool = True,
        include_dom_rects: bool = True,
    ) -> dict[str, Any]:
        """Call DOMSnapshot.captureSnapshot and return the raw result dict."""
        sid = self._require_session()

        # Required computed styles that ClickableElementDetector needs
        REQUIRED_COMPUTED_STYLES = [
            "display",
            "visibility",
            "opacity",
            "pointer-events",
            "cursor",
        ]

        result = await self._client.send.DOMSnapshot.captureSnapshot(
            params={
                "computedStyles": REQUIRED_COMPUTED_STYLES,
                "includePaintOrder": include_paint_order,
                "includeDOMRects": include_dom_rects,
                "includeBlendedBackgroundColors": False,
                "includeTextColorOpacities": False,
            },
            session_id=sid,
        )
        return result  # type: ignore[return-value]

    async def _get_device_pixel_ratio(self) -> float:
        """Return the device pixel ratio for coordinate conversion."""
        try:
            sid = self._require_session()
            metrics = await self._client.send.Page.getLayoutMetrics(session_id=sid)
            visual_viewport = metrics.get("visualViewport", {})
            css_viewport = metrics.get("cssVisualViewport", {})
            dpr = visual_viewport.get("clientWidth", 1) / css_viewport.get("clientWidth", 1)
            return float(dpr) if dpr > 0 else 1.0
        except Exception:
            return 1.0

    async def _build_snapshot_lookup(
        self,
        snapshot: dict[str, Any],
        dpr: float = 1.0,
    ) -> dict[int, snapshot_types.LayoutTreeNode]:
        """
        Build a {backendNodeId → LayoutTreeNode} lookup from a DOMSnapshot result.

        This mirrors the logic in browser_use.dom.enhanced_snapshot.build_snapshot_lookup.
        """
        lookup: dict[int, snapshot_types.LayoutTreeNode] = {}

        documents = snapshot.get("documents", [])
        for doc in documents:
            # strings: shared string table
            strings: list[str] = doc.get("strings", [])
            # nodes: parallel arrays indexed by node index
            layout_tree_nodes: list[dict[str, Any]] = doc.get("layoutTree", [])
            # Rare boolean/integer/string data
            rare_strings: list[dict[str, Any]] = doc.get("rareStringData", [])

            for node_idx_str, node_data in enumerate(layout_tree_nodes):
                if not isinstance(node_data, dict):
                    continue

                backend_id = node_data.get("backendNodeId")
                if not backend_id:
                    continue

                # Parse bounds (DOMRect)
                raw_bounds: dict[str, Any] | None = node_data.get("bounds")
                bounds = None
                if raw_bounds and isinstance(raw_bounds, dict):
                    raw_rect = raw_bounds.get("value", raw_bounds)
                    if isinstance(raw_rect, (list, tuple)) and len(raw_rect) >= 4:
                        x, y, w, h = [float(v) for v in raw_rect[:4]]
                        bounds = snapshot_types.Rectangle(
                            x=x / dpr,
                            y=y / dpr,
                            width=w / dpr,
                            height=h / dpr,
                        )

                # Parse computed styles
                raw_computed = node_data.get("computedStyles")
                computed: dict[str, str] = {}
                if raw_computed and isinstance(raw_computed, list):
                    for i in range(0, len(raw_computed), 2):
                        key = raw_computed[i]
                        val_idx = raw_computed[i + 1]
                        if isinstance(key, str) and isinstance(val_idx, int) and 0 <= val_idx < len(strings):
                            computed[key] = strings[val_idx]

                # Parse cursor
                cursor: str | None = computed.get("cursor")

                # Parse clientRects (for iframe viewport detection)
                raw_crects = node_data.get("clientRects")
                client_rects = None
                if raw_crects and isinstance(raw_crects, list) and len(raw_crects) > 0:
                    rc = raw_crects[0]
                    if isinstance(rc, (list, tuple)) and len(rc) >= 4:
                        client_rects = snapshot_types.Rectangle(
                            x=float(rc[0]) / dpr,
                            y=float(rc[1]) / dpr,
                            width=float(rc[2]) / dpr,
                            height=float(rc[3]) / dpr,
                        )

                # Parse scroll rects
                raw_scroll = node_data.get("scrollRects")
                scroll_rects = None
                if raw_scroll and isinstance(raw_scroll, list) and len(raw_scroll) > 0:
                    sr = raw_scroll[0]
                    if isinstance(sr, dict) and len(sr) >= 3:
                        scroll_rects = snapshot_types.Rectangle(
                            x=float(sr.get("x", 0)) / dpr,
                            y=float(sr.get("y", 0)) / dpr,
                            width=float(sr.get("width", 0)) / dpr,
                            height=float(sr.get("height", 0)) / dpr,
                        )

                layout_node = snapshot_types.LayoutTreeNode(
                    bounds=bounds,
                    clientRects=client_rects,
                    scrollRects=scroll_rects,
                    computed_styles=computed,
                    cursor_style=cursor,
                    # InlineTextBox indices stored but not needed for element detection
                    inlineTextBoxIndex=node_data.get("inlineTextBoxIndex"),
                    paintOrder=node_data.get("paintOrder"),
                    isStackingContext=node_data.get("isStackingContext"),
                    nodeId=node_data.get("nodeId"),
                )
                lookup[backend_id] = layout_node

        return lookup

    # ------------------------------------------------------------------
    # Element detection
    # ------------------------------------------------------------------

    @staticmethod
    def _is_interactive_tag(tag: str | None) -> bool:
        if not tag:
            return False
        return tag.lower() in {
            "button", "input", "select", "textarea", "a",
            "details", "summary", "option", "optgroup",
        }

    @staticmethod
    def _is_interactive_ax_role(role: str | None) -> bool:
        if not role:
            return False
        return role.lower() in {
            "button", "link", "menuitem", "option", "radio",
            "checkbox", "tab", "textbox", "combobox", "slider",
            "spinbutton", "listbox", "search", "searchbox",
            "row", "cell", "gridcell",
        }

    @staticmethod
    def _is_interactive_attr_role(role: str | None) -> bool:
        if not role:
            return False
        return role.lower() in {
            "button", "link", "menuitem", "option", "radio",
            "checkbox", "tab", "textbox", "combobox", "slider",
            "spinbutton", "search", "searchbox", "row", "cell",
            "gridcell", "menu",
        }

    def _get_element_text(
        self,
        node: dict[str, Any],
        strings: list[str],
    ) -> str:
        """Extract display text from a DOM node."""
        texts: list[str] = []

        # nodeValue (for text nodes)
        if node.get("nodeValue"):
            nv = node["nodeValue"]
            if isinstance(nv, int):
                idx = nv
                if 0 <= idx < len(strings):
                    texts.append(strings[idx])
            elif isinstance(nv, str):
                texts.append(nv)

        # contentDocument / children handled by caller recursively
        return " ".join(texts).strip()

    async def get_interactive_elements(self) -> ElementList:
        """
        Capture the DOM snapshot, extract all visible interactive elements,
        and return them as a numbered list.

        Returns
        -------
        ElementList
            Contains ``elements`` (list[InteractiveElement]) and metadata
            (``page_url``, ``page_title``).
        """
        if not self._client or not self._session_id:
            raise RuntimeError("CDPConnection not connected")

        sid = self._require_session()
        dpr = await self._get_device_pixel_ratio()

        # ── 1. Capture DOM snapshot ──────────────────────────────────────
        snapshot = await self._snapshot()
        snapshot_lookup = await self._build_snapshot_lookup(snapshot, dpr)

        # ── 2. Get page metadata ──────────────────────────────────────────
        try:
            page_info = await self._client.send.Page.getFrameTree(session_id=sid)
            frame_tree = page_info.get("frameTree", {})
            frame = frame_tree.get("frame", {})
            self_page_url = frame.get("url", "")
            self_page_title = frame.get("name", "")
        except Exception:
            self_page_url = ""
            self_page_title = ""

        # ── 3. Walk documents and collect nodes ──────────────────────────
        documents: list[dict[str, Any]] = snapshot.get("documents", [])
        elements: list[InteractiveElement] = []
        next_index = 1

        # Collect JS click listener backend IDs via Runtime.evaluate
        js_click_listener_bids: set[int] = set()
        try:
            listener_result = await self._client.send.Runtime.evaluate(
                params={
                    "expression": """
                    (() => {
                        if (typeof getEventListeners !== 'function') return [];
                        const elems = [];
                        const all = document.querySelectorAll('*');
                        for (const el of all) {
                            try {
                                const l = getEventListeners(el);
                                if (l.click || l.mousedown || l.mouseup || l.pointerdown || l.pointerup) {
                                    elems.push(el);
                                }
                            } catch (_) {}
                        }
                        return elems;
                    })()
                    """,
                    "includeCommandLineAPI": True,
                    "returnByValue": False,
                },
                session_id=sid,
            )
            result_oid = listener_result.get("result", {}).get("objectId")
            if result_oid:
                arr_props = await self._client.send.Runtime.getProperties(
                    params={"objectId": result_oid, "ownProperties": True},
                    session_id=sid,
                )
                for prop in arr_props.get("result", []):
                    prop_name = prop.get("name", "") if isinstance(prop, dict) else ""
                    if isinstance(prop_name, str) and prop_name.isdigit():
                        prop_val = prop.get("value", {}) if isinstance(prop, dict) else {}
                        if isinstance(prop_val, dict):
                            oid = prop_val.get("objectId")
                            if oid:
                                try:
                                    node_info = await self._client.send.DOM.describeNode(
                                        params={"objectId": oid},
                                        session_id=sid,
                                    )
                                    bid = node_info.get("node", {}).get("backendNodeId")
                                    if bid:
                                        js_click_listener_bids.add(bid)
                                except Exception:
                                    pass
                try:
                    await self._client.send.Runtime.releaseObject(params={"objectId": result_oid}, session_id=sid)
                except Exception:
                    pass
        except Exception as e:
            logger.debug("JS click listener detection skipped: %s", e)

        # Also fetch the full AX tree to get roles and names
        ax_tree_nodes: dict[int, dict[str, Any]] = {}
        try:
            frame_tree_info = await self._client.send.Page.getFrameTree(session_id=sid)
            frame_tree_node = frame_tree_info.get("frameTree", {})
            frame_id = frame_tree_node.get("frame", {}).get("id")
            if frame_id:
                ax_result = await self._client.send.Accessibility.getFullAXTree(
                    params={"frameId": frame_id},
                    session_id=sid,
                )
                for ax_node in ax_result.get("nodes", []):
                    bid = ax_node.get("backendDOMNodeId")
                    if bid:
                        ax_tree_nodes[bid] = ax_node
        except Exception as e:
            logger.debug("AX tree fetch skipped: %s", e)

        def parse_attrs(attrs: list[int] | None) -> dict[str, str]:
            """Parse [k1, v1, k2, v2, ...] into {k1: v1, ...}."""
            result: dict[str, str] = {}
            if not attrs:
                return result
            for i in range(0, len(attrs) - 1, 2):
                k_idx, v_idx = attrs[i], attrs[i + 1]
                if isinstance(k_idx, int) and isinstance(v_idx, int):
                    k = strings[k_idx] if 0 <= k_idx < len(strings) else str(k_idx)
                    v = strings[v_idx] if 0 <= v_idx < len(strings) else str(v_idx)
                    result[k] = v
            return result

        def get_ax_field(ax_node: dict[str, Any] | None, field: str) -> str | None:
            """Extract a string field from an AX node dict."""
            if not ax_node:
                return None
            val = ax_node.get(field)
            if isinstance(val, dict):
                return val.get("value")
            return val

        def check_disabled_or_readonly(
            attrs: dict[str, str],
            ax_node: dict[str, Any] | None,
        ) -> tuple[bool, bool]:
            disabled = attrs.get("disabled", "").lower() in ("true", "")
            readonly = (
                attrs.get("readonly", "").lower() in ("true", "")
                or attrs.get("aria-readonly", "").lower() in ("true", "true")
            )
            # AX properties
            if ax_node:
                for prop in ax_node.get("properties", []):
                    if prop.get("name") == "disabled" and prop.get("value", {}).get("value") is True:
                        disabled = True
                    if prop.get("name") == "readonly" and prop.get("value", {}).get("value") is True:
                        readonly = True
            return disabled, readonly

        # ── 4. Main walk ────────────────────────────────────────────────
        def walk_doc(doc: dict[str, Any]) -> None:
            nonlocal next_index
            strings = doc.get("strings", [])
            nodes: list[dict[str, Any]] = doc.get("nodes", [])
            frame_id: str | None = doc.get("frameId")

            # Build nodeId→index map for parent resolution
            node_id_to_backend: dict[int, int] = {}
            for n in nodes:
                if "nodeId" in n and "backendNodeId" in n:
                    node_id_to_backend[n["nodeId"]] = n["backendNodeId"]

            for node in nodes:
                if not isinstance(node, dict):
                    continue

                node_type = node.get("nodeType", 0)
                # 1 = ELEMENT_NODE
                if node_type != 1:
                    continue

                tag_name_raw = node.get("nodeName", "")
                tag_name = str(tag_name_raw) if tag_name_raw else ""
                backend_id = node.get("backendNodeId", 0)
                node_id = node.get("nodeId", 0)

                # Skip html/body
                if tag_name.lower() in ("html", "body"):
                    continue

                attrs = parse_attrs(node.get("attributes"))
                snapshot_node = snapshot_lookup.get(backend_id)
                computed = snapshot_node.computed_styles if snapshot_node else {}

                # CSS visibility check
                display = computed.get("display", "").lower()
                visibility = computed.get("visibility", "").lower()
                opacity_str = computed.get("opacity", "1")
                css_hidden = display == "none" or visibility == "hidden"
                try:
                    if float(opacity_str) <= 0:
                        css_hidden = True
                except (ValueError, TypeError):
                    pass
                if css_hidden:
                    continue

                # AX data
                ax_node = ax_tree_nodes.get(backend_id)
                ax_role = get_ax_field(ax_node, "role")
                ax_name = get_ax_field(ax_node, "name") or ""

                # Extract text content from children
                child_texts: list[str] = []
                for child in node.get("children", []) or []:
                    if child.get("nodeType") == 3:  # TEXT_NODE
                        child_texts.append(self._get_element_text(child, strings))
                text_content = " ".join(child_texts).strip()

                # aria-label / title / placeholder / alt
                accessible_name = (
                    attrs.get("aria-label")
                    or attrs.get("title")
                    or attrs.get("placeholder")
                    or attrs.get("alt")
                    or ax_name
                    or text_content
                )

                role_attr = attrs.get("role", "")
                disabled, readonly = check_disabled_or_readonly(attrs, ax_node)

                input_type: str | None = None
                if tag_name.lower() == "input":
                    input_type = attrs.get("type", "text").lower()

                has_js_listener = backend_id in js_click_listener_bids

                cursor = None
                if snapshot_node:
                    cursor = snapshot_node.cursor_style

                # ── Interactivity decision ─────────────────────────────
                is_interactive = False

                # 1. JS click listener
                if has_js_listener:
                    is_interactive = True
                # 2. iframe/frame (large enough)
                elif tag_name.upper() in ("IFRAME", "FRAME"):
                    if snapshot_node and snapshot_node.bounds:
                        if snapshot_node.bounds.width > 100 and snapshot_node.bounds.height > 100:
                            is_interactive = True
                # 3. Interactive tag
                elif self._is_interactive_tag(tag_name):
                    is_interactive = True
                # 4. Interactive AX role
                elif self._is_interactive_ax_role(ax_role):
                    is_interactive = True
                # 5. Interactive attribute role
                elif self._is_interactive_attr_role(role_attr):
                    is_interactive = True
                # 6. Interactive attributes
                elif any(attr in attrs for attr in ("onclick", "onmousedown", "onmouseup", "onkeydown", "tabindex")):
                    is_interactive = True
                # 7. Search indicators in class/id
                elif any(k in (attrs.get("class", "") + " " + attrs.get("id", "")).lower()
                         for k in ("search", "magnify", "lookup", "find", "query")):
                    is_interactive = True
                # 8. Small icon with interaction signals
                elif (
                    snapshot_node
                    and snapshot_node.bounds
                    and 10 <= snapshot_node.bounds.width <= 50
                    and 10 <= snapshot_node.bounds.height <= 50
                    and any(k in attrs for k in ("class", "role", "onclick", "aria-label"))
                ):
                    is_interactive = True
                # 9. Cursor style
                elif cursor == "pointer":
                    is_interactive = True

                if not is_interactive:
                    continue

                # ── Build InteractiveElement ────────────────────────────
                bounds_x = bounds_y = bounds_w = bounds_h = None
                if snapshot_node and snapshot_node.bounds:
                    bounds_x = snapshot_node.bounds.x
                    bounds_y = snapshot_node.bounds.y
                    bounds_w = snapshot_node.bounds.width
                    bounds_h = snapshot_node.bounds.height

                el = InteractiveElement(
                    index=next_index,
                    tag_name=tag_name,
                    role=role_attr or None,
                    name=accessible_name[:200],  # cap at 200 chars
                    ax_role=ax_role,
                    backend_node_id=backend_id,
                    node_id=node_id,
                    frame_id=frame_id,
                    is_disabled=disabled,
                    is_readonly=readonly,
                    input_type=input_type,
                    has_js_click_listener=has_js_listener,
                    cursor_style=cursor,
                    bounds_x=bounds_x,
                    bounds_y=bounds_y,
                    bounds_width=bounds_w,
                    bounds_height=bounds_h,
                )
                elements.append(el)
                next_index += 1

        for doc in documents:
            walk_doc(doc)

        return ElementList(elements=elements, page_url=self_page_url, page_title=self_page_title)

    # ------------------------------------------------------------------
    # Element actions
    # ------------------------------------------------------------------

    async def resolve_element_box(self, element: InteractiveElement) -> tuple[float, float]:
        """
        Resolve the bounding box center for an element via CDP.

        Tries the cached bounds from the snapshot first; falls back to
        DOM.getBoxModel for pixel-perfect coordinates.

        Returns
        -------
        (center_x, center_y) in CSS pixels
        """
        # Use cached bounds if available
        if element.center_x is not None and element.center_y is not None:
            return element.center_x, element.center_y

        # Fall back to DOM.getBoxModel
        sid = self._require_session()
        dpr = await self._get_device_pixel_ratio()

        try:
            result = await self._client.send.DOM.getBoxModel(
                params={"nodeId": element.node_id},
                session_id=sid,
            )
            model = result.get("model", {})
            content = model.get("content", [])
            # content is [x0, y0, x1, y1, x2, y2, x3, y3] quad
            if content and len(content) >= 4:
                xs = content[::2]
                ys = content[1::2]
                cx = (min(xs) + max(xs)) / 2 / dpr
                cy = (min(ys) + max(ys)) / 2 / dpr
                return cx, cy
        except Exception as e:
            logger.debug("getBoxModel failed for node %d: %s", element.node_id, e)

        raise RuntimeError(f"Could not resolve bounding box for element {element.index}")

    async def click_element(self, element: InteractiveElement) -> None:
        """
        Click an element by dispatching a mouse press + release at its center.

        Args:
            element: The element to click (must be from get_interactive_elements).
        """
        sid = self._require_session()
        cx, cy = await self.resolve_element_box(element)

        await self._client.send.Input.dispatchMouseEvent(
            params=input_cmds.DispatchMouseEventParameters(
                type="mousePressed",
                x=cx,
                y=cy,
                button="left",
                clickCount=1,
            ),
            session_id=sid,
        )
        await self._client.send.Input.dispatchMouseEvent(
            params=input_cmds.DispatchMouseEventParameters(
                type="mouseReleased",
                x=cx,
                y=cy,
                button="left",
                clickCount=1,
            ),
            session_id=sid,
        )
        logger.debug("Clicked element [%d] at (%.1f, %.1f)", element.index, cx, cy)

    async def type_into_element(
        self,
        element: InteractiveElement,
        text: str,
        press_enter: bool = False,
    ) -> None:
        """
        Type text into an element, first clicking to focus it.

        Uses Input.insertText for character-accurate input (bypasses
        keyboard layout issues) and dispatches key events for special keys.

        Args:
            element: The input element (must be from get_interactive_elements).
            text: The text to type.
            press_enter: Whether to press Enter after typing.
        """
        sid = self._require_session()
        cx, cy = await self.resolve_element_box(element)

        # Focus: click once
        await self._client.send.Input.dispatchMouseEvent(
            params=input_cmds.DispatchMouseEventParameters(
                type="mousePressed",
                x=cx,
                y=cy,
                button="left",
                clickCount=1,
            ),
            session_id=sid,
        )
        await self._client.send.Input.dispatchMouseEvent(
            params=input_cmds.DispatchMouseEventParameters(
                type="mouseReleased",
                x=cx,
                y=cy,
                button="left",
                clickCount=1,
            ),
            session_id=sid,
        )

        # Clear existing value via Ctrl+A then Backspace
        await self._client.send(Input.dispatchKeyEvent(
            params=input_cmds.DispatchKeyEventParameters(
                type="keyDown",
                modifiers=2,  # Ctrl
                key="a",
                code="KeyA",
            ),
            session_id=sid,
        ))
        await self._client.send(Input.dispatchKeyEvent(
            params=input_cmds.DispatchKeyEventParameters(
                type="keyUp",
                modifiers=2,
                key="a",
                code="KeyA",
            ),
            session_id=sid,
        ))
        await self._client.send(Input.dispatchKeyEvent(
            params=input_cmds.DispatchKeyEventParameters(
                type="keyDown",
                key="Backspace",
                code="Backspace",
            ),
            session_id=sid,
        ))
        await self._client.send(Input.dispatchKeyEvent(
            params=input_cmds.DispatchKeyEventParameters(
                type="keyUp",
                key="Backspace",
                code="Backspace",
            ),
            session_id=sid,
        ))

        # Type using insertText (handles unicode correctly)
        if text:
            await self._client.send.Input.insertText(
                params=input_cmds.InsertTextParameters(text=text),
                session_id=sid,
            )

        if press_enter:
            await self._client.send(Input.dispatchKeyEvent(
                params=input_cmds.DispatchKeyEventParameters(
                    type="keyDown",
                    key="Enter",
                    code="Enter",
                ),
                session_id=sid,
            ))
            await self._client.send(Input.dispatchKeyEvent(
                params=input_cmds.DispatchKeyEventParameters(
                    type="keyUp",
                    key="Enter",
                    code="Enter",
                ),
                session_id=sid,
            ))

        logger.debug("Typed '%s' into element [%d]", text[:40], element.index)

    async def scroll_element_into_view(self, element: InteractiveElement) -> None:
        """Scroll an element into the viewport using DOM.scrollIntoViewIfNeeded."""
        sid = self._require_session()
        try:
            await self._client.send.DOM.scrollIntoViewIfNeeded(
                params={"nodeId": element.node_id},
                session_id=sid,
            )
        except Exception as e:
            logger.debug("scrollIntoViewIfNeeded failed: %s", e)

    # ------------------------------------------------------------------
    # Page operations (mirroring the existing RPA API)
    # ------------------------------------------------------------------

    async def navigate(self, url: str) -> None:
        """Navigate the current tab to a URL."""
        sid = self._require_session()
        await self._client.send.Page.navigate(
            params=page_cmds.NavigateParameters(url=url),
            session_id=sid,
        )
        # Wait forPage to load
        await self._client.send.Page.enable(session_id=sid)

    async def get_page_text(self) -> str:
        """
        Extract all visible text content from the page via JavaScript.

        Returns
        -------
        Plain text string of the page's visible text.
        """
        sid = self._require_session()
        result = await self._client.send.Runtime.evaluate(
            params={
                "expression": """
                (() => {
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: (node) => {
                                const style = window.getComputedStyle(node.parentElement);
                                if (style.display === 'none' || style.visibility === 'hidden') {
                                    return NodeFilter.FILTER_REJECT;
                                }
                                const text = node.textContent || '';
                                if (!text.trim()) return NodeFilter.FILTER_SKIP;
                                return NodeFilter.FILTER_ACCEPT;
                            }
                        }
                    );
                    const texts = [];
                    let node;
                    while ((node = walker.nextNode())) {
                        texts.push(node.textContent.trim());
                    }
                    return texts.join(' ');
                })()
                """,
                "returnByValue": True,
            },
            session_id=sid,
        )
        value = result.get("result", {}).get("value", "")
        return str(value) if value else ""


# ---------------------------------------------------------------------------
# Convenience functions (single-shot, create and destroy connection)
# ---------------------------------------------------------------------------


async def get_interactive_elements(cdp_url: str) -> ElementList:
    """
    Single-shot: connect to a CDP URL, capture elements, disconnect.
    """
    conn = CDPConnection(cdp_url)
    await conn.connect()
    try:
        return await conn.get_interactive_elements()
    finally:
        await conn.disconnect()


async def click_element_by_index(cdp_url: str, element: InteractiveElement) -> None:
    """Single-shot: click an element and disconnect."""
    conn = CDPConnection(cdp_url)
    await conn.connect()
    try:
        await conn.click_element(element)
    finally:
        await conn.disconnect()


async def type_into_element_by_index(
    cdp_url: str,
    element: InteractiveElement,
    text: str,
    press_enter: bool = False,
) -> None:
    """Single-shot: type into an element and disconnect."""
    conn = CDPConnection(cdp_url)
    await conn.connect()
    try:
        await conn.type_into_element(element, text, press_enter)
    finally:
        await conn.disconnect()


async def get_page_text_content(cdp_url: str) -> str:
    """Single-shot: get page text and disconnect."""
    conn = CDPConnection(cdp_url)
    await conn.connect()
    try:
        return await conn.get_page_text()
    finally:
        await conn.disconnect()
