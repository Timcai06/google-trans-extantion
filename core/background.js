/**
 * 单词翻译助手 - 后台服务工作进程
 *
 * 主要功能：
 * 1. 调用第三方翻译/词典API（网易有道开放平台）
 * 2. 处理扩展安装事件
 * 3. 与内容脚本(content script)进行消息通信
 * 4. 管理翻译请求和响应
 */

// 导入辅助模块
try {
  importScripts('../utils/module-manager.js', '../config/api-config.js', '../services/ai-translate-service.js', '../services/quality_service.js', '../tests/test_suite.js');
} catch (e) {
  console.error('Failed to import scripts:', e);
}

// 使用模块管理器注册和初始化模块
try {
  // 创建模块管理器实例（如果尚未创建）
  const moduleManager = self.moduleManager || new ModuleManager();
  
  // 注册模块
  moduleManager.registerModule('apiConfig', self);
  moduleManager.registerModule('aiTranslateService', self.translateWithAI ? self : null);
  moduleManager.registerModule('qualityService', self.qualityService || null);
  
  // 初始化所有模块
  moduleManager.initAll().then(result => {
    console.log('模块初始化完成:', result);
  }).catch(error => {
    console.error('模块初始化失败:', error);
  });
} catch (e) {
  console.error('模块管理初始化失败:', e);
}

// 监听扩展安装事件 - 当用户首次安装或更新扩展时触发
chrome.runtime.onInstalled.addListener(() => {
  console.log('单词翻译助手已安装');
  
  // 清理无效的 detailedInfo 数据
  cleanInvalidDetailedInfo();
});

// Service Worker 启动时也执行一次清理（处理已安装用户）
cleanInvalidDetailedInfo();

/**
 * 清理无效的 detailedInfo 数据
 * 删除 basic 为 null 或 definitions 为空的 detailedInfo
 * 这样下次打开抽屉时会重新从有道 API 获取完整数据
 */
async function cleanInvalidDetailedInfo() {
  try {
    const result = await chrome.storage.local.get(['translatedWords']);
    const words = result.translatedWords || {};
    let cleanedCount = 0;
    
    Object.keys(words).forEach(key => {
      const word = words[key];
      if (word.detailedInfo) {
        // 检查 detailedInfo 是否有效
        const info = word.detailedInfo;
        const hasValidBasic = info.basic && (info.basic.phonetic || (info.basic.explains && info.basic.explains.length > 0));
        const hasValidDefinitions = info.definitions && info.definitions.length > 0;
        
        // 如果没有有效数据，删除 detailedInfo
        if (!hasValidBasic && !hasValidDefinitions) {
          delete words[key].detailedInfo;
          cleanedCount++;
        }
      }
    });
    
    if (cleanedCount > 0) {
      await chrome.storage.local.set({ translatedWords: words });
      console.log(`已清理 ${cleanedCount} 个无效的 detailedInfo 数据`);
    } else {
      console.log('没有需要清理的无效 detailedInfo 数据');
    }
  } catch (error) {
    console.error('清理 detailedInfo 失败:', error);
  }
}

// =========================
// 网易有道翻译/词典 API 集成模块
// =========================

// 获取用户配置的API密钥
async function getYoudaoCredentials() {
  try {
    const result = await chrome.storage.local.get(['userSettings']);
    const settings = result.userSettings || {};
    
    // 优先使用用户配置的API密钥
    const appKey = settings.apiKey || self.DEFAULT_YOUDAO_APP_KEY;
    const appSecret = settings.apiSecret || self.DEFAULT_YOUDAO_APP_SECRET;
    
    return { appKey, appSecret };
  } catch (error) {
    console.error('获取API配置失败:', error);
    // 回退到默认密钥
    return { 
      appKey: self.DEFAULT_YOUDAO_APP_KEY, 
      appSecret: self.DEFAULT_YOUDAO_APP_SECRET 
    };
  }
}

/**
 * 生成有道API签名所需的截断函数
 * 根据有道官方文档算法，对查询文本进行长度处理
 *
 * @param {string} q - 要翻译的文本
 * @returns {string} 处理后的文本
 */
function truncate(q) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

/**
 * 计算SHA-256哈希值并返回十六进制字符串
 * 用于有道API的v3签名算法
 *
 * @param {string} message - 要哈希的消息
 * @returns {Promise<string>} SHA-256哈希值的十六进制表示
 */
async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 调用网易有道开放平台进行文本翻译
 * 支持自动语言检测和中英文互译
 *
 * @param {string} text - 要翻译的文本内容
 * @returns {Promise<Object>} 翻译结果对象，包含译文、词典信息等
 * @throws {Error} 当API配置错误或翻译失败时抛出异常
 */
