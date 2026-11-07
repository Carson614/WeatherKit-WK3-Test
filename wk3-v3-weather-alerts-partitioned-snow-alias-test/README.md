# WK3 Weather Alerts Partitioned Snow Alias Test

此独立测试版基于上一版房山类型文本诊断分支，仅添加已由真机日志确认的精确名称别名：和风 `分区暴雪` 对应 Apple `暴雪`。它不会通用移除“分区”前缀。

## 严格条件

预警仍须逐条满足大陆地区、规范化类型、已验证级别、精确发布时间和唯一候选。所有 Apple 预警都匹配成功后才改写详情链接；任一条失败则整批保持 Apple 原始二进制和链接。响应诊断中的 `e0=matched:r2t1s1p1c1` 表示地区、类型、级别、发布时间和唯一候选检查均通过。

详情页面改写到 WK3 原生 `/api/v1/weatherAlerts` 或 `/api/v2/weatherAlerts` 路由。自动回放分别模拟两个路由，并检查 `WK3WD/2;route=v1|v2;result=details_served`；这不是 iPhone 上实际发出详情请求的证明。

## 回归范围

自动化覆盖精确别名、非暴雪类型不扩展、级别/时间/唯一性门槛、整批回退、详情路由、WK3 AQI 与昨日比较、分钟降水及未知根槽位。

AQI/分钟雨逻辑沿用真机验收基线 `34475524c06ca7d5c6d17da18612548cd8b0b2e6`。脚本通过固定锚点增量构建，不是完整 Rollup 源码构建；回放测试不等于真机验收。保留上游 Apache-2.0 许可证和归属声明。

安装前请在 Surge 中单独测试本模块，避免与旧版规则重复命中。真机验收时检查响应 Header 中 e0、e1 的匹配计数，并打开 Apple 预警详情；确认详情请求命中 v1/v2 路由且 Header 为 `result=details_served`。
