/**
 * 组件性能测试
 * 测试组件的渲染和更新性能
 */

// 模拟浏览器环境
const mockBrowserEnvironment = () => {
  global.performance = {
    now: () => Date.now()
  };
  
  global.document = {
    createElement: () => ({
      appendChild: () => {},
      setAttribute: () => {},
      innerText: '',
      id: '',
      parentNode: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      style: {}
    }),
    head: {
      appendChild: () => {}
    },
    body: {
      className: '',
      setAttribute: () => {},
      style: {}
    },
    documentElement: {
      style: {
        setProperty: () => {},
        removeProperty: () => {}
      }
    },
    getElementsByTagName: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({}),
    innerWidth: 1920,
    innerHeight: 1080,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    })
  };
  
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  
  global.chrome = {
    runtime: {
      onMessage: {
        addListener: () => {},
        removeListener: () => {}
      },
      sendMessage: () => {},
      lastError: null
    },
    storage: {
      local: {
        get: (keys, callback) => callback({}),
        set: (data, callback) => callback()
      }
    }
  };
};

// 设置模拟环境
mockBrowserEnvironment();

const PerformanceTestFramework = require('./performance-test-framework.js');
const BaseComponent = require('../../components/utils/BaseComponent.js');

const perfTest = new PerformanceTestFramework();

// 测试用组件类
class TestComponent extends BaseComponent {
  constructor(props = {}) {
    super(props);
    this.testState = 'initial';
  }
  
  render() {
    // 模拟渲染
    this.element = document.createElement('div');
    this.element.id = this.props.id;
    this.element.className = this.props.className;
    return this.element;
  }
  
  testMethod() {
    return 'test-value';
  }
}

console.log('=== 组件性能测试 ===\n');

// 1. 测试组件初始化性能
perfTest.runTest('组件初始化性能', () => {
  const component = new TestComponent();
});

// 2. 测试组件渲染性能
perfTest.runTest('组件渲染性能', () => {
  const component = new TestComponent();
  component.render();
});

// 3. 测试setState方法性能
perfTest.runTest('setState方法性能', () => {
  const component = new TestComponent();
  component.render();
  component.setState({ testState: 'updated' });
});

// 4. 测试事件绑定性能
perfTest.runTest('事件绑定性能', () => {
  const component = new TestComponent();
  component.render();
  const element = component.element;
  component.bindEvent(element, 'click', () => {});
});

// 5. 测试组件销毁性能
perfTest.runTest('组件销毁性能', () => {
  const component = new TestComponent();
  component.render();
  component.destroy();
});

// 6. 测试大量组件创建性能
perfTest.runTest('大量组件创建性能', () => {
  const components = [];
  for (let i = 0; i < 10; i++) {
    const component = new TestComponent();
    components.push(component);
  }
}, { iterations: 100 });

// 保存测试结果
perfTest.printResults();
perfTest.saveResults('./tests/performance/performance-test-results.json');

console.log('\n=== 性能测试完成 ===');