"""
Action type definitions for the RPA execution engine.

Describes what each action does and what parameters it accepts.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# ---------------------------------------------------------------------------
# Literal types
# ---------------------------------------------------------------------------

ClickTarget = Literal["coordinate", "element_index"]
"""How to resolve the click target: by screen coordinates or by element index."""


# ---------------------------------------------------------------------------
# Action definitions
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ActionType:
    """
    Immutable description of one RPA action type.

    Fields
    ------
    name:
        Unique identifier, e.g. ``"click"``.
    description:
        Human-readable description shown to the AI so it can decide
        which action to emit.
    params:
        List of parameter names the AI must provide when emitting this action.
    has_element_index_param:
        If True the action accepts an ``element_index`` field (1-based number
        from ``get_interactive_elements``) in addition to coordinate params.
    example:
        Minimal example string for the AI prompt.
    """

    name: str
    description: str
    params: tuple[str, ...]
    has_element_index_param: bool = False
    example: str = ""


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

ACTION_REGISTRY: dict[str, ActionType] = {}


def register_action(
    name: str,
    description: str,
    params: tuple[str, ...],
    has_element_index_param: bool = False,
    example: str = "",
) -> ActionType:
    """Register an action type and return it (also stored in ACTION_REGISTRY)."""
    at = ActionType(
        name=name,
        description=description,
        params=params,
        has_element_index_param=has_element_index_param,
        example=example,
    )
    ACTION_REGISTRY[name] = at
    return at


# ── Page navigation ────────────────────────────────────────────────────────


NAVIGATE = register_action(
    name="navigate",
    description=("Load a URL in the current tab. Use this first to open the target page."),
    params=("url",),
    example="navigate(url='https://example.com')",
)

GO_BACK = register_action(
    name="go_back",
    description="Navigate to the previous page in browser history.",
    params=(),
    example="go_back()",
)

RELOAD = register_action(
    name="reload",
    description="Reload the current page.",
    params=(),
    example="reload()",
)


# ── Element actions ────────────────────────────────────────────────────────


CLICK = register_action(
    name="click",
    description=(
        "Click an element on the page. "
        "Prefer using element_index (from the numbered list) over x/y coordinates "
        "— element_index is stable across window resizes and content reflows. "
        "Use x/y only when the element has no detectable index."
    ),
    params=(
        "element_index",
        "x",
        "y",
    ),
    has_element_index_param=True,
    example="click(element_index=3)   # click by element number from last get_interactive_elements call\n"
    "click(x=150, y=230)        # click by coordinates (fallback, less stable)",
)


TYPE = register_action(
    name="type",
    description=(
        "Type text into a focused input element. "
        "The element must be an <input>, <textarea>, or contenteditable. "
        "Prefer element_index over coordinate-based focus. "
        "Sends Ctrl+A then Backspace to clear before typing. "
        "Supports press_enter to submit forms."
    ),
    params=(
        "element_index",
        "text",
        "press_enter",
    ),
    has_element_index_param=True,
    example="type(element_index=1, text='hello world', press_enter=True)",
)


SCROLL_INTO_VIEW = register_action(
    name="scroll_into_view",
    description=(
        "Scroll an element into the viewport so it is visible. "
        "Call get_interactive_elements again after scrolling to see newly revealed elements."
    ),
    params=("element_index",),
    has_element_index_param=True,
    example="scroll_into_view(element_index=5)",
)


# ── Page state ──────────────────────────────────────────────────────────────


GET_INTERACTIVE_ELEMENTS = register_action(
    name="get_interactive_elements",
    description=(
        "Capture a DOM snapshot and return a numbered list of all interactive elements "
        "(links, buttons, inputs, selects, textareas, and elements with click handlers or "
        "interactive ARIA roles). The 1-based index is used in click() and type() calls. "
        "Call this whenever you need to know what elements are on the page or after a "
        "significant page change (navigation, modal, scroll)."
    ),
    params=(),
    example="get_interactive_elements()   # returns: [1] 'Search' input [2] Login button [3] ... ",
)


GET_PAGE_TEXT = register_action(
    name="get_page_text",
    description=(
        "Extract all visible text content from the page. "
        "Use this to understand page content before deciding the next action. "
        "Does NOT return element indices — use get_interactive_elements for that."
    ),
    params=(),
    example="get_page_text()",
)


# ── Lookup helper (not a real action, used by the AI) ─────────────────────


def get_action(name: str) -> ActionType | None:
    return ACTION_REGISTRY.get(name)


def all_actions() -> list[ActionType]:
    return list(ACTION_REGISTRY.values())


def action_names() -> list[str]:
    return list(ACTION_REGISTRY.keys())
