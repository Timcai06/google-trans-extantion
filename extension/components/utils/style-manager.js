/**
 * 样式管理器，用于管理组件的样式注入和主题切换
 * 采用单例模式，确保整个应用只有一个样式管理器实例
 */
class StyleManager {
  constructor() {
    if (StyleManager.instance) {
      return StyleManager.instance;
    }
    
    this.styles = new Map();
    this.styleSheet = null;
    this.theme = 'light'; // 默认主题为浅色主题
    this.cssVariables = new Map();
    
    this.init();
    StyleManager.instance = this;
  }

  /**
   * 初始化样式管理器
   */
  init() {
    // 创建样式表元素
    this.styleSheet = document.createElement('style');
    this.styleSheet.id = 'component-styles';
    document.head.appendChild(this.styleSheet);
    
    // 初始化主题
    this.initTheme();
    
    // 监听主题变化
    this.listenThemeChanges();
  }

  /**
   * 初始化主题
   */
  initTheme() {
    // 从localStorage获取主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.theme = savedTheme;
    } else {
      // 检测系统主题
      this.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // 设置主题类名
    document.body.className = `theme-${this.theme}`;
    
    // 初始化CSS变量
    this.initCSSVariables();
  }

  /**
   * 初始化CSS变量
   */
  initCSSVariables() {
    // 主题颜色变量
    const themeColors = {
      light: {
        '--primary-color': '#409eff',
        '--secondary-color': '#6c757d',
        '--success-color': '#28a745',
        '--danger-color': '#dc3545',
        '--warning-color': '#ffc107',
        '--info-color': '#17a2b8',
        '--light-color': '#f8f9fa',
        '--dark-color': '#343a40',
        '--text-primary': '#333',
        '--text-secondary': '#666',
        '--bg-primary': '#fff',
        '--bg-secondary': '#f5f5f5',
        '--border-color': '#e0e0e0',
        '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        '--shadow-lg': '0 10px 20px rgba(0, 0, 0, 0.15)',
        '--border-radius': '4px',
      },
      dark: {
        '--primary-color': '#409eff',
        '--secondary-color': '#6c757d',
        '--success-color': '#28a745',
        '--danger-color': '#dc3545',
        '--warning-color': '#ffc107',
        '--info-color': '#17a2b8',
        '--light-color': '#f8f9fa',
        '--dark-color': '#343a40',
        '--text-primary': '#fff',
        '--text-secondary': '#adb5bd',
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#2d2d2d',
        '--border-color': '#444',
        '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.5)',
        '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.3)',
        '--shadow-lg': '0 10px 20px rgba(0, 0, 0, 0.4)',
        '--border-radius': '4px',
      }
    };
    
    // 设置CSS变量
    const root = document.documentElement;
    const colors = themeColors[this.theme];
    
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(key, value);
      this.cssVariables.set(key, value);
    }
  }

  /**
   * 监听主题变化
   */
  listenThemeChanges() {
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
    
    // 监听自定义主题变化事件
    document.addEventListener('themeChange', (e) => {
      this.setTheme(e.detail.theme);
    });
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称，可选值为 'light' 或 'dark'
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error('Theme must be either "light" or "dark"');
    }
    
    this.theme = theme;
    localStorage.setItem('theme', theme);
    document.body.className = `theme-${theme}`;
    
    // 更新CSS变量
    this.initCSSVariables();
    
    // 触发主题变化事件
    const event = new CustomEvent('themeChanged', { detail: { theme } });
    document.dispatchEvent(event);
  }

  /**
   * 获取当前主题
   * @returns {string} - 当前主题名称
   */
  getTheme() {
    return this.theme;
  }

  /**
   * 注册组件样式
   * @param {string} componentName - 组件名称
   * @param {Object} styles - 组件样式对象
   */
  registerStyle(componentName, styles) {
    if (typeof componentName !== 'string') {
      throw new Error('Component name must be a string');
    }
    if (typeof styles !== 'object' || styles === null) {
      throw new Error('Styles must be an object');
    }
    
    // 生成CSS代码
    const css = this.generateCSS(componentName, styles);
    
    // 存储样式
    this.styles.set(componentName, css);
    
    // 更新样式表
    this.updateStyleSheet();
  }

  /**
   * 生成CSS代码
   * @param {string} componentName - 组件名称
   * @param {Object} styles - 组件样式对象
   * @returns {string} - 生成的CSS代码
   */
  generateCSS(componentName, styles) {
    let css = '';
    
    // 遍历样式对象，生成CSS规则
    for (const [selector, rules] of Object.entries(styles)) {
      // 为选择器添加组件前缀，确保样式隔离
      const fullSelector = selector.startsWith(':') || selector.startsWith('.') || selector.startsWith('#') 
        ? `.${componentName} ${selector}` 
        : `.${componentName}-${selector}`;
      
      // 生成CSS规则
      css += `${fullSelector} {\n`;
      
      for (const [property, value] of Object.entries(rules)) {
        css += `  ${property}: ${value};\n`;
      }
      
      css += `}\n\n`;
    }
    
    return css;
  }

  /**
   * 更新样式表
   */
  updateStyleSheet() {
    // 合并所有样式
    let css = '';
    for (const style of this.styles.values()) {
      css += style;
    }
    
    // 更新样式表内容
    this.styleSheet.textContent = css;
  }

  /**
   * 移除组件样式
   * @param {string} componentName - 组件名称
   */
  removeStyle(componentName) {
    this.styles.delete(componentName);
    this.updateStyleSheet();
  }

  /**
   * 清空所有样式
   */
  clearStyles() {
    this.styles.clear();
    this.updateStyleSheet();
  }

  /**
   * 获取CSS变量值
   * @param {string} variable - CSS变量名称
   * @returns {string} - CSS变量值
   */
  getCSSVariable(variable) {
    return this.cssVariables.get(variable) || '';
  }

  /**
   * 设置CSS变量
   * @param {string} variable - CSS变量名称
   * @param {string} value - CSS变量值
   */
  setCSSVariable(variable, value) {
    const root = document.documentElement;
    root.style.setProperty(variable, value);
    this.cssVariables.set(variable, value);
  }
}

// 创建单例实例
const styleManager = new StyleManager();

// 导出样式管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = styleManager;
} else if (typeof window !== 'undefined') {
  window.styleManager = styleManager;
}