# WK3 Orange / raw2 Severe Experiment

独立真机实验版，基于 `WK3 Weather Alerts National Crosswalk Update Test` 的固定诊断源码与已验收 AQI、分钟降水 bundle。此分支只试验国家基础 14 类中规范允许橙色的事件：Apple WK3 raw2 → Severe，并将其与 QX/T 408—2017 Table 6 的橙色 → CAP Severe 对照。**raw2 → Severe 是实验性推断，不是 Apple 协议定义，也没有 Apple JSON 同事件配对确认。**

## 匹配与回退

- raw4 → Minor → 蓝色和 raw3 → Moderate → 黄色保持已有源码及真机证据；红色 / Extreme 仍不可匹配。
- raw2 规则在 `APPLE_WK3_EXPERIMENTAL_SEVERITY` 中单独登记，绝不混入 `APPLE_WK3_SEVERITY`。只有国家 14 类注册类型、该类型允许橙色、和风页面明确为橙色、WK3 raw 为 2，并且地区、精确发布时间、生命周期和唯一候选全部通过时才进入实验匹配。若结构化和风 API severity 与颜色不一致，则拒绝。
- 保留 Apple 原始事件 ID、标题、raw severity、发布时间和来源字段；只在完整匹配后写共享详情 URL。任一事件未匹配、取消、过期/版本冲突、来源不可用、候选歧义或编码异常时，整个预警集合保持 Apple 原始链接和数据，不做部分改写。
- 内置详情路由仍校验 Apple 原事件 ID、区域、类型、发布时间及 severity。实验详情将 raw2 解读为 `severe`；其它未知 WK3 raw 继续拒绝。
- AQI（EPA_NowCast.2604）、昨日同源比较、分钟降水及 WK3 未知根字段实现沿用基线；警报功能仅在其后的独立写回步骤处理。

## 证据边界

上游 `patrickyanxxxxx/WeatherKit-WK3` v3.3.6 的 WK3 b66 codec 源码只确认 raw3=`MODERATE`、raw4=`MINOR`，没有给出 raw2 的语义。唐山路北区用户真机日志提供了 raw2「暴雪」与和风「暴雪橙色预警」在地区、类型、准确发布时间、单一身份候选上的严格配对；这是本实验的动机，但没有 Apple JSON `severity=severe`，也不能证明所有 WK3 raw2 的协议含义。CMA/QX/T 规范只确定政府颜色 / CAP severity 的对应，不决定 Apple raw 枚举。

因此本版不得被视为稳定默认映射。真机验收只说明这组约束下客户端呈现是否可用，不会把实验推断升级为 Apple 官方协议证据。

## 自动验证

自动测试覆盖国家 14 类适用橙色、错误颜色/严重程度拒绝、raw2 未知/非橙色回退、蓝黄既有规则、唐山三预警完整共享路由及 v1/v2 详情、房山双预警、吐鲁番蓝色大风、update/cancel/时间冲突/歧义/地区冲突、AQI/昨日比较、分钟降水、未知根字段及失败透传。合成样本回放不等同 iPhone 真机验收。

## 构建限制

分发脚本由已通过 iPhone 验收的固定 Next Hour bundle 进行固定锚点增量构建并内嵌预警实现；它不是完整 Rollup 源码构建。此前完整 Rollup 构建受私有 GitHub Packages 依赖返回 401 阻挡。发布报告将记录 bundle SHA-256 与固定 Git commit。

上游实现保留 Apache-2.0 版权与许可证声明，仓库根目录 `LICENSE` 保留原许可证文本。
