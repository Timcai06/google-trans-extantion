/**
 * Word Drawer Component
 * 单词抽屉组件 - 从右侧滑入的单词详细信息面板
 * 显示音标、释义、例句、同义词、反义词等详细信息
 */

/**
 * 单词抽屉组件类
 * 管理抽屉的显示、数据填充和交互
 */
class WordDrawer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.containerId - 容器元素ID
   * @param {Function} options.onClose - 关闭时的回调函数
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      containerId: 'wordDrawerContainer',
      onClose: null,
      ...options
    };

    // 当前显示的单词数据
    this.currentWord = null;

    // 组件元素引用
    this.elements = {
      overlay: null,
      drawer: null,
      closeBtn: null,
      content: null,
      actionsContainer: null
    };

    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.createDOM();
    this.bindEvents();
  }

  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建容器
    const container = document.getElementById(this.options.containerId) || document.body;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'word-drawer-overlay';
    this.elements.overlay = overlay;

    // 创建抽屉
    const drawer = document.createElement('div');
    drawer.className = 'word-drawer';
    drawer.innerHTML = `
      <!-- 抽屉头部 -->
      <div class="word-drawer-header">
        <h3 class="word-drawer-title">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          单词详情
        </h3>
        <button class="word-drawer-close-btn" aria-label="关闭">×</button>
      </div>

      <!-- 抽屉内容区域 -->
      <div class="word-drawer-content" id="wordDrawerContentArea">
        <!-- 内容将动态填充 -->
      </div>

      <!-- 操作按钮区域 -->
      <div class="word-drawer-actions" id="wordDrawerActions">
        <button class="drawer-action-btn" id="drawerCopyBtn">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          复制
        </button>
        <button class="drawer-action-btn" id="drawerStarBtn">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          收藏
        </button>
        <button class="drawer-action-btn primary" id="drawerReviewBtn">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          添加到复习
        </button>
      </div>
    `;

    this.elements.drawer = drawer;

    // 获取元素引用
    this.elements.closeBtn = drawer.querySelector('.word-drawer-close-btn');
    this.elements.content = drawer.querySelector('#wordDrawerContentArea');
    this.elements.actionsContainer = drawer.querySelector('#wordDrawerActions');

    // 添加到容器
    container.appendChild(overlay);
    container.appendChild(drawer);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 遮罩层点击关闭
    this.elements.overlay.addEventListener('click', () => {
      this.hide();
    });

    // 关闭按钮
    this.elements.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // 阻止抽屉点击事件冒泡
    this.elements.drawer.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.overlay.classList.contains('active')) {
        this.hide();
      }
    });

    // 操作按钮事件
    const copyBtn = document.getElementById('drawerCopyBtn');
    const starBtn = document.getElementById('drawerStarBtn');
    const reviewBtn = document.getElementById('drawerReviewBtn');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.handleCopy());
    }

    if (starBtn) {
      starBtn.addEventListener('click', () => this.handleStar());
    }

    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => this.handleAddToReview());
    }
  }

  /**
   * 显示抽屉
   * @param {Object} wordData - 单词数据对象
   */
  show(wordData) {
    if (!wordData) {
      console.error('WordDrawer: No word data provided');
      return;
    }

    this.currentWord = wordData;

    // 填充内容
    this.renderContent(wordData);

    // 显示遮罩和抽屉（带动画）
    requestAnimationFrame(() => {
      this.elements.overlay.classList.add('active');
      this.elements.drawer.classList.add('active');
    });

    // 禁用body滚动
    document.body.style.overflow = 'hidden';
  }

  /**
   * 隐藏抽屉
   */
  hide() {
    // 隐藏遮罩和抽屉
    this.elements.overlay.classList.remove('active');
    this.elements.drawer.classList.remove('active');

    // 恢复body滚动
    document.body.style.overflow = '';

    // 触发关闭回调
    if (this.options.onClose && typeof this.options.onClose === 'function') {
      this.options.onClose();
    }

    // 延迟清空内容
    setTimeout(() => {
      this.currentWord = null;
    }, 300);
  }

  /**
   * 渲染抽屉内容
   * @param {Object} data - 单词数据
   */
  renderContent(data) {
    // 清空现有内容
    this.elements.content.innerHTML = '';

    // 创建单词标题区域
    const header = this.createWordHeader(data);
    this.elements.content.appendChild(header);

    // 创建主要释义区域（如果有详细数据）
    if (data.detailedInfo && data.detailedInfo.definitions) {
      const definitions = this.createDefinitionsSection(data.detailedInfo.definitions);
      this.elements.content.appendChild(definitions);
    } else {
      // 如果没有详细数据，显示基本翻译
      const basicTranslation = this.createBasicTranslation(data);
      this.elements.content.appendChild(basicTranslation);
    }

    // 创建例句区域（如果有）
    if (data.detailedInfo && data.detailedInfo.examples && data.detailedInfo.examples.length > 0) {
      const examples = this.createExamplesSection(data.detailedInfo.examples);
      this.elements.content.appendChild(examples);
    }

    // 创建同义词/反义词区域（如果有）
    if (data.detailedInfo && (data.detailedInfo.synonyms || data.detailedInfo.antonyms)) {
      const synonymsAntonyms = this.createSynonymsAntonymsSection(data.detailedInfo);
      this.elements.content.appendChild(synonymsAntonyms);
    }

    // 创建同根词区域（如果有）
    if (data.detailedInfo && data.detailedInfo.roots && data.detailedInfo.roots.length > 0) {
      const roots = this.createRootsSection(data.detailedInfo.roots);
      this.elements.content.appendChild(roots);
    }

    // 创建更多信息区域
    const moreInfo = this.createMoreInfoSection(data);
    this.elements.content.appendChild(moreInfo);

    // 更新星标按钮状态
    this.updateStarButton(data.starred);
  }

  /**
   * 创建单词标题区域
   * @param {Object} data - 单词数据
   * @returns {HTMLElement} 标题元素
   */
  createWordHeader(data) {
    const header = document.createElement('div');
    header.className = 'drawer-word-header';

    const word = data.text || data.word || '未知单词';
    const phonetic = data.detailedInfo?.phonetic || data.phonetic || '';
    const mainTranslation = data.translation || '';

    header.innerHTML = `
      <h1 class="drawer-word-title">${this.escapeHtml(word)}</h1>
      ${phonetic ? `<div class="drawer-word-phonetic">${this.escapeHtml(phonetic)}</div>` : ''}
      ${mainTranslation ? `<div class="drawer-word-main-translation">${this.escapeHtml(mainTranslation)}</div>` : ''}
      <button class="drawer-pronunciation-btn" id="drawerPronunciationBtn">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        发音
      </button>
    `;

    // 绑定发音按钮事件
    setTimeout(() => {
      const pronunciationBtn = header.querySelector('#drawerPronunciationBtn');
      if (pronunciationBtn) {
        pronunciationBtn.addEventListener('click', () => this.handlePronunciation(word));
      }
    }, 0);

    return header;
  }

  /**
   * 创建基本翻译区域（当没有详细数据时）
   * @param {Object} data - 单词数据
   * @returns {HTMLElement} 翻译元素
   */
  createBasicTranslation(data) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    const translation = data.translation || '暂无翻译';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        翻译
      </h3>
      <div class="drawer-definition-text">${this.escapeHtml(translation)}</div>
    `;

    return section;
  }

  /**
   * 创建主要释义区域
   * @param {Array} definitions - 释义数组
   * @returns {HTMLElement} 释义元素
   */
  createDefinitionsSection(definitions) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        主要释义
      </h3>
      <div class="drawer-definitions"></div>
    `;

    const container = section.querySelector('.drawer-definitions');

    definitions.forEach(def => {
      const item = document.createElement('div');
      item.className = 'drawer-definition-item';
      item.innerHTML = `
        <div class="drawer-definition-pos">${this.escapeHtml(def.pos || 'n.')}</div>
        <div class="drawer-definition-content">
          <div class="drawer-definition-text">${this.escapeHtml(def.text || '')}</div>
          ${def.translation ? `<div class="drawer-definition-translation">${this.escapeHtml(def.translation)}</div>` : ''}
        </div>
      `;
      container.appendChild(item);
    });

    return section;
  }

  /**
   * 创建例句区域
   * @param {Array} examples - 例句数组
   * @returns {HTMLElement} 例句元素
   */
  createExamplesSection(examples) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        例句
      </h3>
      <div class="drawer-examples"></div>
    `;

    const container = section.querySelector('.drawer-examples');

    examples.forEach(example => {
      const item = document.createElement('div');
      item.className = 'drawer-example-item';
      item.innerHTML = `
        <div class="drawer-example-source">${this.escapeHtml(example.source || example.text || '')}</div>
        ${example.translation ? `<div class="drawer-example-translation">${this.escapeHtml(example.translation)}</div>` : ''}
      `;
      container.appendChild(item);
    });

    return section;
  }

  /**
   * 创建同义词/反义词区域
   * @param {Object} data - 包含同义词和反义词的对象
   * @returns {HTMLElement} 同义词/反义词元素
   */
  createSynonymsAntonymsSection(data) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="16 12 12 8 8 12"></polyline>
          <line x1="12" y1="16" x2="12" y2="8"></line>
        </svg>
        同义词 / 反义词
      </h3>
      <div class="drawer-synonyms-antonyms">
        <div class="drawer-synonyms">
          <h4>同义词</h4>
          <div class="drawer-word-list" id="drawerSynonymsList"></div>
        </div>
        <div class="drawer-antonyms">
          <h4>反义词</h4>
          <div class="drawer-word-list" id="drawerAntonymsList"></div>
        </div>
      </div>
    `;

    // 填充同义词
    const synonymsList = section.querySelector('#drawerSynonymsList');
    if (data.synonyms && data.synonyms.length > 0) {
      data.synonyms.forEach(word => {
        const tag = document.createElement('span');
        tag.className = 'drawer-word-tag';
        tag.textContent = word;
        tag.addEventListener('click', () => this.handleWordClick(word));
        synonymsList.appendChild(tag);
      });
    } else {
      synonymsList.innerHTML = '<div class="drawer-empty-state">暂无数据</div>';
    }

    // 填充反义词
    const antonymsList = section.querySelector('#drawerAntonymsList');
    if (data.antonyms && data.antonyms.length > 0) {
      data.antonyms.forEach(word => {
        const tag = document.createElement('span');
        tag.className = 'drawer-word-tag';
        tag.textContent = word;
        tag.addEventListener('click', () => this.handleWordClick(word));
        antonymsList.appendChild(tag);
      });
    } else {
      antonymsList.innerHTML = '<div class="drawer-empty-state">暂无数据</div>';
    }

    return section;
  }

  /**
   * 创建同根词区域
   * @param {Array} roots - 同根词数组
   * @returns {HTMLElement} 同根词元素
   */
  createRootsSection(roots) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20"></path>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        同根词
      </h3>
      <div class="drawer-roots"></div>
    `;

    const container = section.querySelector('.drawer-roots');

    roots.forEach(root => {
      const item = document.createElement('div');
      item.className = 'drawer-root-item';
      item.innerHTML = `
        <div class="drawer-root-word">${this.escapeHtml(root.word || '')}</div>
        <div class="drawer-root-definition">${this.escapeHtml(root.definition || '')}</div>
      `;
      item.addEventListener('click', () => this.handleWordClick(root.word));
      container.appendChild(item);
    });

    return section;
  }

  /**
   * 创建更多信息区域
   * @param {Object} data - 单词数据
   * @returns {HTMLElement} 更多信息元素
   */
  createMoreInfoSection(data) {
    const section = document.createElement('div');
    section.className = 'drawer-section';

    section.innerHTML = `
      <h3 class="drawer-section-title">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        更多信息
      </h3>
      <div class="drawer-info-grid"></div>
    `;

    const container = section.querySelector('.drawer-info-grid');

    // 添加使用次数
    if (data.count !== undefined) {
      const item = this.createInfoItem('使用次数', `${data.count} 次`);
      container.appendChild(item);
    }

    // 添加最近使用时间
    if (data.lastUsed) {
      const lastUsedTime = this.formatDate(data.lastUsed);
      const lastUsedItem = this.createInfoItem('最近使用', lastUsedTime);
      container.appendChild(lastUsedItem);
    }

    // 添加首次使用时间
    if (data.firstUsed) {
      const firstUsedTime = this.formatDate(data.firstUsed);
      const firstUsedItem = this.createInfoItem('首次使用', firstUsedTime);
      container.appendChild(firstUsedItem);
    }

    // 添加单词类型
    if (data.type) {
      const typeLabel = { word: '单词', phrase: '词组', sentence: '句子' }[data.type] || data.type;
      const typeItem = this.createInfoItem('类型', typeLabel);
      container.appendChild(typeItem);
    }

    return section;
  }

  /**
   * 创建信息项元素
   * @param {string} label - 标签
   * @param {string} value - 值
   * @returns {HTMLElement} 信息项元素
   */
  createInfoItem(label, value) {
    const item = document.createElement('div');
    item.className = 'drawer-info-item';
    item.innerHTML = `
      <div class="drawer-info-label">${this.escapeHtml(label)}</div>
      <div class="drawer-info-value">${this.escapeHtml(value)}</div>
    `;
    return item;
  }

  /**
   * 更新星标按钮状态
   * @param {boolean} starred - 是否已星标
   */
  updateStarButton(starred) {
    const starBtn = document.getElementById('drawerStarBtn');
    if (starBtn) {
      const svg = starBtn.querySelector('svg');
      const span = starBtn.querySelector('span');
      if (starred) {
        if (svg) svg.style.fill = 'currentColor';
        if (span) span.textContent = '已收藏';
      } else {
        if (svg) svg.style.fill = 'none';
        if (span) span.textContent = '收藏';
      }
    }
  }

  /**
   * 处理发音
   * @param {string} word - 要发音的单词
   */
  handlePronunciation(word) {
    // 使用Web Speech API进行发音
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('语音合成失败:', error);
      }
    } else {
      console.warn('当前浏览器不支持语音合成');
    }
  }

  /**
   * 处理复制
   */
  handleCopy() {
    if (!this.currentWord) return;

    const text = `${this.currentWord.text || this.currentWord.word}\n${this.currentWord.translation || ''}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
      this.showToast('复制失败');
    });
  }

  /**
   * 处理星标
   */
  handleStar() {
    if (!this.currentWord) return;

    // 触发自定义事件，让外部处理星标逻辑
    const event = new CustomEvent('wordDrawerStar', {
      detail: { word: this.currentWord }
    });
    document.dispatchEvent(event);

    // 更新UI
    this.currentWord.starred = !this.currentWord.starred;
    this.updateStarButton(this.currentWord.starred);

    const message = this.currentWord.starred ? '已添加到收藏' : '已取消收藏';
    this.showToast(message);
  }

  /**
   * 处理添加到复习
   */
  handleAddToReview() {
    if (!this.currentWord) return;

    // 触发自定义事件
    const event = new CustomEvent('wordDrawerAddToReview', {
      detail: { word: this.currentWord }
    });
    document.dispatchEvent(event);

    this.showToast('已添加到复习列表');
  }

  /**
   * 处理单词点击（用于同义词、反义词、同根词等）
   * @param {string} word - 单词文本
   */
  handleWordClick(word) {
    // 触发自定义事件，让外部处理单词查询
    const event = new CustomEvent('wordDrawerWordClick', {
      detail: { word }
    });
    document.dispatchEvent(event);
  }

  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   */
  showToast(message) {
    // 简单的toast实现
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      animation: fadeInOut 2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  /**
   * 格式化日期
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
    // 小于7天
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
    // 大于7天，显示具体日期
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * 转义HTML特殊字符
   * @param {string} str - 要转义的字符串
   * @returns {string} 转义后的字符串
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 移除DOM元素
    if (this.elements.overlay) {
      this.elements.overlay.remove();
    }
    if (this.elements.drawer) {
      this.elements.drawer.remove();
    }

    // 清除引用
    this.elements = {};
    this.currentWord = null;
  }
}

// 导出组件 - 浏览器环境直接挂载到 window
if (typeof window !== 'undefined') {
  window.WordDrawer = WordDrawer;
  console.log('WordDrawer 类已挂载到 window 对象');
}

// 兼容 CommonJS 模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordDrawer;
}

