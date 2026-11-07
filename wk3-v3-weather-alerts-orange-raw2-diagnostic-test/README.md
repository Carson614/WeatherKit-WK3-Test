# WK3 Orange / raw2 Evidence Diagnostic Test

独立诊断版，以 `WK3 Weather Alerts National Crosswalk Update Test` 为基线。它不增加橙色匹配，不改变现有匹配或天气数据逻辑；Apple WK3 raw2 与橙色预警仍安全回退。AQI、昨日比较、分钟降水、房山双预警、吐鲁番蓝色大风及更新预警沿用已验收逻辑。

## 证据结论

上游 `WeatherKit-WK3` v3.3.6 的 WK3 b66 codec 只给 raw0、raw3、raw4 明确名称：`UNKNOWN`、`MODERATE`、`MINOR`。代码按原始 byte 读取 severity，注释明确未知整数只 round-trip；没有把 raw2 映射为 `SEVERE`。v3.3.6 仓库没有发布 WK3 severity schema/生成枚举。该仓库的 `wk2.js` 是 WeatherKit 2 schema，确实定义 raw2=`SEVERE`，但不能拿 WK2 定义填补 WK3 缺口。

QX/T 408—2017 表 6 规定政府颜色到 CAP severity：蓝→Minor、黄→Moderate、橙→Severe、红→Extreme。它证明的是中国颜色与 CAP 的对应，不证明 Apple WK3 的整数编码。表 4 的 CAP severity 词义与和风 API 的 `severity` 词汇相似，但仍是不同字段；和风 API 把 `eventType.code`、`severity`、`color.code`、`issuedTime`、`messageType` 分开提供。网页解析若没有 API severity，就只能报告 `unknown`。

因此当前映射仍为：

| 政府颜色 | QX/T 408 表 6 → CAP | WK3 b66 raw | 处理 |
| --- | --- | ---: | --- |
| 蓝 | Minor | 4（源码及真机有证据） | 按 14 类适用颜色匹配 |
| 黄 | Moderate | 3（源码及房山、张家港证据） | 按 14 类适用颜色匹配 |
| 橙 | Severe | 未证实；本轮 raw2 真机配对仍缺 Apple JSON token | 原样回退 |
| 红 | Extreme | 未证实 | 原样回退 |

唐山响应头 `r3t1s0p1c0:raw2:qunknown:gorange` 证明了地区/类型/发布时间候选关系、raw2 与橙色同时出现，但没有 e0 类型文本，也没有 Apple JSON severity。因此不能据此认定 e0 是暴雪，也不能认定 raw2=Severe。

## 本版新增诊断

只有出现 Apple raw2 时，Surge 脚本日志额外输出一条 `[WK3WA raw2-evidence]`。它包含 Apple 原始及归一化类型、注册类型、raw2、Apple 发布时间、和风候选原始标题及归一化类型、和风页面地区名、政府颜色、API severity、时间/类型/地区比较、活动状态及去除 severity 后的唯一身份候选数，并明确写 `appleJsonSeverityEvidence=not_captured`。

诊断不输出 Apple 事件 ID、和风事件 ID、地区编码、位置坐标、请求 URL、令牌或完整响应；也不修改回退决策。若身份候选唯一但严重程度未验证，`identityUnique=true` 同时 `severityMatch=false`，最终仍是 `severity_unverified`。证明 raw2 为 Severe 仍需同一事件的 WK3 raw2 与 Apple JSON `severity=severe` 直接配对；当前请求详情不自动取得该 JSON 字段。

## 回归与限制

自动测试覆盖 14 类及各自适用颜色、蓝/黄现有映射、raw2/橙色安全回退、唐山合成对照、房山双预警、吐鲁番蓝色大风、更新/取消、时间/地区冲突、唯一候选、v1/v2 详情路由、AQI、昨日比较、分钟降水、未知 WK3 根字段及失败透传。合成回放不等于真机验收。

脚本由已验收的 Next Hour Provider Conversion 固定构建产物进行锚点增量构建；没有声称完成 Rollup 源码构建。完整 Rollup 先前受私有 `@nsringo/weatherkit` GitHub Packages HTTP 401 阻挡。分钟降水 `provider_data_rejected_summary_enum` 是既有独立问题，本版没有修改它。

真机检查 raw2 时，只需查看 `[WK3WA raw2-evidence]` 行及同一请求的 `X-WK3-Alerts-Diag`；重点核对 `appleType/typeId/raw/issuedTime`、唯一和风候选、颜色、API severity、`regionMatch/typeMatch/issueTimeMatch`。本版尚未真机验收。

## 来源与许可证

- QX/T 408—2017 表 6（中国气象局）：<https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/bz/202209/P020220921686798381547.pdf>
- Apple WeatherSeverity：<https://developer.apple.com/documentation/weatherkit/weatherseverity>
- 和风实时预警 API：<https://dev.qweather.com/docs/api/warning/weather-alert/>
- 上游 WK3 v3.3.6 codec：<https://github.com/patrickyanxxxxx/WeatherKit-WK3/blob/v3.3.6/src/wk3/class/WK3Alerts.mjs>
- 上游 WK2 generated schema（仅作不可混用的对照）：<https://github.com/patrickyanxxxxx/WeatherKit-WK3/blob/v3.3.6/src/wk3/proto/apple/wk2.js>

保留 WeatherKit-WK3 / NSRingo Apache-2.0 许可证和归属；此模块为独立诊断实验版。
