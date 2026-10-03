# 当前架构与后续工作

更新日期：2026-10-04。仓库已形成扩展、Web、移动端和同步 API 的多端基础。三端共用 `@googletrans/core` 与 `@googletrans/data` 的词条、复习、备份及同步实现；平台差异由 IndexedDB、SQLite 和扩展运行时适配。各项构建和运行验收见[多端验证记录](multiplatform-verification.md)。

## 当前模块

```text
apps/extension  WXT background/content + 内嵌 apps/web 的词库 UI
apps/web        React/Vite 浏览器应用，IndexedDB 本地词库
apps/mobile     Expo / React Native，SQLite 本地词库
packages/core  平台无关的数据类型、词条 ID、同步排序与学习规则
packages/data  共享客户端、事务存储接口、备份、旧数据导入与 outbox
apps/api       Node 24 HTTP 服务，SQLite 账号、会话及同步记录
```

扩展构建先生成 Web 页面，再由 WXT 将页面作为扩展词库界面打包；新的 content 与 background 入口使用 TypeScript。历史 `extension/` 源码仍保留作旧功能和迁移资料，其中部分运行时代码不属于新的 WXT bundle。根 `manifest.json` 是供 Chrome“加载已解压扩展程序”使用的 loader，指向 `apps/extension/.output/chrome-mv3` 下构建产物；从同一仓库根目录加载和重载可保留该目录对应的扩展 ID。不要改从 `.output` 子目录加载，否则扩展 ID 和按 ID 隔离的旧 Chrome Storage 会不同。

扩展后台首次启动会把 `translatedWords`、学习进度和相关历史从 Chrome Storage 导入新的本地词库，并以导入标记避免重复；Chrome Storage 原数据保留。该过程已实现，实际升级路径与现存用户数据仍需按[验证记录](multiplatform-verification.md)验收。Web 使用 IndexedDB；移动端使用 Expo SQLite。账号命名空间和匿名 `local` 命名空间隔离，登录不会自动上传匿名数据。客户端提供明确的“导入本机词库到账号”操作。

API 提供注册、登录、会话查询与撤销、按账号隔离的同步、健康检查和可选服务器翻译。同步请求使用 mutation ID 幂等处理，记录冲突按共享契约仲裁，删除保留墓碑；客户端将本地变更与 outbox 写入同一事务，并分页拉取服务端变更。单实例 Docker Compose 部署使用持久化 SQLite 卷；云主机、TLS、域名、备份与监控需由部署方配置。

## 可用范围与运维边界

- Web 与移动端可手动录入翻译，不需要第三方翻译密钥。服务器翻译需在 API 部署中配置 `TRANSLATION_API_URL`、`TRANSLATION_API_KEY` 和模型。
- 账号基础流程已实现；邮箱验证、密码重置和面向多副本的服务端数据库尚未提供。
- Compose 文件提供本地/单实例部署构件，不表示已创建或发布云端服务。对外部署还需要 HTTPS 反向代理、持久卷、来源白名单和代理层认证限流。
- 扩展的根 loader 是保持同一目录加载的迁移路径；旧版 Chrome Storage 原始数据保留，备份和迁移可由客户端导出/导入。
- 手工构建或类型检查只能证明对应工具链阶段；Web/扩展交互与移动端真机状态见[验证记录](multiplatform-verification.md)。

## 后续工作

接下来完善 UI 与真实环境验收，并按验证记录补齐浏览器、升级和 iOS/Android 设备上的用户流程。运维层面可按实际发布需要配置云主机/TLS、可靠备份与恢复演练、日志监控、反向代理限流，以及账号邮箱验证和密码恢复。设计契约见[多端实现契约](multiplatform-contract.md)，部署说明见 [`deploy/README.md`](../../deploy/README.md)。
