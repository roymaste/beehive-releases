#!/usr/bin/env python3
"""
Twitter 自动化示例
用法: /home/joyandjoe/.venv/cloak/bin/python scripts/example.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.twitter_client import TwitterClient
from scripts.twitter_base import load_accounts

def main():
    accounts = load_accounts()

    if not accounts:
        print("没有账号配置，请先编辑 configs/accounts.json")
        return

    account = accounts[0]
    print(f"操作账号: {account['username']}")

    with TwitterClient(
        account_id=account["id"],
        username=account["username"],
        password=account["password"],
        email=account.get("email"),
        proxy=account.get("proxy")
    ) as client:
        # 发推
        client.post_tweet("Hello from BeehiveBrowser! 🦊 #test")

        # 关注用户
        # client.follow("elonmusk")

        # 点赞推文
        # client.like_tweet("elonmusk/status/123456789")

        print("操作完成!")

if __name__ == "__main__":
    main()
