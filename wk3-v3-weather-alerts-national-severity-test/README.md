# WK3 Weather Alerts National Severity Evidence Test

这是独立的国家基础气象灾害预警匹配测试版，基于已验收的 WK3 Next Hour Provider Conversion 功能及现有 Weather Alerts 实验代码。它保留美国 EPA AQI、昨日比较、分钟级降水、未知 WK3 字段透传及严格失败回退。不会修改 V1/V2、现有测试模块或当前 iPhone Surge 配置。

## 类型与来源

国家基础 14 类按中国气象局《气象灾害预警信号发布与传播办法》（中国气象局令第16号）登记，和风事件代码对照来自和风官方事件表：

| 类型 | 和风 eventType.code | 国家颜色级别 |
| --- | ---: | --- |
| 台风 | 1001 | 蓝、黄、橙、红 |
| 暴雨 | 1003 | 蓝、黄、橙、红 |
| 暴雪 | 1004 | 蓝、黄、橙、红 |
| 寒潮 | 1005 | 蓝、黄、橙、红 |
| 大风 | 1006 | 蓝、黄、橙、红 |
| 沙尘暴 | 1007 | 黄、橙、红 |
| 高温 | 1009 | 黄、橙、红 |
| 干旱 | 1022 | 橙、红 |
| 雷电 | 1014 | 黄、橙、红 |
| 冰雹 | 1015 | 橙、红 |
| 霜冻 | 1016 | 蓝、黄、橙 |
| 大雾 | 1017 | 黄、橙、红 |
| 霾 | 1019 | 黄、橙 |
| 道路结冰 | 1021 | 黄、橙、红 |

规范链接：
- CMA 第16号令附件：https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/gz/202005/P020220628619411458474.pdf
- 和风预警事件表：https://dev.qweather.com/docs/api/warning/alert-events/
- 和风 Weather Alert API：https://dev.qweather.com/docs/api/warning/weather-alert/
- 和风预警说明：https://dev.qweather.com/docs/api/warning/alert-guide/
- 和风服务覆盖：https://dev.qweather.com/docs/api/warning/alert-coverage/

标题解析只去除常见颜色/预警后缀。保留已经真机确认的精确别名“分区暴雪→暴雪”，不通用删除“分区”。“恶劣天气”不会被归为某个具体灾害。地方类型范围没有扩大。

## 严重程度与证据

政府颜色、和风 API severity（unknown/minor/moderate/severe/extreme）和 Apple WK3 b66 原始 severity 是三套独立值，不能按颜色猜 Apple 枚举。

- 已有 b66 配对数据确认 Apple raw 3=moderate、raw 4=minor。
- 真机匹配证据仅支持黄色/raw 3 用于暴雪、道路结冰、寒潮。
- 蓝色、橙色、红色没有已验证的 HTML 颜色到 WK3 raw 映射；其他国家类型的网页颜色映射也未验证。
- 吐鲁番蓝色大风的原始 Apple severity 尚未在已提供日志中出现；本版诊断头会报告 raw 值，供真机确认。测试不会把 raw 4 预设成蓝色。

只有 QWeather 页面颜色且 type/color/WK3 配对有真实证据时才比较；未知级别和不支持的颜色对保留 Apple 原响应。类型、地区、级别、精确发布时间、活动状态、唯一候选和 Apple 原事件身份检查保持严格。诊断头的 r/t/s/p/c 分别记录地区候选、类型候选、级别候选、精确发布时间候选及最终候选数；raw/q/g 仅记录受限枚举。

## QWeather API 评估

官方 API 返回 eventType.code、severity、issuedTime、messageType、有效/起止时间及预警文本。请求需要已配置的 API host 和 JWT；本测试版没有假定用户有 API 授权，也不读取或记录用户令牌。结构化 API 可在未来配置后作为优先来源；当前实现继续使用公开网页解析回退。网页解析不会伪造 eventType.code 或 API severity。API 的坐标查询返回适用于该点的预警，公开响应 schema 未提供用于独立校验每条预警行政边界的多边形，因此现有地区锚定仍须保留。

## 构建与验证

构建脚本从固定 SHA-256 的已验收脚本做确定性锚点增强，并生成 Surge request/response bundle；这不是完整 Rollup 源码构建。完整 Rollup 所需的私有依赖曾返回 HTTP 401，因此不声称完成完整源码构建。

本目录测试通过后，模块中的两条脚本 URL 会固定到同一验证提交 SHA。验证包含 14 类精确名称/事件代码、各类型适用颜色矩阵、所有未验证颜色对的失败透传、精确发布时间诊断、多条事件、来源失败、未知 severity、房山双预警、AQI/昨天比较、分钟降水和未知 FlatBuffer 根字段。

合成回放不代表真机验收。本模块需在 iPhone Surge 单独安装验收吐鲁番 raw severity、现有匹配及其他天气功能；不要和其他命中同一 WK3 请求的测试模块同时启用。

## 许可证

保留上游 NSRingo WeatherKit Apache-2.0 许可证与版权声明。该独立测试分支只增加 WeatherKit WK3 兼容及诊断逻辑。
