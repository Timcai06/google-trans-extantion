# 理解 build/ 和 node_modules/ 目录

**问题**: 为什么 `build/` 和 `node_modules/` 显示为暗色？  
**答案**: 它们被 Git 忽略了（在 `.gitignore` 中配置）

---

## 📁 目录说明

### 1. build/ 目录（820KB）

#### 是什么？
`build/` 是**构建产物目录**，包含编译和测试生成的文件。

#### 包含什么？
```
build/
├── dist/           # TypeScript 编译输出
│   ├── services/   # 编译后的 .js 文件
│   ├── types/      # 类型声明 .d.ts 文件
│   ├── utils/
│   └── ...
│
└── coverage/       # 测试覆盖率报告
    ├── lcov-report/    # HTML 格式报告
    ├── coverage-final.json
    └── clover.xml
```

#### 如何生成？
```bash
# 生成 dist/ - TypeScript 编译
npm run build

# 生成 coverage/ - 测试覆盖率
npm run test:coverage
```

#### 为什么被忽略？
- ✅ **可重新生成** - 随时可以通过命令重新生成
- ✅ **体积大** - 不需要提交到 Git
- ✅ **因人而异** - 每个开发者本地生成即可
- ✅ **避免冲突** - 不同环境生成的文件可能不同

#### 可以删除吗？
✅ **可以安全删除**！随时可以重新生成：
```bash
# 删除
rm -rf build/

# 重新生成
npm run build
npm run test:coverage
```

---

### 2. node_modules/ 目录（95MB）

#### 是什么？
`node_modules/` 是**依赖包目录**，包含项目所需的所有 npm 包。

#### 包含什么？
```
node_modules/
├── @types/             # TypeScript 类型定义
│   ├── chrome/
│   ├── jest/
│   └── node/
├── typescript/         # TypeScript 编译器
├── jest/               # 测试框架
├── fast-check/         # 属性测试库
└── ... (数百个包)
```

#### 如何生成？
```bash
# 安装所有依赖
npm install

# 或
npm ci  # 使用 package-lock.json 精确安装
```

#### 为什么被忽略？
- ✅ **体积巨大** - 95MB，包含数百个包
- ✅ **可重新安装** - 通过 `package.json` 和 `package-lock.json` 重新安装
- ✅ **因平台而异** - 不同操作系统可能有不同的二进制文件
- ✅ **避免冲突** - 不同开发者可能使用不同版本

#### 可以删除吗？
✅ **可以安全删除**！但需要重新安装：
```bash
# 删除
rm -rf node_modules/

# 重新安装
npm install
```

---

## 🎨 为什么显示为暗色？

### VS Code / IDE 的视觉提示

大多数 IDE 会将 `.gitignore` 中的文件/文件夹显示为暗色，表示：
- 🔒 **被 Git 忽略** - 不会提交到版本控制
- 📦 **临时文件** - 可以随时删除和重新生成
- ⚠️ **不要编辑** - 这些文件是自动生成的

### .gitignore 配置

```gitignore
# Dependencies
node_modules/       # npm 依赖包
package-lock.json   # 依赖锁文件（可选忽略）

# Build outputs
build/              # 构建产物

# IDE
.DS_Store           # macOS 系统文件
```

---

## 📊 目录对比

