# WK3 National Alerts Four-Level + Next Hour Fix

独立 Surge 真机实验模块，基于已经通过 iOS 27.3 + Surge 6.100.0 验收的 MinFix-US-AQI、分钟降水与天气预警实现。本目录不替换任何 V1/V2 或既有已验收版本。

## 预警严重程度

| 政府颜色 | CAP severity | WK3 raw | 本版状态 |
|---|---|---:|---|
| 蓝 | Minor | 4 | 已有上游枚举及吐鲁番大风真机证据 |
| 黄 | Moderate | 3 | 已有上游枚举、房山/张家港真机证据 |
| 橙 | Severe | 2 | 唐山三预警真机通过的实验推断；不是 Apple 协议定义 |
| 红 | Extreme | 1 | 用户授权的独立实验假设；无 Apple 直接定义或红色真机配对 |

APPLE_WK3_SEVERITY 只登记已验证的 raw3/raw4。raw2 与 raw1 分别保存在实验表中。raw1 默认仅在本模块启用，可独立关闭：把模块参数 WeatherAlerts.ExperimentalRaw1 设为 false。关闭它不会关闭 raw2 橙色实验。

映射只对国家基础 14 类中规范允许的颜色开放。地区、事件类型、政府颜色、Apple raw severity、精确发布时间、有效生命周期、唯一候选及 Apple 原事件身份均须通过；和风结构化 severity 与政府颜色冲突时拒绝。Apple 原标题、ID、raw severity、发布时间及来源保留。全批事件都匹配后才会改写集合共享详情路由；否则整批保留 Apple 原始链接与内容。未匹配、歧义、取消、过期/版本冲突、未知枚举和结构错误均失败透传。

唐山暴雪橙色、寒潮蓝色、大风蓝色的集合级原生详情已在真机分别展开验收。本次新增 raw1 红色路径只有合成测试，尚无红色真机验收。

## 分钟降水转换

此前 provider_data_rejected_summary_enum 的代码层根因是 WK3 summary precipitation 映射只接受 CLEAR 和 RAIN，provider 对合法液态降水还可能生成 DRIZZLE、HEAVY_RAIN 或 POSSIBLE_DRIZZLE。先前 Surge 状态头未记录具体符号，因此不能断定唐山那次被拒绝的确切枚举；本版新增 X-WK3-NextHour-Diag: WK3NH/4，安全显示失败阶段、允许列表中的符号、是否有实际强度/概率、summary/condition/minute 数量、分钟间隔、时间线状态和雨型概况，不包含坐标、令牌或响应正文。

只有同一时间段内存在正的分钟降水强度与概率、分钟与 summary 时间边界一致且数组时间线通过时，才把 DRIZZLE、HEAVY_RAIN、POSSIBLE_DRIZZLE 归一到 WK3 已验证的粗粒度 RAIN；POSSIBLE_DRIZZLE 没有实际湿强度证据时仍拒绝。晴天只有无实际降水强度时才能编码为 CLEAR。雪、雨夹雪、冰雹、混合相态、多枚 summary condition、未知符号、缺失数值或错误时间线不会被猜成雨，分钟降水保持 Apple 原值。失败仅回退分钟降水写入，不撤销同一响应已经完成的 AQI 写入。

没有用户提供的原始唐山 WK3 bin 可用于回放，因此该次实际拒绝符号仍需由 WK3NH/4 真机诊断确认。合成样本覆盖晴天、连续雨、毛毛雨、强雨、雨停再下、类型未知、数值缺失及时间线异常；这些不是天气预报准确性或真机证明。

## 保留功能与回归

- 美国 AQI：EPA_NowCast.2604，HJ6332012 转换、缺失 AQ 安全补入及昨日 ColorfulCloudsUS 同源比较沿用通过验收的基线。
- 分钟降水使用 WK3 专用 FlatBuffer 结构及 root slot 5 安全重建；未知根槽位与失败透传保护保留。
- 天气详情：只在整批严格匹配时写共享原生详情；v1/v2 路由服务已捕获的同批详情并核验原 Apple 事件 ID。
- 已有回归：房山暴雪＋道路结冰；吐鲁番蓝色大风；唐山橙色＋两条蓝色预警共享详情。

## 构建与证据边界

脚本从 SHA-256 固定的已真机验收 Next Hour Provider Conversion bundles 做锚点增量构建，再内嵌本目录预警代码；这不是完整 Rollup 源码构建。完整 Rollup 所需的私有 GitHub Packages 依赖曾返回 401，故本次不宣称完整源码构建通过。构建报告记录锚点、构建 bundle/module 哈希和资产 commit。最终 Surge 模块由你在 iPhone 上单独安装验收；自动化回放不等于真机通过。

上游实现保留 Apache-2.0 版权声明，根目录 LICENSE 保留许可证文本。
