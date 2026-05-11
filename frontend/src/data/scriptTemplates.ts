// Script template library for RPA automations
// Each template is a pre-defined sequence of steps compatible with the action_types system.

export interface ScriptTemplateStep {
  action: string;
  params: Record<string, unknown>;
  then_steps?: ScriptTemplateStep[];
  else_steps?: ScriptTemplateStep[];
  for_each_steps?: ScriptTemplateStep[];
}

export interface ScriptTemplate {
  id: string;
  name: string;
  platform: string;
  description: string;
  steps: ScriptTemplateStep[];
}

// ── Twitter/X ─────────────────────────────────────────────────

const twitterLogin: ScriptTemplate = {
  id: 'twitter_login',
  name: 'Twitter 登录',
  platform: 'twitter',
  description: '打开 Twitter 登录页面，输入账号密码，处理验证码',
  steps: [
    { action: 'open_url', params: { url: 'https://twitter.com/i/flow/login', headless: false } },
    { action: 'wait_element', params: { selector: 'input[autocomplete="username"]', timeout: 15000 } },
    { action: 'type_text', params: { selector: 'input[autocomplete="username"]', text: '{{account_username}}', delay: 300 } },
    { action: 'click_element', params: { selector: 'button:has-text("下一步")', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[name="password"]', timeout: 8000 } },
    { action: 'type_text', params: { selector: 'input[name="password"]', text: '{{account_password}}', delay: 300 } },
    { action: 'click_element', params: { selector: 'button:has-text("登录")', timeout: 5000 } },
    {
      action: 'if_element',
      params: { selector: 'input[name="code"]', timeout: 3000 },
      then_steps: [
        { action: 'wait_element', params: { selector: 'input[name="code"]', timeout: 120000 } },
        { action: 'type_text', params: { selector: 'input[name="code"]', text: '{{verification_code}}', delay: 200 } },
        { action: 'click_element', params: { selector: 'button:has-text("验证")', timeout: 5000 } },
      ],
    },
  ],
};

const twitterTweet: ScriptTemplate = {
  id: 'twitter_tweet',
  name: 'Twitter 发推',
  platform: 'twitter',
  description: '在 Twitter 发一条文字推文，可附配图',
  steps: [
    { action: 'open_url', params: { url: 'https://twitter.com/home', headless: false } },
    { action: 'wait_element', params: { selector: '[data-testid="tweetTextarea_0"]', timeout: 15000 } },
    { action: 'click_element', params: { selector: '[data-testid="tweetTextarea_0"]', timeout: 5000 } },
    { action: 'type_text', params: { selector: '[data-testid="tweetTextarea_0"]', text: '{{tweet_content}}', delay: 100 } },
    {
      action: 'if_element',
      params: { selector: '[data-testid="fileInput"]', timeout: 2000 },
      then_steps: [
        { action: 'upload_file', params: { selector: '[data-testid="fileInput"]', file_path: '{{media_path}}' } },
      ],
    },
    { action: 'click_element', params: { selector: '[data-testid="tweetButtonInline"]', timeout: 5000 } },
    { action: 'wait_element', params: { selector: '[data-testid="tweetTextarea_0"]', timeout: 10000 } },
  ],
};

const twitterSearch: ScriptTemplate = {
  id: 'twitter_search',
  name: 'Twitter 搜索',
  platform: 'twitter',
  description: '搜索指定关键词并浏览结果',
  steps: [
    { action: 'open_url', params: { url: 'https://twitter.com/search?q={{search_keyword}}&src=typed_query', headless: false } },
    { action: 'wait_element', params: { selector: '[data-testid="tweet"]', timeout: 15000 } },
    { action: 'scroll', params: { direction: 'down', pixels: 800 } },
    { action: 'wait', params: { seconds: 2 } },
  ],
};

const twitterLikeRetweet: ScriptTemplate = {
  id: 'twitter_like_retweet',
  name: 'Twitter 点赞+转发',
  platform: 'twitter',
  description: '打开推文链接，执行点赞和转发',
  steps: [
    { action: 'open_url', params: { url: '{{tweet_url}}', headless: false } },
    { action: 'wait_element', params: { selector: '[data-testid="like"]', timeout: 15000 } },
    {
      action: 'if_element',
      params: { selector: '[data-testid="like"]', timeout: 3000 },
      then_steps: [
        { action: 'click_element', params: { selector: '[data-testid="like"]', timeout: 5000 } },
      ],
    },
    {
      action: 'if_element',
      params: { selector: '[data-testid="retweet"]', timeout: 3000 },
      then_steps: [
        { action: 'click_element', params: { selector: '[data-testid="retweet"]', timeout: 5000 } },
        {
          action: 'if_element',
          params: { selector: '[data-testid="retweetConfirm"]', timeout: 3000 },
          then_steps: [
            { action: 'click_element', params: { selector: '[data-testid="retweetConfirm"]', timeout: 5000 } },
          ],
        },
      ],
    },
  ],
};

// ── 微博 ──────────────────────────────────────────────────────

const weiboLogin: ScriptTemplate = {
  id: 'weibo_login',
  name: '微博 登录',
  platform: 'weibo',
  description: '打开微博登录页，完成账号密码登录',
  steps: [
    { action: 'open_url', params: { url: 'https://login.sina.com.cn/signup/signin.php', headless: false } },
    { action: 'wait_element', params: { selector: '#username', timeout: 15000 } },
    { action: 'type_text', params: { selector: '#username', text: '{{account_username}}', delay: 300 } },
    { action: 'type_text', params: { selector: '#password', text: '{{account_password}}', delay: 300 } },
    { action: 'click_element', params: { selector: '.btn_a.btn_big', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

const weiboPost: ScriptTemplate = {
  id: 'weibo_post',
  name: '微博 发微博',
  platform: 'weibo',
  description: '在微博发布文字内容，可附图片',
  steps: [
    { action: 'open_url', params: { url: 'https://weibo.com/u/{{uid}}/home', headless: false } },
    { action: 'wait_element', params: { selector: '.W_input', timeout: 15000 } },
    { action: 'click_element', params: { selector: '.W_input', timeout: 5000 } },
    { action: 'type_text', params: { selector: '.W_input', text: '{{weibo_content}}', delay: 100 } },
    {
      action: 'if_element',
      params: { selector: 'input[type="file"]', timeout: 2000 },
      then_steps: [
        { action: 'upload_file', params: { selector: 'input[type="file"]', file_path: '{{media_path}}' } },
      ],
    },
    { action: 'wait', params: { seconds: 2 } },
    { action: 'click_element', params: { selector: '.W_btn_a[node-type="submit"]', timeout: 5000 } },
    { action: 'wait', params: { seconds: 3 } },
  ],
};

// ── 小红书 ───────────────────────────────────────────────────

const xhsLogin: ScriptTemplate = {
  id: 'xhs_login',
  name: '小红书 登录',
  platform: 'xiaohongshu',
  description: '打开小红书登录页面，完成手机号+验证码登录',
  steps: [
    { action: 'open_url', params: { url: 'https://www.xiaohongshu.com', headless: false } },
    { action: 'wait_element', params: { selector: '.login-wrapper', timeout: 15000 } },
    { action: 'click_element', params: { selector: '.login-wrapper', timeout: 5000 } },
    { action: 'wait_element', params: { selector: '.phone-login', timeout: 8000 } },
    { action: 'click_element', params: { selector: '.phone-login', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[type="tel"]', timeout: 8000 } },
    { action: 'type_text', params: { selector: 'input[type="tel"]', text: '{{phone_number}}', delay: 300 } },
    { action: 'click_element', params: { selector: 'button:has-text("获取验证码")', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[name="code"]', timeout: 5000 } },
    { action: 'type_text', params: { selector: 'input[name="code"]', text: '{{verification_code}}', delay: 200 } },
    { action: 'click_element', params: { selector: 'button:has-text("登录")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

const xhsPost: ScriptTemplate = {
  id: 'xhs_post',
  name: '小红书 发笔记',
  platform: 'xiaohongshu',
  description: '发布图文笔记，包含标题、正文、标签',
  steps: [
    { action: 'open_url', params: { url: 'https://creator.xiaohongshu.com/publish/publish', headless: false } },
    { action: 'wait_element', params: { selector: '.editor-textarea', timeout: 15000 } },
    { action: 'click_element', params: { selector: '.editor-textarea', timeout: 5000 } },
    { action: 'type_text', params: { selector: '.editor-textarea', text: '{{note_content}}', delay: 100 } },
    {
      action: 'if_element',
      params: { selector: 'input[type="file"]', timeout: 3000 },
      then_steps: [
        { action: 'upload_file', params: { selector: 'input[type="file"]', file_path: '{{cover_image}}' } },
      ],
    },
    { action: 'wait', params: { seconds: 2 } },
    { action: 'type_text', params: { selector: 'input[placeholder*="标签"]', text: '{{hashtags}}', delay: 200 } },
    { action: 'click_element', params: { selector: 'button:has-text("发布")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

// ── 抖音/TikTok ──────────────────────────────────────────────

const douyinLogin: ScriptTemplate = {
  id: 'douyin_login',
  name: '抖音 登录',
  platform: 'douyin',
  description: '打开抖音创作平台并完成登录',
  steps: [
    { action: 'open_url', params: { url: 'https://creator.douyin.com', headless: false } },
    { action: 'wait_element', params: { selector: '.login-wrapper', timeout: 15000 } },
    { action: 'click_element', params: { selector: '.login-tab-phone', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[type="tel"]', timeout: 8000 } },
    { action: 'type_text', params: { selector: 'input[type="tel"]', text: '{{phone_number}}', delay: 300 } },
    { action: 'click_element', params: { selector: 'button:has-text("获取验证码")', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[name="code"]', timeout: 5000 } },
    { action: 'type_text', params: { selector: 'input[name="code"]', text: '{{verification_code}}', delay: 200 } },
    { action: 'click_element', params: { selector: 'button:has-text("登录")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

const douyinPost: ScriptTemplate = {
  id: 'douyin_post',
  name: '抖音 发视频',
  platform: 'douyin',
  description: '在抖音创作平台上传并发布视频',
  steps: [
    { action: 'open_url', params: { url: 'https://creator.douyin.com/creator-micro/home', headless: false } },
    { action: 'wait_element', params: { selector: '.upload-btn', timeout: 15000 } },
    { action: 'click_element', params: { selector: '.upload-btn', timeout: 5000 } },
    { action: 'wait_element', params: { selector: 'input[type="file"]', timeout: 8000 } },
    { action: 'upload_file', params: { selector: 'input[type="file"]', file_path: '{{video_path}}' } },
    { action: 'wait_element', params: { selector: '.desc-editor', timeout: 30000 } },
    { action: 'click_element', params: { selector: '.desc-editor', timeout: 5000 } },
    { action: 'type_text', params: { selector: '.desc-editor', text: '{{video_desc}}', delay: 100 } },
    { action: 'type_text', params: { selector: 'input[placeholder*="标签"]', text: '{{hashtags}}', delay: 200 } },
    { action: 'click_element', params: { selector: 'button:has-text("发布")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

// ── 网店（淘宝/拼多多）───────────────────────────────────────

const shopLogin: ScriptTemplate = {
  id: 'shop_login',
  name: '网店 商家后台登录',
  platform: 'shop',
  description: '登录淘宝或拼多多商家后台',
  steps: [
    { action: 'open_url', params: { url: '{{shop_login_url}}', headless: false } },
    { action: 'wait_element', params: { selector: '#username', timeout: 15000 } },
    { action: 'type_text', params: { selector: '#username', text: '{{shop_username}}', delay: 300 } },
    { action: 'type_text', params: { selector: '#password', text: '{{shop_password}}', delay: 300 } },
    { action: 'click_element', params: { selector: 'button:has-text("登录")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

const shopPublishProduct: ScriptTemplate = {
  id: 'shop_publish_product',
  name: '网店 上架商品',
  platform: 'shop',
  description: '在商家后台发布新商品',
  steps: [
    { action: 'open_url', params: { url: '{{shop_publish_url}}', headless: false } },
    { action: 'wait_element', params: { selector: 'input[name="title"]', timeout: 15000 } },
    { action: 'type_text', params: { selector: 'input[name="title"]', text: '{{product_title}}', delay: 200 } },
    { action: 'type_text', params: { selector: 'textarea[name="description"]', text: '{{product_desc}}', delay: 100 } },
    { action: 'type_text', params: { selector: 'input[name="price"]', text: '{{product_price}}', delay: 200 } },
    { action: 'type_text', params: { selector: 'input[name="stock"]', text: '{{product_stock}}', delay: 200 } },
    {
      action: 'if_element',
      params: { selector: 'input[type="file"][accept*="image"]', timeout: 3000 },
      then_steps: [
        { action: 'upload_file', params: { selector: 'input[type="file"][accept*="image"]', file_path: '{{product_image}}' } },
      ],
    },
    { action: 'wait', params: { seconds: 2 } },
    { action: 'click_element', params: { selector: 'button:has-text("发布商品")', timeout: 5000 } },
    { action: 'wait', params: { seconds: 5 } },
  ],
};

// ── Export ───────────────────────────────────────────────────

export const scriptTemplates: ScriptTemplate[] = [
  // Twitter/X
  twitterLogin,
  twitterTweet,
  twitterSearch,
  twitterLikeRetweet,
  // 微博
  weiboLogin,
  weiboPost,
  // 小红书
  xhsLogin,
  xhsPost,
  // 抖音/TikTok
  douyinLogin,
  douyinPost,
  // 网店
  shopLogin,
  shopPublishProduct,
];

export const scriptTemplatesByPlatform = scriptTemplates.reduce<Record<string, ScriptTemplate[]>>((acc, t) => {
  if (!acc[t.platform]) acc[t.platform] = [];
  acc[t.platform].push(t);
  return acc;
}, {});

export const platformLabels: Record<string, string> = {
  twitter: 'Twitter/X',
  weibo: '微博',
  xiaohongshu: '小红书',
  douyin: '抖音/TikTok',
  shop: '网店',
};
