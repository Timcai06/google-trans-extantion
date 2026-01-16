/**
 * 单词翻译助手 - API配置文件
 * 集中管理所有第三方API的配置信息
 * 使用全局变量格式，适用于importScripts导入
 */

// =========================
// 网易有道翻译/词典 API 配置
// =========================

// ⚠️ 警告：以下是默认的测试用 API 密钥。
// 在生产环境中，建议要求用户配置自己的密钥，或通过安全的后端代理请求，避免密钥泄露。
self.DEFAULT_YOUDAO_APP_KEY = '73a29bc0304b261d';
self.DEFAULT_YOUDAO_APP_SECRET = 'cek7XucQ5ggaDqXDCMYEVXs0FiZTHueX';

// 有道API请求URL
self.YOUDAO_API_URL = 'https://openapi.youdao.com/api';

// =========================
// AI 翻译 API 配置
// =========================

self.AI_DEFAULTS = {
  enabled: true, // 默认开启，但在没有 Key 时会自动回退
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '', // 用户需自行配置
  model: 'gpt-3.5-turbo',
  temperature: 0.3
};
