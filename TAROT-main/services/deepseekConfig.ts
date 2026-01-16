// DeepSeek API 配置
// 获取 API Key: https://platform.deepseek.com/
export const DEEPSEEK_CONFIG = {
  apiKey: 'sk-ae04c3b4699d473d9b8946f3e746f6e7',
  baseUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  timeout: 30000, // 30 秒
  temperature: 0.7,
  top_p: 0.9,
  maxTokens: 2048
};
