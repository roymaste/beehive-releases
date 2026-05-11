"""
Tests for CDP element detection — saas.services.agent_executor module.

Uses unittest.mock to mock the CDP WebSocket client so tests run
without a live browser.
"""

from __future__ import annotations

import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Path resolution for the saas package
sys.path.insert(0, "/home/joyandjoe/beehive-agent")
sys.path.insert(0, "/home/joyandjoe/beehive-agent/frontend")

from saas.services.agent_executor import (
    CDPConnection,
    InteractiveElement,
    ElementList,
    get_interactive_elements,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_snapshot_result():
    """
    Minimal DOMSnapshot.captureSnapshot result representing a page with:
    - <input type="text" placeholder="Search" name="q">  (backendNodeId=20)
    - <button>Login</button>                           (backendNodeId=21)
    - <a href="/about">About</a>                       (backendNodeId=22)
    - <input type="password" disabled>                 (backendNodeId=23) — filtered out
    """
    return {
        "documents": [
            {
                "frameId": "frame0",
                "strings": [
                    "",          # 0 – unused
                    "INPUT",     # 1
                    "type",      # 2
                    "text",      # 3
                    "placeholder", # 4
                    "Search",    # 5
                    "name",      # 6
                    "q",         # 7
                    "BUTTON",    # 8
                    "Login",     # 9
                    "A",         # 10
                    "href",      # 11
                    "/about",    # 12
                    "About",     # 13
                    "disabled",  # 14
                    "true",      # 15
                    "password",  # 16
                ],
                "nodes": [
                    {"nodeId": 0, "backendNodeId": 0,  "nodeType": 9,  "nodeName": "#document"},
                    {"nodeId": 1, "backendNodeId": 10, "nodeType": 1,  "nodeName": "HTML"},
                    {"nodeId": 2, "backendNodeId": 11, "nodeType": 1,  "nodeName": "BODY"},
                    # input text — interactive
                    {
                        "nodeId": 3, "backendNodeId": 20, "nodeType": 1, "nodeName": "INPUT",
                        "attributes": [2, 3, 4, 5, 6, 7],   # type=text, placeholder=Search, name=q
                        "bounds": {"value": [10.0, 20.0, 210.0, 60.0]},
                    },
                    # button — interactive
                    {
                        "nodeId": 4, "backendNodeId": 21, "nodeType": 1, "nodeName": "BUTTON",
                        "attributes": [],
                        "bounds": {"value": [10.0, 80.0, 110.0, 44.0]},
                        "children": [
                            {"nodeId": 5, "backendNodeId": 0, "nodeType": 3, "nodeValue": 9},
                        ],
                    },
                    # anchor — interactive
                    {
                        "nodeId": 6, "backendNodeId": 22, "nodeType": 1, "nodeName": "A",
                        "attributes": [11, 12],
                        "bounds": {"value": [10.0, 140.0, 80.0, 24.0]},
                        "children": [
                            {"nodeId": 7, "backendNodeId": 0, "nodeType": 3, "nodeValue": 13},
                        ],
                    },
                    # input password disabled — filtered out
                    {
                        "nodeId": 8, "backendNodeId": 23, "nodeType": 1, "nodeName": "INPUT",
                        "attributes": [2, 16, 14, 15],  # type=password, disabled=true
                        "bounds": {"value": [10.0, 200.0, 210.0, 240.0]},
                    },
                ],
                "layoutTree": [
                    {},  # 0 – document
                    {},  # 1 – html
                    {},  # 2 – body
                    {"backendNodeId": 20, "nodeId": 3, "bounds": {"value": [10.0, 20.0, 200.0, 40.0]}},
                    {"backendNodeId": 21, "nodeId": 4, "bounds": {"value": [10.0, 80.0, 100.0, 44.0]}},
                    {"backendNodeId": 22, "nodeId": 6, "bounds": {"value": [10.0, 140.0, 80.0, 24.0]}},
                    {"backendNodeId": 23, "nodeId": 8, "bounds": {"value": [10.0, 200.0, 200.0, 40.0]}},
                ],
            }
        ]
    }


@pytest.fixture
def mock_ax_tree_result():
    return {
        "nodes": [
            {"backendDOMNodeId": 20, "role": {"value": "textbox"}, "name": {"value": "Search"}},
            {"backendDOMNodeId": 21, "role": {"value": "button"},  "name": {"value": "Login"}},
            {"backendDOMNodeId": 22, "role": {"value": "link"},    "name": {"value": "About"}},
            {"backendDOMNodeId": 23, "role": {"value": "textbox"}, "name": {"value": ""}},
        ]
    }


@pytest.fixture
def mock_page_frame_tree():
    return {
        "frameTree": {
            "frame": {
                "id": "frame0",
                "url": "https://example.com/search",
                "name": "Search — Example",
            }
        }
    }


# ---------------------------------------------------------------------------
# CDPConnection.connect
# ---------------------------------------------------------------------------

class TestCDPConnectionConnect:
    @pytest.mark.asyncio
    async def test_parses_target_id_from_url(self):
        with patch("saas.services.agent_executor.CDPClient") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.start = AsyncMock()
            mock_client.send.Target.attachToTarget = AsyncMock(return_value={"sessionId": "sess123"})
            mock_client.send.Page.enable = AsyncMock()
            mock_client.send.DOM.enable = AsyncMock()
            mock_client.send.Runtime.enable = AsyncMock()
            mock_client.send.Network.enable = AsyncMock()
            mock_client.send.Input.enable = AsyncMock()

            conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab_abc")
            await conn.connect()

            mock_client.start.assert_called_once()
            mock_client.send.Target.attachToTarget.assert_called_once()
            call_params = mock_client.send.Target.attachToTarget.call_args
            assert call_params.kwargs["params"]["targetId"] == "tab_abc"
            assert conn._session_id == "sess123"

    @pytest.mark.asyncio
    async def test_extract_target_id_static(self):
        assert CDPConnection._extract_target_id("ws://127.0.0.1:9222/cdp/tab1") == "tab1"
        assert CDPConnection._extract_target_id("ws://127.0.0.1:9222/cdp/my-target-id") == "my-target-id"
        assert CDPConnection._extract_target_id("ws://127.0.0.1:9222/other/path") is None

    @pytest.mark.asyncio
    async def test_disconnect_is_safe_when_not_connected(self):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        await conn.disconnect()  # must not raise


# ---------------------------------------------------------------------------
# InteractiveElement
# ---------------------------------------------------------------------------

class TestInteractiveElement:
    def test_center_x_y_from_bounds(self):
        el = InteractiveElement(
            index=1, tag_name="INPUT", role=None, name="Search",
            ax_role="textbox", backend_node_id=20, node_id=3, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
            bounds_x=10.0, bounds_y=20.0, bounds_width=200.0, bounds_height=40.0,
        )
        assert el.center_x == 110.0
        assert el.center_y == 40.0

    def test_center_x_y_none_when_bounds_missing(self):
        el = InteractiveElement(
            index=1, tag_name="BUTTON", role=None, name="OK",
            ax_role=None, backend_node_id=1, node_id=1, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        assert el.center_x is None
        assert el.center_y is None

    def test_display_label_basic(self):
        el = InteractiveElement(
            index=3, tag_name="INPUT", role="combobox", name="Country selector",
            ax_role="combobox", backend_node_id=5, node_id=10, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
        )
        label = el.display_label()
        assert "INPUT" in label
        assert "Country selector" in label
        assert "combobox" in label

    def test_display_label_truncates_long_name(self):
        el = InteractiveElement(
            index=1, tag_name="DIV", role=None, name="x" * 100,
            ax_role=None, backend_node_id=1, node_id=1, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        assert len(el.display_label()) < 200

    def test_display_label_disabled(self):
        el = InteractiveElement(
            index=1, tag_name="BUTTON", role=None, name="Submit",
            ax_role=None, backend_node_id=1, node_id=1, frame_id=None,
            is_disabled=True, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        assert "(disabled)" in el.display_label()


# ---------------------------------------------------------------------------
# ElementList
# ---------------------------------------------------------------------------

class TestElementList:
    def test_numbered_list_empty(self):
        lst = ElementList()
        assert "(no interactive elements found)" in lst.numbered_list()

    def test_numbered_list_formats_correctly(self):
        el1 = InteractiveElement(
            index=1, tag_name="INPUT", role=None, name="q",
            ax_role="textbox", backend_node_id=20, node_id=3, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
        )
        el2 = InteractiveElement(
            index=2, tag_name="BUTTON", role=None, name="Login",
            ax_role="button", backend_node_id=21, node_id=4, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        lst = ElementList(elements=[el1, el2])
        output = lst.numbered_list()
        assert "[1]" in output
        assert "[2]" in output
        assert "INPUT" in output
        assert "BUTTON" in output

    def test_by_index(self):
        el1 = InteractiveElement(
            index=1, tag_name="INPUT", role=None, name="q",
            ax_role="textbox", backend_node_id=20, node_id=3, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
        )
        el2 = InteractiveElement(
            index=2, tag_name="BUTTON", role=None, name="Login",
            ax_role="button", backend_node_id=21, node_id=4, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        lst = ElementList(elements=[el1, el2])
        assert lst.by_index(1) is el1
        assert lst.by_index(2) is el2
        assert lst.by_index(99) is None


# ---------------------------------------------------------------------------
# CDPConnection.get_interactive_elements
# ---------------------------------------------------------------------------

class TestGetInteractiveElements:
    @pytest.mark.asyncio
    async def test_filters_disabled_elements(self, mock_snapshot_result, mock_ax_tree_result, mock_page_frame_tree):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._target_id = "tab1"
        conn._dpr = AsyncMock(return_value=1.0)
        conn._capture_snapshot = AsyncMock(return_value=mock_snapshot_result)

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Accessibility.getFullAXTree = AsyncMock(return_value=mock_ax_tree_result)
            mock_send.Runtime.evaluate = AsyncMock(return_value={"result": {"objectId": None}})
            mock_send.Page.getFrameTree = AsyncMock(return_value=mock_page_frame_tree)

            result = await conn.get_interactive_elements()

        backend_ids = {el.backend_node_id for el in result.elements}

        # Disabled password input must NOT appear
        assert 23 not in backend_ids
        # Others must appear
        assert 20 in backend_ids  # input text
        assert 21 in backend_ids  # button
        assert 22 in backend_ids  # anchor

        for el in result.elements:
            assert not el.is_disabled

    @pytest.mark.asyncio
    async def test_assigns_sequential_indices(self, mock_snapshot_result, mock_ax_tree_result, mock_page_frame_tree):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._target_id = "tab1"
        conn._dpr = AsyncMock(return_value=1.0)
        conn._capture_snapshot = AsyncMock(return_value=mock_snapshot_result)

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Accessibility.getFullAXTree = AsyncMock(return_value=mock_ax_tree_result)
            mock_send.Runtime.evaluate = AsyncMock(return_value={"result": {"objectId": None}})
            mock_send.Page.getFrameTree = AsyncMock(return_value=mock_page_frame_tree)

            result = await conn.get_interactive_elements()

        indices = [el.index for el in result.elements]
        assert indices == list(range(1, len(indices) + 1))

    @pytest.mark.asyncio
    async def test_populates_accessible_name_from_ax_tree(self, mock_snapshot_result, mock_ax_tree_result, mock_page_frame_tree):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._target_id = "tab1"
        conn._dpr = AsyncMock(return_value=1.0)
        conn._capture_snapshot = AsyncMock(return_value=mock_snapshot_result)

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Accessibility.getFullAXTree = AsyncMock(return_value=mock_ax_tree_result)
            mock_send.Runtime.evaluate = AsyncMock(return_value={"result": {"objectId": None}})
            mock_send.Page.getFrameTree = AsyncMock(return_value=mock_page_frame_tree)

            result = await conn.get_interactive_elements()

        names_map = {el.backend_node_id: el.name for el in result.elements}
        assert names_map.get(20) == "Search"
        assert names_map.get(21) == "Login"
        assert names_map.get(22) == "About"

    @pytest.mark.asyncio
    async def test_page_url_title_set(self, mock_snapshot_result, mock_ax_tree_result, mock_page_frame_tree):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._target_id = "tab1"
        conn._dpr = AsyncMock(return_value=1.0)
        conn._capture_snapshot = AsyncMock(return_value=mock_snapshot_result)

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Accessibility.getFullAXTree = AsyncMock(return_value=mock_ax_tree_result)
            mock_send.Runtime.evaluate = AsyncMock(return_value={"result": {"objectId": None}})
            mock_send.Page.getFrameTree = AsyncMock(return_value=mock_page_frame_tree)

            result = await conn.get_interactive_elements()

        assert result.page_url == "https://example.com/search"
        assert result.page_title == "Search — Example"


# ---------------------------------------------------------------------------
# CDPConnection.click_element
# ---------------------------------------------------------------------------

class TestClickElement:
    @pytest.mark.asyncio
    async def test_click_dispatches_two_mouse_events(self):
        el = InteractiveElement(
            index=1, tag_name="BUTTON", role=None, name="OK",
            ax_role="button", backend_node_id=1, node_id=5, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
            bounds_x=100.0, bounds_y=200.0, bounds_width=50.0, bounds_height=30.0,
        )

        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._resolve_element_box = AsyncMock(return_value=(125.0, 215.0))

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Input.dispatchMouseEvent = AsyncMock()

            await conn.click_element(el)

        assert mock_send.Input.dispatchMouseEvent.call_count == 2

        pressed_call = mock_send.Input.dispatchMouseEvent.call_args_list[0]
        pressed_params = pressed_call.kwargs["params"]
        assert pressed_params["type"] == "mousePressed"
        assert pressed_params["x"] == 125.0
        assert pressed_params["y"] == 215.0
        assert pressed_params["button"] == "left"
        assert pressed_params["clickCount"] == 1

        released_call = mock_send.Input.dispatchMouseEvent.call_args_list[1]
        released_params = released_call.kwargs["params"]
        assert released_params["type"] == "mouseReleased"


# ---------------------------------------------------------------------------
# CDPConnection.type_into_element
# ---------------------------------------------------------------------------

class TestTypeIntoElement:
    @pytest.mark.asyncio
    async def test_types_text_without_enter(self):
        el = InteractiveElement(
            index=1, tag_name="INPUT", role=None, name="Search",
            ax_role="textbox", backend_node_id=1, node_id=3, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
            bounds_x=10.0, bounds_y=20.0, bounds_width=200.0, bounds_height=40.0,
        )

        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._resolve_element_box = AsyncMock(return_value=(110.0, 40.0))

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Input.dispatchMouseEvent = AsyncMock()
            mock_send.Input.dispatchKeyEvent = AsyncMock()
            mock_send.Input.insertText = AsyncMock()

            await conn.type_into_element(el, "hello world", press_enter=False)

            mock_send.Input.insertText.assert_called_once()
            insert_call = mock_send.Input.insertText.call_args_list[0]
            assert insert_call.kwargs["params"]["text"] == "hello world"

            enter_calls = [
                c for c in mock_send.Input.dispatchKeyEvent.call_args_list
                if c.kwargs["params"]["key"] == "Enter"
            ]
            assert len(enter_calls) == 0

    @pytest.mark.asyncio
    async def test_type_presses_enter_when_flag_set(self):
        el = InteractiveElement(
            index=1, tag_name="INPUT", role=None, name="Search",
            ax_role="textbox", backend_node_id=1, node_id=3, frame_id=None,
            is_disabled=False, is_readonly=False, input_type="text",
            has_js_click_listener=False, cursor_style=None,
            bounds_x=10.0, bounds_y=20.0, bounds_width=200.0, bounds_height=40.0,
        )

        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._resolve_element_box = AsyncMock(return_value=(110.0, 40.0))

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Input.dispatchMouseEvent = AsyncMock()
            mock_send.Input.dispatchKeyEvent = AsyncMock()
            mock_send.Input.insertText = AsyncMock()

            await conn.type_into_element(el, "query", press_enter=True)

            enter_down = [
                c for c in mock_send.Input.dispatchKeyEvent.call_args_list
                if c.kwargs["params"]["key"] == "Enter" and c.kwargs["params"]["type"] == "keyDown"
            ]
            enter_up = [
                c for c in mock_send.Input.dispatchKeyEvent.call_args_list
                if c.kwargs["params"]["key"] == "Enter" and c.kwargs["params"]["type"] == "keyUp"
            ]
            assert len(enter_down) == 1
            assert len(enter_up) == 1


# ---------------------------------------------------------------------------
# CDPConnection.resolve_element_box
# ---------------------------------------------------------------------------

class TestResolveElementBox:
    @pytest.mark.asyncio
    async def test_uses_cached_bounds(self):
        el = InteractiveElement(
            index=1, tag_name="BUTTON", role=None, name="OK",
            ax_role="button", backend_node_id=1, node_id=1, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
            bounds_x=10.0, bounds_y=20.0, bounds_width=100.0, bounds_height=40.0,
        )
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"

        cx, cy = await conn.resolve_element_box(el)
        assert cx == 60.0
        assert cy == 40.0

    @pytest.mark.asyncio
    async def test_falls_back_to_get_box_model(self):
        el = InteractiveElement(
            index=1, tag_name="DIV", role=None, name="box",
            ax_role=None, backend_node_id=5, node_id=10, frame_id=None,
            is_disabled=False, is_readonly=False, input_type=None,
            has_js_click_listener=False, cursor_style=None,
        )
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"
        conn._dpr = AsyncMock(return_value=1.0)

        with patch.object(conn._client, "send") as mock_send:
            mock_send.DOM.getBoxModel = AsyncMock(
                return_value={
                    "model": {
                        # Quad: (50,60) (150,60) (150,110) (50,110) → center=(100, 85)
                        "content": [50.0, 60.0, 150.0, 60.0, 150.0, 110.0, 50.0, 110.0],
                    }
                }
            )
            cx, cy = await conn.resolve_element_box(el)
            assert cx == 100.0
            assert cy == 85.0


# ---------------------------------------------------------------------------
# CDPConnection.get_page_text
# ---------------------------------------------------------------------------

class TestGetPageText:
    @pytest.mark.asyncio
    async def test_returns_javascript_result(self):
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        conn._client = MagicMock()
        conn._session_id = "sess123"

        with patch.object(conn._client, "send") as mock_send:
            mock_send.Runtime.evaluate = AsyncMock(
                return_value={"result": {"value": "Hello world  Some paragraph text"}}
            )
            text = await conn.get_page_text()

        assert text == "Hello world  Some paragraph text"
        eval_call = mock_send.Runtime.evaluate.call_args
        assert "acceptNode" in eval_call.kwargs["params"]["expression"]


# ---------------------------------------------------------------------------
# Snapshot lookup builder
# ---------------------------------------------------------------------------

class TestSnapshotLookup:
    @pytest.mark.asyncio
    async def test_build_snapshot_lookup_parses_bounds(self):
        snapshot = {
            "documents": [
                {
                    "strings": ["display", "flex", "cursor", "pointer"],
                    "layoutTree": [
                        {
                            "backendNodeId": 100,
                            "nodeId": 5,
                            "bounds": {"value": [10.0, 20.0, 100.0, 40.0]},
                            "computedStyles": [0, 1, 2, 3],  # [key_idx, val_idx, ...] → display→flex, cursor→pointer
                        },
                    ],
                }
            ]
        }
        conn = CDPConnection("ws://127.0.0.1:9222/cdp/tab1")
        lookup = await conn._build_snapshot_lookup(snapshot, dpr=1.0)

        assert 100 in lookup
        node = lookup[100]
        assert node["bounds"] is not None
        assert node["bounds"]["x"] == 10.0
        assert node["bounds"]["y"] == 20.0
        assert node["bounds"]["width"] == 100.0
        assert node["bounds"]["height"] == 40.0
        assert node["computed_styles"].get("display") == "flex"
        assert node["cursor_style"] == "pointer"


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------

class TestConvenienceFunctions:
    @pytest.mark.asyncio
    async def test_get_interactive_elements_creates_and_tears_down(
        self, mock_snapshot_result, mock_ax_tree_result, mock_page_frame_tree
    ):
        with patch("saas.services.agent_executor.CDPClient") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.start = AsyncMock()
            mock_client.stop = AsyncMock()
            mock_client.send.Target.attachToTarget = AsyncMock(return_value={"sessionId": "sess1"})
            mock_client.send.Page.enable = AsyncMock()
            mock_client.send.DOM.enable = AsyncMock()
            mock_client.send.Runtime.enable = AsyncMock()
            mock_client.send.Network.enable = AsyncMock()
            mock_client.send.Input.enable = AsyncMock()
            mock_client.send.DOMSnapshot.captureSnapshot = AsyncMock(return_value=mock_snapshot_result)
            mock_client.send.Page.getLayoutMetrics = AsyncMock(
                return_value={"visualViewport": {}, "cssVisualViewport": {}}
            )
            mock_client.send.Page.getFrameTree = AsyncMock(return_value=mock_page_frame_tree)
            mock_client.send.Accessibility.getFullAXTree = AsyncMock(return_value=mock_ax_tree_result)
            mock_client.send.Runtime.evaluate = AsyncMock(return_value={"result": {"objectId": None}})

            result = await get_interactive_elements("ws://127.0.0.1:9222/cdp/tab1")

            assert isinstance(result, ElementList)
            mock_client.stop.assert_called_once()
