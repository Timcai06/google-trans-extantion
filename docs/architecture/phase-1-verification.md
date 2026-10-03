# 首期验证记录

> 历史检查点。后续多端实现已替代本页的扩展入口与产物；当前安装方式见根 README，当前验证结果见[多端验证记录](multiplatform-verification.md)。

日期：2026-10-03。针对当前工作区的新构建链路与共享学习核心；不是发布或浏览器完整验收记录。

## 已执行

| 命令 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile --offline --store-dir /private/tmp/googletrans-pnpm-store` | 通过；现有本地缓存可按锁文件安装，未验证全新机器联网安装 |
| `pnpm run check` | 通过；核心和扩展类型检查、核心边界检查、5 个测试文件 / 46 个测试、WXT 构建和产物校验 |
| `pnpm run type-check:legacy` | 通过；原有 `src/` TypeScript 模块 |
| `pnpm run test:legacy:pos --runInBand --silent` | 11 个测试套件 / 145 个测试通过；Jest 报告退出时存在未释放异步资源，仍需单独清理 |

新测试覆盖学习进度规范化、调度与时间注入、真实 LearningManager 调用核心、旧字段保留、后台可选权限、旧网页运行时代码组装等价性、核心依赖边界，以及缺失后台入口的坏包拒绝。

产物检查核对 manifest 入口、资源白名单、本地页面引用、经典脚本顺序及 CSP，并执行产物中的真实共享核心桥接脚本验证复习结果。

## 构建产物

- 开发验证入口：`apps/extension/.output/chrome-mv3`。
- 文件数：72。
- 产物文件路径与内容的集合 SHA-256：`88426dcc51ae09233a2be4afcb76337b8e5da8fa7e09ff812b2f94e1ef23deab`。
- 旧网页运行时源码组装 SHA-256：`02251be12faf85767ccb73b8fdb19ad3fba7d08a0f178cd50e3ba956f46fae29`，与旧活跃 bundle 相同。构建自身不读取该 bundle。
- 构建已关闭包含绝对检出路径的模块来源调试注释；检查确认生成的后台和网页脚本不含本机 `/Users/tim` 路径。

## 尚未验证或实现

- 尚未在真实 Chrome 中验证联网翻译、完整交互和升级过程；VM 行为测试不能替代浏览器验收。
- 尚未执行全仓库旧 Jest 测试，也未做全新检出或跨机器构建验证。
- Chrome Storage 的整对象写入及其并发限制仍然存在；未实施 IndexedDB 事务、outbox、云端、Web 或移动端。
- 改变解压扩展的加载目录可能改变扩展 ID，新包不会自动继承旧 ID 下的数据。保留原扩展；备份、恢复、原地升级与数据迁移需要独立验收。
- 开发热更新未覆盖所有复制资源和核心桥接脚本，修改后仍需重新构建、重新加载。

后续工作见[实施计划](implementation-plan.md)。
