"""
rpa_cdp_client.py — CDP DOMSnapshot 元素检测
通过 Chrome DevTools Protocol 连接到 WebView，支持 Tauri WebKitGTK 和 Chromium
"""

import asyncio
import json
import websockets
from typing import Optional, List, Dict, Any


class CDPClient:
    """
    CDP 客户端，封装 WebSocket 通信协议
    支持 WebKitGTK (Tauri) 和 Chromium (--remote-debugging-port)
    """

    def __init__(
        self,
        cdp_host: str = "127.0.0.1",
        cdp_port: int = 9222,
        screenshot_dir: str = "/tmp",
    ):
        self.cdp_host = cdp_host
        self.cdp_port = cdp_port
        self.screenshot_dir = screenshot_dir
        self.ws_url: Optional[str] = None
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self._msg_id = 0
        self._pending: Dict[int, asyncio.Future] = {}
        self._browser_type: Optional[str] = None  # "webkit" or "chromium"
        self._listener_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        """连接到 CDP WebSocket 端点"""
        try:
            if self._browser_type is None:
                self._browser_type = await self._detect_browser_type()
                print(f"[CDP] 检测到浏览器类型: {self._browser_type}")

            if self._browser_type == "chromium":
                self.ws_url = f"ws://{self.cdp_host}:{self.cdp_port}/devtools/browser"
            else:
                self.ws_url = f"ws://{self.cdp_host}:{self.cdp_port}"

            self.ws = await websockets.connect(self.ws_url, ping_interval=None)
            self._listener_task = asyncio.create_task(self._async_listen())
            return True
        except Exception as e:
            print(f"[CDP] 连接失败: {e}")
            return False

    async def _detect_browser_type(self) -> str:
        """检测是 WebKit 还是 Chromium"""
        try:
            import urllib.request
            resp = urllib.request.urlopen(
                f"http://{self.cdp_host}:{self.cdp_port}/json", timeout=2
            )
            json.loads(resp.read())
            return "chromium"
        except Exception:
            pass
        return "webkit"

    async def _send(self, method: str, params: Optional[Dict] = None) -> Any:
        """发送 CDP 命令并等待响应"""
        if self.ws is None:
            raise RuntimeError("未连接到 CDP")

        self._msg_id += 1
        msg_id = self._msg_id
        future = asyncio.Future()
        self._pending[msg_id] = future

        payload = {"id": msg_id, "method": method}
        if params:
            payload["params"] = params

        await self.ws.send(json.dumps(payload))

        try:
            return await future
        finally:
            self._pending.pop(msg_id, None)

    async def _recv(self):
        """接收并分发 CDP 消息"""
        if self.ws is None:
            return
        try:
            msg = await self.ws.recv()
            data = json.loads(msg)
            if "id" in data and data["id"] in self._pending:
                fut = self._pending[data["id"]]
                if "result" in data:
                    fut.set_result(data["result"])
                elif "error" in data:
                    fut.set_exception(Exception(str(data["error"])))
        except Exception:
            pass

    async def _async_listen(self):
        """后台监听任务"""
        while self.ws and self.ws.open:
            await self._recv()

    # ─── Runtime.evaluate ────────────────────────────────────────────────

    async def evaluate(self, expr: str, return_by_value: bool = True) -> Any:
        """执行 JavaScript 表达式"""
        params = {
            "expression": expr,
            "returnByValue": return_by_value,
            "awaitPromise": False,
        }
        result = await self._send("Runtime.evaluate", params)
        if result.get("exceptionDetails"):
            raise RuntimeError(f"JS 执行错误: {result['exceptionDetails']}")
        if return_by_value:
            return result.get("result", {}).get("value")
        return result

    # ─── Page ────────────────────────────────────────────────────────────

    async def capture_screenshot(self, full_page: bool = False) -> bytes:
        """截图"""
        result = await self._send("Page.captureScreenshot", {"fullPage": full_page})
        import base64
        return base64.b64decode(result["data"])

    async def navigate(self, url: str):
        """导航到 URL"""
        await self._send("Page.navigate", {"url": url})
        await asyncio.sleep(0.5)

    # ─── DOM 元素检测 ─────────────────────────────────────────────────────

    async def get_element_by_text(self, text: str) -> Optional[Dict[str, Any]]:
        """通过文本内容查找 DOM 元素"""
        js = f"""
        (function() {{
            const el = [...document.querySelectorAll('*')].find(e =>
                e.textContent.trim() === {json.dumps(text)} ||
                e.innerText === {json.dumps(text)}
            );
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {{
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
                tagName: el.tagName.toLowerCase(),
                text: el.textContent.trim().substring(0, 100)
            }};
        }})()
        """
        return await self.evaluate(js)

    async def get_element_by_selector(self, css: str) -> Optional[Dict[str, Any]]:
        """通过 CSS 选择器查找 DOM 元素"""
        js = f"""
        (function() {{
            const el = document.querySelector({json.dumps(css)});
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {{
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
                tagName: el.tagName.toLowerCase(),
                text: el.textContent.trim().substring(0, 100)
            }};
        }})()
        """
        return await self.evaluate(js)

    async def get_elements_by_selectors(
        self, selectors: List[str]
    ) -> List[Dict[str, Any]]:
        """通过多个 CSS 选择器查找所有匹配元素"""
        js = f"""
        (function() {{
            const selectors = {json.dumps(selectors)};
            const results = [];
            selectors.forEach(css => {{
                document.querySelectorAll(css).forEach(el => {{
                    const rect = el.getBoundingClientRect();
                    results.push({{
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2,
                        width: rect.width,
                        height: rect.height,
                        tagName: el.tagName.toLowerCase(),
                        text: el.textContent.trim().substring(0, 100),
                        selector: css
                    }});
                }});
            }});
            return results;
        }})()
        """
        return await self.evaluate(js)

    # ─── Input 操作 ──────────────────────────────────────────────────────

    async def click_element(self, x: float, y: float):
        """鼠标点击指定坐标"""
        await self._send("Input.dispatchMouseEvent", {
            "type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1
        })
        await self._send("Input.dispatchMouseEvent", {
            "type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1
        })

    async def type_text(self, selector: str, text: str) -> bool:
        """在输入框输入文本（先点击聚焦，再逐字输入）"""
        el = await self.get_element_by_selector(selector)
        if not el:
            print(f"[CDP] 未找到元素: {selector}")
            return False

        x, y = el["x"], el["y"]
        await self.click_element(x, y)
        await asyncio.sleep(0.1)

        for char in text:
            code = ord(char)
            await self._send("Input.dispatchKeyEvent", {
                "type": "keyDown", "text": char, "key": char, "keyCode": code
            })
            await self._send("Input.dispatchKeyEvent", {
                "type": "keyUp", "text": char, "key": char, "keyCode": code
            })
            await asyncio.sleep(0.01)

        return True

    async def press_key(self, key: str):
        """按下键盘按键"""
        await self._send("Input.dispatchKeyEvent", {
            "type": "keyPressed",
            "key": key,
            "code": key,
            "keyCode": ord(key) if len(key) == 1 else 0
        })

    # ─── 滚动 ───────────────────────────────────────────────────────────

    async def scroll_by(self, dx: int = 0, dy: int = 500):
        """滚动页面"""
        await self.evaluate(f"window.scrollBy({dx}, {dy})")

    async def scroll_to_element(self, selector: str):
        """滚动到元素可见"""
        await self.evaluate(
            f"""
            (function() {{
                const el = document.querySelector({json.dumps(selector)});
                if (el) el.scrollIntoView({{behavior: 'smooth', block: 'center'}});
            }})()
            """
        )

    # ─── 关闭 ────────────────────────────────────────────────────────────

    async def close(self):
        """关闭连接"""
        if self._listener_task:
            self._listener_task.cancel()
            self._listener_task = None
        if self.ws:
            await self.ws.close()
            self.ws = None


