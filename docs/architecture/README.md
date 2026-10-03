# 架构文档入口

当前仓库包含 Chrome 扩展、Web、Expo 移动端和 Node/SQLite 同步服务。共享数据与同步规则位于 `packages/core`、`packages/data`。代码已实现和自动检查、浏览器或设备运行验收是不同状态；逐项证据见[多端验证记录](multiplatform-verification.md)。

## 当前实现

| 文档 | 内容 |
| --- | --- |
| [当前与目标架构](current-and-target.md) | 实际模块、数据路径、扩展升级边界与未提供的运维能力 |
| [实施计划](implementation-plan.md) | 已实现功能与后续交付事项 |
| [开发交接](development-handoff.md) | 快速启动、常用命令和接手检查点 |
| [多端验证记录](multiplatform-verification.md) | 自动构建、真实浏览器和原生设备的分别验证情况 |
| [多端实现契约](multiplatform-contract.md) | 词库、复习事件、冲突处理、认证与同步 API |

## 设计决策与历史记录

- [多端架构 RFC](2026-10-03-multiplatform-architecture-rfc.md) 记录设计背景；以当前代码及验证记录为实现状态依据。
- [ADR 0001：共享核心与运行时边界](../decisions/0001-shared-core-and-runtime-boundaries.md) 记录共享业务逻辑与平台适配的边界。
- [旧架构概览](01_架构设计/架构概览.md)、[旧依赖关系图](02_依赖文档/依赖关系图.md)及[2026-01-13 架构审计](03_审计报告/审计报告_2026-01-13.md)是历史资料，不代表当前实现。
- 其他：[UI 组件化规范](04_开发规范/UI组件化规范表.md)、[组件文档](04_开发规范/组件文档.md)、[样式规范](05_样式指南/样式规范文档.md)、[旧使用指南](06_使用指南/使用指南.md)、[无障碍指南](08_可访问性/A11y开发指南.md)。
