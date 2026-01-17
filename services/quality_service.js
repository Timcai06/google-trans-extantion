/**
 * 翻译质量评估模块
 * 负责收集和记录翻译请求的性能指标
 */

const QUALITY_METRICS = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  aiUsed: 0,
  fallbackUsed: 0,
  avgLatency: 0,
  latencyHistory: []
};

// 保存统计信息到本地存储
async function saveMetrics() {
  await chrome.storage.local.set({ qualityMetrics: QUALITY_METRICS });
}

// 加载统计信息
async function loadMetrics() {
  const result = await chrome.storage.local.get(['qualityMetrics']);
  if (result.qualityMetrics) {
    Object.assign(QUALITY_METRICS, result.qualityMetrics);
  }
}

// 记录一次翻译请求
function recordTranslation(source, success, latency) {
  QUALITY_METRICS.totalRequests++;
  if (success) {
    QUALITY_METRICS.successfulRequests++;
  } else {
    QUALITY_METRICS.failedRequests++;
  }

  if (source === 'ai') {
    QUALITY_METRICS.aiUsed++;
  } else if (source === 'youdao') {
    QUALITY_METRICS.fallbackUsed++;
  }

  // 更新平均延迟 (简单移动平均)
  const n = QUALITY_METRICS.successfulRequests;
  if (n > 0) {
    QUALITY_METRICS.avgLatency = ((QUALITY_METRICS.avgLatency * (n - 1)) + latency) / n;
  }
  
  // 保留最近 100 次延迟记录
  if (latency > 0) {
    QUALITY_METRICS.latencyHistory.push(latency);
    if (QUALITY_METRICS.latencyHistory.length > 100) {
      QUALITY_METRICS.latencyHistory.shift();
    }
  }

  saveMetrics();
}

// 获取质量报告
function getQualityReport() {
  return {
    ...QUALITY_METRICS,
    successRate: QUALITY_METRICS.totalRequests ? (QUALITY_METRICS.successfulRequests / QUALITY_METRICS.totalRequests * 100).toFixed(2) + '%' : '0%',
    aiUtilization: QUALITY_METRICS.totalRequests ? (QUALITY_METRICS.aiUsed / QUALITY_METRICS.totalRequests * 100).toFixed(2) + '%' : '0%'
  };
}

// 初始化加载
loadMetrics().catch(console.error);
