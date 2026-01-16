/**
 * 查询频率修复测试
 */

// 测试数据
const testData = {
  text: 'hello',
  translation: '你好',
  lookupHistory: [
    Date.now() - 6 * 24 * 60 * 60 * 1000, // 6天前
    Date.now() - 5 * 24 * 60 * 60 * 1000, // 5天前
    Date.now() - 4 * 24 * 60 * 60 * 1000, // 4天前
    Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
    Date.now() - 2 * 24 * 60 * 60 * 1000, // 2天前
    Date.now() - 1 * 24 * 60 * 60 * 1000, // 1天前
    Date.now() - 12 * 60 * 60 * 1000, // 12小时前
    Date.now() - 6 * 60 * 60 * 1000, // 6小时前
  ]
};

// 复制drawer逻辑（简化测试）
const drawer = {
  getLookupHistoryData(data) {
    const history = data.lookupHistory || [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const days = 7;
    const counts = new Array(days).fill(0);
    const labels = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;

      const dayCount = history.filter(timestamp =>
        timestamp >= dayStart && timestamp < dayEnd
      ).length;

      counts[days - 1 - i] = dayCount;

      if (i === 0) {
        labels.push('今天');
      } else if (i === 1) {
        labels.push('昨天');
      } else {
        labels.push(`${i}天前`);
      }
    }

    return { counts, labels };
  },

  generateFrequencyStats(history) {
    if (history.length === 0) {
      return '暂无查询记录';
    }

    const now = Date.now();
    const firstQuery = Math.min(...history);
    const lastQuery = Math.max(...history);
    const daysSinceFirst = Math.ceil((now - firstQuery) / (24 * 60 * 60 * 1000));
    const avgDaily = daysSinceFirst > 0 ? (history.length / daysSinceFirst).toFixed(1) : history.length;

    const firstDate = new Date(firstQuery).toLocaleDateString();
    const lastDate = new Date(lastQuery).toLocaleDateString();

    return `首次查询: ${firstDate}, 最近查询: ${lastDate}, 平均每日: ${avgDaily} 次`;
  }
};

// 测试
const historyData = drawer.getLookupHistoryData(testData);
console.log('History data:', historyData);

const stats = drawer.generateFrequencyStats(testData.lookupHistory);
console.log('Frequency stats:', stats);

console.log('✅ Query frequency fix test completed');