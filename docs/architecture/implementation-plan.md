# 多端实施状态

更新日期：2026-10-04。扩展、Web、Expo 移动端、共享词库/同步包和 Node/SQLite API 已有实现。自动检查与人工运行验收分开记录，具体结果及限制见[多端验证记录](multiplatform-verification.md)。

## 已实现的基础

| 范围 | 当前实现 | 主要位置 |
| --- | --- | --- |
| 共享规则与数据 | 学习进度、词条 ID、同步冲突仲裁、事务式客户端、备份和旧数据导入 | `packages/core/`、`packages/data/` |
| Chrome 扩展 | TypeScript background/content，内嵌 Web 词库界面；根 manifest loader 指向 WXT 产物；首次启动导入旧 Chrome Storage 数据 | `apps/extension/`、`manifest.json` |
| Web | 词条增删改、搜索收藏、复习、账号/同步、备份导入导出；IndexedDB 离线存储 | `apps/web/` |
| 移动端 | Expo iOS/Android 应用、词条和复习界面、账号/同步、备份导入导出；SQLite 与 SecureStore | `apps/mobile/` |
| 同步服务 | Node 24 HTTP API、SQLite、注册登录/会话、账号隔离同步及可选翻译接口 | `apps/api/` |
| 本地部署 | Docker Compose 单实例 API 与 Web 反向代理配置、持久化 SQLite 卷 | `deploy/` |
| 集成检查 | workspace 类型检查、依赖边界、Vitest 与构建检查；完整旧词性代码检查作为额外步骤 | 根 `package.json`、`scripts/`、`tests/` |

登录不会隐式合并匿名词库；各客户端提供显式导入操作。未配置服务端翻译提供方时，用户仍可直接输入翻译。新扩展从原 Chrome Storage 导入词条和学习数据，旧数据保留。扩展须从仓库根目录加载并重载 `manifest.json`，以维持 loader 所指向的同一扩展 ID。

## 运行和验证阶段

| 工作 | 当前状态 | 验收依据 |
| --- | --- | --- |
| 自动类型检查、边界检查、测试和扩展/Web/API 构建 | 已提供统一命令 | `pnpm run check` |
| 移动端平台包构建及遗留词性模块检查 | 已提供完整检查命令 | `pnpm run check:all`；Expo 导出不是模拟器或真机验收 |
| Web 与扩展真实浏览器流程 | 单独记录运行情况和限制 | [多端验证记录](multiplatform-verification.md) |
| iOS/Android 原生运行 | 单独记录设备或模拟器可用性 | [多端验证记录](multiplatform-verification.md) |
| 独立部署与恢复 | Compose 可本地启动；云服务与恢复演练由部署环境决定 | [`deploy/README.md`](../../deploy/README.md) |

## 后续交付

1. 完成明天计划的功能性 UI 打磨，并复核 Web、扩展和移动端的保存、复习、备份、登录及同步路径。
2. 在模拟器或设备上验收移动端启动、SQLite 持久化、SecureStore 会话和恢复流程；构建产物不能代替此项。
3. 对外部署时配置 HTTPS、持久卷、数据库备份和恢复演练、代理限流及监控；目前没有云端部署目标。
4. 按产品需要补充邮箱验证和密码重置。

功能完成、自动检查通过、真实浏览器/设备验收和生产运维准备是独立状态，应分别在[验证记录](multiplatform-verification.md)中维护证据。
