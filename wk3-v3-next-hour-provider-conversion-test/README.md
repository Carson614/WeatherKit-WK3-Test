# WK3 Next Hour Provider Conversion Test

独立的 Surge 手动测试模块，基于已验收的 `MinFix-US-AQI-Test`（`f5b344b95f8bee0e2de3b09cb92e936c8e316a4a`）及根 slot 重建研究（`881b92927b5991fb307cf691cb8236e2e2584c1f`）。保留美国 AQI、昨日同源比较、大陆识别、CN_AQHI 修复、WK3 未知根槽位和安全根表重建；本目录只处理分钟预报转换，不包含预警逻辑。

## 本轮修复

真机 `WK3NH/2` 显示根 slot 5 为零偏移，彩云已被调用。旧转换器会将多个互不相同的输入问题折叠成 `provider_data_rejected`。

- 彩云上游 v3.3.6 `ForecastNextHour.Minute/Summary/Condition` 会生成 `HEAVY_RAIN`、`POSSIBLE_DRIZZLE` 和 `STOP_START`。WK3 b66 已验证的条件枚举包括 `CLEAR`、`RAIN`、`DRIZZLE`；未知名称不再直接造成无法定位的静默拒绝。
- 确认为降雨摘要时，`HEAVY_RAIN` 与 `POSSIBLE_DRIZZLE` 作为雨况细分映射到已确认的 WK3 `RAIN` 值。雨量、概率、分钟时间和宽泛摘要仍按原始彩云输出写入。
- 对上游精确的 `RAIN → CLEAR → RAIN` 三段形态，只将未验证的复合令牌 `STOP_START` 展开为已确认的 `STOP → START → CONSTANT`；先校验段边界及参数时间。没有给未验证令牌猜测数值。
- 上游 `Condition()` 会截取超过四段的摘要，并因浅复制修改第 4 段结束时间。构建器现在传入摘要副本。截断或段数不一致的复杂天气变化继续回退，保持 Apple 原始子表。
- `X-WK3-NextHour-Diag` 升到 `WK3NH/3`，`result` 使用固定代码，如 `provider_data_rejected_condition_enum`、`provider_data_rejected_token_enum`、`provider_data_rejected_probability`、`provider_data_rejected_summary_timeline` 和 `provider_data_rejected_composite_token`。不会输出异常文本、坐标、令牌或天气数据。

分钟开始时间须逐分钟连续；概率按上游彩云 `probability × 100` 转成 0–100 整数；强度保持 `mm/h`。时间线、数组结构、概率范围或枚举不符合校验时不修改分钟雨数据，其他 AQI 写回仍独立完成。

## 自动验证

运行：

```sh
npm install
npm run build
npm test
```

合成回放覆盖无雨、连续弱雨、强雨、降雨开始/停止、强度变化、雨/晴/雨、过多转换段、错误概率和不支持的条件。还验证了输出重解码、minute 时间线、美国 AQI 与昨日比较、未知根槽位字节、slot 5 根表重建、无效指针回退、失败透传和重复处理。测试不代替 iPhone 真机验收，也没有使用张家界用户原始包。

## 构建与许可

响应脚本通过固定锚点增量修改已经通过 AQI 测试的基线脚本，并嵌入 WK3 专用 b66 编解码器；编解码器和分钟生成器参考 `patrickyanxxxxx/WeatherKit-WK3` v3.3.6（`9fc8d85afaf595f338db032090a77283a5c63db3`）。这不是完整 Rollup 源码构建：完整构建仍因私有 `@nsringo/weatherkit` 依赖返回 HTTP 401 而无法完成。仓库保留了上游 Apache-2.0 许可文本。

没有修改现有 Surge 配置或已发布模块。当前目录及模块均为独立实验版本；未宣布稳定，也未声称真机通过。
