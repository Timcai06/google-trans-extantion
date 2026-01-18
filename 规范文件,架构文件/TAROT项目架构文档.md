# TAROT 子项目架构文档

> **文档创建时间**: 2026-01-18
> **主项目版本**: 2.0.0
> **TAROT项目版本**: 0.0.0
> **技术栈**: React 19 + TypeScript + Vite + Tailwind CSS 4
> **用途**: 独立的塔罗牌游戏应用，作为扩展的富交互模块

---

## 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [技术栈](#技术栈)
4. [项目结构](#项目结构)
5. [核心模块](#核心模块)
6. [服务层](#服务层)
7. [构建流程](#构建流程)
8. [集成方式](#集成方式)
9. [开发指南](#开发指南)
10. [常见问题](#常见问题)

---

## 项目概述

### 什么是 TAROT？

TAROT（Mystic Pixel Tarot）是一个基于 React 的独立塔罗牌应用，通过**Vite 构建后集成到 Chrome 扩展中**。它提供了沉浸式的塔罗牌占卜体验，包括多种牌组、解读报告和历史记录功能。

### 核心特点

| 特点 | 说明 |
|------|------|
| **独立开发** | 完全独立的 React + TypeScript 项目，可独立开发和测试 |
| **本地构建** | 通过 Vite 构建，生成无哈希的静态资源 |
| **自动同步** | `npm run build:extension` 自动将构建产物复制到扩展根目录 |
| **AI 集成** | 支持 Gemini、Qwen、Groq、DeepSeek 多种 AI 服务 |
| **动画特效** | 使用 Framer Motion 实现流畅的卡片翻转和过渡动画 |
| **现代 UI** | 基于 Tailwind CSS 4 的响应式设计 |

---

## 架构设计

### 架构模式

TAROT 采用**组件化架构**，类似于主扩展的组件系统，但基于 React 生态：

```
┌─────────────────────────────────────────────────────────────┐
│                   TAROT React Application                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Components Layer (8个组件)                         │  │
│  │  - App (根组件)                                     │  │
│  │  - Card (卡片组件)                                  │  │
│  │  - DeckLibraryModal (牌组管理)                      │  │
│  │  - HistoryModal (历史记录)                          │  │
│  │  - IntroCard (引导卡片)                             │  │
│  │  - LoadingOracle (加载动画)                         │  │
│  │  - PixelCat (像素猫角色)                            │  │
│  │  - StarryBackground (星空背景)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services Layer (5个服务)                           │  │
│  │  - readingService (占卜服务)                        │  │
│  │  - geminiConfig (Gemini AI 配置)                    │  │
│  │  - qwenConfig (Qwen AI 配置)                       │  │
│  │  - groqConfig (Groq AI 配置)                       │  │
│  │  - deepseekConfig (DeepSeek AI 配置)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  External APIs                                      │  │
│  │  - Gemini API                                       │  │
│  │  - Qwen API                                         │  │
│  │  - Groq API                                         │  │
│  │  - DeepSeek API                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户选择塔罗牌
    ↓
Card.tsx: handleCardSelect()
    ↓
readingService.ts: performReading()
    ├─ 选择 AI 服务（Gemini/Qwen/Groq/DeepSeek）
    ├─ 调用 AI API 进行占卜
    └─ 返回解读结果
    ↓
ReadingReport.tsx: 显示解读报告
    ↓
HistoryModal.tsx: 保存到历史记录
    ↓
chrome.storage.local (与主扩展共享)
```

---

## 技术栈

### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | ^19.2.3 | UI 框架 |
| **TypeScript** | ~5.8.2 | 类型安全 |
| **Vite** | ^6.2.0 | 构建工具 |
| **@vitejs/plugin-react** | ^5.0.0 | React 插件 |

### 样式方案

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tailwind CSS** | ^4.1.18 | Utility-first CSS |
| **@tailwindcss/postcss** | ^4.1.18 | PostCSS 集成 |
| **PostCSS** | ^8.5.6 | CSS 处理 |

### 动画库

| 技术 | 版本 | 用途 |
|------|------|------|
| **Framer Motion** | ^12.25.0 | 动画库 |
| **Lucide React** | ^0.562.0 | 图标库 |

### AI 服务

| 服务 | 包名 | 版本 | 用途 |
|------|------|------|------|
| **Google GenAI** | @google/genai | ^1.35.0 | Gemini AI SDK |

---

## 项目结构

```
TAROT-main/
├── components/              # 组件目录（8个）
│   ├── App.tsx             # 根组件（路由和布局）
│   ├── Card.tsx            # 塔罗牌卡片
│   ├── DeckLibraryModal.tsx # 牌组管理模态框
│   ├── HistoryModal.tsx     # 历史记录模态框
│   ├── IntroCard.tsx       # 引导卡片
│   ├── LoadingOracle.tsx    # 加载动画
│   ├── PixelCat.tsx        # 像素猫角色
│   └── StarryBackground.tsx # 星空背景
├── services/                # 服务目录（5个）
│   ├── readingService.ts    # 占卜服务核心
│   ├── geminiConfig.ts     # Gemini AI 配置
│   ├── qwenConfig.ts       # Qwen AI 配置
│   ├── groqConfig.ts       # Groq AI 配置
│   └── deepseekConfig.ts   # DeepSeek AI 配置
├── scripts/                 # 脚本目录
│   └── copy-to-extension.js # 构建产物复制脚本
├── tests/                   # 测试目录（3个）
│   ├── component-rendering.test.js
│   ├── user-interaction.test.js
│   └── offline-functionality.test.js
├── App.tsx                  # 应用入口
├── index.tsx                # React 挂载点
├── index.css                # 全局样式
├── index.html               # HTML 模板
├── constants.ts             # 常量定义
├── types.ts                 # 类型定义
├── metadata.json            # 元数据
├── package.json             # 依赖管理
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.js       # Tailwind 配置
├── postcss.config.js        # PostCSS 配置
└── README.md                # 项目说明
```

---

## 核心模块

### 1. Components Layer

#### App.tsx - 根组件
**职责**：应用路由、状态管理、布局容器
- 管理应用状态（当前牌组、历史记录等）
- 提供全局上下文
- 响应式布局

#### Card.tsx - 塔罗牌卡片
**职责**：卡片交互、翻转动画、选择状态
- 78 张塔罗牌的渲染
- Framer Motion 实现的 3D 翻转动画
- 点击选中、悬停效果

#### DeckLibraryModal.tsx - 牌组管理
**职责**：牌组切换、牌组预览、牌组信息
- 显示可用牌组列表
- 牌组描述和特点
- 切换牌组功能

#### HistoryModal.tsx - 历史记录
**职责**：占卜历史、记录查看、记录管理
- 显示历史占卜记录
- 查看详细解读报告
- 清空历史记录

#### IntroCard.tsx - 引导卡片
**职责**：用户引导、使用说明、功能介绍
- 首次使用引导
- 功能说明卡片

#### LoadingOracle.tsx - 加载动画
**职责**：占卜加载状态、动画展示
- 加载进度动画
- AI 占卜状态显示

#### PixelCat.tsx - 像素猫角色
**职责**：吉祥物、互动元素、视觉装饰
- 像素风格的猫角色
- 互动反馈动画

#### StarryBackground.tsx - 星空背景
**职责**：动态背景、鼠标交互、视觉效果
- Canvas 实现的星空粒子动画
- 鼠标跟随效果

---

## 服务层

### 1. readingService.ts - 占卜服务核心

**功能**：AI 占卜流程管理、卡片解读、历史记录

```typescript
// 核心功能
interface ReadingService {
  // 执行占卜
  performReading(cards: Card[], question?: string): Promise<ReadingResult>

  // 获取解读报告
  getReadingReport(readingId: string): Promise<Report>

  // 保存历史记录
  saveToHistory(reading: Reading): Promise<void>

  // 获取历史记录
  getHistory(): Promise<Reading[]>

  // 清空历史记录
  clearHistory(): Promise<void>
}
```

**AI 服务选择**：
- **Gemini**（默认）：Google AI Studio
- **Qwen**：阿里云通义千问
- **Groq**：Groq 云服务
- **DeepSeek**：深度求索 AI

### 2. AI 配置服务

#### geminiConfig.ts
```typescript
{
  apiKey: string;
  model: string; // gemini-pro, gemini-1.5-flash
  temperature: number;
  maxTokens: number;
}
```

#### qwenConfig.ts
```typescript
{
  apiKey: string;
  model: string; // qwen-turbo, qwen-plus
  temperature: number;
  maxTokens: number;
}
```

#### groqConfig.ts
```typescript
{
  apiKey: string;
  model: string; // llama3-70b-8192, mixtral-8x7b-32768
  temperature: number;
  maxTokens: number;
}
```

#### deepseekConfig.ts
```typescript
{
  apiKey: string;
  model: string; // deepseek-chat, deepseek-coder
  temperature: number;
  maxTokens: number;
}
```

---

## 构建流程

### 1. 开发模式

```bash
# 进入 TAROT-main 目录
cd TAROT-main

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 2. 生产构建

```bash
# 构建 TAROT 项目
npm run build

# 构建产物输出到 dist/ 目录
# dist/
# ├── index.html
# └── assets/
#     ├── index.js
#     ├── index.css
#     └── ... (其他资源)
```

### 3. 集成到扩展

```bash
# 一键构建并同步到扩展
npm run build:extension

# 执行流程：
# 1. 运行 npm run build
# 2. 执行 node scripts/copy-to-extension.js
# 3. 将 dist/assets/ 复制到 ../assets/
# 4. 将 dist/index.html 复制到 ../game.html
```

---

## 集成方式

### 1. 与主扩展的集成

#### 共享数据存储

TAROT 应用与主扩展共享 `chrome.storage.local`：

```javascript
// 在 TAROT 中保存数据
chrome.storage.local.set({
  tarotHistory: [...],
  tarotSettings: {...}
})

// 在主扩展中读取数据
chrome.storage.local.get(['tarotHistory'], (result) => {
  console.log(result.tarotHistory)
})
```

#### CSP 策略

TAROT 遵循扩展的 CSP 策略：

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 2. 访问方式

#### 通过扩展访问
```html
<!-- 在主扩展中添加入口 -->
<a href="game.html" target="_blank">
  <button>打开塔罗牌应用</button>
</a>
```

#### 通过 popup 访问
```javascript
// 在 popup.html 中添加按钮
document.getElementById('tarot-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'game.html' })
})
```

---

## 开发指南

### 1. 添加新组件

```typescript
// 1. 创建组件文件
// components/MyComponent.tsx

import React from 'react'
import { motion } from 'framer-motion'

interface MyComponentProps {
  title: string
  onClick?: () => void
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
  return (
    <motion.div
      className="p-4 bg-white rounded-lg shadow-md"
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
    >
      <h2 className="text-xl font-bold">{title}</h2>
    </motion.div>
  )
}
```

### 2. 添加新 AI 服务

```typescript
// 1. 创建配置文件
// services/myaiConfig.ts

export const myaiConfig = {
  apiKey: import.meta.env.MYAI_API_KEY,
  model: 'myai-model-v1',
  temperature: 0.7,
  maxTokens: 2048,
  baseUrl: 'https://api.myai.com'
}

// 2. 在 readingService.ts 中添加
import { myaiConfig } from './myaiConfig'

async function callMyAI(prompt: string) {
  // 实现 AI 调用逻辑
}
```

### 3. 添加动画

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// 使用 AnimatePresence 实现过渡动画
<AnimatePresence mode="wait">
  {currentStep === 1 && (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      {/* 内容 */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 常见问题

### Q1: 修改代码后如何测试？

**A**:
1. 在 `TAROT-main/` 目录下运行 `npm run dev`
2. 在浏览器中访问 `http://localhost:3000`
3. 实时预览修改效果
4. 确认无误后运行 `npm run build:extension` 集成到扩展

### Q2: 如何添加新的塔罗牌组？

**A**:
1. 在 `constants.ts` 中添加牌组配置
2. 准备牌组图片资源（78张）
3. 在 `DeckLibraryModal.tsx` 中添加牌组选项
4. 在 `readingService.ts` 中添加牌组选择逻辑

### Q3: 如何更换 AI 服务？

**A**:
```typescript
// 在 App.tsx 中修改
const [aiProvider, setAiProvider] = useState<'gemini' | 'qwen' | 'groq' | 'deepseek'>('gemini')

// 在 readingService.ts 中根据选择的 provider 调用对应的配置
```

### Q4: 构建后如何调试？

**A**:
1. 在 Chrome 中打开 `game.html`
2. 打开开发者工具（F12）
3. 在 Console 中查看日志
4. 使用 React DevTools 检查组件状态

### Q5: 如何处理 CSP 违规？

**A**:
- 确保所有资源都是本地的（通过 Vite 构建）
- 不使用 `eval()`、`innerHTML` 等不安全操作
- 使用 `dangerouslySetInnerHTML` 时进行 XSS 防护
- 所有脚本都是 `src` 引入，不使用内联脚本

---

## 更新日志

### 2026-01-18
- ✨ 创建 TAROT 架构文档
- 📝 完善项目结构说明
- 📚 添加开发指南和常见问题

---

**文档维护**: 定期更新以保持与代码同步
**最后更新**: 2026-01-18
