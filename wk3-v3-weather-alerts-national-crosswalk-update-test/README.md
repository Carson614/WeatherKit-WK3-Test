# WK3 Weather Alerts National Crosswalk and Update Test

独立的 Surge 真机实验模块。以已验收 AQI、昨日比较及 WK3 分钟降水为基线，仅扩展国家 14 类预警颜色交叉表和有效更新匹配。不会修改 V1/V2、其他已验收模块或当前 Surge 配置。

## 研究结论

中国气象局令第 16 号登记国家基础 14 类及各类适用颜色。QX/T 408—2017 表 6 要求预警颜色代码与 CAP `severity` 同时对应：蓝→Minor、黄→Moderate、橙→Severe、红→Extreme。标准附录 A 的持续低温黄色示例却写 `Severe`，与表 6 冲突；实现采用规范表 6，不以资料性示例覆盖规范表。

WK3 b66 的上游 v3.3.6 注释和配对观察只确认 raw3=MODERATE、raw4=MINOR；raw2、raw severe/extreme 编码仍未知。因此：

| 政府颜色 | CAP severity（标准） | WK3 原始值 | 实验行为 |
| --- | --- | ---: | --- |
| 蓝 | Minor | 4 | 国家类型允许该颜色时可匹配 |
| 黄 | Moderate | 3 | 国家类型允许该颜色时可匹配 |
| 橙 | Severe | 未确认 | 保留 Apple 原响应 |
| 红 | Extreme | 未确认 | 保留 Apple 原响应 |

国家类型适用颜色仍按 CMA 令第 16 号分别限制，不会给干旱、冰雹等类型虚构蓝色级别。四套概念——政府颜色、CAP severity、和风 API severity、Apple WK3 raw severity——分开校验。若同时有和风 API severity 与政府颜色，两者映射出的 CAP severity 也必须一致，否则 `severity_evidence_conflict` 并回退。明确保留「分区暴雪↔暴雪」精确别名；「恶劣天气」不映射为具体灾害。

规范和来源：

- [中国气象局令第 16 号](https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/gz/202005/P020220628619411458474.pdf)
- [QX/T 408—2017](https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/bz/202209/P020220921686798381547.pdf)
- [QWeather 预警事件表](https://dev.qweather.com/docs/api/warning/alert-events/)
- [QWeather Weather Alert API](https://dev.qweather.com/docs/api/warning/weather-alert/)
- [QWeather 生命周期与时间说明](https://dev.qweather.com/docs/api/warning/alert-changes/)
- [QWeather 当前预警与时间字段说明](https://dev.qweather.com/docs/api/warning/alert-guide/)
- [WK3 v3.3.6 b66 severity 定义](https://github.com/patrickyanxxxxx/WeatherKit-WK3/blob/v3.3.6/src/wk3/class/WK3Alerts.mjs)

## 更新预警

QWeather 官方定义 `update` 会取代 `supersedes` 中旧消息，且更新仍属于当前有效预警；`cancel` 是取消消息。QWeather API 的当前预警接口需要 JWT 和 API Host，本模块不假定用户拥有授权，继续使用无令牌的公开网页解析。

此前代码把网页标题中的「更新/变更」在精确时间与级别比较前一律拒绝，导致有效更新被 `source_updated` 误拦。本版只在类型、地区、WK3/CAP 严重程度（API severity 与颜色同时存在时二者一致）和唯一候选均通过、且 Apple 与 QWeather `issuedTime` 精确相同的情况下接受更新。若网页有较新的同类更新，旧 Apple 版本会以 `source_update_newer_candidate` 回退；发布时间不一致则以 `source_update_version_mismatch` 回退。取消、未知生命周期、歧义或结构失败继续透传。

公开 HTML 未提供结构化 `id/supersedes` 链和完整 expiry 字段；精确发布时刻是当前网页路线用于版本绑定的代理证据，不等同于 API ID 链验证。这是本实验的已知限制，未匹配时宁可不补详情。唐山用户日志未带 Apple 类型、QWeather 原始标题和发布时间，不能判断 e0/e2 对应哪一条预警；raw2 也继续未确认。

## 批量验证

测试按国家 14 类和每类法定颜色矩阵生成回放，验证蓝/黄通用交叉表、橙/红与 raw2 安全回退、来源更新/取消、地区冲突、精确时间、唯一候选、房山双预警、吐鲁番蓝色大风、AQI、昨日比较、分钟降水和未知 WK3 根字段。内置 QWeather API 文档中的 update 示例明确标记为文档样例，非实时抓取、非 Apple 配对证据。`PublicWarningSampleLedger.mjs` 只保留公开页面的类型、颜色、状态、地区代码和时间，去重且不会保存消息正文或授权信息。

这轮未能从运行环境批量取得公开 QWeather 页面：`www.qweather.com` 在该环境返回 Forbidden；官方 QWeather API 和中国天气网 SmartWeatherAPI 均要求申请认证。没有使用或索要令牌，也没有把文档示例称作真实配对。自动矩阵覆盖规则，公开样本的全国实时分布仍待可访问来源。

## 验证和限制

本版保留 AQI / yesterday / minute rain 的已验收逻辑和原始 WK3 未知字段；分钟降水已有 `provider_data_rejected_summary_enum` 的独立既有诊断，本次没有改动它。自动测试是合成回放，不代表新模块已真机验收。完整 Rollup 构建曾受私有 GitHub Packages 401 阻断；本版按原固定锚点方式生成脚本，并会报告此限制。

诊断继续使用 `X-WK3-Alerts-Diag`。真机检查：房山双预警应仍为严格匹配；吐鲁番大风蓝色应 `raw4`、`gblue`、`matched`；更新事件如时间一致可见 `matched_update_current`，旧版被较新更新取代时为 `source_update_newer_candidate`；raw2 应为 `severity_unverified`。确认 AQI 和分钟降水无回归。不要将自动测试视为真机通过。

## 许可证

保留上游 WeatherKit-WK3 / NSRingo Apache-2.0 许可证和归属声明。此测试版不是正式稳定版。