async function translateWithYoudao(text) {
  // 获取用户配置的API密钥
  const credentials = await getYoudaoCredentials();
  
  // 检查API密钥是否正确配置（允许使用默认密钥进行试用）
  if (!credentials.appKey || !credentials.appSecret) {
    throw new Error('Youdao appKey/appSecret 未配置，请在扩展设置中配置您的API密钥');
  }

  // API请求基础配置
  const url = self.YOUDAO_API_URL;
  const q = text;                    // 查询文本
  const from = 'auto';               // 源语言自动检测
  const to = 'zh-CHS';               // 目标语言：简体中文
  const salt = Date.now().toString(); // 随机盐值，防止重放攻击
  const curtime = Math.floor(Date.now() / 1000).toString(); // 当前时间戳

  // 生成API签名字符串
  const signStr = credentials.appKey + truncate(q) + salt + curtime + credentials.appSecret;
  const sign = await sha256Hex(signStr); // 计算SHA-256签名

  // 构建请求参数
  const params = new URLSearchParams({
    q,                    // 查询文本
    from,                 // 源语言
    to,                   // 目标语言
    appKey: credentials.appKey, // 应用密钥
    salt,                 // 盐值
    sign,                 // 签名
    signType: 'v3',       // 签名类型
    curtime               // 时间戳
  });

  // 发送HTTP POST请求到有道API
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  // 解析JSON响应
  const data = await resp.json();

  // 检查API响应是否成功
  if (data.errorCode !== '0') {
    console.error('Youdao API error:', data);
    throw new Error('Youdao error: ' + data.errorCode);
  }

  // 提取翻译结果
  const translation = Array.isArray(data.translation) ? data.translation[0] : ''; // 主译文
  const basic = data.basic || null; // 词典信息（单词音标、词性等）

  // 返回结构化的翻译结果
  return {
    translation,    // 翻译文本
    basic,         // 词典详细信息
    raw: data      // 原始API响应数据
  };
}

// =========================
// AI 大模型翻译集成模块
// =========================


/**
 * 智能翻译聚合函数
 * 优先尝试 AI 翻译，失败则回退到有道
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文
 * @param {boolean} skipAI - 是否跳过AI翻译（仅使用普通翻译API）
 */
async function smartTranslate(text, context, skipAI = false) {
  const startTime = Date.now();
  
  // 1. 尝试 AI 翻译 (如果不跳过)
  if (!skipAI) {
    try {
      const aiResult = await self.translateWithAI(text, context);
      const latency = Date.now() - startTime;
      
      // 记录成功 metrics
      if (typeof recordTranslation === 'function') {
        recordTranslation('ai', true, latency);
      }
      
      return {
        translation: aiResult.translation,
        basic: null, // AI 暂不返回词典信息，可后续通过 Prompt 优化
        source: 'ai',
        raw: aiResult
      };
    } catch (aiError) {
      console.log('AI translation skipped/failed, falling back to Youdao:', aiError.message);
    }
  }
    
  // 2. 回退到有道翻译
  try {
    const youdaoResult = await translateWithYoudao(text);
    const latency = Date.now() - startTime;
    
    // 记录 fallback metrics
    if (typeof recordTranslation === 'function') {
      recordTranslation('youdao', true, latency);
    }
    
    // 增强返回数据：从 raw 中提取更多信息
    const result = {
      translation: youdaoResult.translation,
      basic: youdaoResult.basic || (youdaoResult.raw ? youdaoResult.raw.basic : null),
      source: 'youdao',
      raw: youdaoResult.raw
    };
    
    // 如果有 raw 数据，提取额外信息
    if (youdaoResult.raw) {
      // 提取音标
      if (youdaoResult.raw.basic) {
        result.phonetic = youdaoResult.raw.basic.phonetic || 
                         youdaoResult.raw.basic['uk-phonetic'] || 
                         youdaoResult.raw.basic['us-phonetic'] || '';
        result.partOfSpeech = youdaoResult.raw.basic.explains && youdaoResult.raw.basic.explains[0] 
          ? youdaoResult.raw.basic.explains[0].split('.')[0] + '.' 
          : '';
      }
      
      // 提取释义
      if (youdaoResult.raw.basic && youdaoResult.raw.basic.explains) {
        result.definitions = youdaoResult.raw.basic.explains.map(explain => ({
          text: explain,
          translation: explain
        }));
      }
      
      // 提取例句
      if (youdaoResult.raw.web) {
        result.examples = youdaoResult.raw.web.slice(0, 3).map(item => ({
          source: item.key,
          target: Array.isArray(item.value) ? item.value.join('；') : item.value
        }));
      }
      
      // 提取网络释义
      result.web = youdaoResult.raw.web || null;
    }
    
    // 调试日志
    console.log('smartTranslate 返回数据:', {
      hasBasic: !!result.basic,
      basicKeys: result.basic ? Object.keys(result.basic) : [],
      hasDefinitions: !!result.definitions,
      definitionsCount: result.definitions ? result.definitions.length : 0,
      hasExamples: !!result.examples,
      examplesCount: result.examples ? result.examples.length : 0
    });
    
    return result;
  } catch (finalError) {
    const latency = Date.now() - startTime;
    // 记录失败
    if (typeof recordTranslation === 'function') {
      recordTranslation('all', false, latency);
    }
    throw finalError;
  }
}


