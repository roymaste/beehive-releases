"""
Twitter 操作模块 - 基于 BeehiveBrowser
发帖、养号、互动
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.twitter_base import (
    create_browser_context, save_state, load_state,
    log_action, wait_random, ACCOUNTS_DIR
)

TWITTER_URL = "https://twitter.com"
LOGIN_URL = "https://twitter.com/i/flow/login"

class TwitterClient:
    def __init__(self, account_id: str, username: str, password: str,
                 email: str = None, proxy: dict = None):
        self.account_id = account_id
        self.username = username
        self.password = password
        self.email = email
        self.proxy = proxy
        self.browser = None
        self.context = None
        self.page = None
        self.storage_path = ACCOUNTS_DIR / account_id / "storage_state.json"

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, *args):
        self.disconnect()

    def connect(self):
        """启动浏览器并加载或登录"""
        self.browser, self.context, self.storage_path = create_browser_context(
            self.account_id, self.proxy
        )
        self.page = self.context.new_page()

        # 尝试加载已有状态
        if self.storage_path.exists():
            load_state(self.context, self.storage_path)
            self.page.goto(TWITTER_URL, wait_until="networkidle", timeout=30000)
            if self._is_logged_in():
                log_action(self.account_id, "CONNECT", "SUCCESS", "Loaded existing session")
                return

        # 需要登录
        self._login()

    def disconnect(self):
        """保存状态并关闭"""
        if self.page and self.storage_path:
            save_state(self.context, self.storage_path)
        if self.browser:
            self.browser.close()

    def _is_logged_in(self) -> bool:
        """检查是否已登录"""
        try:
            self.page.wait_for_selector(
                '[data-testid="SideNav_YouTube_Twitter"]',
                timeout=5000
            )
            return True
        except Exception:
            return False

    def _login(self):
        """登录 Twitter"""
        log_action(self.account_id, "LOGIN", "START")
        self.page.goto(LOGIN_URL, wait_until="networkidle", timeout=30000)
        wait_random(1, 3)

        # 输入用户名/邮箱
        username_input = self.page.wait_for_selector(
            'input[autocomplete="username"]', timeout=15000
        )
        username_input.click()
        username_input.fill(self.username)
        wait_random(0.5, 1.5)
        self.page.keyboard.press("Enter")
        wait_random(1, 2)

        # 如果出现邮箱验证
        try:
            email_input = self.page.wait_for_selector(
                'input[data-testid="ocfEnterTextTextInput"]', timeout=3000
            )
            email_input.fill(self.email)
            wait_random(0.5, 1.5)
            self.page.keyboard.press("Enter")
            wait_random(1, 2)
        except Exception:
            pass

        # 输入密码
        password_input = self.page.wait_for_selector(
            'input[name="password"]', timeout=15000
        )
        password_input.fill(self.password)
        wait_random(0.5, 1.5)
        password_input.press("Enter")

        # 等待登录完成
        self.page.wait_for_url("**/home", timeout=45000)
        log_action(self.account_id, "LOGIN", "SUCCESS")
        wait_random(2, 4)

    def post_tweet(self, content: str) -> bool:
        """发推文"""
        try:
            log_action(self.account_id, "POST_TWEET", "START", content[:50])

            # 点击编写新推文
            compose_box = self.page.wait_for_selector(
                '[data-testid="tweetTextarea_0"]', timeout=10000
            )
            compose_box.click()
            wait_random(0.5, 1.5)

            # 输入内容
            compose_box.fill(content)
            wait_random(1, 2)

            # 点击发布
            tweet_button = self.page.wait_for_selector(
                '[data-testid="tweetButtonInline"]', timeout=5000
            )
            tweet_button.click()

            # 等待发布完成
            self.page.wait_for_timeout(3000)
            log_action(self.account_id, "POST_TWEET", "SUCCESS", content[:50])
            wait_random(2, 5)
            return True

        except Exception as e:
            log_action(self.account_id, "POST_TWEET", "FAIL", str(e))
            return False

    def like_tweet(self, tweet_url: str) -> bool:
        """点赞推文"""
        try:
            log_action(self.account_id, "LIKE", "START", tweet_url)
            self.page.goto(f"{TWITTER_URL}/{tweet_url}", wait_until="networkidle", timeout=30000)
            wait_random(2, 4)

            like_button = self.page.wait_for_selector(
                '[data-testid="like"]', timeout=10000
            )
            like_button.click()
            wait_random(1, 2)

            log_action(self.account_id, "LIKE", "SUCCESS", tweet_url)
            return True

        except Exception as e:
            log_action(self.account_id, "LIKE", "FAIL", str(e))
            return False

    def retweet(self, tweet_url: str) -> bool:
        """转发推文"""
        try:
            log_action(self.account_id, "RETWEET", "START", tweet_url)
            self.page.goto(f"{TWITTER_URL}/{tweet_url}", wait_until="networkidle", timeout=30000)
            wait_random(2, 4)

            retweet_button = self.page.wait_for_selector(
                '[data-testid="retweet"]', timeout=10000
            )
            retweet_button.click()
            wait_random(1, 2)

            # 确认转发
            confirm = self.page.wait_for_selector(
                '[data-testid="retweetConfirm"]', timeout=5000
            )
            confirm.click()

            log_action(self.account_id, "RETWEET", "SUCCESS", tweet_url)
            return True

        except Exception as e:
            log_action(self.account_id, "RETWEET", "FAIL", str(e))
            return False

    def follow(self, username: str) -> bool:
        """关注用户"""
        try:
            log_action(self.account_id, "FOLLOW", "START", username)
            self.page.goto(f"{TWITTER_URL}/{username}", wait_until="networkidle", timeout=30000)
            wait_random(2, 4)

            follow_button = self.page.wait_for_selector(
                '[data-testid="followButton"]', timeout=10000
            )
            follow_button.click()
            wait_random(1, 2)

            log_action(self.account_id, "FOLLOW", "SUCCESS", username)
            return True

        except Exception as e:
            log_action(self.account_id, "FOLLOW", "FAIL", str(e))
            return False

    def reply_to_tweet(self, tweet_url: str, content: str) -> bool:
        """回复推文"""
        try:
            log_action(self.account_id, "REPLY", "START", f"{tweet_url}: {content[:30]}")
            self.page.goto(f"{TWITTER_URL}/{tweet_url}", wait_until="networkidle", timeout=30000)
            wait_random(2, 4)

            # 点击回复按钮
            reply_button = self.page.wait_for_selector(
                '[data-testid="reply"]', timeout=10000
            )
            reply_button.click()
            wait_random(1, 2)

            # 输入回复内容
            reply_input = self.page.wait_for_selector(
                '[data-testid="tweetTextarea_0"]', timeout=5000
            )
            reply_input.fill(content)
            wait_random(1, 2)

            # 发送
            send_button = self.page.wait_for_selector(
                '[data-testid="tweetButton"]', timeout=5000
            )
            send_button.click()
            wait_random(2, 4)

            log_action(self.account_id, "REPLY", "SUCCESS", content[:30])
            return True

        except Exception as e:
            log_action(self.account_id, "REPLY", "FAIL", str(e))
            return False

    def send_dm(self, recipient: str, message: str) -> bool:
        """发送私信"""
        try:
            log_action(self.account_id, "SEND_DM", "START", f"To: {recipient}")
            self.page.goto(f"{TWITTER_URL}/{recipient}", wait_until="networkidle", timeout=30000)
            wait_random(2, 4)

            # 点击私信按钮
            message_button = self.page.wait_for_selector(
                '[data-testid="DMButton"]', timeout=10000
            )
            message_button.click()
            wait_random(1, 2)

            # 输入私信内容
            dm_input = self.page.wait_for_selector(
                '[data-testid="dmComposerTextInput"]', timeout=5000
            )
            dm_input.fill(message)
            wait_random(1, 2)

            # 发送
            send_dm_button = self.page.wait_for_selector(
                '[data-testid="dmComposerSend"]', timeout=5000
            )
            send_dm_button.click()
            wait_random(2, 4)

            log_action(self.account_id, "SEND_DM", "SUCCESS", f"To: {recipient}")
            return True

        except Exception as e:
            log_action(self.account_id, "SEND_DM", "FAIL", str(e))
            return False
