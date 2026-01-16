// Groq API 配置
// 获取 API Key: https://console.groq.com/
export const GROQ_CONFIG = {
  apiKey: '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',
  baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.1-8b-instant',
  timeout: 30000, // 30 秒
  temperature: 0.7,
  top_p: 0.9,
  maxTokens: 2048
};