/**
 * Ollama API 调用函数
 */
async function fetchOllama(data) {
  const OLLAMA_CONFIG = {
    baseUrl: 'http://127.0.0.1:11434',
    timeout: 60000,
  };

  try {
    console.log('🔮 Connecting to Ollama:', OLLAMA_CONFIG.baseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

    const requestData = {
      ...data,
      stream: false
    };

    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama error response:', errorText);
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Ollama response received');
    return result.response || null;
  } catch (error) {
    console.error('❌ Ollama fetch error:', error);
    throw new Error(error.message || 'Ollama request failed');
  }
}

/**
 * 消息监听器 - 处理来自内容脚本的翻译请求
 * 使用Chrome扩展消息传递API进行跨脚本通信
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 运行测试套件
  if (msg && msg.type === 'RUN_TESTS') {
    if (typeof runTestSuite === 'function') {
      runTestSuite(msg.iterations || 10)
        .then(report => sendResponse({ ok: true, report }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
    } else {
      sendResponse({ ok: false, error: 'Test suite not loaded' });
    }
    return true;
  }

  // 获取质量报告
  if (msg && msg.type === 'GET_QUALITY_REPORT') {
    if (typeof getQualityReport === 'function') {
      sendResponse({ ok: true, report: getQualityReport() });
    } else {
      sendResponse({ ok: false, error: 'Quality service not loaded' });
    }
    return false;
  }

  // 智能翻译请求
  if (msg && msg.type === 'SMART_TRANSLATE' && msg.text) {
    smartTranslate(msg.text, msg.context, msg.skipAI)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => {
        console.error('Smart translate failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // AI 分析请求
  if (msg && msg.type === 'AI_ANALYZE' && msg.text) {
    self.aiAnalyze(msg.text, msg.context)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => {
        console.error('AI analyze failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // Ollama 生成请求
  if (msg && msg.action === 'ollama-generate' && msg.data) {
    fetchOllama(msg.data)
      .then(result => sendResponse({ response: result }))
      .catch(err => {
        console.error('Ollama generate failed:', err);
        sendResponse({ error: err.message });
      });
    return true;
  }


  // 检查消息类型是否为翻译请求 (Legacy Support)
  if (msg && msg.type === 'YOUDAO_TRANSLATE' && msg.text) {
    // 异步调用翻译函数
    translateWithYoudao(msg.text)
      .then(result => {
        // 翻译成功，返回结果
        sendResponse({ ok: true, result });
      })
      .catch(err => {
        // 翻译失败，记录错误并返回错误信息
        console.error('Youdao translate failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    // 返回true表示将异步发送响应
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'REHIGHLIGHT' }).catch(() => {});
  }
});

// 监听导航提交事件（用于常规页面加载和 iframe 加载）
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details && typeof details.tabId === 'number') {
    // 定向发送消息给特定的 frame，避免触发整个页面的所有 frame 重绘
    const options = typeof details.frameId === 'number' ? { frameId: details.frameId } : {};
    
    chrome.tabs.sendMessage(details.tabId, { type: 'REHIGHLIGHT' }, options).catch(() => {
      // 忽略因标签页关闭或内容脚本尚未准备好而导致的错误
    });
  }
});

// 监听 History API 更新（用于 SPA 单页应用）
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details && typeof details.tabId === 'number') {
    // 定向发送消息给特定的 frame
    const options = typeof details.frameId === 'number' ? { frameId: details.frameId } : {};
    
    chrome.tabs.sendMessage(details.tabId, { type: 'REHIGHLIGHT' }, options).catch(() => {});
  }
});
