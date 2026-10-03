# 多端开发交接

## 环境与启动

- Node.js 24，pnpm 10.33.0（仓库通过 `packageManager` 固定 pnpm 版本）。
- 首次安装：`pnpm install --frozen-lockfile`。
- 本地完整构建：`pnpm build`。该命令构建 Web、扩展和 API，并更新根目录扩展 loader。
- 分别在独立终端启动：`pnpm dev:api`、`pnpm dev:web`、`pnpm dev:mobile`。
- API 默认地址为 `http://127.0.0.1:8787`。第三方服务器翻译可选；按 `.env.example` 配置服务端环境变量。客户端的手工翻译输入不依赖外部密钥。
- 移动端用 Expo Go（SDK 57）或开发构建启动。真机访问开发机 API 时使用电脑的局域网地址，并把服务端 `HOST` 设为 `0.0.0.0`；线上使用 HTTPS。

## 扩展加载和升级

Chrome 开发者模式应加载仓库根目录的 `manifest.json`。它指向 `apps/extension/.output/chrome-mv3` 下的 WXT 构建文件；同一路径重载可维持扩展 ID。`pnpm build` 会先构建 Web 页面再构建扩展。新 background 首次运行会导入旧 Chrome Storage 数据至本地词库，旧数据保持原样。

## 常用检查

```sh
pnpm run check       # 核心与扩展类型、边界、Vitest、Web/API/扩展构建及扩展包检查
pnpm run check:all   # check + 移动端 iOS/Android JS 导出 + 旧词性 TypeScript/Jest 检查
pnpm build:mobile    # 仅导出移动端 iOS/Android JavaScript 包
```

Expo 导出用于验证平台打包，不代表模拟器或真机运行。浏览器、设备及自动化命令的实际结果见[多端验证记录](multiplatform-verification.md)。

## 架构边界

- `packages/core` 放平台无关规则与同步协议；`packages/data` 放共享客户端和事务数据操作。不要在客户端复制这些业务规则。
- Web/扩展的本地状态在 IndexedDB；移动端在 SQLite；连接配置和凭据由各自运行时保存。
- `local` 匿名词库与账号词库相互隔离。登录本身不上传匿名词库，用户通过“导入本机词库到账号”明确复制。
- API 的 SQLite Compose 部署是单实例基线。公开部署需由环境提供 TLS、持久卷、备份、监控和代理层限流；当前没有配置云主机。
- 自动账号注册、会话和同步已有实现；邮箱验证与密码重置尚未实现。

UI 后续工作以实际浏览器和移动设备体验为验收，功能流程先覆盖编辑、复习、备份恢复、登录、显式导入与断网后重试。
