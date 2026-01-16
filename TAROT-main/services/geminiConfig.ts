// Google Gemini API 配置
// 获取 API Key: https://aistudio.google.com/app/apikey
export const GEMINI_CONFIG = {
  apiKey: 'AIzaSyCkGfCOXSYOJasaBxGRTFh-vudRDzJbPDM',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  timeout: 30000, // 30 秒
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048
};
