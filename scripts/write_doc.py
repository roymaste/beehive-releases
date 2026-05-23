import json

blocks = []
blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "\u5931\u8d25\u9879\u5206\u6790"}}]}})
blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "\u521b\u5efa\u4ee3\u7406 \u2014 \u671f\u671bHTTP 201, \u5b9e\u9645 200 (\u72b6\u6001\u7801\u504f\u5dee, \u529f\u80fd\u6b63\u5e38)"}}]}})
blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "\u521b\u5efaprofile \u2014 \u671f\u671bHTTP 201, \u5b9e\u9645 200 (\u72b6\u6001\u7801\u504f\u5dee, \u529f\u80fd\u6b63\u5e38)"}}]}})
blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "\u521b\u5efa\u8d26\u53f7 \u2014 \u671f\u671bHTTP 201, \u5b9e\u9645 200 (\u72b6\u6001\u7801\u504f\u5dee, \u529f\u80fd\u6b63\u5e38)"}}]}})
blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "Team members \u2014 \u8def\u7531 /api/v1/team/members \u4e0d\u5b58\u5728, \u5b9e\u9645\u8def\u7531\u4e3a /api/v1/teams"}}]}})
blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "DELETE 307 \u2014 \u7f3a\u5c11\u5c3e\u968f\u659c\u6760\u5bfc\u81f4\u91cd\u5b9a\u5411, \u529f\u80fd\u6b63\u5e38"}}]}})
blocks.append({"block_type": 22, "divider": {}})
blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "\u5df2\u4fee\u590d\u95ee\u9898"}}]}})
blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": "DB \u7f3a\u5c11 tenant_api_keys.key_prefix/scopes/is_active/rate_limit/daily_quota \u5217 \u2014 \u5df2\u6dfb\u52a0"}}]}})
blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": "DB \u7f3a\u5c11 browser_profiles.group_id \u5217 \u2014 \u5df2\u6dfb\u52a0"}}]}})
blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": "DB \u7f3a\u5c11 automation_tasks.executor_id \u5217 \u2014 \u5df2\u6dfb\u52a0"}}]}})
blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": "\u670d\u52a1\u542f\u52a8\u65f6\u672a\u52a0\u8f7d .env \u73af\u5883\u53d8\u91cf \u2014 \u5df2\u4fee\u6b63"}}]}})
blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": "\u7f3a\u5c11 apscheduler \u4f9d\u8d56 (ModuleNotFoundError) \u2014 \u5df2\u5b89\u88c5"}}]}})

data = {"children": blocks, "index": -1}
with open("/tmp/doc_batch_1.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print(f"Written {len(blocks)} blocks")
