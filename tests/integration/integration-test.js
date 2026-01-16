/**
 * 集成测试文件
 * 测试组件间的交互和组件与现有代码的集成
 */

const TestFramework = require('../unit/test-framework.js');

const testFramework = new TestFramework();
const suite = testFramework.suite('集成测试');

// 模拟Chrome API环境
function mockChromeAPI() {
  global.chrome = {
    runtime: {
      onMessage: {
        listeners: [],
        addListener: function(callback) {
          this.listeners.push(callback);
        },
        removeListener: function(callback) {
          this.listeners = this.listeners.filter(l => l !== callback);
        }
      },
      sendMessage: function(tabId, message, options, callback) {
        // 模拟消息发送
        setTimeout(() => {
          // 确保lastError为null，表示操作成功
          chrome.runtime.lastError = null;
          if (callback) callback({ ok: true, result: { translation: '测试响应' } });
        }, 100);
      },
      // 添加lastError模拟，初始为null
      lastError: null
    },
    storage: {
      local: {
        get: function(keys, callback) {
          setTimeout(() => {
            // 确保lastError为null，表示操作成功
            chrome.runtime.lastError = null;
            callback({ userSettings: { apiKey: 'test-key', apiSecret: 'test-secret' } });
          }, 50);
        },
        set: function(data, callback) {
          setTimeout(() => {
            // 确保lastError为null，表示操作成功
            chrome.runtime.lastError = null;
            if (callback) callback();
          }, 50);
        }
      }
    },
    tabs: {
      onUpdated: {
        listeners: [],
        addListener: function(callback) {
          this.listeners.push(callback);
        }
      },
      sendMessage: function(tabId, message, options, callback) {
        setTimeout(() => {
          // 确保lastError为null，表示操作成功
          chrome.runtime.lastError = null;
          if (callback) callback({ status: 'ok' });
        }, 50);
      },
      // 添加query方法模拟，用于sendMessageToAllTabs
      query: function(queryInfo, callback) {
        setTimeout(() => {
          // 确保lastError为null，表示操作成功
          chrome.runtime.lastError = null;
          if (callback) callback([{ id: 1 }, { id: 2 }]);
        }, 50);
      }
    },
    webNavigation: {
      onCommitted: {
        listeners: [],
        addListener: function(callback) {
          this.listeners.push(callback);
        }
      },
      onHistoryStateUpdated: {
        listeners: [],
        addListener: function(callback) {
          this.listeners.push(callback);
        }
      }
    }
  };
}

suite.beforeEach(async () => {
  // 模拟Chrome API
  mockChromeAPI();
});

suite.afterEach(async () => {
  // 清理模拟环境
  delete global.chrome;
});

suite.test('Background组件与Chrome API集成', async () => {
  // 测试Background组件能否正确使用Chrome API
  try {
    const BackgroundComponent = require('../../components/background/utils/BackgroundComponent.js');
    const component = new BackgroundComponent();
    
    // 测试存储功能
    const storageData = await component.getStorageData(['test']);
    testFramework.assert(storageData);
    
    // 测试设置存储
    await component.setStorageData({ testKey: 'testValue' });
    testFramework.assert(true); // 没有抛出错误即为通过
  } catch (error) {
    testFramework.assert(false, `Background组件与Chrome API集成失败: ${error.message}`);
  }
});

suite.test('API请求组件与消息组件集成', async () => {
  // 测试API请求组件与消息组件的集成
  try {
    // 导入组件
    const BackgroundAPIRequest = require('../../components/background/complex/BackgroundAPIRequest.js');
    const BackgroundMessage = require('../../components/background/complex/BackgroundMessage.js');
    
    // 创建组件实例
    const apiRequest = new BackgroundAPIRequest();
    const message = new BackgroundMessage({ apiRequestComponent: apiRequest });
    
    testFramework.assert(apiRequest instanceof BackgroundAPIRequest);
    testFramework.assert(message instanceof BackgroundMessage);
    testFramework.assert(message.props.apiRequestComponent === apiRequest);
  } catch (error) {
    testFramework.assert(false, `API请求组件与消息组件集成失败: ${error.message}`);
  }
});

suite.test('数据同步组件与状态管理组件集成', async () => {
  // 测试数据同步组件与状态管理组件的集成
  try {
    const BackgroundDataSync = require('../../components/background/complex/BackgroundDataSync.js');
    const BackgroundStateManager = require('../../components/background/complex/BackgroundStateManager.js');
    
    const dataSync = new BackgroundDataSync();
    const stateManager = new BackgroundStateManager();
    
    testFramework.assert(dataSync instanceof BackgroundDataSync);
    testFramework.assert(stateManager instanceof BackgroundStateManager);
  } catch (error) {
    testFramework.assert(false, `数据同步组件与状态管理组件集成失败: ${error.message}`);
  }
});

// 运行测试
(async () => {
  const results = await testFramework.run();
  
  // 保存测试结果
  const fs = require('fs');
  const resultsPath = './tests/test-results.json';
  
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`测试结果已保存到 ${resultsPath}`);
})();