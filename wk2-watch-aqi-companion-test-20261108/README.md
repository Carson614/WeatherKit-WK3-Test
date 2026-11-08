# WK2 Watch AQI Companion Test

独立 WK2 实验模块，用于 Apple Watch 请求没有 `airQuality` 根产品时尝试安全补入彩云美国 AQI。它只匹配 `weatherkit.apple.com/api/v2/weather/`；运行时还要求 GET、成功的 HTTP 状态、`country=CN`、请求数据集明确包含 `airQuality`、WK2.Weather FlatBuffer 正常且路径坐标有效。

## 功能与边界

- 复用 NSRingo WeatherKit v3.3.2 的 WK2 codec、ColorfulCloudsUS 当前 AQI 与同源昨日比较逻辑。
- 当前 AQI 使用 `EPA_NowCast.2604`。构建只给固定上游 bundle 的 `EPA_NowCast` scale 增加 `version: "2604"`，以保持本项目 WK3 已验收标尺 ID；算法与数据转换沿用上游实现。
- 若 WK2 根表中已有 `airQuality` 产品，响应体保持逐字节不变，不请求彩云。
- 若该产品缺失，才调用上游 WK2 codec 补入。编码结果需通过 FlatBuffer、坐标（与请求点相距不超过 10 km）、数据时间、0–500 指数、类别和 EPA 标尺校验；任何失败都会恢复 Apple 原始二进制正文。
- 昨日数据不可用时仍可保留经过验证的今日 AQI，昨日比较保持 UNKNOWN，不构造趋势。
- 其他 WK2 产品和未知根槽位通过固定上游 codec 保留；最终 bundle 回放验证了当前天气产品和未知根产品仍可重新解码。
- 响应附加不含坐标、完整 URL、令牌或正文的 `X-WK2-Watch-AQI-Diag`。诊断包括 `original=present|missing|invalid`、`source=not_called|called|ok` 与 `result=original_preserved|injected|source_unavailable|encode_failed|safe_fallback|*_skip`。
- 不处理 `/api/v1/`、`/api/v3/`、可用性、预警、分钟雨雪或其他 WeatherKit 路由；不更改 iPhone Surge 当前配置。

## 安装

从本仓库固定提交打开 `WK2-Watch-AQI-Companion-Test.sgmodule`，在 Surge 中添加为独立测试模块。它只处理显式 `country=CN` 的 WK2 天气请求；与现有 WK3 Stable Candidate 共存时，路径互不重叠。不要同时启用另一条会处理相同 `/api/v2/weather/` 的 WK2 AQI 响应脚本。

安装后在 Surge 最近请求中检查来自 Watch 的 `/api/v2/weather/` 详情：请求需含 `country=CN` 和 `dataSets` 中的 `airQuality`；响应 `X-WK2-Watch-AQI-Diag` 应显示注入状态。然后在 Apple Watch 张家港天气页确认 AQI 卡片。自动回放不能代替 Watch 真机验收。

## 构建与来源

- 上游：[`NSRingo/WeatherKit` v3.3.2](https://github.com/NSRingo/WeatherKit/tree/v3.3.2)，提交 `c40e8f8a13c8304a7ef500cb74acc5948af14b3f`。
- 仅使用其公开发行版 `response.bundle.js`，来源 SHA-256：`ce1db90d77c44fce972db0c2e319845fc1d6a276d41d772c0294882e59d7f999`。
- `build.mjs` 对上游固定 bundle 的参数定义、WK2 编码失败边界和单一响应入口做锚点断言，再嵌入本目录的守卫脚本。锚点不唯一或 SHA 不符时构建失败。
- 上游完整 Rollup 构建需要 GitHub Packages 私有依赖；匿名获取返回 HTTP 401。本版不绕过认证，使用上述公开、哈希固定的发行 bundle 增量构建。
- 上游许可证见 [`LICENSE-NSRINGO.txt`](./LICENSE-NSRINGO.txt)。

## 自动验证

运行 `npm ci && npm run check`。测试执行最终发布 bundle，而非仅检查源守卫；覆盖缺失 AQ 根产品、vtable 偏移为零、现有 AQ 原样保留、同源昨日比较、无昨日数据、数据源失败、过期/异地/越界 AQI、非 CN、无 `airQuality` 数据集、错误响应类型、无效 FlatBuffer，以及原始已知/未知根产品保留。所有回放样本与坐标均为合成数据，不包含真实请求正文或凭证。当前通过结果和 SHA 见 [`BUILD-TEST-REPORT.md`](./BUILD-TEST-REPORT.md)。

自动化仅证明合成 WK2 回放和脚本结构。尚未证明 Apple Watch UI 会显示新卡片；需要在 Watch 手动安装后验证。
