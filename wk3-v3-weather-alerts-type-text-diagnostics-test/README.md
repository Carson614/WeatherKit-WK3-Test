# WK3 Weather Alerts Type Text Diagnostics Test

独立诊断副本，基于已发布的 `wk3-v3-weather-alerts-match-diagnostics-test`。只为下一次房山区真机请求记录 Apple 与 QWeather 预警类型文本，**不改匹配条件、详情链接、AQI 或分钟降水**。

## 日志

日志只输出最多 2 条 Apple 事件、最多 4 条当前 QWeather 地区页候选及其两两比较。格式示例：

```text
[WK3WA type] Apple e0 raw="..." normalized="..."
[WK3WA type] QWeather q0 eventName="..." eventNameNormalized="..." description="..." descriptionNormalized="..." matchNormalized="..."
[WK3WA type] compare e0/q0 equal=false appleOnly="..." qweatherOnly="..." commonPrefix="..." commonSuffix="..."
```

`raw` 是 WK3 Apple `description`；QWeather 的 `eventName` 与原始标题 `description` 分开记录。`matchNormalized` 是当前严格匹配器实际比较的类型键。`appleOnly` / `qweatherOnly` 给出归一化后不同的文字，公共前后缀单独列出。长文本日志最多保留 160 个 Unicode 字符。

诊断日志不包含请求 URL、坐标、令牌、事件 ID、正文或其他请求字段。脚本在初始化和请求处理前将通用日志级别固定为 OFF，只有上述类型文本走单独日志输出；通用错误/调试日志也不会显示。响应中的 `X-WK3-Alerts-Diag` 与 `X-WK3-NextHour-Diag` 保持现有安全状态码，不附带标题。

## 安全边界

- Apple 和 QWeather 事件只按既有规则逐项严格匹配：地区、规范化类型、已验证级别、精确发布时间、唯一候选。
- 不添加别名、不模糊匹配、不读取周边区县页面候选。
- 任意一条 Apple 事件未匹配时，整批保留 Apple 原始响应及原始详情链接。
- AQI 美标和昨日比较、分钟降水、WK3 未知根槽透传继续沿用已真机验收的基线实现。
- 这是独立真机诊断模块；不要与现用模块叠加产生重复脚本命中。手动添加后只观察一条房山区 WeatherKit 请求的脚本日志和诊断 Header。

## 验证

使用匿名合成 WK3 b66 响应与匿名 QWeather 页面回放。没有使用真实 Apple 二进制、坐标、令牌或天气响应；自动化回放不等于 iPhone 验收。构建通过固定锚点将诊断代码叠加到已验证脚本，**不是完整 Rollup 源码构建**（此前私有包 `@nsringo/weatherkit` 拉取返回 HTTP 401）。

```sh
npm run build
node --check request.dev.bundle.js
node --check response.dev.bundle.js
npm test
```
