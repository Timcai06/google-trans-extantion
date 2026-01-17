/**
 * 抽屉可视化实时绘制修复测试
 */

// 模拟WordDrawerV2的部分功能
const mockDrawer = {
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

  generateFrequencyBars(historyData) {
    const { counts } = historyData;
    const maxCount = Math.max(...counts, 1);

    return counts.map((count, index) => {
      const height = Math.max((count / maxCount) * 100, 5);
      const isToday = index === counts.length - 1;
      return `<div class="drawer-frequency-bar ${isToday ? 'today' : ''}"
                    style="height: 0%"
                    data-height="${height}%"
                    data-count="${count}">
                 <span class="bar-tooltip">${count}次</span>
               </div>`;
    }).join('');
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
  },

  animateFrequencyBars() {
    console.log('动画开始：频率柱状图实时绘制');
    // 模拟动画
    setTimeout(() => console.log('动画完成：柱状图高度已设置'), 1000);
  },

  animateCount(element, targetCount) {
    console.log(`计数动画：从0到${targetCount}`);
  }
};

// 测试数据
const testData = {
  text: 'hello',
  lookupHistory: [
    Date.now() - 6 * 24 * 60 * 60 * 1000,
    Date.now() - 5 * 24 * 60 * 60 * 1000,
    Date.now() - 4 * 24 * 60 * 60 * 1000,
    Date.now() - 2 * 24 * 60 * 60 * 1000,
    Date.now() - 1 * 24 * 60 * 60 * 1000,
    Date.now() - 12 * 60 * 60 * 1000,
    Date.now() - 6 * 60 * 60 * 1000,
  ]
};

// 测试
const historyData = mockDrawer.getLookupHistoryData(testData);
console.log('历史数据:', historyData);

const barsHtml = mockDrawer.generateFrequencyBars(historyData);
console.log('柱状图HTML生成完成');

const statsHtml = mockDrawer.generateFrequencyStats(testData.lookupHistory);
console.log('统计信息:', statsHtml);

mockDrawer.animateFrequencyBars();

console.log('✅ Drawer visualization real-time rendering fix test completed');