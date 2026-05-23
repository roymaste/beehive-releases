"""
rpa_twitter.py — Twitter 登录/发推逻辑
依赖 rpa_human_behavior.py，提供完整的 Twitter 操作流程
"""

import asyncio
import time
import random
from typing import Optional, List, Dict, Any, Callable

try:
    from rpa_human_behavior import HumanBehavior
except ImportError:
    from .rpa_human_behavior import HumanBehavior

try:
    from rpa_cdp_client import CDPClient
except ImportError:
    from .rpa_cdp_client import CDPClient


class TwitterRPA:
    """
    Twitter RPA 操作类
    支持多账号顺序登录、发推、错误检测
    """

    LOGIN_URL = "https://twitter.com/i/flow/login"
    HOME_URL = "https://twitter.com/home"

    SELECTORS = {
        "login_username": 'input[autocomplete="username"]',
        "login_username_alt": 'input[name="text"]',
        "next_button": 'button[type="submit"]',
        "login_password": 'input[name="password"]',
        "password_alt": 'input[autocomplete="current-password"]',
        "verification_input": 'input[autocomplete="off"]',
        "verification_code": 'input[name="verification_code"]',
        "home_tweet_box": '[data-testid="tweetTextarea_0"]',
        "tweet_button": '[data-testid="tweetButtonInline"]',
        "tweet_button_home": '[data-testid="tweetButton"]',
        "error_page": '[data-testid="error-detail"]',
        "challenge_page": '[data-testid="challenge"]',
        "captcha": ".captcha",
        "toast": '[data-testid="toast"]',
    }

    def __init__(self, cdp_client: CDPClient):
        self.cdp = cdp_client
        self.hb = HumanBehavior(cdp_client)
        self._logged_in = False
        self._last_error: Optional[str] = None

    async def _check_blocked(self) -> bool:
        """检测是否遇到验证码/异常页面"""
        for key in ["captcha", "challenge_page", "error_page"]:
            sel = self.SELECTORS.get(key)
            if sel:
                el = await self.cdp.get_element_by_selector(sel)
                if el and el.get("width", 0) > 0:
                    self._last_error = f"检测到拦截页面: {key}"
                    print(f"[TwitterRPA] ⚠️ {self._last_error}")
                    return True

        toast = await self.cdp.get_element_by_selector(self.SELECTORS["toast"])
        if toast and toast.get("width", 0) > 0:
            toast_text = toast.get("text", "")[:100]
            if any(
                kw in toast_text.lower()
                for kw in ["suspicious", "unusual", "login", "verify"]
            ):
                self._last_error = f"检测到异常 Toast: {toast_text}"
                print(f"[TwitterRPA] ⚠️ {self._last_error}")
                return True

        return False

    async def login(
        self,
        username: str,
        password: str,
        email: Optional[str] = None,
        verification_callback: Optional[Callable[[], str]] = None,
    ) -> bool:
        """Twitter 登录流程"""
        print(f"[TwitterRPA] 开始登录: {username}")
        t0 = time.time()

        await self.cdp.navigate(self.LOGIN_URL)
        await asyncio.sleep(random.uniform(2.0, 4.0))

        if await self._check_blocked():
            return False

        # Step 1: 输入用户名
        for sel in [self.SELECTORS["login_username"], self.SELECTORS["login_username_alt"]]:
            el = await self.cdp.get_element_by_selector(sel)
            if el and el.get("width", 0) > 0:
                await self.hb.type_text_human(sel, username)
                break
        else:
            self._last_error = "未找到用户名输入框"
            print(f"[TwitterRPA] ❌ {self._last_error}")
            return False

        await asyncio.sleep(random.uniform(1.0, 2.0))
        await self.hb.click_element_logged(self.SELECTORS["next_button"], "next_button")
        await asyncio.sleep(random.uniform(1.5, 3.0))

        if await self._check_blocked():
            return False

        # Step 1.5: Email 验证
        email_el = await self.cdp.get_element_by_selector(
            'input[autocomplete="email"]'
        )
        if email_el and email_el.get("width", 0) > 0:
            if email:
                await self.hb.type_text_human('input[autocomplete="email"]', email)
                await asyncio.sleep(random.uniform(1.0, 2.0))
                await self.hb.click_element_logged(
                    self.SELECTORS["next_button"], "email_next"
                )
                await asyncio.sleep(random.uniform(1.5, 3.0))
            else:
                print("[TwitterRPA] ⚠️ 需要 Email 验证但未提供 email 参数")

        if await self._check_blocked():
            return False

        # Step 2: 输入密码
        for sel in [self.SELECTORS["login_password"], self.SELECTORS["password_alt"]]:
            el = await self.cdp.get_element_by_selector(sel)
            if el and el.get("width", 0) > 0:
                await self.hb.type_text_human(sel, password)
                break
        else:
            self._last_error = "未找到密码输入框"
            print(f"[TwitterRPA] ❌ {self._last_error}")
            return False

        await asyncio.sleep(random.uniform(0.5, 1.5))
        await self.hb.click_element_logged(self.SELECTORS["next_button"], "login_submit")
        await asyncio.sleep(random.uniform(2.0, 4.0))

        if await self._check_blocked():
            return False

        # Step 3: 2FA / 验证码
        verif_el = await self.cdp.get_element_by_selector(
            self.SELECTORS["verification_input"]
        )
        if verif_el and verif_el.get("width", 0) > 0:
            if verification_callback:
                code = await asyncio.get_event_loop().run_in_executor(
                    None, verification_callback
                )
                if code:
                    await self.hb.type_text_human(
                        self.SELECTORS["verification_input"], code
                    )
                    await asyncio.sleep(random.uniform(1.0, 2.0))
                    await self.hb.click_element_logged(
                        self.SELECTORS["next_button"], "verify_submit"
                    )
                    await asyncio.sleep(random.uniform(2.0, 4.0))
                else:
                    print("[TwitterRPA] ⚠️ 未提供验证码")
            else:
                print("[TwitterRPA] ⚠️ 检测到 2FA/验证码但无回调")

        if await self._check_blocked():
            return False

        # 验证登录状态
        current_url = await self.cdp.evaluate(
            "window.location.href", return_by_value=True
        )
        self._logged_in = (
            "home" in str(current_url) or "i/flow/login" not in str(current_url)
        )

        elapsed = time.time() - t0
        if self._logged_in:
            print(f"[TwitterRPA] ✅ 登录成功 ({elapsed:.1f}s)")
        else:
            print(f"[TwitterRPA] ❌ 登录失败，当前 URL: {current_url}")
        return self._logged_in

    async def tweet(self, text: str) -> bool:
        """发推流程：点击发推按钮 → 输入内容 → 发布"""
        if not self._logged_in:
            print("[TwitterRPA] ⚠️ 未登录，先调用 login()")
            return False

        print(f"[TwitterRPA] 开始发推: {text[:30]}...")
        t0 = time.time()

        await self.cdp.navigate(self.HOME_URL)
        await asyncio.sleep(random.uniform(2.0, 4.0))

        if await self._check_blocked():
            return False

        tweet_box = None
        for sel in [self.SELECTORS["home_tweet_box"]]:
            el = await self.cdp.get_element_by_selector(sel)
            if el and el.get("width", 0) > 0:
                tweet_box = el
                break

        if not tweet_box:
            self._last_error = "未找到发推框"
            print(f"[TwitterRPA] ❌ {self._last_error}")
            return False

        await self.hb.click_bezier(tweet_box["x"], tweet_box["y"])
        await asyncio.sleep(random.uniform(0.5, 1.5))

        if await self._check_blocked():
            return False

        await self.hb.type_text_human(self.SELECTORS["home_tweet_box"], text)
        await asyncio.sleep(random.uniform(0.5, 1.5))

        tweet_btn = None
        for sel in [self.SELECTORS["tweet_button"], self.SELECTORS["tweet_button_home"]]:
            el = await self.cdp.get_element_by_selector(sel)
            if el and el.get("width", 0) > 0:
                tweet_btn = el
                break

        if not tweet_btn:
            self._last_error = "未找到发布按钮"
            print(f"[TwitterRPA] ❌ {self._last_error}")
            return False

        await self.hb.click_bezier(tweet_btn["x"], tweet_btn["y"])
        await asyncio.sleep(random.uniform(2.0, 4.0))

        if await self._check_blocked():
            return False

        elapsed = time.time() - t0
        print(f"[TwitterRPA] ✅ 发推成功 ({elapsed:.1f}s)")
        return True

    async def browse_timeline(self, scroll_count: Optional[int] = None) -> bool:
        """
        Browse the home timeline like a real human after login.

        Steps:
        1. Wait for home timeline to fully load
        2. Scroll down 3-5 times (random), with 2-4s between each scroll
        3. Optionally capture a screenshot after each scroll
        4. Log which tweet index was reached and elapsed time
        5. Add 3-5s "reading time" after browsing

        Returns True on success.
        """
        if not self._logged_in:
            print("[TwitterRPA] ⚠️ 未登录 — 跳过 browse_timeline")
            return False

        print("[TwitterRPA] 开始浏览时间线...")
        t0 = time.time()

        try:
            # 1. Wait for home timeline to load
            await asyncio.sleep(random.uniform(2.0, 3.0))
            print("[TwitterRPA] 时间线已加载，开始浏览...")

            # 2. Determine number of scrolls (3-5)
            num_scrolls = scroll_count if scroll_count else random.randint(3, 5)

            for i in range(num_scrolls):
                scroll_t0 = time.time()

                # Call scroll_human from rpa_human_behavior (simulates human scrolling)
                await self.hb.scroll_human(direction="down")

                scroll_elapsed = time.time() - scroll_t0
                total_elapsed = time.time() - t0

                print(
                    f"[TwitterRPA] 滑动 {i + 1}/{num_scrolls} — "
                    f"约第 {i + 1} 条推文 — "
                    f"本次滑动 {scroll_elapsed:.1f}s — "
                    f"累计耗时 {total_elapsed:.1f}s"
                )

                # 3. Optional screenshot after each scroll (debug only)
                try:
                    screenshot_bytes = await self.cdp.capture_screenshot()
                    ts_str = time.strftime("%Y%m%d_%H%M%S")
                    screenshot_path = f"/tmp/twitter_scroll_{i + 1}_{ts_str}.png"
                    with open(screenshot_path, "wb") as f:
                        f.write(screenshot_bytes)
                    print(f"[TwitterRPA] 📸 截图已保存: {screenshot_path}")
                except Exception as ss_err:
                    print(f"[TwitterRPA] 截图失败 (非关键): {ss_err}")

                # 4. Wait 2-4s between scrolls (reading speed simulation)
                read_delay = random.uniform(2.0, 4.0)
                print(f"[TwitterRPA] 阅读停顿 {read_delay:.1f}s...")
                await asyncio.sleep(read_delay)

            # 5. Final "reading time" before tweeting (3-5s)
            final_read = random.uniform(3.0, 5.0)
            total_elapsed = time.time() - t0
            print(
                f"[TwitterRPA] ✅ 时间线浏览完成 — "
                f"{num_scrolls} 次滑动 — "
                f"总耗时 {total_elapsed:.1f}s — "
                f"最后阅读停顿 {final_read:.1f}s"
            )
            await asyncio.sleep(final_read)

            return True

        except Exception as e:
            print(f"[TwitterRPA] ❌ browse_timeline 异常: {e}")
            return False

    @staticmethod
    async def run_accounts(
        accounts: List[Dict[str, Any]],
        tweet_text: str,
        verification_callback: Optional[Callable[[], str]] = None,
        cdp_host: str = "127.0.0.1",
        cdp_port: int = 9222,
    ) -> List[Dict[str, Any]]:
        """多账号顺序操作"""
        results = []
        for i, acc in enumerate(accounts):
            print(
                f"[TwitterRPA] ===== 账号 {i+1}/{len(accounts)}: "
                f"{acc.get('username')} ====="
            )
            cdp = CDPClient(cdp_host=cdp_host, cdp_port=cdp_port)
            try:
                connected = await cdp.connect()
                if not connected:
                    print("[TwitterRPA] ❌ CDP 连接失败")
                    results.append({
                        "username": acc.get("username"),
                        "success": False,
                        "reason": "CDP连接失败",
                    })
                    continue

                twitter = TwitterRPA(cdp)
                login_ok = await twitter.login(
                    username=acc.get("username", ""),
                    password=acc.get("password", ""),
                    email=acc.get("email"),
                    verification_callback=verification_callback,
                )
                if not login_ok:
                    results.append({
                        "username": acc.get("username"),
                        "success": False,
                        "reason": twitter._last_error,
                    })
                    continue

                # 浏览时间线（登录后、发推前）
                await twitter.browse_timeline()

                tweet_ok = await twitter.tweet(tweet_text)
                results.append({
                    "username": acc.get("username"),
                    "success": tweet_ok,
                    "reason": None if tweet_ok else twitter._last_error,
                })

            except Exception as e:
                print(f"[TwitterRPA] ❌ 异常: {e}")
                results.append({
                    "username": acc.get("username"),
                    "success": False,
                    "reason": str(e),
                })
            finally:
                await cdp.close()

            if i < len(accounts) - 1:
                gap = random.uniform(5.0, 15.0)
                print(f"[TwitterRPA] 等待 {gap:.1f}s 后切换账号...")
                await asyncio.sleep(gap)

        return results


