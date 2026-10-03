# 多端实现契约（2026-10-04）

本轮交付可运行的扩展、Web、Expo 移动端和 Node HTTP 同步服务。界面以功能可用为准，后续单独美化。公共契约由 `@googletrans/core` 导出；存储与客户端用例由 `@googletrans/data` 实现。

## 数据与同步

```ts
type WordData = {
  text: string; translation: string; context: string;
  sourceLanguage: string; targetLanguage: string;
  starred: boolean; createdAt: number;
  legacy?: Record<string, unknown>;
};
type ReviewData = {
  wordId: string; correct: boolean; reviewedAt: number;
  mode: 'flashcard' | 'quiz' | 'spelling';
};
type SyncRecord = {
  id: string; kind: 'word' | 'review'; value: WordData | ReviewData | null;
  deleted: boolean; updatedAt: number; deviceId: string;
};
type SyncMutation = { mutationId: string; record: SyncRecord };
type ServerChange = { cursor: number; mutation: SyncMutation };
type SyncRequest = { cursor: number; changes: SyncMutation[] };
type SyncResponse = {
  cursor: number; changes: ServerChange[]; acknowledged: string[]; hasMore: boolean;
};
```

同一词条 ID 用 `wordId(text, sourceLanguage)` 规范化确定。复习是独立、不可变事件，按 reviewedAt/id 排序后调用已有学习规则重放进度。记录冲突按 updatedAt、deviceId、mutationId 字典序决定胜者；删除使用 tombstone。API 验证大小、字段和时间。服务端按用户隔离、mutationId 幂等，服务端游标分页；客户端本地更新与 outbox 在同一事务提交，同步应用远端记录、清理已确认 outbox、推进游标在同一事务完成。尚未确认的更晚本地写不能被旧响应覆盖。

## HTTP API

- `GET /health`。
- `POST /v1/auth/register`、`POST /v1/auth/login`：`{email,password}` → `{token,user:{id,email}}`。
- `GET /v1/auth/me` → `{user:{id,email}}`；`POST /v1/auth/logout` 撤销 Bearer token。
- `POST /v1/sync`：Bearer 认证，使用上面的请求/响应。
- `POST /v1/translate`：Bearer 认证，`{text,sourceLanguage,targetLanguage}` → `{translation}`。提供方配置在服务端；缺配置返回明确错误，手工录入翻译仍可用。

账号命名空间与本地匿名空间隔离。登录不隐式把其他空间数据上传；提供明确的匿名词库导入操作。退出不删除本地数据。备份不包含 token 或密码。

## 共享客户端接口

`createLibraryClient({store,deviceId,now,id})`。store 为异步事务适配器；Web/扩展使用 IndexedDB，移动端 SQLite。接口由 data 实现者立即发布精确类型，其他客户端按同一接口接线：词条保存/列表/删除/收藏、提交复习/查询进度、备份导入导出、旧数据导入、outbox 同步。网络认证与配置独立于领域核心。所有客户端必须实际调用共享实现，不能复制调度或同步算法。

## 部署与验收

Node 24 + SQLite 的模块化服务，单实例持久卷部署；提供 Docker 与本地启动配置。Web、扩展、移动端分别验证构建；真实浏览器验证 Web/扩展，移动端如无模拟器则明确记录运行验收缺口，不用 Web 构建冒充原生真机验证。