class CDPClientSync:
    """同步封装，供非 async 代码使用"""

    def __init__(
        self,
        cdp_host: str = "127.0.0.1",
        cdp_port: int = 9222,
        screenshot_dir: str = "/tmp",
    ):
        self.client = CDPClient(cdp_host, cdp_port, screenshot_dir)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _ensure_loop(self):
        if self._loop is None:
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
        return self._loop

    def connect(self) -> bool:
        return self._ensure_loop().run_until_complete(self.client.connect())

    def get_element_by_text(self, text: str) -> Optional[Dict]:
        return self._ensure_loop().run_until_complete(
            self.client.get_element_by_text(text)
        )

    def get_element_by_selector(self, css: str) -> Optional[Dict]:
        return self._ensure_loop().run_until_complete(
            self.client.get_element_by_selector(css)
        )

    def click_element(self, x: float, y: float):
        return self._ensure_loop().run_until_complete(
            self.client.click_element(x, y)
        )

    def type_text(self, selector: str, text: str) -> bool:
        return self._ensure_loop().run_until_complete(
            self.client.type_text(selector, text)
        )

    def capture_screenshot(self) -> bytes:
        return self._ensure_loop().run_until_complete(
            self.client.capture_screenshot()
        )

    def close(self):
        if self._loop:
            self._ensure_loop().run_until_complete(self.client.close())
            self._loop = None


if __name__ == "__main__":
    print("OK")
