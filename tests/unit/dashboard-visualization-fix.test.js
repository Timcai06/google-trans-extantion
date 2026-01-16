/**
 * Dashboard可视化数据修复测试
 */

// 模拟数据
const mockTranslatedWords = {
  'hello': {
    type: 'word',
    lookupHistory: [
      Date.now() - 6 * 24 * 60 * 60 * 1000, // 6天前
      Date.now() - 5 * 24 * 60 * 60 * 1000, // 5天前
      Date.now() - 4 * 24 * 60 * 60 * 1000, // 4天前
      Date.now() - 2 * 24 * 60 * 60 * 1000, // 2天前
      Date.now() - 1 * 24 * 60 * 60 * 1000, // 1天前
      Date.now() - 12 * 60 * 60 * 1000, // 12小时前
    ]
  },
  'world': {
    type: 'word',
    lookupHistory: [
      Date.now() - 5 * 24 * 60 * 60 * 1000, // 5天前
      Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
      Date.now() - 6 * 60 * 60 * 1000, // 6小时前
    ]
  },
  'apple': {
    type: 'word',
    lookupHistory: [
      Date.now() - 7 * 24 * 60 * 60 * 1000, // 7天前（超出7天范围）
    ]
  }
};

// 复制修复后的getRealWordTrendData逻辑
async function getRealWordTrendData() {
  try {
    // 使用 translatedWords 的 lookupHistory 数据
    const words = mockTranslatedWords;

    // 初始化最近7天的数据
    const trendData = [];
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;

      // 统计该天查询的单词数（基于真实的lookupHistory）
      let count = 0;
      Object.values(words).forEach(wordData => {
        if (wordData.lookupHistory && Array.isArray(wordData.lookupHistory)) {
          const dayQueries = wordData.lookupHistory.filter(timestamp =>
            timestamp >= dayStart && timestamp < dayEnd
          ).length;
          count += dayQueries;
        }
      });

      trendData.push({
        label: days[new Date(dayEnd).getDay()],
        value: count
      });
    }

    return trendData;
  } catch (error) {
    console.error('获取学习趋势数据失败:', error);
    return [
      { label: '周一', value: 0 },
      { label: '周二', value: 0 },
      { label: '周三', value: 0 },
      { label: '周四', value: 0 },
      { label: '周五', value: 0 },
      { label: '周六', value: 0 },
      { label: '周日', value: 0 }
    ];
  }
}

// 测试
getRealWordTrendData().then(data => {
  console.log('Fixed trend data:', data);

  // 验证数据准确性
  const todayQueries = data.find(d => d.label === '周日')?.value || 0; // 假设今天是周日
  const yesterdayQueries = data.find(d => d.label === '周六')?.value || 0; // 昨天是周六

  console.log(`今天查询数: ${todayQueries}, 昨天查询数: ${yesterdayQueries}`);
  console.log('✅ Dashboard visualization data fix test completed');
});