def main():
    import argparse
    import json
    import sys
    import asyncio

    parser = argparse.ArgumentParser(description="Twitter RPA CLI")
    parser.add_argument("--action", required=True, choices=["post_tweet"],
                        help="Action to perform")
    parser.add_argument("--username", required=True, help="Twitter username")
    parser.add_argument("--password", required=True, help="Twitter password")
    parser.add_argument("--tweet", required=True, help="Tweet content")
    parser.add_argument("--email", default=None, help="Email for 2FA (optional)")
    parser.add_argument("--cdp-port", type=int, default=9222,
                        help="CDP debug port (default: 9222)")
    parser.add_argument("--cdp-host", default="127.0.0.1",
                        help="CDP debug host (default: 127.0.0.1)")
    parser.add_argument("--account-id", default=None,
                        help="Account ID for logging")

    args = parser.parse_args()

    account_label = args.account_id or args.username
    print(f"[TwitterRPA] 账号标识: {account_label}, CDP: {args.cdp_host}:{args.cdp_port}")

    if args.action == "post_tweet":
        accounts = [{"username": args.username, "password": args.password, "email": args.email}]
        try:
            results = asyncio.run(
                TwitterRPA.run_accounts(accounts, args.tweet, cdp_host=args.cdp_host, cdp_port=args.cdp_port)
            )
            result_obj = {"success": True, "results": results}
            print(json.dumps(result_obj, ensure_ascii=False))
            # Exit code: 0 if at least one succeeded
            has_success = any(r.get("success", False) for r in results)
            sys.exit(0 if has_success else 1)
        except Exception as e:
            result_obj = {"success": False, "error": str(e)}
            print(json.dumps(result_obj, ensure_ascii=False))
            sys.exit(1)
    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {args.action}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
