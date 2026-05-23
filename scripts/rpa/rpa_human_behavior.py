"""
rpa_human_behavior.py — 拟人化操作引擎
依赖 rpa_cdp_client.py，提供逐字输入、贝塞尔轨迹、随机间隔等拟人行为
"""

import asyncio
import time
import random
import math
from typing import List, Tuple

try:
    from rpa_cdp_client import CDPClient
except ImportError:
    from .rpa_cdp_client import CDPClient


class BezierCurve:
    """贝塞尔曲线轨迹生成器"""

    @staticmethod
    def cubic(
        p0: Tuple[float, float],
        p1: Tuple[float, float],
        p2: Tuple[float, float],
        p3: Tuple[float, float],
        t: float,
    ) -> Tuple[float, float]:
        """三次贝塞尔曲线插值"""
        u = 1 - t
        tt = t * t
        uu = u * u
        uuu = uu * u
        ttt = tt * t

        x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
        y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
        return (x, y)

    @staticmethod
    def generate_path(
        start: Tuple[float, float],
        end: Tuple[float, float],
        roughness: float = 0.5,
    ) -> List[Tuple[float, float]]:
        """生成从 start 到 end 的贝塞尔路径"""
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        dist = math.sqrt(dx * dx + dy * dy)

        offset = dist * roughness * random.uniform(0.3, 0.7)
        angle = random.uniform(0, 2 * math.pi)

        cp1 = (
            start[0] + dx * 0.25 + offset * math.cos(angle),
            start[1] + dy * 0.25 + offset * math.sin(angle),
        )
        cp2 = (
            start[0] + dx * 0.75 + offset * math.cos(angle + math.pi * 0.5),
            start[1] + dy * 0.75 + offset * math.sin(angle + math.pi * 0.5),
        )

        steps = max(10, int(dist / 5))
        return [
            BezierCurve.cubic(start, cp1, cp2, end, i / steps)
            for i in range(steps + 1)
        ]


class HumanBehavior:
    """
    拟人化操作引擎
    逐字输入、鼠标轨迹、操作间隔完全模拟人类行为
    """

    def __init__(self, cdp_client: CDPClient):
        self.cdp = cdp_client
        self._type_min = 0.08
        self._type_max = 0.20
        self._op_min = 0.5
        self._op_max = 3.0
        self._scroll_min = 300
        self._scroll_max = 800

    def _rand(self, mn: float, mx: float) -> float:
        return random.uniform(mn, mx)

    def _randint(self, mn: int, mx: int) -> int:
        return random.randint(mn, mx)

    async def random_pause(self):
        """操作间随机暂停"""
        await asyncio.sleep(self._rand(self._op_min, self._op_max))

    async def move_mouse_bezier(self, target_x: float, target_y: float):
        """贝塞尔曲线鼠标移动"""
        js = "(function() { return { x: window.screenX || 0, y: window.screenY || 0 }; })()"
        start = (0.0, 0.0)
        try:
            pos = await self.cdp.evaluate(js, return_by_value=True)
            if pos:
                start = (float(pos.get("x") or 0), float(pos.get("y") or 0))
        except Exception:
            pass

        path = BezierCurve.generate_path(
            start, (target_x, target_y), roughness=random.uniform(0.3, 0.8)
        )

        for px, py in path:
            await self.cdp._send("Input.dispatchMouseEvent", {
                "type": "mouseMoved", "x": px, "y": py, "button": "none", "clickCount": 0,
            })
            await asyncio.sleep(self._rand(0.005, 0.02))

    async def click_bezier(self, x: float, y: float):
        """贝塞尔曲线移动 + 点击"""
        await self.move_mouse_bezier(x, y)
        await asyncio.sleep(self._rand(0.05, 0.15))
        await self.cdp.click_element(x, y)

    async def type_text_human(self, selector: str, text: str) -> bool:
        """拟人化逐字输入"""
        el = await self.cdp.get_element_by_selector(selector)
        if not el:
            print(f"[HumanBehavior] 未找到元素: {selector}")
            return False

        await self.click_bezier(el["x"], el["y"])
        await asyncio.sleep(self._rand(0.1, 0.3))

        # 全选删除
        await self.cdp._send("Input.dispatchKeyEvent", {
            "type": "keyDown", "key": "a", "code": "KeyA", "ctrlKey": True
        })
        await self.cdp._send("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "a", "code": "KeyA", "ctrlKey": True
        })
        await self.cdp._send("Input.dispatchKeyEvent", {
            "type": "keyDown", "key": "Delete", "code": "Delete"
        })
        await self.cdp._send("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "Delete", "code": "Delete"
        })
        await asyncio.sleep(self._rand(0.1, 0.2))

        for ch in text:
            code = ord(ch)
            await self.cdp._send("Input.dispatchKeyEvent", {
                "type": "keyDown", "text": ch, "key": ch, "keyCode": code
            })
            await self.cdp._send("Input.dispatchKeyEvent", {
                "type": "keyUp", "text": ch, "key": ch, "keyCode": code
            })
            await asyncio.sleep(self._rand(self._type_min, self._type_max))

        return True

    async def scroll_human(self, direction: str = "down"):
        """模拟人类阅读速度的滚动"""
        dy = self._randint(self._scroll_min, self._scroll_max)
        if direction == "up":
            dy = -dy

        steps = self._randint(3, 5)
        step_dy = dy // steps
        for _ in range(steps):
            await self.cdp.evaluate(
                f"window.scrollBy(0, {step_dy + self._randint(-50, 50)})"
            )
            await asyncio.sleep(self._rand(0.3, 0.8))

    async def click_and_type(
        self, click_selector: str, type_selector: str, text: str
    ) -> bool:
        """点击某处 → 随机暂停 → 在另一处输入"""
        t0 = time.time()
        ts = time.strftime("%Y-%m-%d %H:%M:%S")

        el = await self.cdp.get_element_by_selector(click_selector)
        if el:
            await self.click_bezier(el["x"], el["y"])
        await self.random_pause()

        ok = await self.type_text_human(type_selector, text)
        elapsed = time.time() - t0
        print(
            f"[HumanBehavior] {ts} | click+type | selector={type_selector} | "
            f"chars={len(text)} | elapsed={elapsed:.2f}s | ok={ok}"
        )
        return ok

    async def click_element_logged(self, selector: str, label: str = "") -> bool:
        """带日志的元素点击"""
        t0 = time.time()
        ts = time.strftime("%Y-%m-%d %H:%M:%S")

        el = await self.cdp.get_element_by_selector(selector)
        if not el:
            print(
                f"[HumanBehavior] {ts} | click FAILED | selector={selector} | 未找到元素"
            )
            return False

        await self.click_bezier(el["x"], el["y"])
        elapsed = time.time() - t0
        print(
            f"[HumanBehavior] {ts} | click | label={label} | "
            f"selector={selector} | elapsed={elapsed:.2f}s"
        )
        return True


if __name__ == "__main__":
    print("OK")
