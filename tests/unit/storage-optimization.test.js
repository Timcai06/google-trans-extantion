/**
 * 存储优化简单验证
 */

import { BatchStorageOps, ReviewQueueManager } from '../../utils/storage-optimizer.js';

console.log('Testing BatchStorageOps...');

const batchOps = new BatchStorageOps();

// 测试压缩
const testData = { key: 'value', array: [1, 2, 3] };
const compressed = batchOps.compress(testData);
const decompressed = batchOps.decompress(compressed);

if (JSON.stringify(decompressed) === JSON.stringify(testData)) {
  console.log('✅ Compress/Decompress test passed');
} else {
  console.log('❌ Compress/Decompress test failed');
}

// 测试小数据不压缩
const smallData = { key: 'value' };
const compressedSmall = batchOps.compress(smallData);
if (compressedSmall === JSON.stringify(smallData)) {
  console.log('✅ Small data compression test passed');
} else {
  console.log('❌ Small data compression test failed');
}

console.log('Testing ReviewQueueManager...');

const queue = new ReviewQueueManager();

// 测试添加和排序
queue.addToQueue({ word: 'a', nextReviewTime: 100 });
queue.addToQueue({ word: 'b', nextReviewTime: 50 });
queue.addToQueue({ word: 'c', nextReviewTime: 75 });

const next = queue.getNextReview();
if (next && next.word === 'b') {
  console.log('✅ Queue sorting test passed');
} else {
  console.log('❌ Queue sorting test failed');
}

// 测试更新复习时间
queue.clear();
queue.addToQueue({ word: 'test', nextReviewTime: 100 });
queue.updateReviewTime('test', Date.now() + 1000);

const nextAfterUpdate = queue.getNextReview();
if (!nextAfterUpdate) {
  console.log('✅ Update review time test passed');
} else {
  console.log('❌ Update review time test failed');
}

console.log('Storage optimization tests completed');