| 目录 | 大小 | 用途 | 可删除 | 如何恢复 | Git状态 |
|------|------|------|--------|----------|---------|
| **build/** | 820KB | 构建产物 | ✅ 是 | `npm run build` | 🔒 忽略 |
| **node_modules/** | 95MB | 依赖包 | ✅ 是 | `npm install` | 🔒 忽略 |
| **extension/** | 2.0MB | 扩展代码 | ❌ 否 | - | ✅ 跟踪 |
| **src/** | 304KB | 源代码 | ❌ 否 | - | ✅ 跟踪 |
| **docs/** | 252KB | 文档 | ❌ 否 | - | ✅ 跟踪 |

---

## 🔍 详细说明

### build/dist/ - TypeScript 编译输出

#### 作用
将 TypeScript 源码（`src/`）编译为 JavaScript，供其他工具使用。

#### 示例
```typescript
// src/services/cache-manager.ts (源码)
export class CacheManager {
  private cache: Map<string, any>;
  constructor() {
    this.cache = new Map();
  }
}
```

编译后：
```javascript
// build/dist/services/cache-manager.js (编译后)
export class CacheManager {
  constructor() {
    this.cache = new Map();
  }
}

// build/dist/services/cache-manager.d.ts (类型声明)
export declare class CacheManager {
  private cache;
  constructor();
}
```

#### 何时需要？
- 🔧 **发布 npm 包** - 需要编译后的 JavaScript
- 🧪 **某些测试工具** - 可能需要编译后的代码
- 📦 **打包工具** - 某些打包工具需要编译后的代码

#### 本项目需要吗？
**不一定需要**！因为：
- Chrome 扩展直接使用 `extension/` 中的 JavaScript 代码
- TypeScript 源码（`src/`）主要用于开发和测试
- 可以考虑删除 `build/dist/`，只保留 `build/coverage/`

---

### build/coverage/ - 测试覆盖率报告

#### 作用
显示代码的测试覆盖率，帮助你了解哪些代码被测试了。

#### 包含什么？
```
build/coverage/
├── lcov-report/        # HTML 格式报告（可在浏览器打开）
│   ├── index.html      # 主页
│   ├── services/       # 各模块的覆盖率
│   └── ...
├── coverage-final.json # JSON 格式数据
└── clover.xml          # XML 格式（CI/CD 使用）
```

#### 如何查看？
```bash
# 生成覆盖率报告
npm run test:coverage

# 在浏览器中打开
open build/coverage/lcov-report/index.html
```

#### 示例报告
```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
services/
  cache-manager.ts      |   95.5  |   88.9   |  100.0  |   95.5  |
  color-mapper.ts       |  100.0  |  100.0   |  100.0  |  100.0  |
  context-analyzer.ts   |   98.2  |   95.0   |  100.0  |   98.2  |
```

---

### node_modules/ - npm 依赖包

#### 作用
存储项目所需的所有第三方库和工具。

#### 主要依赖
```json
{
  "devDependencies": {
    "@types/chrome": "^0.0.268",      // Chrome API 类型定义
    "@types/jest": "^29.5.12",        // Jest 类型定义
    "@types/node": "^20.11.19",       // Node.js 类型定义
    "fast-check": "^3.15.1",          // 属性测试库
    "jest": "^29.7.0",                // 测试框架
    "ts-jest": "^29.1.2",             // Jest 的 TS 支持
    "typescript": "^5.3.3"            // TypeScript 编译器
  }
}
```

#### 依赖树
```
node_modules/
├── typescript/         # TypeScript 编译器（直接依赖）
│   └── node_modules/   # TypeScript 的依赖
├── jest/               # Jest 测试框架（直接依赖）
│   └── node_modules/   # Jest 的依赖
│       ├── chalk/      # 终端颜色（间接依赖）
│       ├── diff/       # 差异对比（间接依赖）
│       └── ...
└── ... (数百个包)
```

#### 为什么这么大？
- 📦 **依赖的依赖** - 每个包都有自己的依赖
- 🔧 **开发工具** - TypeScript、Jest 等工具本身很大
- 🌍 **跨平台支持** - 包含多个平台的二进制文件

---

## 🚀 最佳实践

### 1. 定期清理
```bash
# 清理构建产物
rm -rf build/

# 清理依赖（如果遇到问题）
rm -rf node_modules/
npm install
```

### 2. 不要编辑这些目录
- ❌ 不要手动修改 `build/` 中的文件
- ❌ 不要手动修改 `node_modules/` 中的文件
- ✅ 修改源码（`src/`、`extension/`）
- ✅ 修改配置（`package.json`、`tsconfig.json`）

### 3. 不要提交到 Git
```bash
# 检查 Git 状态
git status

# 应该看到：
# build/ 和 node_modules/ 不在列表中（被忽略）
```

### 4. CI/CD 中重新生成
```yaml
# .github/workflows/test.yml
steps:
  - name: Install dependencies
    run: npm ci
  
  - name: Build
    run: npm run build
  
  - name: Test
    run: npm run test:coverage
```

---

## 💡 常见问题

### Q1: 可以删除 build/ 吗？
**A**: ✅ 可以！随时可以重新生成：
```bash
rm -rf build/
npm run build
npm run test:coverage
```

### Q2: 可以删除 node_modules/ 吗？
**A**: ✅ 可以！但需要重新安装：
```bash
rm -rf node_modules/
npm install
```

### Q3: 为什么 package-lock.json 也被忽略了？
**A**: 这是可选的。有些项目忽略它，有些不忽略。
- **忽略**: 允许依赖版本浮动
- **不忽略**: 锁定精确版本，确保一致性

**建议**: 不要忽略 `package-lock.json`，确保团队使用相同版本。

### Q4: build/ 占用空间太大怎么办？
**A**: 可以只保留需要的部分：
```bash
# 只保留测试覆盖率，删除编译输出
rm -rf build/dist/

# 或者全部删除
rm -rf build/
```

### Q5: 如何查看 node_modules/ 的大小？
**A**: 
```bash
# 查看总大小
du -sh node_modules/

# 查看最大的包
du -sh node_modules/* | sort -hr | head -10
```

---

## 📝 总结

### build/ 目录
- **用途**: 构建产物（编译输出 + 测试覆盖率）
- **大小**: 820KB
- **可删除**: ✅ 是
- **恢复方法**: `npm run build` + `npm run test:coverage`
- **Git 状态**: 🔒 被忽略（暗色显示）

### node_modules/ 目录
- **用途**: npm 依赖包
- **大小**: 95MB
- **可删除**: ✅ 是
- **恢复方法**: `npm install`
- **Git 状态**: 🔒 被忽略（暗色显示）

### 关键点
- ✅ 暗色 = 被 Git 忽略
- ✅ 可以安全删除
- ✅ 可以重新生成
- ✅ 不要手动编辑
- ✅ 不要提交到 Git

---

**文档创建时间**: 2026-01-26  
**创建工程师**: Kiro AI Assistant
