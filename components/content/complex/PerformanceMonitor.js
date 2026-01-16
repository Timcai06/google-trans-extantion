/**
 * 高亮性能监控面板
 * 用于实时显示高亮功能的性能指标
 */
const ContentComponent = require('../utils/ContentComponent.js');
const styleManager = require('../../utils/style-manager.js');

class HighlightPerformanceMonitor extends ContentComponent {
  constructor() {
    super();
    
    this.isVisible = false;
    this.updateInterval = null;
    this.metrics = {
      fps: 0,
      memoryUsage: 0,
      highlightCount: 0,
      processingTime: 0,
      cacheHitRate: 0
    };
    
    this.init();
  }

  /**
   * 初始化监控面板
   */
  init() {
    super.init();
    this.registerStyle();
    this.createMonitorPanel();
    this.startMonitoring();
    this.bindEvents();
  }

  /**
   * 注册样式
   */
  registerStyle() {
    const styles = {
      '.highlight-performance-monitor': {
        'position': 'fixed',
        'top': '10px',
        'right': '10px',
        'width': '280px',
        'background': 'rgba(0, 0, 0, 0.9)',
        'color': '#fff',
        'border-radius': '8px',
        'padding': '15px',
        'font-family': 'monospace',
        'font-size': '12px',
        'z-index': '10000',
        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'backdrop-filter': 'blur(10px)',
        'transition': 'all 0.3s ease',
        'border': '1px solid rgba(255, 255, 255, 0.1)'
      },
      
      '.highlight-performance-monitor.hidden': {
        'transform': 'translateX(320px)',
        'opacity': '0'
      },
      
      '.monitor-header': {
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '10px',
        'padding-bottom': '8px',
        'border-bottom': '1px solid rgba(255, 255, 255, 0.2)'
      },
      
      '.monitor-title': {
        'font-weight': 'bold',
        'color': '#4CAF50'
      },
      
      '.monitor-close': {
        'background': 'none',
        'border': 'none',
        'color': '#fff',
        'cursor': 'pointer',
        'font-size': '16px',
        'padding': '0',
        'width': '20px',
        'height': '20px',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'border-radius': '50%',
        'transition': 'background 0.2s'
      },
      
      '.monitor-close:hover': {
        'background': 'rgba(255, 255, 255, 0.1)'
      },
      
      '.metric-row': {
        'display': 'flex',
        'justify-content': 'space-between',
        'margin': '5px 0',
        'padding': '3px 0',
        'border-bottom': '1px solid rgba(255, 255, 255, 0.1)'
      },
      
      '.metric-label': {
        'color': 'rgba(255, 255, 255, 0.8)'
      },
      
      '.metric-value': {
        'font-weight': 'bold',
        'color': '#fff'
      },
      
      '.metric-value.good': {
        'color': '#4CAF50'
      },
      
      '.metric-value.warning': {
        'color': '#FF9800'
      },
      
      '.metric-value.danger': {
        'color': '#F44336'
      },
      
      '.monitor-toggle': {
        'position': 'fixed',
        'top': '10px',
        'right': '10px',
        'width': '40px',
        'height': '40px',
        'background': 'rgba(0, 0, 0, 0.8)',
        'border': 'none',
        'border-radius': '50%',
        'color': '#fff',
        'cursor': 'pointer',
        'z-index': '9999',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'font-size': '18px',
        'transition': 'all 0.3s ease'
      },
      
      '.monitor-toggle:hover': {
        'background': 'rgba(76, 175, 80, 0.9)',
        'transform': 'scale(1.1)'
      }
    };
    
    styleManager.registerStyle('highlight-performance-monitor', styles);
  }

  /**
   * 创建监控面板
   */
  createMonitorPanel() {
    // 创建切换按钮
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'monitor-toggle';
    this.toggleButton.innerHTML = '📊';
    this.toggleButton.title = '显示性能监控';
    
    // 创建监控面板
    this.panel = document.createElement('div');
    this.panel.className = 'highlight-performance-monitor hidden';
    this.panel.innerHTML = `
      <div class="monitor-header">
        <div class="monitor-title">高亮性能监控</div>
        <button class="monitor-close">×</button>
      </div>
      <div class="metric-row">
        <span class="metric-label">FPS:</span>
        <span class="metric-value" id="fps-value">60</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">内存使用:</span>
        <span class="metric-value" id="memory-value">0 MB</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">高亮数量:</span>
        <span class="metric-value" id="highlight-count">0</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">处理时间:</span>
        <span class="metric-value" id="processing-time">0 ms</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">缓存命中率:</span>
        <span class="metric-value" id="cache-hit-rate">0%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">性能模式:</span>
        <span class="metric-value" id="performance-mode">自动</span>
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(this.toggleButton);
    document.body.appendChild(this.panel);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 切换按钮点击事件
    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });
    
    // 关闭按钮点击事件
    this.panel.querySelector('.monitor-close').addEventListener('click', () => {
      this.hide();
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    // FPS 监控
    this.startFPSMonitoring();
    
    // 内存监控
    this.startMemoryMonitoring();
    
    // 定期更新指标
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  /**
   * FPS 监控
   */
  startFPSMonitoring() {
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        this.metrics.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * 内存监控
   */
  startMemoryMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
    }, 2000);
  }

  /**
   * 更新指标
   */
  updateMetrics() {
    // 获取高亮管理器的统计信息
    if (window.highlightManager) {
      const stats = window.highlightManager.getPerformanceStats();
      if (stats) {
        this.metrics.highlightCount = document.querySelectorAll('.translated-word-highlight').length;
        this.metrics.processingTime = stats.metrics?.processingTime || 0;
        this.metrics.cacheHitRate = stats.metrics?.cacheHits || 0;
        
        // 更新性能模式显示
        const modeElement = document.getElementById('performance-mode');
        if (modeElement) {
          const modeText = {
            'high-performance': '高性能',
            'quality': '质量优先',
            'auto': '自动'
          };
          modeElement.textContent = modeText[stats.mode] || '未知';
        }
      }
    }
    
    // 更新显示
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    const elements = {
      'fps-value': this.metrics.fps,
      'memory-value': `${this.metrics.memoryUsage} MB`,
      'highlight-count': this.metrics.highlightCount,
      'processing-time': `${this.metrics.processingTime.toFixed(2)} ms`,
      'cache-hit-rate': `${this.metrics.cacheHitRate}%`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
        
        // 根据数值设置颜色
        element.className = 'metric-value';
        if (id === 'fps-value') {
          if (value >= 55) element.classList.add('good');
          else if (value >= 30) element.classList.add('warning');
          else element.classList.add('danger');
        } else if (id === 'memory-value') {
          const memoryNum = parseInt(value);
          if (memoryNum < 50) element.classList.add('good');
          else if (memoryNum < 80) element.classList.add('warning');
          else element.classList.add('danger');
        }
      }
    });
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 显示面板
   */
  show() {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    this.toggleButton.style.display = 'none';
  }

  /**
   * 隐藏面板
   */
  hide() {
    this.isVisible = false;
    this.panel.classList.add('hidden');
    this.toggleButton.style.display = 'flex';
  }

  /**
   * 销毁监控器
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.toggleButton) {
      this.toggleButton.remove();
    }
    
    if (this.panel) {
      this.panel.remove();
    }
    
    super.destroy();
  }
}

// 创建全局实例
window.highlightPerformanceMonitor = new HighlightPerformanceMonitor();

// 导出组件
module.exports = HighlightPerformanceMonitor;
