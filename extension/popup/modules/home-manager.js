/**
 * 首页功能管理器
 * 负责加载和更新首页内容，包括学习面板、统计数据等
 */

// Helper function to get icon from library
function getIconFromLibrary(name) {
  // Try to use window.iconLibrary if available
  if (window.iconLibrary && typeof window.iconLibrary.getIcon === 'function') {
    return window.iconLibrary.getIcon(name);
  }
  
  // Fallback icons if icon library not loaded
  const fallbackIcons = {
    'book': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    'target': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="9"></circle></svg>',
    'checkmark': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  };
  return fallbackIcons[name] || fallbackIcons['book'];
}

// 加载首页
async function loadHomePage() {
  await loadDataAndBuildIndex();

  // 使用索引快速统计
  const counts = {
    word: wordsIndex.word.length,
    phrase: wordsIndex.phrase.length,
    sentence: wordsIndex.sentence.length,
    starred: wordsIndex.starred.length
  };

  // 更新统计面板
  document.getElementById('totalWords').textContent = wordsIndex.all.length;
  document.getElementById('wordCount').textContent = counts.word;
  document.getElementById('phraseCount').textContent = counts.phrase;
  document.getElementById('sentenceCount').textContent = counts.sentence;
  document.getElementById('starredCount').textContent = counts.starred;

  // 初始化学习面板
  updateLearningPanel();
  
  // 更新学习统计数据
  updateLearningStats();
}

/**
 * 更新学习面板内容
 * 简化版：只显示3个按钮 + 2个状态显示
 */
async function updateLearningPanel() {
  const learningContent = document.getElementById('learningContent');

  // 如果没有单词数据，显示占位符
  if (wordsIndex.all.length === 0) {
    learningContent.innerHTML = `
      <div class="learning-placeholder">
        <div class="placeholder-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px;">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </div>
        <div class="placeholder-text">开始翻译一些单词来开始学习吧！</div>
        <div class="placeholder-actions">
          <button class="dashboard-icon-btn" id="dashboardBtn" title="学习Dashboard">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // 为Dashboard按钮添加点击事件
    document.getElementById('dashboardBtn').addEventListener('click', () => {
      showPage('dashboard');
    });
    
    return;
  }

  // 获取真实的学习数据
  let todayLearnedCount = 0;
  let challengeProgress = { completed: 0, total: 20, isCompleted: false };
  
  // 从学习历史获取今日学习数
  if (window.learningHistoryManager) {
    todayLearnedCount = await window.learningHistoryManager.getTodayLearnedCount();
    
    // 获取每日挑战进度
    const todayChallenge = await window.learningHistoryManager.getTodayChallenge();
    if (todayChallenge) {
      challengeProgress = todayChallenge;
    }
  }

  // 简化的学习面板HTML：3个按钮 + 2个状态显示
  learningContent.innerHTML = `
    <div class="learning-actions">
      <button class="learning-btn" id="startLearningBtn">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
          <path d="M12 15l-3-3a22 22 0 0 1 2-2 11.5 11.5 0 0 0-5.5 5.5l-3-3a22 22 0 0 1 2-2 11.5 11.5 0 0 0-5.5 5.5"></path>
          <path d="M12 15l6-6.5a22 22 0 0 1 2 2 11.5 11.5 0 0 0-5.5 5.5"></path>
          <path d="M12 15l3 3a22 22 0 0 1-2 2 11.5 11.5 0 0 0 5.5-5.5"></path>
        </svg>
        开始学习
      </button>
      <button class="learning-btn" id="reviewDifficultBtn">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
          <line x1="6" y1="1" x2="6" y2="4"></line>
          <line x1="10" y1="1" x2="10" y2="4"></line>
          <line x1="14" y1="1" x2="14" y2="4"></line>
        </svg>
        复习难点
      </button>
      <button class="learning-btn" id="dailyChallengeBtn">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
        每日挑战
      </button>
    </div>
    
    <div class="learning-status-display">
      <div class="status-item today-learned">
        <span class="status-icon">${getIconFromLibrary('book')}</span>
        <span class="status-text">已学习 <strong id="todayLearnedCount">${todayLearnedCount}</strong> 个单词</span>
      </div>
      <div class="status-item daily-challenge ${challengeProgress.isCompleted ? 'completed' : ''}">
        <span class="status-icon">${challengeProgress.isCompleted ? getIconFromLibrary('checkmark') : getIconFromLibrary('target')}</span>
        <span class="status-text">
          <strong id="challengeCompleted">${challengeProgress.completed}</strong>/<strong id="challengeTotal">${challengeProgress.total}</strong> 已完成
        </span>
        <div class="challenge-progress-bar">
          <div class="challenge-progress-fill" style="width: ${(challengeProgress.completed / challengeProgress.total) * 100}%"></div>
        </div>
      </div>
    </div>
  `;

  // 为学习按钮添加事件监听器
  document.getElementById('startLearningBtn').addEventListener('click', () => {
    pendingLearningFilter = 'all';
    showPage('modeSelection');
  });

  document.getElementById('reviewDifficultBtn').addEventListener('click', () => {
    pendingLearningFilter = 'difficult';
    showPage('modeSelection');
  });

  document.getElementById('dailyChallengeBtn').addEventListener('click', async () => {
    // 生成或获取今日挑战
    if (window.learningHistoryManager) {
      const result = await chrome.storage.local.get(['translatedWords', 'learningProgress']);
      const words = result.translatedWords || {};
      const progress = result.learningProgress || {};
      
      await window.learningHistoryManager.generateTodayChallenge(words, progress, 20);
    }
    
    // 每日挑战进入模式选择
    pendingLearningFilter = 'daily';
    showPage('modeSelection');
  });

  // 为header中的Dashboard按钮添加事件监听器
  const dashboardBtn = document.getElementById('dashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      showPage('dashboard');
    });
  }
}



/**
 * 获取最近学习的单词
 * @param {number} limit - 返回的单词数量限制
 * @returns {Array} 最近学习的单词数组
 */
function getRecentWords(limit) {
  // 从所有单词中按最后使用时间排序，取最新的limit个
  const allWords = Object.values(wordsData);
  return allWords
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, limit)
    .map(word => ({
      key: word.word, // 使用word.word而不是word.key
      count: word.count,
      lastUsed: word.lastUsed
    }));
}

/**
 * 显示单词详情
 * @param {string} wordKey - 单词键
 */
function showWordDetail(wordKey) {
  // 这里可以实现显示单词详情的逻辑
  // 暂时跳转到对应的单词列表页面
  const wordData = wordsData[wordKey];
  if (wordData) {
    // 根据单词类型跳转到对应页面
    let filterType = 'word'; // 默认单词
    if (wordData.key.includes(' ')) {
      if (wordData.key.split(' ').length > 3) {
        filterType = 'sentence';
      } else {
        filterType = 'phrase';
      }
    }
    showPage(filterType);
  }
}

// 将函数挂载到window对象，以便在其他文件中使用
window.loadHomePage = loadHomePage;
window.updateLearningPanel = updateLearningPanel;
window.getRecentWords = getRecentWords;
window.showWordDetail = showWordDetail;
