# WK3 Weather Alerts Selective Detail Test

此独立实验从已验收的 AreaID Fallback 基线 `be9c44cfba0ad54104f449b1a62f2280de592025` 派生，不覆盖 V1/V2、AQI、分钟降水、昨日比较或其他测试模块，也不修改正在运行的 Surge 配置。上游 Apache-2.0 版权和许可证文件保留。

## 技术可行性与行为

WK3 表结构同时含有集合级共享 `detailsUrl`（预警集合 slot 1）和每条预警摘要自己的 `detailsUrl`（summary slot 12）。`decodeWK3Alerts()` 按每条摘要读取该字段，`patchWK3Alerts()` 只改已存在的摘要字段并在未知摘要槽位出现时回退。由此可以在编码层单独改写某条预警，而不改共享链接。

此版本仅在预警批次出现未匹配事件时启用逐条实验：严格匹配的事件若本来有非空摘要详情链接，则该摘要改为只含该 Apple 原始事件 ID 的本地详情路由；未匹配摘要及集合级共享链接保持原样。若没有可独立改写的已存在摘要链接，则原字节透传，不创建字段。全部事件匹配时维持已有共享详情路由。类型、地区、已验证严重程度、精确发布时间、活动状态、唯一候选和 Apple 身份校验均未放宽；不新增预警名称别名。

源码证据确认“每条摘要有可独立写入的链接字段”；自动回放确认单条链接、详情 API 与事件 ID 绑定。Apple 天气是否实际读取单条摘要链接仍须 iPhone 真机验收；如果 UI 只跟随集合级链接，实验会保持安全，但匹配详情可能不会在 App 中展示。

## 自动验证

`npm run build` 使用固定哈希锚定的已验收 Next Hour Provider Conversion bundle 生成 request/response 脚本，不是完整 Rollup 构建。`npm test` 覆盖张家港“恶劣天气 + 寒潮”部分匹配回放、共享链接及未匹配事件保留、单事件 v1/v2 详情 API、AQI scale/index/category/yesterday、分钟雨、未知根字段和失败透传。合成回放不是 iPhone 真机结果。

## iPhone 验收

请独立安装此测试模块，不要与其他同样匹配 WK3 weather 请求的测试版同时启用。张家港应观察到寒潮摘要进入模块构建的详情 API（`X-WK3-Alerts-Diag` 中 `link=per_event_native`，详情请求 `result=details_served`），而“恶劣天气”详情仍保持 Apple 原样；同时确认上海/张家港/昆山美标 AQI、分钟降水和昨日比较不退步。模块未真机验收前不视为完成。
