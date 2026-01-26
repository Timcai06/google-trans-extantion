/**
 * 翻译结果高亮组件，用于高亮显示已翻译的单词和词组
 * 5.2.3：迁移翻译结果高亮显示功能到组件
 */
const ContentComponent = require('../utils/ContentComponent.js');
const styleManager = require('../../utils/style-manager.js');

class TranslationHighlight extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {Function} props.onHighlightClick - 高亮元素点击事件回调
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      onHighlightClick: () => {},
      maxHighlights: 1000
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.highlightedWords = {};
    this.domObserver = null;
    this.highlightClickDebounceTimer = null;
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.registerStyle();
    this.bindEvents();
    this.createObserver();
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    // 注册高亮元素的样式
    const styles = {
      '.translated-word-highlight': {
        'position': 'relative',
        'cursor': 'pointer',
        'padding': '0 2px',
        'border-radius': '2px',
        'transition': 'all 0.2s ease',
        'background': 'var(--accent-primary-transparent)',
        'border-bottom': '1px dashed var(--accent-primary)'
      },
      
      '.translated-word-highlight:hover': {
        'background': 'var(--accent-primary)',
        'color': 'var(--text-on-primary)',
        'border-bottom': '1px solid var(--accent-primary)'
      },
      
      '.translated-word-highlight.pos-noun': {
        'background': 'rgba(76, 175, 80, 0.2)',
        'border-bottom-color': 'rgb(76, 175, 80)'
      },
      
      '.translated-word-highlight.pos-noun:hover': {
        'background': 'rgb(76, 175, 80)',
        'color': '#fff'
      },
      
      '.translated-word-highlight.pos-verb': {
        'background': 'rgba(33, 150, 243, 0.2)',
        'border-bottom-color': 'rgb(33, 150, 243)'
      },
      
      '.translated-word-highlight.pos-verb:hover': {
        'background': 'rgb(33, 150, 243)',
        'color': '#fff'
      },
      
      '.translated-word-highlight.pos-adjective': {
        'background': 'rgba(255, 152, 0, 0.2)',
        'border-bottom-color': 'rgb(255, 152, 0)'
      },
      
      '.translated-word-highlight.pos-adjective:hover': {
        'background': 'rgb(255, 152, 0)',
        'color': '#fff'
      },
      
      '.translated-word-highlight.pos-adverb': {
        'background': 'rgba(156, 39, 176, 0.2)',
        'border-bottom-color': 'rgb(156, 39, 176)'
      },
      
      '.translated-word-highlight.pos-adverb:hover': {
        'background': 'rgb(156, 39, 176)',
        'color': '#fff'
      },
      
      '.translated-word-highlight.pos-phrase': {
        'background': 'rgba(233, 30, 99, 0.2)',
        'border-bottom-color': 'rgb(233, 30, 99)'
      },
      
      '.translated-word-highlight.pos-phrase:hover': {
        'background': 'rgb(233, 30, 99)',
        'color': '#fff'
      }
    };
    
    styleManager.registerStyle('translation-highlight', styles);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 使用事件委托处理所有高亮元素的点击事件
    this.bindEvent(document, 'click', this.handleHighlightClick.bind(this));
    
    // 监听背景脚本的重高亮消息
    this.registerMessageListener((msg) => {
      if (msg && msg.type === 'REHIGHLIGHT') {
        this.rehighlight();
      }
    });
  }

  /**
   * 处理高亮元素点击事件
   * @param {Event} e - 点击事件
   */
  handleHighlightClick(e) {
    // 检查点击的是否是高亮元素
    const highlight = e.target.closest('.translated-word-highlight');
    if (highlight) {
      e.preventDefault();
      e.stopPropagation();
      
      // 防抖处理：300ms
      if (this.highlightClickDebounceTimer) {
        clearTimeout(this.highlightClickDebounceTimer);
      }
      
      this.highlightClickDebounceTimer = setTimeout(() => {
        this.props.onHighlightClick({
          element: highlight,
          word: highlight.dataset.word,
          translation: highlight.dataset.translation,
          count: parseInt(highlight.dataset.count || '1'),
          partOfSpeech: highlight.dataset.partOfSpeech,
          event: e
        });
      }, 300);
    }
  }

  /**
   * 创建DOM观察者，用于监听页面DOM变化
   */
  createObserver() {
    // 创建MutationObserver，用于监听DOM变化
    this.domObserver = new MutationObserver((mutations) => {
      // 检查是否有新增的DOM节点
      let hasAddedNodes = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          hasAddedNodes = true;
        }
      });
      
      // 如果有新增节点，进行增量高亮
      if (hasAddedNodes) {
        this.highlightTranslatedWords(this.highlightedWords, mutations.map(mutation => {
          return [...mutation.addedNodes].filter(node => node.nodeType === 1); // 只处理元素节点
        }).flat());
      }
    });
    
    // 观察整个文档的DOM变化
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false
    });
  }

  /**
   * 高亮显示已翻译的单词
   * @param {Object} words - 已翻译的单词对象，键为单词，值为翻译数据
   * @param {Array<Node>} targetRoots - 可选，指定需要处理的根节点列表。如果不传，则处理整个文档并清除旧高亮
   */
  highlightTranslatedWords(words, targetRoots = null) {
    // 保存单词数据
    this.highlightedWords = words;
    
    // 检查当前域名是否允许运行插件
    if (!this.isDomainAllowed()) {
      return;
    }
    
    // 暂时断开 Observer 连接，防止修改 DOM 触发递归
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    try {
      // 优化DOM查询：缓存document.body，避免重复查询
      const body = document.body;
      if (!body) {
        return;
      }
      
      // 如果是全量更新（没有指定 targetRoots），则移除之前的所有高亮元素
      if (!targetRoots) {
        const existingHighlights = document.querySelectorAll('.translated-word-highlight, trae-highlight');
        // 使用documentFragment批量移除，减少重排重绘
        const fragment = document.createDocumentFragment();
        existingHighlights.forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            // 将高亮元素替换为纯文本节点
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize(); // 合并相邻的文本节点
          }
        });
      }

      // 只处理单词和词组类型的翻译记录，并按使用频率排序
      let wordEntries = Object.entries(words).filter(([word, wordData]) => {
        return wordData && (wordData.type === 'word' || wordData.type === 'phrase');
      });

      // 按使用频率排序，优先高亮使用频率高的单词
      wordEntries.sort((a, b) => (b[1].count || 0) - (a[1].count || 0));

      // 限制高亮的单词数量，避免过多DOM操作
      wordEntries = wordEntries.slice(0, this.props.maxHighlights);

      // 如果没有单词需要高亮，直接返回
      if (wordEntries.length === 0) {
        return;
      }

      // 确定需要处理的根节点
      const roots = targetRoots || [document.body];

      // 对每个根节点进行高亮处理
      roots.forEach(root => {
        if (root.nodeType === 1) { // 只处理元素节点
          this.processRootNode(root, wordEntries);
        }
      });
    } catch (error) {
      console.error('高亮处理失败:', error);
    } finally {
      // 重新连接 Observer
      if (this.domObserver) {
        this.domObserver.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: false
        });
      }
    }
  }

  /**
   * 处理单个根节点，高亮其中的已翻译单词
   * @param {HTMLElement} root - 根节点
   * @param {Array} wordEntries - 已翻译单词列表
   */
  processRootNode(root, wordEntries) {
    // 获取根节点下的所有文本节点
    const textNodes = this.getTextNodes(root);
    
    // 对每个文本节点进行处理
    textNodes.forEach(textNode => {
      this.processTextNode(textNode, wordEntries);
    });
  }

  /**
   * 获取节点下的所有文本节点
   * @param {Node} node - 要遍历的节点
   * @returns {Array<Text>} - 文本节点列表
   */
  getTextNodes(node) {
    const textNodes = [];
    
    // 递归遍历节点树
    const walk = (n) => {
      if (n.nodeType === 3) { // 文本节点
        textNodes.push(n);
      } else if (n.nodeType === 1) { // 元素节点
        // 跳过不需要处理的元素
        const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'AUDIO', 'VIDEO', 'CANVAS', 'SVG'];
        if (!skipTags.includes(n.tagName) && !n.classList.contains('translated-word-highlight')) {
          for (let child of n.childNodes) {
            walk(child);
          }
        }
      }
    };
    
    walk(node);
    return textNodes;
  }

  /**
   * 处理单个文本节点，高亮其中的已翻译单词
   * @param {Text} textNode - 文本节点
   * @param {Array} wordEntries - 已翻译单词列表
   */
  processTextNode(textNode, wordEntries) {
    let text = textNode.textContent;
    if (!text.trim()) return;
    
    // 创建一个新的文档片段，用于替换原文本节点
    const fragment = document.createDocumentFragment();
    
    // 标记是否有高亮替换
    let hasReplacement = false;
    
    // 遍历所有已翻译单词，按长度降序处理（优先处理长单词/词组）
    const sortedEntries = [...wordEntries].sort((a, b) => b[0].length - a[0].length);
    
    let lastIndex = 0;
    
    for (const [word, wordData] of sortedEntries) {
      if (text.length === 0) break;
      
      // 创建正则表达式，匹配整个单词/词组，忽略大小写
      const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        
        // 创建高亮元素
        const highlightElement = this.createHighlightElement(match[0], wordData);
        fragment.appendChild(highlightElement);
        
        hasReplacement = true;
        lastIndex = regex.lastIndex;
      }
    }
    
    // 添加剩余的文本
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    // 如果有替换，替换原文本节点
    if (hasReplacement) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }

  /**
   * 创建高亮元素
   * @param {string} word - 要高亮的单词
   * @param {Object} wordData - 单词的翻译数据
   * @returns {HTMLElement} - 高亮元素
   */
  createHighlightElement(word, wordData) {
    const highlight = document.createElement('span');
    highlight.className = `translated-word-highlight pos-${this.getPartOfSpeechClass(wordData.partOfSpeech || (wordData.type === 'phrase' ? 'phrase' : 'word'))}`;
    highlight.textContent = word;
    highlight.dataset.word = word.toLowerCase();
    highlight.dataset.translation = typeof wordData.translation === 'object' ? wordData.translation.translation : wordData.translation;
    highlight.dataset.count = wordData.count || 1;
    highlight.dataset.partOfSpeech = wordData.partOfSpeech;
    
    return highlight;
  }

  /**
   * 获取词性对应的CSS类名
   * @param {string} partOfSpeech - 词性
   * @returns {string} - CSS类名
   */
  getPartOfSpeechClass(partOfSpeech) {
    const posMap = {
      'n': 'noun',
      'v': 'verb',
      'adj': 'adjective',
      'adv': 'adverb',
      'phrase': 'phrase'
    };
    
    return posMap[partOfSpeech] || 'word';
  }

  /**
   * 转义正则表达式特殊字符
   * @param {string} string - 要转义的字符串
   * @returns {string} - 转义后的字符串
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 检查当前域名是否允许运行插件
   * @returns {boolean} - 是否允许运行
   */
  isDomainAllowed() {
    // 简单实现，实际项目中应从配置获取允许的域名列表
    return true;
  }

  /**
   * 重新高亮所有已翻译单词
   */
  async rehighlight() {
    try {
      // 从存储中获取最新的单词数据
      const result = await this.getStorageData(['translatedWords']);
      const words = result.translatedWords || {};
      this.highlightTranslatedWords(words);
    } catch (error) {
      console.error('重新高亮失败:', error);
    }
  }

  /**
   * 从Chrome存储获取数据
   * @param {Array} keys - 要获取的键列表
   * @returns {Promise<Object>} - 存储的数据
   */
  getStorageData(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * 渲染组件
   * @returns {HTMLElement|null} - 组件DOM元素，此组件无可见容器DOM
   */
  render() {
    // 此组件无可见容器DOM，返回null
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清除定时器
    if (this.highlightClickDebounceTimer) {
      clearTimeout(this.highlightClickDebounceTimer);
    }
    
    // 停止DOM观察
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    // 移除所有高亮元素
    this.removeAllHighlights();
    
    super.destroy();
  }

  /**
   * 移除所有高亮元素
   */
  removeAllHighlights() {
    const existingHighlights = document.querySelectorAll('.translated-word-highlight, trae-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });
  }
}

// 导出组件
module.exports = TranslationHighlight;
