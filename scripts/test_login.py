"""
蜂巢实测：用 BeehiveBrowser 登录 Twitter
环境对齐：IP 美国 + 时区美东 + 英文 locale
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from beehivebrowser import launch, ProxySettings

async def test_login():
    # account_3 配置
    proxy = {
        "server": "direct.miyaip.online",
        "port": 8001,
        "protocol": "http",
        "username": "dqsxwedrcs",
        "password": "ortmitymotymuw"
    }
    username = "1gay1331"

    print(f"🚀 启动 BeehiveBrowser (proxy={proxy['username']}@...)")

    # 代理设置
    proxy_settings = ProxySettings(
        server=f"{proxy['protocol']}://{proxy['server']}:{proxy['port']}",
        username=proxy['username'],
        password=proxy['password'],
    )

    # 启动浏览器
    browser = await launch(
        headless=False,  # 可视化，好看结果
        proxy=proxy_settings,
    )

    # 创建上下文——环境对齐美国
    context = await browser.new_context(
        locale="en-US",
        timezone_id="America/New_York",
        viewport={"width": 1280, "height": 720},
        geolocation={"latitude": 40.7128, "longitude": -74.0060},
        permissions=["geolocation"],
    )

    page = await context.new_page()

    # 1. 先访问 Twitter 首页看看能不能打开
    print("🌐 访问 twitter.com...")
    try:
        await page.goto("https://twitter.com", timeout=30000, wait_until="networkidle")
        print(f"✅ 页面加载成功! title={await page.title()}")
        # 截图
        await page.screenshot(path="/tmp/twitter_home.png")
        print("📸 截图: /tmp/twitter_home.png")
    except Exception as e:
        print(f"❌ 页面加载失败: {e}")
        await page.screenshot(path="/tmp/twitter_error.png")
        print("📸 错误截图: /tmp/twitter_error.png")
        await browser.close()
        return

    # 2. 访问登录页
    print("🔐 打开登录页...")
    try:
        await page.goto("https://twitter.com/i/flow/login", timeout=30000, wait_until="networkidle")
        await asyncio.sleep(3)
        await page.screenshot(path="/tmp/twitter_login_page.png")
        print("📸 登录页截图: /tmp/twitter_login_page.png")

        # 看页面上有什么
        html = await page.content()
        if "flow" in html or "login" in html.lower():
            print("✅ 登录页面加载正常")
        else:
            print("⚠️ 页面内容异常:")
            # 打印前500字符
            print(html[:500])
    except Exception as e:
        print(f"❌ 登录页加载失败: {e}")
        await page.screenshot(path="/tmp/twitter_login_error.png")
        await browser.close()
        return

    # 3. 尝试输入用户名
    print("⌨️ 输入用户名...")
    try:
        # Twitter 登录流程可能有变化，尝试多种选择器
        selectors = [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]',
        ]
        input_found = False
        for sel in selectors:
            el = await page.query_selector(sel)
            if el:
                await el.fill(username)
                input_found = True
                print(f"  找到输入框: {sel}")
                break

        if not input_found:
            print("❌ 找不到用户名输入框")
            await page.screenshot(path="/tmp/twitter_no_input.png")
            await browser.close()
            return

        # 点击下一步
        next_btn = await page.query_selector('[role="button"]')
        if next_btn:
            await next_btn.click()
            await asyncio.sleep(2)

        await page.screenshot(path="/tmp/twitter_after_username.png")
        print("📸 输入用户名后截图: /tmp/twitter_after_username.png")
    except Exception as e:
        print(f"❌ 输入用户出错: {e}")
        await browser.close()
        return

    print("\n✅ 测试完成!")
    input("按 Enter 关闭浏览器...")
    await browser.close()

if __name__ == "__main__":
    asyncio.run(test_login())
