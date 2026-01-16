/**
 * 存储优化阶段2测试
 */

import { Trie } from '../../utils/trie-index.js';
import { ReviewQueueHeap } from '../../utils/heap.js';
import { indexManager } from '../../utils/storage-optimizer.js';

console.log('Testing Trie Index...');

// 测试Trie
const trie = new Trie();
trie.insert('hello', { word: 'hello', meaning: '你好' });
trie.insert('help', { word: 'help', meaning: '帮助' });
trie.insert('world', { word: 'world', meaning: '世界' });

const searchResult = trie.search('hello');
if (searchResult && searchResult.meaning === '你好') {
  console.log('✅ Trie search test passed');
} else {
  console.log('❌ Trie search test failed');
}

const prefixResults = trie.startsWith('hel');
if (prefixResults.length === 2) {
  console.log('✅ Trie prefix search test passed');
} else {
  console.log('❌ Trie prefix search test failed');
}

console.log('Testing ReviewQueueHeap...');

// 测试堆
const heap = new ReviewQueueHeap();
const now = Date.now();
heap.addReviewItem({ word: 'test1', nextReviewTime: now + 1000 });
heap.addReviewItem({ word: 'test2', nextReviewTime: now - 1000 });
heap.addReviewItem({ word: 'test3', nextReviewTime: now + 2000 });

const nextReview = heap.getNextReview();
if (nextReview && nextReview.word === 'test2') {
  console.log('✅ Heap priority test passed');
} else {
  console.log('❌ Heap priority test failed');
}

console.log('Testing IndexManager...');

// 测试IndexManager
await indexManager.init();
indexManager.buildWordIndex({
  'apple': { meaning: '苹果' },
  'application': { meaning: '应用' },
  'apply': { meaning: '应用' }
});

const indexResults = indexManager.searchWords('app');
if (indexResults.length >= 2) {
  console.log('✅ IndexManager search test passed');
} else {
  console.log('❌ IndexManager search test failed');
}

console.log('Stage 2 optimization tests completed');