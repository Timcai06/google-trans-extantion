// 通义千问 API 配置
// 获取 API Key: https://dashscope.aliyun.com/
export const QWEN_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE', // 替换为你的 API Key
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  model: 'qwen-plus',
  timeout: 30000, // 30 秒
  temperature: 0.7,
  top_p: 0.9,
  maxTokens: 2048
};
