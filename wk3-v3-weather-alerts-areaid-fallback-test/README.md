# WK3 Weather Alerts AreaID Fallback Test

此独立修复版从 National Registry Test 固定提交增量构建，只调整 Apple `areaId` 缺失时的地区验证。它不覆盖现有 V1/V2、MinFix、Next Hour 或 National Registry 测试版，也不修改正在运行的 Surge 配置。AQI、昨日比较、WK3 分钟降水、未知根槽位保护和 Apache-2.0 归属沿用验收基线。

## Apple `areaId` 缺失时的严格验证

Apple 预警缺少 `areaId` 时不再单独拒绝，但必须同时满足：Apple `countryCode=CN`；Apple 原始预警详情链接是受支持的和风预警页面且包含地区编码；和风候选来自该精确页面并具有相同地区编码。Apple 显式给出不同 `areaId`、来源地区不一致或链接无法解析时仍整批回退。类型、已验证级别、精确发布时间、活动状态、唯一候选及 Apple 原事件 ID 规则保持不变。

新增房山双预警回归：Apple `areaId` 字段缺失，原链接指向 `fangshan-101011200`，两条「暴雪/道路结冰」均须通过地区、类型、级别、时间和唯一性校验后才允许重写链接。该回放是合成测试，不是本版本 iPhone 真机结果。

## 预警类型注册表

`src/class/WeatherAlertTypeRegistry.mjs` 按来源登记中国气象局国家基础 14 类、QWeather 官方事件代码，以及有明确地域来源的四川/深圳地方扩展。当前地方条目只覆盖已核对来源的扩展示例，不代表全国所有省市规范已穷尽；没有注册的名称不匹配并保留 Apple 原始预警。

QWeather 官方事件表将事件代码作为类型 ID；只有实际输入包含 `eventType.code` 时才按代码查表。当前 QWeather 网页抓取器没有这个字段，因此脚本不从页面标题伪造代码，只使用受控精确名称和已验证别名。`恶劣天气` 等宽泛词不会映射到具体灾害，`分区` 不会被通用删除；仅保留真机标题证据支持的 `分区暴雪 ↔ 暴雪`。

政府颜色、QWeather API `severity` 和 Apple WK3 原始 severity 是三个独立字段。官方网页仅提供标题/CSS 颜色，故其 QWeather severity 保持 unknown。Apple b66 当前仅有 raw `3=moderate`、`4=minor` 的配对证据。网页来源只保留实测 `raw 3 + yellow` 交叉验证；红、橙、蓝或未知枚举在没有更多实测交叉证据前都回退。日志最多记录 4 条 Apple 事件和 4 条来源候选的灾害类型、枚举、颜色、发布时间与逐谓词结果，不输出 URL、坐标、令牌、Apple 事件 ID或响应正文。

详情链接只在类型、QWeather 点位/Apple 行政区一致、严重程度、精确发布时间、活动状态和唯一候选全部通过后改写。任何更新/解除、结构异常、歧义或未验证枚举都整批保留 Apple 原响应与详情链接。

## 已有实测和未确认项

- 北京房山此前真机记录确认 e1（道路结冰）曾匹配，e0 类型文本为“暴雪”与“分区暴雪”。完整双预警在本分支的匿名 WK3/HTML 回放中覆盖，但本次版本尚未真机复测，因此不把合成回放称为双预警真机成功。
- 贵州万山先前真机诊断只记录 `e0=severity_unverified`、`e1=type_no_match`，未提供原始 WK3 severity 整数、原始两条类型文本和候选时间。本模块会在下一次测试请求输出匿名所需字段；本地另以未知枚举/类型样本验证失败回退，不冒充真实万山包回放。
- QWeather HTML 无官方 `eventType.code` 和 API `severity`，地方预警范围仍以 Apple 区域字段与区域页面为边界；不支持的来源结构回退。

## 自动验证与构建

运行 `npm test`。测试覆盖国家 14 类、已登记地方扩展、四种政府颜色、未知级别、时间不一致、行政区不一致、Apple `areaId` 缺失的房山双预警、多条预警、更新/解除、严格 alias、AQI/昨日比较、分钟降水、WK3 未知根字段及请求失败时的原包回退。

脚本由哈希锁定的已验收 bundle 固定锚点增量生成，不是完整 Rollup 源码构建；上游私有包 `@nsringo/weatherkit` 曾返回 HTTP 401。真机验收仍待进行，尤其需要收集万山匿名 raw severity 值和北京房山本版 e0/e1 双匹配结果。

## 手动验收

将其作为独立实验模块安装，不与其他 WK3 响应模块同时命中。检查 `X-WK3-Alerts-Diag` 与 Surge 脚本日志：房山须逐条得到 `matched`，详情请求须由本模块 v1/v2 路由返回 `details_served`；万山未知级别或类型必须保持 Apple 原详情链接。确认 AQI 和分钟雨维持当前已验收行为后再提交反馈。自动测试不等于 iPhone 真机通过。
