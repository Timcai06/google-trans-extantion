/**
 * 存储优化阶段3测试
 */

import { indexManager } from '../../utils/storage-optimizer.js';

console.log('Testing Stage 3: IndexedDB and Offline Features...');

// 初始化
await indexManager.init();

console.log('IndexManager initialized, useIndexedDB:', indexManager.useIndexedDB);

// 测试离线翻译（模拟）
const mockOnlineTranslator = async (text) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  return { translation: `翻译: ${text}`, source: 'mock' };
};

try {
  const result1 = await indexManager.translateOfflineFirst('hello', mockOnlineTranslator);
  console.log('✅ Offline-first translation test 1 passed:', result1.source);

  // 再次翻译相同的文本，应该使用缓存
  const result2 = await indexManager.translateOfflineFirst('hello', mockOnlineTranslator);
  console.log('✅ Offline-first translation test 2 passed:', result2.source);
} catch (error) {
  console.log('❌ Offline-first translation test failed:', error);
}

// 测试缓存统计
try {
  const stats = await indexManager.getCacheStats();
  console.log('✅ Cache stats test passed:', stats);
} catch (error) {
  console.log('❌ Cache stats test failed:', error);
}

console.log('Stage 3 optimization tests completed');