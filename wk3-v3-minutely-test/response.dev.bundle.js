console.log('Date: 2026/11/6 15:21:40');
console.log('Version: dev');
console.log('response.dev.bundle.js');
console.log(' iRingo: 🌤 WeatherKit β');
/* https://NSRingo.github.io/guide/Weather/weather-kit */
/**
 * 当前运行平台名称（脚本平台优先，模块系统次之）。
 * Current runtime platform name (script platform first, module system second).
 *
 * 识别顺序:
 * Detection order:
 * 1) `$task` -> Quantumult X
 * 2) `$loon` -> Loon
 * 3) `$rocket` -> Shadowrocket
 * 4) `Egern` -> Egern
 * 5) `$environment["surge-version"]` -> Surge
 * 6) `$environment["stash-version"]` -> Stash
 * 7) `Cloudflare` -> Worker
 * 8) `process.versions.node` -> Node.js
 * 9) 默认回落 -> undefined
 *    default fallback -> undefined
 *
 * 说明:
 * Notes:
 * - 使用 `'key' in globalThis`，避免 `Object.keys` 对不可枚举全局变量漏检。
 * - Use `'key' in globalThis` to avoid missing non-enumerable globals with `Object.keys`.
 *
 * @type {("Quantumult X" | "Loon" | "Shadowrocket" | "Egern" | "Surge" | "Stash" | "Worker" | "Node.js" | undefined)}
 */
const $app = (() => {
	const has = key => key in globalThis;
	switch (true) {
		case has("$task"):
			return "Quantumult X";
		case has("$loon"):
			return "Loon";
		case has("$rocket"):
			return "Shadowrocket";
		case has("Egern"):
			return "Egern";
		case Boolean(globalThis.$environment?.["surge-version"]):
			return "Surge";
		case Boolean(globalThis.$environment?.["stash-version"]):
			return "Stash";
		case has("Cloudflare"):
			//case has("ServiceWorkerGlobalScope") && has("self") && has("caches") && has("scheduler"):
			return "Worker";
		case Boolean(globalThis.process?.versions?.node):
			return "Node.js";
		default:
			return undefined;
	}
})();

/**
 * 统一日志工具，兼容各脚本平台、Worker 与 Node.js。
 * Unified logger compatible with script platforms, Worker, and Node.js.
 *
 * logLevel 用法:
 * logLevel usage:
 * - 可读: `Console.logLevel` 返回 `OFF|ERROR|WARN|INFO|DEBUG|ALL`
 * - Read: `Console.logLevel` returns `OFF|ERROR|WARN|INFO|DEBUG|ALL`
 * - 可写: 数字 `0~5` 或字符串 `off/error/warn/info/debug/all`
 * - Write: number `0~5` or string `off/error/warn/info/debug/all`
 *
 * @example
 * Console.logLevel = "debug";
 * Console.debug("only shown when level >= DEBUG");
 * Console.logLevel = 2; // WARN
 */
class Console {
	static #counts = new Map([]);
	static #groups = [];
	static #times = new Map([]);

	/**
	 * 清空控制台（当前为空实现）。
	 * Clear console (currently a no-op).
	 *
	 * @returns {void}
	 */
	static clear = () => {};

	/**
	 * 增加计数器并打印当前值。
	 * Increment counter and print the current value.
	 *
	 * @param {string} [label="default"] 计数器名称 / Counter label.
	 * @returns {void}
	 */
	static count = (label = "default") => {
		switch (Console.#counts.has(label)) {
			case true:
				Console.#counts.set(label, Console.#counts.get(label) + 1);
				break;
			case false:
				Console.#counts.set(label, 0);
				break;
		}
		Console.log(`${label}: ${Console.#counts.get(label)}`);
	};

	/**
	 * 重置计数器。
	 * Reset a counter.
	 *
	 * @param {string} [label="default"] 计数器名称 / Counter label.
	 * @returns {void}
	 */
	static countReset = (label = "default") => {
		switch (Console.#counts.has(label)) {
			case true:
				Console.#counts.set(label, 0);
				Console.log(`${label}: ${Console.#counts.get(label)}`);
				break;
			case false:
				Console.warn(`Counter "${label}" doesn’t exist`);
				break;
		}
	};

	/**
	 * 输出调试日志。
	 * Print debug logs.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static debug = (...msg) => {
		if (Console.#level < 4) return;
		msg = msg.map(m => `🅱️ ${m}`);
		Console.log(...msg);
	};

	/**
	 * 输出错误日志。
	 * Print error logs.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static error(...msg) {
		if (Console.#level < 1) return;
		switch ($app) {
			case "Surge":
			case "Loon":
			case "Stash":
			case "Egern":
			case "Shadowrocket":
			case "Quantumult X":
			default:
				msg = msg.map(m => `❌ ${m}`);
				break;
			case "Worker":
			case "Node.js":
				msg = msg.map(m => `❌ ${m?.stack ?? m}`);
				break;
		}
		Console.log(...msg);
	}

	/**
	 * `error` 的别名。
	 * Alias of `error`.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static exception = (...msg) => Console.error(...msg);

	/**
	 * 进入日志分组。
	 * Enter a log group.
	 *
	 * @param {string} label 分组名 / Group label.
	 * @returns {number}
	 */
	static group = label => Console.#groups.unshift(label);

	/**
	 * 退出日志分组。
	 * Exit the latest log group.
	 *
	 * @returns {*}
	 */
	static groupEnd = () => Console.#groups.shift();

	/**
	 * 输出信息日志。
	 * Print info logs.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static info(...msg) {
		if (Console.#level < 3) return;
		msg = msg.map(m => `ℹ️ ${m}`);
		Console.log(...msg);
	}

	static #level = 3;

	/**
	 * 获取日志级别文本。
	 * Get current log level text.
	 *
	 * @returns {"OFF"|"ERROR"|"WARN"|"INFO"|"DEBUG"|"ALL"}
	 */
	static get logLevel() {
		switch (Console.#level) {
			case 0:
				return "OFF";
			case 1:
				return "ERROR";
			case 2:
				return "WARN";
			case 3:
			default:
				return "INFO";
			case 4:
				return "DEBUG";
			case 5:
				return "ALL";
		}
	}

	/**
	 * 设置日志级别。
	 * Set current log level.
	 *
	 * @param {number|string} level 级别值 / Level value.
	 */
	static set logLevel(level) {
		switch (typeof level) {
			case "string":
				level = level.toLowerCase();
				break;
			case "number":
				break;
			case "undefined":
			default:
				level = "warn";
				break;
		}
		switch (level) {
			case 0:
			case "off":
				Console.#level = 0;
				break;
			case 1:
			case "error":
				Console.#level = 1;
				break;
			case 2:
			case "warn":
			case "warning":
			default:
				Console.#level = 2;
				break;
			case 3:
			case "info":
				Console.#level = 3;
				break;
			case 4:
			case "debug":
				Console.#level = 4;
				break;
			case 5:
			case "all":
				Console.#level = 5;
				break;
		}
	}

	/**
	 * 输出通用日志。
	 * Print generic logs.
	 *
	 * 说明:
	 * Notes:
	 * - 多行字符串参数会按换行拆分为多个独立日志项。
	 * - Multi-line string arguments are split into multiple log entries by line breaks.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static log = (...msg) => {
		if (Console.#level === 0) return;
		msg = msg.flatMap(log => {
			switch (typeof log) {
				case "object":
					return [JSON.stringify(log)];
				case "bigint":
				case "number":
				case "boolean":
					return [log.toString()];
				case "string":
					return log.split(/\r?\n/u);
				case "undefined":
				default:
					return [log];
			}
		});
		Console.#groups.forEach(group => {
			msg = msg.map(log => `  ${log}`);
			msg.unshift(`▼ ${group}:`);
		});
		msg = ["", ...msg];
		console.log(msg.join("\n"));
	};

	/**
	 * 开始计时。
	 * Start timer.
	 *
	 * @param {string} [label="default"] 计时器名称 / Timer label.
	 * @returns {Map<string, number>}
	 */
	static time = (label = "default") => Console.#times.set(label, Date.now());

	/**
	 * 结束计时并移除计时器。
	 * End timer and remove it.
	 *
	 * @param {string} [label="default"] 计时器名称 / Timer label.
	 * @returns {boolean}
	 */
	static timeEnd = (label = "default") => Console.#times.delete(label);

	/**
	 * 输出当前计时器耗时。
	 * Print elapsed time for a timer.
	 *
	 * @param {string} [label="default"] 计时器名称 / Timer label.
	 * @returns {void}
	 */
	static timeLog = (label = "default") => {
		const time = Console.#times.get(label);
		if (time) Console.log(`${label}: ${Date.now() - time}ms`);
		else Console.warn(`Timer "${label}" doesn’t exist`);
	};

	/**
	 * 输出警告日志。
	 * Print warning logs.
	 *
	 * @param {...any} msg 日志内容 / Log messages.
	 * @returns {void}
	 */
	static warn(...msg) {
		if (Console.#level < 2) return;
		msg = msg.map(m => `⚠️ ${m}`);
		Console.log(...msg);
	}
}

/* https://www.lodashjs.com */
/**
 * 轻量 Lodash 工具集。
 * Lightweight Lodash-like utilities.
 *
 * 说明:
 * Notes:
 * - 这是 Lodash 的“部分方法”简化实现，不等价于完整 Lodash
 * - This is a simplified subset, not a full Lodash implementation
 * - 各方法语义可参考 Lodash 官方文档
 * - Method semantics can be referenced from official Lodash docs
 * - 导入时建议使用 `Lodash as _`，遵循 lodash 官方示例惯例
 * - Use `Lodash as _` when importing, following official lodash example convention
 *
 * 参考:
 * Reference:
 * - https://www.lodashjs.com
 * - https://lodash.com
 */
class Lodash {
	/**
	 * HTML 特殊字符转义。
	 * Escape HTML special characters.
	 *
	 * @param {string} string 输入文本 / Input text.
	 * @returns {string}
	 * @see {@link https://lodash.com/docs/#escape lodash.escape}
	 * @see {@link https://www.lodashjs.com/docs/lodash.escape lodash.escape (中文)}
	 */
	static escape(string) {
		const map = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return string.replace(/[&<>"']/g, m => map[m]);
	}

	/**
	 * 按路径读取对象值。
	 * Get object value by path.
	 *
	 * @param {object} [object={}] 目标对象 / Target object.
	 * @param {string|string[]} [path=""] 路径 / Path.
	 * @param {*} [defaultValue=undefined] 默认值 / Default value.
	 * @returns {*}
	 * @see {@link https://lodash.com/docs/#get lodash.get}
	 * @see {@link https://www.lodashjs.com/docs/lodash.get lodash.get (中文)}
	 */
	static get(object = {}, path = "", defaultValue = undefined) {
		// translate array case to dot case, then split with .
		// a[0].b -> a.0.b -> ['a', '0', 'b']
		if (!Array.isArray(path)) path = Lodash.toPath(path);

		const result = path.reduce((previousValue, currentValue) => {
			return Object(previousValue)[currentValue]; // null undefined get attribute will throwError, Object() can return a object
		}, object);
		return result === undefined ? defaultValue : result;
	}

	/**
	 * 递归合并源对象的自身可枚举属性到目标对象
	 * Recursively merge source enumerable properties into target object.
	 * @description 简化版 lodash.merge，用于合并配置对象
	 * @description A simplified lodash.merge for config merging.
	 *
	 * 适用情况:
	 * - 合并嵌套的配置/设置对象
	 * - 需要深度合并而非浅层覆盖的场景
	 * - 多个源对象依次合并到目标对象
	 *
	 * 限制:
	 * - 仅处理普通对象 (Plain Object)，不处理 Date/RegExp 等特殊对象
	 * - Map/Set 仅支持同类型合并，不递归内部值
	 * - 数组会被直接覆盖，不会合并数组元素
	 * - 不处理循环引用，可能导致栈溢出
	 * - 不复制 Symbol 属性和不可枚举属性
	 * - 不保留原型链，仅处理自身属性
	 * - 会修改原始目标对象 (mutates target)
	 *
	 * @param {object} object - 目标对象
	 * @param {object} object - Target object.
	 * @param {...object} sources - 源对象(可多个)
	 * @param {...object} sources - Source objects.
	 * @returns {object} 返回合并后的目标对象
	 * @returns {object} Merged target object.
	 * @see {@link https://lodash.com/docs/#merge lodash.merge}
	 * @see {@link https://www.lodashjs.com/docs/lodash.merge lodash.merge (中文)}
	 * @example
	 * const target = { a: { b: 1 }, c: 2 };
	 * const source = { a: { d: 3 }, e: 4 };
	 * Lodash.merge(target, source);
	 * // => { a: { b: 1, d: 3 }, c: 2, e: 4 }
	 */
	static merge(object, ...sources) {
		if (object === null || object === undefined) return object;

		for (const source of sources) {
			if (source === null || source === undefined) continue;

			for (const key of Object.keys(source)) {
				const sourceValue = source[key];
				const targetValue = object[key];

				switch (true) {
					case Lodash.#isPlainObject(sourceValue) && Lodash.#isPlainObject(targetValue):
						// 递归合并对象
						object[key] = Lodash.merge(targetValue, sourceValue);
						break;
					case sourceValue instanceof Map && targetValue instanceof Map:
						// 合并 Map（空 Map 跳过）
						if (sourceValue.size > 0) {
							for (const [k, v] of sourceValue) {
								targetValue.set(k, v);
							}
						}
						break;
					case sourceValue instanceof Set && targetValue instanceof Set:
						// 合并 Set（空 Set 跳过）
						if (sourceValue.size > 0) {
							for (const v of sourceValue) {
								targetValue.add(v);
							}
						}
						break;
					case Array.isArray(sourceValue) && sourceValue.length === 0 && targetValue !== undefined:
						// 空数组不覆盖已有值
						break;
					case (sourceValue instanceof Map && sourceValue.size === 0 && targetValue !== undefined):
					case (sourceValue instanceof Set && sourceValue.size === 0 && targetValue !== undefined):
						// 空 Map/Set 不覆盖已有值
						break;
					case sourceValue !== undefined:
						object[key] = sourceValue;
						break;
				}
			}
		}

		return object;
	}

	/**
	 * 判断值是否为普通对象 (Plain Object)
	 * Check whether a value is a plain object.
	 * @param {*} value - 要检查的值
	 * @param {*} value - Value to check.
	 * @returns {boolean} 如果是普通对象返回 true
	 * @returns {boolean} Returns true when value is a plain object.
	 * @see {@link https://lodash.com/docs/#isPlainObject lodash.isPlainObject}
	 * @see {@link https://www.lodashjs.com/docs/lodash.isPlainObject lodash.isPlainObject (中文)}
	 */
	static #isPlainObject(value) {
		if (value === null || typeof value !== "object") return false;
		const proto = Object.getPrototypeOf(value);
		return proto === null || proto === Object.prototype;
	}

	/**
	 * 删除对象指定路径并返回对象。
	 * Omit paths from object and return the same object.
	 *
	 * @param {object} [object={}] 目标对象 / Target object.
	 * @param {string|string[]} [paths=[]] 要删除的路径 / Paths to remove.
	 * @returns {object}
	 * @see {@link https://lodash.com/docs/#omit lodash.omit}
	 * @see {@link https://www.lodashjs.com/docs/lodash.omit lodash.omit (中文)}
	 */
	static omit(object = {}, paths = []) {
		if (!Array.isArray(paths)) paths = [paths.toString()];
		paths.forEach(path => Lodash.unset(object, path));
		return object;
	}

	/**
	 * 仅保留对象指定键（第一层）。
	 * Pick selected keys from object (top level only).
	 *
	 * @param {object} [object={}] 目标对象 / Target object.
	 * @param {string|string[]} [paths=[]] 需要保留的键 / Keys to keep.
	 * @returns {object}
	 * @see {@link https://lodash.com/docs/#pick lodash.pick}
	 * @see {@link https://www.lodashjs.com/docs/lodash.pick lodash.pick (中文)}
	 */
	static pick(object = {}, paths = []) {
		if (!Array.isArray(paths)) paths = [paths.toString()];
		const filteredEntries = Object.entries(object).filter(([key, value]) => paths.includes(key));
		return Object.fromEntries(filteredEntries);
	}

	/**
	 * 按路径写入对象值。
	 * Set object value by path.
	 *
	 * @param {object} object 目标对象 / Target object.
	 * @param {string|string[]} path 路径 / Path.
	 * @param {*} value 写入值 / Value.
	 * @returns {object}
	 * @see {@link https://lodash.com/docs/#set lodash.set}
	 * @see {@link https://www.lodashjs.com/docs/lodash.set lodash.set (中文)}
	 */
	static set(object, path, value) {
		if (!Array.isArray(path)) path = Lodash.toPath(path);
		path.slice(0, -1).reduce((previousValue, currentValue, currentIndex) => (Object(previousValue[currentValue]) === previousValue[currentValue] ? previousValue[currentValue] : (previousValue[currentValue] = /^\d+$/.test(path[currentIndex + 1]) ? [] : {})), object)[path[path.length - 1]] = value;
		return object;
	}

	/**
	 * 将点路径或数组下标路径转换为数组。
	 * Convert dot/array-index path string into path segments.
	 *
	 * @param {string} value 路径字符串 / Path string.
	 * @returns {string[]}
	 * @see {@link https://lodash.com/docs/#toPath lodash.toPath}
	 * @see {@link https://www.lodashjs.com/docs/lodash.toPath lodash.toPath (中文)}
	 */
	static toPath(value) {
		return value
			.replace(/\[(\d+)\]/g, ".$1")
			.split(".")
			.filter(Boolean);
	}

	/**
	 * HTML 实体反转义。
	 * Unescape HTML entities.
	 *
	 * @param {string} string 输入文本 / Input text.
	 * @returns {string}
	 * @see {@link https://lodash.com/docs/#unescape lodash.unescape}
	 * @see {@link https://www.lodashjs.com/docs/lodash.unescape lodash.unescape (中文)}
	 */
	static unescape(string) {
		const map = {
			"&amp;": "&",
			"&lt;": "<",
			"&gt;": ">",
			"&quot;": '"',
			"&#39;": "'",
		};
		return string.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => map[m]);
	}

	/**
	 * 删除对象路径对应的值。
	 * Remove value by object path.
	 *
	 * @param {object} [object={}] 目标对象 / Target object.
	 * @param {string|string[]} [path=""] 路径 / Path.
	 * @returns {boolean}
	 * @see {@link https://lodash.com/docs/#unset lodash.unset}
	 * @see {@link https://www.lodashjs.com/docs/lodash.unset lodash.unset (中文)}
	 */
	static unset(object = {}, path = "") {
		if (!Array.isArray(path)) path = Lodash.toPath(path);
		const result = path.reduce((previousValue, currentValue, currentIndex) => {
			if (currentIndex === path.length - 1) {
				delete previousValue[currentValue];
				return true;
			}
			return Object(previousValue)[currentValue];
		}, object);
		return result;
	}
}

/* https://github.com/ljharb/qs */
/**
 * 轻量 `qs` 查询字符串工具。
 * Lightweight `qs` query-string utilities.
 *
 * 说明:
 * Notes:
 * - 参考 `qs` 的 `parse` / `stringify` 接口设计
 * - Modeled after the `qs` `parse` / `stringify` API
 * - `parse` 保持当前项目原有 `$argument` 字符串解析语义
 * - `parse` preserves the existing `$argument` string parsing semantics
 * - `stringify` 基于项目内 `Lodash` 路径能力展开对象
 * - `stringify` expands objects via the in-project `Lodash` path helpers
 *
 * 参考:
 * Reference:
 * - https://github.com/ljharb/qs
 * - https://www.npmjs.com/package/qs
 */
class qs {
	/**
	 * 将查询字符串解析为对象。
	 * Parse a query string into an object.
	 *
	 * @param {string | Record<string, unknown> | null | undefined} [query=""] 查询字符串或对象 / Query string or object.
	 * @returns {Record<string, unknown>}
	 */
	static parse(query) {
		let result = {};
		switch (typeof query) {
			case "string": {
				const source = query.replace(/^\?/, "");
				if (!source) break;
				const obj = Object.fromEntries(
					source
						.split("&")
						.filter(Boolean)
						.map(item => {
							const [rawKey = "", rawValue = ""] = item.split("=", 2);
							const key = qs.#decode(rawKey).replace(/\[([^\[\]]+)\]/g, ".$1");
							return [key, qs.#decode(rawValue).replace(/\"/g, "")];
						}),
				);
				Object.keys(obj).forEach(key => Lodash.set(result, key, obj[key]));
				break;
			}
			case "object": {
				switch (query) {
					case null:
						break;
					default: {
						const obj = {};
						Object.keys(query).forEach(key => Lodash.set(obj, key, query[key]));
						result = obj;
						break;
					}
				}
				break;
			}
			case "undefined":
				result = {};
				break;
		}
		return result;
	}

	/**
	 * 将对象序列化为查询字符串。
	 * Serialize an object into a query string.
	 *
	 * @param {Record<string, unknown>} [object={}] 输入对象 / Input object.
	 * @returns {string}
	 */
	static stringify(object = {}) {
		if (!object || typeof object !== "object") return "";

		const entries = [];
		Object.keys(object).forEach(key => qs.#collect(object, key, entries));

		if (entries.length === 0) return "";
		return entries
			.map(([key, value]) => `${qs.#encode(qs.#formatPath(key))}=${qs.#encode(value)}`)
			.join("&");
	}

	/**
	 * 收集待序列化的键值对。
	 * Collect key-value pairs for stringification.
	 *
	 * @param {Record<string, unknown>} object 输入对象 / Input object.
	 * @param {string} path 当前路径 / Current path.
	 * @param {[string, string][]} entries 输出数组 / Output entries.
	 * @returns {void}
	 */
	static #collect(object, path, entries) {
		const value = Lodash.get(object, path);
		if (value === undefined) return;
		if (value === null) {
			entries.push([path, ""]);
			return;
		}
		if (Array.isArray(value)) {
			value.forEach((item, index) => {
				if (item === undefined) return;
				qs.#collect(object, `${path}[${index}]`, entries);
			});
			return;
		}
		if (qs.#isPlainObject(value)) {
			Object.keys(value).forEach(key => qs.#collect(object, `${path}.${key}`, entries));
			return;
		}
		entries.push([path, String(value)]);
	}

	/**
	 * 使用 `Lodash.toPath` 规范化输出路径。
	 * Normalize output path via `Lodash.toPath`.
	 *
	 * @param {string} path 原始路径 / Raw path.
	 * @returns {string}
	 */
	static #formatPath(path) {
		const [head, ...tail] = Lodash.toPath(path);
		return tail.reduce((result, segment) => (/^\d+$/.test(segment) ? `${result}[${segment}]` : `${result}.${segment}`), head);
	}

	/**
	 * 判断值是否为普通对象。
	 * Check whether a value is a plain object.
	 *
	 * @param {unknown} value 输入值 / Input value.
	 * @returns {boolean}
	 */
	static #isPlainObject(value) {
		if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
		const proto = Object.getPrototypeOf(value);
		return proto === null || proto === Object.prototype;
	}

	/**
	 * 编码查询字符串片段。
	 * Encode a query-string fragment.
	 *
	 * @param {string} value 原始值 / Raw value.
	 * @returns {string}
	 */
	static #encode(value) {
		return encodeURIComponent(value);
	}

	/**
	 * 解码查询字符串片段。
	 * Decode a query-string fragment.
	 *
	 * @param {string} value 编码值 / Encoded value.
	 * @returns {string}
	 */
	static #decode(value) {
		return decodeURIComponent(value.replace(/\+/g, " "));
	}
}

/**
 * 统一 `$argument` 输入格式并展开深路径。
 * Normalize `$argument` input format and expand deep paths.
 *
 * 平台差异:
 * Platform differences:
 * - Surge / Stash / Egern 常见为字符串参数: `a=1&b=2`
 * - Surge / Stash / Egern usually pass string args: `a=1&b=2`
 * - Loon 支持字符串和对象两种形态
 * - Loon supports both string and object forms
 * - Quantumult X / Shadowrocket 一般不提供 `$argument`
 * - Quantumult X / Shadowrocket usually do not expose `$argument`
 *
 * 执行时机:
 * Execution timing:
 * - 该模块为即时执行模块，`import` 时立即处理全局 `$argument`
 * - This module executes immediately and mutates global `$argument` on import
 *
 * 归一化规则补充:
 * Normalization details:
 * - 使用 `globalThis.$argument` 读写，避免运行环境下未声明变量引用问题
 * - Read/write via `globalThis.$argument` to avoid undeclared variable access
 * - 当 `$argument` 为 `null` 或 `undefined` 时，会重置为 `{}`
 * - When `$argument` is `null` or `undefined`, it is normalized to `{}`
 */
(() => {
	Console.debug("☑️ $argument");
	globalThis.$argument = qs.parse(globalThis.$argument);
	if (globalThis.$argument.LogLevel) Console.logLevel = globalThis.$argument.LogLevel;
	Console.debug("✅ $argument", `$argument: ${JSON.stringify(globalThis.$argument)}`);
})();

/**
 * HTTP 状态码文本映射表。
 * HTTP status code to status text map.
 *
 * 主要用途:
 * Primary usage:
 * - 为 Quantumult X 的 `$done` 状态行拼接提供状态文本
 * - Provide status text for Quantumult X `$done` status-line composition
 * - QX 在部分场景要求 `status` 为完整状态行（如 `HTTP/1.1 200 OK`）
 * - QX may require full status line (e.g. `HTTP/1.1 200 OK`) in some cases
 *
 * 参考:
 * Reference:
 * - https://github.com/crossutility/Quantumult-X/raw/refs/heads/master/sample-rewrite-response-header.js
 *
 * @type {Record<number, string>}
 */
const StatusTexts = {
	100: "Continue",
	101: "Switching Protocols",
	102: "Processing",
	103: "Early Hints",
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	207: "Multi-Status",
	208: "Already Reported",
	226: "IM Used",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	304: "Not Modified",
	307: "Temporary Redirect",
	308: "Permanent Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Content Too Large",
	414: "URI Too Long",
	415: "Unsupported Media Type",
	416: "Range Not Satisfiable",
	417: "Expectation Failed",
	418: "I'm a teapot",
	421: "Misdirected Request",
	422: "Unprocessable Entity",
	423: "Locked",
	424: "Failed Dependency",
	425: "Too Early",
	426: "Upgrade Required",
	428: "Precondition Required",
	429: "Too Many Requests",
	431: "Request Header Fields Too Large",
	451: "Unavailable For Legal Reasons",
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported",
	506: "Variant Also Negotiates",
	507: "Insufficient Storage",
	508: "Loop Detected",
	510: "Not Extended",
	511: "Network Authentication Required",
};

/**
 * `done` 的统一入参结构。
 * Unified `done` input payload.
 *
 * @typedef {object} DonePayload
 * @property {number|string} [status] 响应状态码或状态行 / Response status code or status line.
 * @property {string} [url] 响应 URL / Response URL.
 * @property {Record<string, any>} [headers] 响应头 / Response headers.
 * @property {string|ArrayBuffer|ArrayBufferView} [body] 响应体 / Response body.
 * @property {ArrayBuffer} [bodyBytes] 二进制响应体 / Binary response body.
 * @property {string} [policy] 指定策略名 / Preferred policy name.
 */

/**
 * 结束脚本执行并按平台转换参数。
 * Complete script execution with platform-specific parameter mapping.
 *
 * 说明:
 * Notes:
 * - 这是调用入口，平台原生 `$done` 差异在内部处理
 * - This is the call entry and native `$done` differences are handled internally
 * - Worker 不调用 `$done` 或退出进程，仅记录日志
 * - Worker neither calls `$done` nor exits the process; it only logs
 * - Node.js 不调用 `$done`，而是直接退出进程
 * - Node.js does not call `$done`; it exits the process directly
 * - 未识别平台仅记录结束日志，不会强制退出
 * - Unknown runtimes only log completion and do not force an exit
 *
 * @param {DonePayload} [object={}] 统一响应对象 / Unified response object.
 * @returns {void}
 */
function done(object = {}) {
	switch ($app) {
		case "Surge":
			if (object.policy) Lodash.set(object, "headers.X-Surge-Policy", object.policy);
			Console.log("🚩 执行结束!", `🕛 ${new Date().getTime() / 1000 - $script.startTime} 秒`);
			$done(object);
			break;
		case "Loon":
			if (object.policy) object.node = object.policy;
			Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
			$done(object);
			break;
		case "Stash":
			if (object.policy) Lodash.set(object, "headers.X-Stash-Selected-Proxy", encodeURI(object.policy));
			Console.log("🚩 执行结束!", `🕛 ${(new Date() - $script.startTime) / 1000} 秒`);
			$done(object);
			break;
		case "Egern":
			Console.log("🚩 执行结束!");
			$done(object);
			break;
		case "Shadowrocket":
			Console.log("🚩 执行结束!");
			$done(object);
			break;
		case "Quantumult X":
			if (object.policy) Lodash.set(object, "opts.policy", object.policy);
			object = Lodash.pick(object, ["status", "url", "headers", "body", "bodyBytes"]);
			switch (typeof object.status) {
				case "number":
					object.status = `HTTP/1.1 ${object.status} ${StatusTexts[object.status]}`;
					break;
				case "string":
				case "undefined":
					break;
				default:
					throw new TypeError(`${Function.name}: 参数类型错误, status 必须为数字或字符串`);
			}
			if (object.body instanceof ArrayBuffer) {
				object.bodyBytes = object.body;
				object.body = undefined;
			} else if (ArrayBuffer.isView(object.body)) {
				object.bodyBytes = object.body.buffer.slice(object.body.byteOffset, object.body.byteLength + object.body.byteOffset);
				object.body = undefined;
			} else if (object.body) object.bodyBytes = undefined;
			Console.log("🚩 执行结束!");
			$done(object);
			break;
		case "Worker":
			Console.log("🚩 执行结束!");
			break;
		case "Node.js":
			Console.log("🚩 执行结束!");
			process.exit(1);
			break;
		default:
			Console.log("🚩 执行结束!");
			break;
	}
}

/**
 * 按模板格式化时间字符串。
 * Format date/time into a template string.
 *
 * 支持占位符:
 * Supported tokens:
 * - `YY`, `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`, `sss`, `S`
 *
 * @param {string} format 格式模板 / Format template.
 * @param {number} [ts] 可选时间戳 / Optional timestamp.
 * @returns {string}
 */
function time(format, ts) {
	const date = ts ? new Date(ts) : new Date();
	const Time = {
		YY: date.getFullYear().toString().substring(3),
		yyyy: date.getFullYear().toString(),
		MM: (date.getMonth() + 1).toString().padStart(2, "0"),
		dd: date.getDate().toString().padStart(2, "0"),
		HH: date.getHours().toString().padStart(2, "0"),
		mm: date.getMinutes().toString().padStart(2, "0"),
		sss: date.getMilliseconds().toString().padStart(3, "0"),
		ss: date.getSeconds().toString().padStart(2, "0"),
		S: `${Math.floor(date.getMonth() / 3) + 1}`,
	};
	for (const [key, value] of Object.entries(Time)) {
		format = format.replace(key, value);
	}
	return format;
}

/**
 * 统一请求参数。
 * Unified request payload.
 *
 * @typedef {object} FetchRequest
 * @property {string} url 请求地址 / Request URL.
 * @property {string} [method] 请求方法 / HTTP method.
 * @property {Record<string, any>} [headers] 请求头 / Request headers.
 * @property {string|ArrayBuffer|ArrayBufferView|object} [body] 请求体 / Request body.
 * @property {ArrayBuffer} [bodyBytes] 二进制请求体 / Binary request body.
 * @property {number|string} [timeout] 超时（秒或毫秒）/ Timeout (seconds or milliseconds).
 * @property {string} [policy] 指定策略 / Preferred policy.
 * @property {boolean} [redirection] 是否跟随重定向 / Whether to follow redirects.
 * @property {boolean} ["auto-redirect"] 平台重定向字段 / Platform redirect flag.
 * @property {boolean|number|string} ["auto-cookie"] Worker / Node.js Cookie 开关 / Worker / Node.js Cookie toggle.
 * @property {Record<string, any>} [opts] 平台扩展字段 / Platform extension fields.
 */

/**
 * 统一响应结构。
 * Unified response payload.
 *
 * @typedef {object} FetchResponse
 * @property {boolean} ok 请求是否成功 / Whether request is successful.
 * @property {number} status 状态码 / HTTP status code.
 * @property {number} [statusCode] 状态码别名 / Status code alias.
 * @property {string} [statusText] 状态文本 / HTTP status text.
 * @property {Record<string, any>} [headers] 响应头 / Response headers.
 * @property {string|ArrayBuffer} [body] 响应体 / Response body.
 * @property {ArrayBuffer} [bodyBytes] 二进制响应体 / Binary response body.
 */

/**
 * 跨平台 `fetch` 适配层。
 * Cross-platform `fetch` adapter.
 *
 * 设计目标:
 * Design goal:
 * - 仿照 Web API `fetch`（`Window.fetch`）接口设计
 * - Modeled after Web API `fetch` (`Window.fetch`)
 * - 统一 VPN App、Worker 与 Node.js 环境中的请求调用
 * - Unify request calls across VPN apps, Worker, and Node.js
 *
 * 功能:
 * Features:
 * - 统一 Quantumult X / Loon / Surge / Stash / Egern / Shadowrocket / Worker / Node.js 请求接口
 * - Normalize request APIs across Quantumult X / Loon / Surge / Stash / Egern / Shadowrocket / Worker / Node.js
 * - 统一返回体字段（`ok/status/statusText/body/bodyBytes`）
 * - Normalize response fields (`ok/status/statusText/body/bodyBytes`)
 *
 * 与 Web `fetch` 的已知差异:
 * Known differences from Web `fetch`:
 * - 支持 `policy`、`auto-redirect` 等平台扩展字段
 * - Supports platform extension fields like `policy` and `auto-redirect`
 * - Worker / Node.js 共享基于 `fetch` 的请求分支
 * - Worker / Node.js share the `fetch`-based request branch
 * - Node.js ESM 的 `auto-cookie` 由 `fetch.node.mjs` 处理，本文件只使用宿主 `fetch`
 * - Node.js ESM `auto-cookie` is handled by `fetch.node.mjs`; this module only uses the host `fetch`
 * - 非浏览器平台通过 `$httpClient/$task` 实现，不是原生 Fetch 实现
 * - Non-browser platforms use `$httpClient/$task` instead of native Fetch engine
 * - 返回结构包含 `statusCode/bodyBytes` 等兼容字段
 * - Response includes compatibility fields like `statusCode/bodyBytes`
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
 * @link https://developer.mozilla.org/zh-CN/docs/Web/API/Window/fetch
 * @async
 * @param {FetchRequest|string} resource 请求对象或 URL / Request object or URL string.
 * @param {Partial<FetchRequest>} [options={}] 追加参数 / Extra options.
 * @returns {Promise<FetchResponse>}
 */
async function fetch(resource, options = {}) {
	// 初始化参数。
	// Initialize request input.
	switch (typeof resource) {
		case "object":
			resource = { ...options, ...resource };
			break;
		case "string":
			resource = { ...options, url: resource };
			break;
		case "undefined":
		default:
			throw new TypeError(`${Function.name}: 参数类型错误, resource 必须为对象或字符串`);
	}
	// 自动判断请求方法。
	// Infer the HTTP method automatically.
	if (!resource.method) {
		resource.method = "GET";
		if (resource.body ?? resource.bodyBytes) resource.method = "POST";
	}
	// 移除需要由底层实现自动生成的请求头。
	// Remove headers that should be generated by the underlying runtime.
	delete resource.headers?.Host;
	delete resource.headers?.[":authority"];
	delete resource.headers?.["Content-Length"];
	delete resource.headers?.["content-length"];
	// 统一请求方法为小写，方便后续索引平台 API。
	// Normalize the method to lowercase for platform API lookups.
	const method = resource.method.toLocaleLowerCase();
	// 默认请求超时时间为 5 秒。
	// Default request timeout to 5 seconds.
	if (!resource.timeout) resource.timeout = 5;
	if (resource.timeout) {
		resource.timeout = Number.parseInt(resource.timeout, 10);
		// 统一先转换为秒，大于 500 视为毫秒输入。
		// Convert to seconds first and treat values above 500 as milliseconds.
		if (resource.timeout > 500) resource.timeout = Math.round(resource.timeout / 1000);
	}
	if (resource.timeout) {
		switch ($app) {
			case "Loon":
			case "Quantumult X":
			case "Worker":
			case "Node.js":
				// 这些平台要求毫秒，因此把秒重新换算为毫秒。
				// These platforms expect milliseconds, so convert seconds back to milliseconds.
				resource.timeout = resource.timeout * 1000;
				break;
		}
	}
	// 根据当前平台选择请求实现。
	// Select the request engine for the current platform.
	switch ($app) {
		case "Loon":
		case "Surge":
		case "Stash":
		case "Egern":
		case "Shadowrocket":
			// 转换通用请求参数到 `$httpClient` 语义。
			// Map shared request fields to `$httpClient` semantics.
			if (resource.policy) {
				switch ($app) {
					case "Loon":
						resource.node = resource.policy;
						break;
					case "Stash":
						Lodash.set(resource, "headers.X-Stash-Selected-Proxy", encodeURI(resource.policy));
						break;
					case "Shadowrocket":
						Lodash.set(resource, "headers.X-Surge-Proxy", resource.policy);
						break;
				}
			}
			if (typeof resource.redirection === "boolean") resource["auto-redirect"] = resource.redirection;
			// 优先把 `bodyBytes` 映射回 `$httpClient` 能接受的 `body`。
			// Prefer mapping `bodyBytes` back to the `body` field expected by `$httpClient`.
			if (resource.bodyBytes && !resource.body) {
				resource.body = resource.bodyBytes;
				resource.bodyBytes = undefined;
			}
			// 根据 `Accept` 推断是否需要二进制响应体。
			// Infer whether the response should be treated as binary from `Accept`.
			switch ((resource.headers?.Accept || resource.headers?.accept)?.split(";")?.[0]) {
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
				case "application/vnd.apple.flatbuffer":
				case "application/grpc":
				case "application/grpc-web":
				case "application/grpc+proto":
				case "application/octet-stream":
					resource["binary-mode"] = true;
					break;
			}
			// 发送 `$httpClient` 请求并归一化返回结构。
			// Send the `$httpClient` request and normalize the response payload.
			return new Promise((resolve, reject) => {
				globalThis.$httpClient[method](resource, (error, response, body) => {
					if (error) reject(error);
					else {
						response.ok = /^2\d\d$/.test(response.status);
						response.statusCode = response.status;
						response.statusText = StatusTexts[response.status];
						if (body) {
							response.body = body;
							if (resource["binary-mode"] == true) response.bodyBytes = body;
						}
						resolve(response);
					}
				});
			});
		case "Quantumult X":
			// 转换 Quantumult X 专有请求参数。
			// Map request fields to Quantumult X specific options.
			if (resource.policy) Lodash.set(resource, "opts.policy", resource.policy);
			if (typeof resource["auto-redirect"] === "boolean") Lodash.set(resource, "opts.redirection", resource["auto-redirect"]);
			// Quantumult X 使用 `bodyBytes` 传输二进制请求体。
			// Quantumult X uses `bodyBytes` for binary request payloads.
			if (resource.body instanceof ArrayBuffer) {
				resource.bodyBytes = resource.body;
				resource.body = undefined;
			} else if (ArrayBuffer.isView(resource.body)) {
				resource.bodyBytes = resource.body.buffer.slice(resource.body.byteOffset, resource.body.byteLength + resource.body.byteOffset);
				resource.body = undefined;
			} else if (resource.body) resource.bodyBytes = undefined;
			// 发送请求，并用 `Promise.race` 提供统一超时保护。
			// Send the request and enforce timeout with `Promise.race`.
			return Promise.race([
				globalThis.$task.fetch(resource).then(
					response => {
						response.ok = /^2\d\d$/.test(response.statusCode);
						response.status = response.statusCode;
						response.statusText = StatusTexts[response.status];
						switch ((response.headers?.["Content-Type"] ?? response.headers?.["content-type"])?.split(";")?.[0]) {
							case "application/protobuf":
							case "application/x-protobuf":
							case "application/vnd.google.protobuf":
							case "application/vnd.apple.flatbuffer":
							case "application/grpc":
							case "application/grpc-web":
							case "application/grpc+proto":
							case "application/octet-stream":
								response.body = response.bodyBytes;
								break;
						}
						response.bodyBytes = undefined;
						return response;
					},
					reason => Promise.reject(reason.error),
				),
				new Promise((resolve, reject) => {
					setTimeout(() => {
						reject(new Error(`${Function.name}: 请求超时, 请检查网络后重试`));
					}, resource.timeout);
				}),
			]);
		case "Worker":
		case "Node.js":
		default: {
			let request;
			let timeout;
			let shouldWrapError = false;
			switch ($app) {
				case "Worker":
				case "Node.js":
					switch (typeof globalThis.fetch) {
						case "function":
							break;
						default:
							throw new Error(`${Function.name}: 当前运行环境不支持 Fetch API`);
					}
					// 将通用字段映射到 Worker / Node.js Fetch 语义。
					// Map shared fields to Worker / Node.js Fetch semantics.
					resource.redirect = resource.redirection ? "follow" : "manual";
					request = resource;
					timeout = resource.timeout;
					shouldWrapError = true;
					break;
				default: {
					// 未识别宿主也可使用完整标准 Fetch API；不将能力推断为宿主类型。
					// An unrecognized host may still use the complete standard Fetch API; capability does not imply a host type.
					if (typeof globalThis.fetch !== "function" || typeof globalThis.Headers !== "function" || typeof globalThis.Request !== "function" || typeof globalThis.Response !== "function") {
						throw new Error(`${Function.name}: 当前运行环境不支持 Fetch API`);
					}
					const { url, bodyBytes, redirection, timeout: _timeout, policy: _policy, "auto-redirect": _autoRedirect, "auto-cookie": _autoCookie, opts: _opts, ...fetchOptions } = resource;
					if (bodyBytes !== undefined && fetchOptions.body === undefined) fetchOptions.body = bodyBytes;
					fetchOptions.redirect = redirection ? "follow" : "manual";
					request = { url, ...fetchOptions };
					timeout = resource.timeout * 1000;
					break;
				}
			}
			const { url, ...options } = request;
			// 发起请求并归一化响应头、文本与二进制响应体。
			// Send the request and normalize headers, text, and binary response data.
			const responsePromise = globalThis.fetch(url, options).then(async response => {
				const bodyBytes = await response.arrayBuffer();
				let headers;
				try {
					headers = response.headers.raw();
				} catch {
					headers = Array.from(response.headers.entries()).reduce((acc, [key, value]) => {
						acc[key] = acc[key] ? [...acc[key], value] : [value];
						return acc;
					}, {});
				}
				return {
					ok: response.ok ?? /^2\d\d$/.test(response.status),
					status: response.status,
					statusCode: response.status,
					statusText: response.statusText,
					body: new TextDecoder("utf-8").decode(bodyBytes),
					bodyBytes: bodyBytes,
					headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, key.toLowerCase() !== "set-cookie" ? value.toString() : value])),
				};
			});
			return Promise.race([
				shouldWrapError ? responsePromise.catch(error => Promise.reject(error.message)) : responsePromise,
				new Promise((_resolve, reject) => {
					setTimeout(() => {
						reject(new Error(`${Function.name}: 请求超时, 请检查网络后重试`));
					}, timeout);
				}),
			]);
		}
	}
}

/**
 * 跨平台持久化存储适配器。
 * Cross-platform persistent storage adapter.
 *
 * 设计目标:
 * Design goal:
 * - 仿照 Web Storage (`Storage`) 接口设计
 * - Modeled after Web Storage (`Storage`) interface
 * - 统一 VPN App 脚本环境中的持久化读写接口
 * - Unify persistence APIs across VPN app script environments
 *
 * 支持后端:
 * Supported backends:
 * - Surge/Loon/Stash/Egern/Shadowrocket: `$persistentStore`
 * - Quantumult X: `$prefs`
 * - Worker: 内存缓存（非持久化）
 * - Worker: in-memory cache (non-persistent)
 * - Node.js: 由 Node.js ESM 入口注入持久化后端
 * - Node.js: persistent backend injected by the Node.js ESM entry
 *
 * 支持路径键:
 * Supports path key:
 * - `@root.path.to.value`
 *
 * 与 Web Storage 的已知差异:
 * Known differences from Web Storage:
 * - 支持 `@key.path` 深路径读写（Web Storage 原生不支持）
 * - Supports `@key.path` deep-path access (not native in Web Storage)
 * - `removeItem/clear` 并非所有平台都可用
 * - `removeItem/clear` are not available on every platform
 * - 读取时会尝试 `JSON.parse`，写入对象会 `JSON.stringify`
 * - Reads try `JSON.parse`, writes stringify objects
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Storage
 * @link https://developer.mozilla.org/zh-CN/docs/Web/API/Storage
 */
class Storage {
	/**
	 * Worker / Node.js 环境下的内存数据缓存。
	 * In-memory data cache for Worker / Node.js runtime.
	 *
	 * @type {Record<string, any>|null}
	 */
	static data = null;

	/**
	 * Node.js 持久化文件名。
	 * Data file name used in Node.js.
	 *
	 * @type {string}
	 */
	static dataFile = "box.dat";

	/**
	 * Node.js ESM 入口注入的存储后端。
	 * Storage backend injected by the Node.js ESM entry.
	 *
	 * @type {{load: (dataFile: string) => Record<string, any>, write: (dataFile: string, data: Record<string, any>) => void}|null}
	 */
	static nodeBackend = null;

	/**
	 * `@key.path` 解析正则。
	 * Regex for `@key.path` parsing.
	 *
	 * @type {RegExp}
	 */
	static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;

	/**
	 * 读取存储值。
	 * Read value from persistent storage.
	 *
	 * @param {string} keyName 键名或路径键 / Key or path key.
	 * @param {*} [defaultValue=null] 默认值 / Default value when key is missing.
	 * @returns {*}
	 */
	static getItem(keyName, defaultValue = null) {
		let keyValue = defaultValue;
		// 如果以 @
		switch (keyName.startsWith("@")) {
			case true: {
				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
				keyName = key;
				let value = Storage.getItem(keyName, {});
				if (typeof value !== "object") value = {};
				keyValue = Lodash.get(value, path);
				try {
					keyValue = JSON.parse(keyValue);
				} catch {}
				break;
			}
			default:
				switch ($app) {
					case "Surge":
					case "Loon":
					case "Stash":
					case "Egern":
					case "Shadowrocket":
						keyValue = $persistentStore.read(keyName);
						break;
					case "Quantumult X":
						keyValue = $prefs.valueForKey(keyName);
						break;
					case "Worker":
						Storage.data = Storage.data ?? {};
						keyValue = Storage.data[keyName];
						break;
					case "Node.js":
						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
						keyValue = Storage.data?.[keyName];
						break;
					default:
						keyValue = Storage.data?.[keyName] || null;
						break;
				}
				try {
					keyValue = JSON.parse(keyValue);
				} catch {
					// do nothing
				}
				break;
		}
		return keyValue ?? defaultValue;
	}

	/**
	 * 写入存储值。
	 * Write value into persistent storage.
	 *
	 * @param {string} keyName 键名或路径键 / Key or path key.
	 * @param {*} keyValue 写入值 / Value to store.
	 * @returns {boolean}
	 */
	static setItem(keyName = new String(), keyValue = new String()) {
		let result = false;
		switch (typeof keyValue) {
			case "object":
				keyValue = JSON.stringify(keyValue);
				break;
			default:
				keyValue = String(keyValue);
				break;
		}
		switch (keyName.startsWith("@")) {
			case true: {
				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
				keyName = key;
				let value = Storage.getItem(keyName, {});
				if (typeof value !== "object") value = {};
				Lodash.set(value, path, keyValue);
				result = Storage.setItem(keyName, value);
				break;
			}
			default:
				switch ($app) {
					case "Surge":
					case "Loon":
					case "Stash":
					case "Egern":
					case "Shadowrocket":
						result = $persistentStore.write(keyValue, keyName);
						break;
					case "Quantumult X":
						result = $prefs.setValueForKey(keyValue, keyName);
						break;
					case "Worker":
						Storage.data = Storage.data ?? {};
						Storage.data[keyName] = keyValue;
						result = true;
						break;
					case "Node.js":
						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
						Storage.data[keyName] = keyValue;
						Storage.nodeBackend.write(Storage.dataFile, Storage.data);
						result = true;
						break;
					default:
						result = Storage.data?.[keyName] || null;
						break;
				}
				break;
		}
		return result;
	}

	/**
	 * 删除存储值。
	 * Remove value from persistent storage.
	 *
	 * 平台说明:
	 * Platform notes:
	 * - Quantumult X: `$prefs.removeValueForKey`
	 * - Surge: 通过 `$persistentStore.write(null, keyName)` 删除
	 * - 其余平台当前返回 `false`
	 *
	 * @param {string} keyName 键名或路径键 / Key or path key.
	 * @returns {boolean}
	 */
	static removeItem(keyName) {
		let result = false;
		switch (keyName.startsWith("@")) {
			case true: {
				const { key, path } = keyName.match(Storage.#nameRegex)?.groups;
				keyName = key;
				let value = Storage.getItem(keyName);
				if (typeof value !== "object") value = {};
				Lodash.unset(value, path);
				result = Storage.setItem(keyName, value);
				break;
			}
			default:
				switch ($app) {
					case "Surge":
						result = $persistentStore.write(null, keyName);
						break;
					case "Loon":
					case "Stash":
					case "Egern":
					case "Shadowrocket":
						result = false;
						break;
					case "Quantumult X":
						result = $prefs.removeValueForKey(keyName);
						break;
					case "Worker":
						Storage.data = Storage.data ?? {};
						delete Storage.data[keyName];
						result = true;
						break;
					case "Node.js":
						// result = false;
						Storage.data = Storage.nodeBackend.load(Storage.dataFile);
						delete Storage.data[keyName];
						Storage.nodeBackend.write(Storage.dataFile, Storage.data);
						result = true;
						break;
					default:
						result = false;
						break;
				}
				break;
		}
		return result;
	}

	/**
	 * 清空存储。
	 * Clear storage.
	 *
	 * @returns {boolean}
	 */
	static clear() {
		let result = false;
		switch ($app) {
			case "Surge":
			case "Loon":
			case "Stash":
			case "Egern":
			case "Shadowrocket":
				result = false;
				break;
			case "Quantumult X":
				result = $prefs.removeAllValues();
				break;
			case "Worker":
				Storage.data = {};
				result = true;
				break;
			case "Node.js":
				// result = false;
				Storage.data = Storage.nodeBackend.load(Storage.dataFile);
				Storage.data = {};
				Storage.nodeBackend.write(Storage.dataFile, Storage.data);
				result = true;
				break;
			default:
				result = false;
				break;
		}
		return result;
	}
}

const SIZEOF_SHORT = 2;
const SIZEOF_INT = 4;
const FILE_IDENTIFIER_LENGTH = 4;
const SIZE_PREFIX_LENGTH = 4;

const int32 = new Int32Array(2);
const float32 = new Float32Array(int32.buffer);
const float64 = new Float64Array(int32.buffer);
const isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

var Encoding;
(function (Encoding) {
    Encoding[Encoding["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding[Encoding["UTF16_STRING"] = 2] = "UTF16_STRING";
})(Encoding || (Encoding = {}));

class ByteBuffer {
    /**
     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
     */
    constructor(bytes_) {
        this.bytes_ = bytes_;
        this.position_ = 0;
        this.text_decoder_ = new TextDecoder();
    }
    /**
     * Create and allocate a new ByteBuffer with a given size.
     */
    static allocate(byte_size) {
        return new ByteBuffer(new Uint8Array(byte_size));
    }
    clear() {
        this.position_ = 0;
    }
    /**
     * Get the underlying `Uint8Array`.
     */
    bytes() {
        return this.bytes_;
    }
    /**
     * Get the buffer's position.
     */
    position() {
        return this.position_;
    }
    /**
     * Set the buffer's position.
     */
    setPosition(position) {
        this.position_ = position;
    }
    /**
     * Get the buffer's capacity.
     */
    capacity() {
        return this.bytes_.length;
    }
    readInt8(offset) {
        return this.readUint8(offset) << 24 >> 24;
    }
    readUint8(offset) {
        return this.bytes_[offset];
    }
    readInt16(offset) {
        return this.readUint16(offset) << 16 >> 16;
    }
    readUint16(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
    }
    readInt32(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
    }
    readUint32(offset) {
        return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
        return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
        return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
        int32[0] = this.readInt32(offset);
        return float32[0];
    }
    readFloat64(offset) {
        int32[isLittleEndian ? 0 : 1] = this.readInt32(offset);
        int32[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
        return float64[0];
    }
    writeInt8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeUint16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeInt32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeUint32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeInt64(offset, value) {
        this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
        this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
        this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
        this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
        float32[0] = value;
        this.writeInt32(offset, int32[0]);
    }
    writeFloat64(offset, value) {
        float64[0] = value;
        this.writeInt32(offset, int32[isLittleEndian ? 0 : 1]);
        this.writeInt32(offset + 4, int32[isLittleEndian ? 1 : 0]);
    }
    /**
     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
     * schema does not include a file_identifier (likely points at padding or the
     * start of a the root vtable).
     */
    getBufferIdentifier() {
        if (this.bytes_.length < this.position_ + SIZEOF_INT +
            FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: ByteBuffer is too short to contain an identifier.');
        }
        let result = "";
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
        }
        return result;
    }
    /**
     * Look up a field in the vtable, return an offset into the object, or 0 if the
     * field is not present.
     */
    __offset(bb_pos, vtable_offset) {
        const vtable = bb_pos - this.readInt32(bb_pos);
        return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
    }
    /**
     * Initialize any Table-derived type to point to the union at the given offset.
     */
    __union(t, offset) {
        t.bb_pos = offset + this.readInt32(offset);
        t.bb = this;
        return t;
    }
    /**
     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
     * This allocates a new string and converts to wide chars upon each access.
     *
     * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
     * "optionalEncoding" argument. This is useful for avoiding conversion when
     * the data will just be packaged back up in another FlatBuffer later on.
     *
     * @param offset
     * @param opt_encoding Defaults to UTF16_STRING
     */
    __string(offset, opt_encoding) {
        offset += this.readInt32(offset);
        const length = this.readInt32(offset);
        offset += SIZEOF_INT;
        const utf8bytes = this.bytes_.subarray(offset, offset + length);
        if (opt_encoding === Encoding.UTF8_BYTES)
            return utf8bytes;
        else
            return this.text_decoder_.decode(utf8bytes);
    }
    /**
     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
     * if a string then return a new one
     *
     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
     * makes the behaviour of __union_with_string different compared to __union
     */
    __union_with_string(o, offset) {
        if (typeof o === 'string') {
            return this.__string(offset);
        }
        return this.__union(o, offset);
    }
    /**
     * Retrieve the relative offset stored at "offset"
     */
    __indirect(offset) {
        return offset + this.readInt32(offset);
    }
    /**
     * Get the start of data of a vector whose offset is stored at "offset" in this object.
     */
    __vector(offset) {
        return offset + this.readInt32(offset) + SIZEOF_INT; // data starts after the length
    }
    /**
     * Get the length of a vector whose offset is stored at "offset" in this object.
     */
    __vector_len(offset) {
        return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(ident) {
        if (ident.length != FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: file identifier must be length ' +
                FILE_IDENTIFIER_LENGTH);
        }
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
                return false;
            }
        }
        return true;
    }
    /**
     * A helper function for generating list for obj api
     */
    createScalarList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val);
            }
        }
        return ret;
    }
    /**
     * A helper function for generating list for obj api
     * @param listAccessor function that accepts an index and return data at that index
     * @param listLength listLength
     * @param res result list
     */
    createObjList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val.unpack());
            }
        }
        return ret;
    }
}

class Builder {
    /**
     * Create a FlatBufferBuilder.
     */
    constructor(opt_initial_size) {
        /** Minimum alignment encountered so far. */
        this.minalign = 1;
        /** The vtable for the current table. */
        this.vtable = null;
        /** The amount of fields we're actually using. */
        this.vtable_in_use = 0;
        /** Whether we are currently serializing a table. */
        this.isNested = false;
        /** Starting offset of the current struct/table. */
        this.object_start = 0;
        /** List of offsets of all vtables. */
        this.vtables = [];
        /** For the current vector being built. */
        this.vector_num_elems = 0;
        /** False omits default values from the serialized data */
        this.force_defaults = false;
        this.string_maps = null;
        this.text_encoder = new TextEncoder();
        let initial_size;
        if (!opt_initial_size) {
            initial_size = 1024;
        }
        else {
            initial_size = opt_initial_size;
        }
        /**
         * @type {ByteBuffer}
         * @private
         */
        this.bb = ByteBuffer.allocate(initial_size);
        this.space = initial_size;
    }
    clear() {
        this.bb.clear();
        this.space = this.bb.capacity();
        this.minalign = 1;
        this.vtable = null;
        this.vtable_in_use = 0;
        this.isNested = false;
        this.object_start = 0;
        this.vtables = [];
        this.vector_num_elems = 0;
        this.force_defaults = false;
        this.string_maps = null;
    }
    /**
     * In order to save space, fields that are set to their default value
     * don't get serialized into the buffer. Forcing defaults provides a
     * way to manually disable this optimization.
     *
     * @param forceDefaults true always serializes default values
     */
    forceDefaults(forceDefaults) {
        this.force_defaults = forceDefaults;
    }
    /**
     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
     * called finish(). The actual data starts at the ByteBuffer's current position,
     * not necessarily at 0.
     */
    dataBuffer() {
        return this.bb;
    }
    /**
     * Get the bytes representing the FlatBuffer. Only call this after you've
     * called finish().
     */
    asUint8Array() {
        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    /**
     * Prepare to write an element of `size` after `additional_bytes` have been
     * written, e.g. if you write a string, you need to align such the int length
     * field is aligned to 4 bytes, and the string data follows it directly. If all
     * you need to do is alignment, `additional_bytes` will be 0.
     *
     * @param size This is the of the new element to write
     * @param additional_bytes The padding size
     */
    prep(size, additional_bytes) {
        // Track the biggest thing we've ever aligned to.
        if (size > this.minalign) {
            this.minalign = size;
        }
        // Find the amount of alignment needed such that `size` is properly
        // aligned after `additional_bytes`
        const align_size = ((~(this.bb.capacity() - this.space + additional_bytes)) + 1) & (size - 1);
        // Reallocate the buffer if needed.
        while (this.space < align_size + size + additional_bytes) {
            const old_buf_size = this.bb.capacity();
            this.bb = Builder.growByteBuffer(this.bb);
            this.space += this.bb.capacity() - old_buf_size;
        }
        this.pad(align_size);
    }
    pad(byte_size) {
        for (let i = 0; i < byte_size; i++) {
            this.bb.writeInt8(--this.space, 0);
        }
    }
    writeInt8(value) {
        this.bb.writeInt8(this.space -= 1, value);
    }
    writeInt16(value) {
        this.bb.writeInt16(this.space -= 2, value);
    }
    writeInt32(value) {
        this.bb.writeInt32(this.space -= 4, value);
    }
    writeInt64(value) {
        this.bb.writeInt64(this.space -= 8, value);
    }
    writeFloat32(value) {
        this.bb.writeFloat32(this.space -= 4, value);
    }
    writeFloat64(value) {
        this.bb.writeFloat64(this.space -= 8, value);
    }
    /**
     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int8` to add the buffer.
     */
    addInt8(value) {
        this.prep(1, 0);
        this.writeInt8(value);
    }
    /**
     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int16` to add the buffer.
     */
    addInt16(value) {
        this.prep(2, 0);
        this.writeInt16(value);
    }
    /**
     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int32` to add the buffer.
     */
    addInt32(value) {
        this.prep(4, 0);
        this.writeInt32(value);
    }
    /**
     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int64` to add the buffer.
     */
    addInt64(value) {
        this.prep(8, 0);
        this.writeInt64(value);
    }
    /**
     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float32` to add the buffer.
     */
    addFloat32(value) {
        this.prep(4, 0);
        this.writeFloat32(value);
    }
    /**
     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float64` to add the buffer.
     */
    addFloat64(value) {
        this.prep(8, 0);
        this.writeFloat64(value);
    }
    addFieldInt8(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt8(value);
            this.slot(voffset);
        }
    }
    addFieldInt16(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt16(value);
            this.slot(voffset);
        }
    }
    addFieldInt32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt32(value);
            this.slot(voffset);
        }
    }
    addFieldInt64(voffset, value, defaultValue) {
        if (this.force_defaults || value !== defaultValue) {
            this.addInt64(value);
            this.slot(voffset);
        }
    }
    addFieldFloat32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat32(value);
            this.slot(voffset);
        }
    }
    addFieldFloat64(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat64(value);
            this.slot(voffset);
        }
    }
    addFieldOffset(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addOffset(value);
            this.slot(voffset);
        }
    }
    /**
     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
     */
    addFieldStruct(voffset, value, defaultValue) {
        if (value != defaultValue) {
            this.nested(value);
            this.slot(voffset);
        }
    }
    /**
     * Structures are always stored inline, they need to be created right
     * where they're used.  You'll get this assertion failure if you
     * created it elsewhere.
     */
    nested(obj) {
        if (obj != this.offset()) {
            throw new TypeError('FlatBuffers: struct must be serialized inline.');
        }
    }
    /**
     * Should not be creating any other object, string or vector
     * while an object is being constructed
     */
    notNested() {
        if (this.isNested) {
            throw new TypeError('FlatBuffers: object serialization must not be nested.');
        }
    }
    /**
     * Set the current vtable at `voffset` to the current location in the buffer.
     */
    slot(voffset) {
        if (this.vtable !== null)
            this.vtable[voffset] = this.offset();
    }
    /**
     * @returns Offset relative to the end of the buffer.
     */
    offset() {
        return this.bb.capacity() - this.space;
    }
    /**
     * Doubles the size of the backing ByteBuffer and copies the old data towards
     * the end of the new buffer (since we build the buffer backwards).
     *
     * @param bb The current buffer with the existing data
     * @returns A new byte buffer with the old data copied
     * to it. The data is located at the end of the buffer.
     *
     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
     * it a uint8Array we need to suppress the type check:
     * @suppress {checkTypes}
     */
    static growByteBuffer(bb) {
        const old_buf_size = bb.capacity();
        // Ensure we don't grow beyond what fits in an int.
        if (old_buf_size & 0xC0000000) {
            throw new Error('FlatBuffers: cannot grow buffer beyond 2 gigabytes.');
        }
        const new_buf_size = old_buf_size << 1;
        const nbb = ByteBuffer.allocate(new_buf_size);
        nbb.setPosition(new_buf_size - old_buf_size);
        nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
        return nbb;
    }
    /**
     * Adds on offset, relative to where it will be written.
     *
     * @param offset The offset to add.
     */
    addOffset(offset) {
        this.prep(SIZEOF_INT, 0); // Ensure alignment is already done.
        this.writeInt32(this.offset() - offset + SIZEOF_INT);
    }
    /**
     * Start encoding a new object in the buffer.  Users will not usually need to
     * call this directly. The FlatBuffers compiler will generate helper methods
     * that call this method internally.
     */
    startObject(numfields) {
        this.notNested();
        if (this.vtable == null) {
            this.vtable = [];
        }
        this.vtable_in_use = numfields;
        for (let i = 0; i < numfields; i++) {
            this.vtable[i] = 0; // This will push additional elements as needed
        }
        this.isNested = true;
        this.object_start = this.offset();
    }
    /**
     * Finish off writing the object that is under construction.
     *
     * @returns The offset to the object inside `dataBuffer`
     */
    endObject() {
        if (this.vtable == null || !this.isNested) {
            throw new Error('FlatBuffers: endObject called without startObject');
        }
        this.addInt32(0);
        const vtableloc = this.offset();
        // Trim trailing zeroes.
        let i = this.vtable_in_use - 1;
        // eslint-disable-next-line no-empty
        for (; i >= 0 && this.vtable[i] == 0; i--) { }
        const trimmed_size = i + 1;
        // Write out the current vtable.
        for (; i >= 0; i--) {
            // Offset relative to the start of the table.
            this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
        }
        const standard_fields = 2; // The fields below:
        this.addInt16(vtableloc - this.object_start);
        const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
        this.addInt16(len);
        // Search for an existing vtable that matches the current one.
        let existing_vtable = 0;
        const vt1 = this.space;
        outer_loop: for (i = 0; i < this.vtables.length; i++) {
            const vt2 = this.bb.capacity() - this.vtables[i];
            if (len == this.bb.readInt16(vt2)) {
                for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
                    if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                        continue outer_loop;
                    }
                }
                existing_vtable = this.vtables[i];
                break;
            }
        }
        if (existing_vtable) {
            // Found a match:
            // Remove the current vtable.
            this.space = this.bb.capacity() - vtableloc;
            // Point table to existing vtable.
            this.bb.writeInt32(this.space, existing_vtable - vtableloc);
        }
        else {
            // No match:
            // Add the location of the current vtable to the list of vtables.
            this.vtables.push(this.offset());
            // Point table to current vtable.
            this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
        }
        this.isNested = false;
        return vtableloc;
    }
    /**
     * Finalize a buffer, poiting to the given `root_table`.
     */
    finish(root_table, opt_file_identifier, opt_size_prefix) {
        const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
        if (opt_file_identifier) {
            const file_identifier = opt_file_identifier;
            this.prep(this.minalign, SIZEOF_INT +
                FILE_IDENTIFIER_LENGTH + size_prefix);
            if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
                throw new TypeError('FlatBuffers: file identifier must be length ' +
                    FILE_IDENTIFIER_LENGTH);
            }
            for (let i = FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
                this.writeInt8(file_identifier.charCodeAt(i));
            }
        }
        this.prep(this.minalign, SIZEOF_INT + size_prefix);
        this.addOffset(root_table);
        if (size_prefix) {
            this.addInt32(this.bb.capacity() - this.space);
        }
        this.bb.setPosition(this.space);
    }
    /**
     * Finalize a size prefixed buffer, pointing to the given `root_table`.
     */
    finishSizePrefixed(root_table, opt_file_identifier) {
        this.finish(root_table, opt_file_identifier, true);
    }
    /**
     * This checks a required field has been set in a given table that has
     * just been constructed.
     */
    requiredField(table, field) {
        const table_start = this.bb.capacity() - table;
        const vtable_start = table_start - this.bb.readInt32(table_start);
        const ok = field < this.bb.readInt16(vtable_start) &&
            this.bb.readInt16(vtable_start + field) != 0;
        // If this fails, the caller will show what field needs to be set.
        if (!ok) {
            throw new TypeError('FlatBuffers: field ' + field + ' must be set');
        }
    }
    /**
     * Start a new array/vector of objects.  Users usually will not call
     * this directly. The FlatBuffers compiler will create a start/end
     * method for vector types in generated code.
     *
     * @param elem_size The size of each element in the array
     * @param num_elems The number of elements in the array
     * @param alignment The alignment of the array
     */
    startVector(elem_size, num_elems, alignment) {
        this.notNested();
        this.vector_num_elems = num_elems;
        this.prep(SIZEOF_INT, elem_size * num_elems);
        this.prep(alignment, elem_size * num_elems); // Just in case alignment > int.
    }
    /**
     * Finish off the creation of an array and all its elements. The array must be
     * created with `startVector`.
     *
     * @returns The offset at which the newly created array
     * starts.
     */
    endVector() {
        this.writeInt32(this.vector_num_elems);
        return this.offset();
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If the string passed has
     * already been seen, we return the offset of the already written string
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createSharedString(s) {
        if (!s) {
            return 0;
        }
        if (!this.string_maps) {
            this.string_maps = new Map();
        }
        if (this.string_maps.has(s)) {
            return this.string_maps.get(s);
        }
        const offset = this.createString(s);
        this.string_maps.set(s, offset);
        return offset;
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createString(s) {
        if (s === null || s === undefined) {
            return 0;
        }
        let utf8;
        if (s instanceof Uint8Array) {
            utf8 = s;
        }
        else {
            utf8 = this.text_encoder.encode(s);
        }
        this.addInt8(0);
        this.startVector(1, utf8.length, 1);
        this.bb.setPosition(this.space -= utf8.length);
        this.bb.bytes().set(utf8, this.space);
        return this.endVector();
    }
    /**
     * Create a byte vector.
     *
     * @param v The bytes to add
     * @returns The offset in the buffer where the byte vector starts
     */
    createByteVector(v) {
        if (v === null || v === undefined) {
            return 0;
        }
        this.startVector(1, v.length, 1);
        this.bb.setPosition(this.space -= v.length);
        this.bb.bytes().set(v, this.space);
        return this.endVector();
    }
    /**
     * A helper function to pack an object
     *
     * @returns offset of obj
     */
    createObjectOffset(obj) {
        if (obj === null) {
            return 0;
        }
        if (typeof obj === 'string') {
            return this.createString(obj);
        }
        else {
            return obj.pack(this);
        }
    }
    /**
     * A helper function to pack a list of object
     *
     * @returns list of offsets of each non null object
     */
    createObjectOffsetList(list) {
        const ret = [];
        for (let i = 0; i < list.length; ++i) {
            const val = list[i];
            if (val !== null) {
                ret.push(this.createObjectOffset(val));
            }
            else {
                throw new TypeError('FlatBuffers: Argument for createObjectOffsetList cannot contain null.');
            }
        }
        return ret;
    }
    createStructOffsetList(list, startFunc) {
        startFunc(this, list.length);
        this.createObjectOffsetList(list.slice().reverse());
        return this.endVector();
    }
}

// Code by Claude
class SimplePrecisionMath {
    /**
     * 获取数字的小数位数
     */
    static getDecimalLength(num) {
        const str = String(num);
        const decimalIndex = str.indexOf(".");
        return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
    }

    /**
     * 乘法
     */
    static multiply(a, b, decimals = 15) {
        const numA = Number(a.toFixed(decimals));
        const numB = Number(b.toFixed(decimals));

        const lenA = SimplePrecisionMath.getDecimalLength(numA);
        const lenB = SimplePrecisionMath.getDecimalLength(numB);

        const factorA = 10 ** lenA;
        const factorB = 10 ** lenB;

        const intA = Math.round(numA * factorA);
        const intB = Math.round(numB * factorB);

        const result = (intA * intB) / (factorA * factorB);

        return Number(result.toFixed(decimals));
    }

    /**
     * 除法
     */
    static divide(a, b, decimals = 15) {
        if (b === 0) {
            throw new Error("除数不能为0");
        }

        const numA = Number(a.toFixed(decimals));
        const numB = Number(b.toFixed(decimals));

        const lenA = SimplePrecisionMath.getDecimalLength(numA);
        const lenB = SimplePrecisionMath.getDecimalLength(numB);

        const factorA = 10 ** lenA;
        const factorB = 10 ** lenB;

        const intA = Math.round(numA * factorA);
        const intB = Math.round(numB * factorB);

        const result = (intA / intB) * (factorB / factorA);

        return Number(result.toFixed(decimals));
    }

    /**
     * 加法
     */
    static add(a, b, decimals = 15) {
        const numA = Number(a.toFixed(decimals));
        const numB = Number(b.toFixed(decimals));

        const lenA = SimplePrecisionMath.getDecimalLength(numA);
        const lenB = SimplePrecisionMath.getDecimalLength(numB);
        const maxLen = Math.max(lenA, lenB);
        const factor = 10 ** maxLen;

        const intA = Math.round(numA * factor);
        const intB = Math.round(numB * factor);

        return Number(((intA + intB) / factor).toFixed(decimals));
    }

    /**
     * 减法
     */
    static subtract(a, b, decimals = 15) {
        const numA = Number(a.toFixed(decimals));
        const numB = Number(b.toFixed(decimals));

        const lenA = SimplePrecisionMath.getDecimalLength(numA);
        const lenB = SimplePrecisionMath.getDecimalLength(numB);
        const maxLen = Math.max(lenA, lenB);
        const factor = 10 ** maxLen;

        const intA = Math.round(numA * factor);
        const intB = Math.round(numB * factor);

        return Number(((intA - intB) / factor).toFixed(decimals));
    }
}

class AirQuality {
    static Name = "AirQuality";
    static Version = "3.1.0";
    static Author = "Virgil Clyne & Wordless Echo";

    // Code by Claude
    static #CeilByPrecision(a, b) {
        // 获取 b 的小数位数
        const decimals = (b.toString().split(".")[1] || "").length;

        // 根据小数位数计算倍数
        const multiplier = 10 ** decimals;

        // 向上取整；参考 WeatherKit PR #107 以 EPSILON 容差修正二进制浮点导致的边界误判
        const scaled = a * multiplier;
        return Math.ceil(scaled - Number.EPSILON * Math.max(1, Math.abs(scaled)) * 8) / multiplier;
    }

    /**
     * 根据 AQI 数值定位其所属的分类等级（categoryIndex）。
     *
     * 作用：
     * - 在给定的 categories.ranges 中查找 index 落入的区间；
     * - 返回该区间对应的 categoryIndex，供主污染物判断与展示层分级使用。
     *
     * @param {number} index
     * 待判定的 AQI 指数值。
     *
     * @param {{
     *   ranges?: Array<{ categoryIndex: number, indexes: [number, number] }>
     * }} categories
     * 分类配置对象。
     * - ranges[*].indexes 为 [min, max] 区间；
     * - 使用 #CeilByPrecision 处理小数精度后再进行区间比较。
     *
     * @returns {number}
     * 命中的 categoryIndex；若 categories 无效或未命中区间，返回 -1。
     */

    static CategoryIndex(index, categories) {
        Console.info("☑️ CategoryIndex", `index: ${index}`);

        const failedCategoryIndex = -1;

        if (!categories?.ranges || !Array.isArray(categories.ranges) || categories.ranges.length === 0) {
            Console.debug(`categories: ${JSON.stringify(categories)}`);
            Console.error("GetPrimaryPollutant", "categories无效");
            return failedCategoryIndex;
        }

        const range = categories.ranges.find(({ indexes }) => {
            const [min, max] = indexes;
            return AirQuality.#CeilByPrecision(index, min) >= min && AirQuality.#CeilByPrecision(index, max) <= max;
        });
        if (!range) {
            Console.error("CategoryIndex", `找不到index: ${index}对应的category`);
            return failedCategoryIndex;
        }

        Console.info("✅ CategoryIndex", `categoryIndex: ${range.categoryIndex}`);
        return range.categoryIndex;
    }

    static CompareCategoryIndexes(todayCategoryIndex, yesterdayCategoryIndex) {
        Console.info("☑️ CompareCategoryIndexes", `todayCategoryIndex: ${todayCategoryIndex}`, `yesterdayCategoryIndex: ${yesterdayCategoryIndex}`);

        const { UNKNOWN, SAME, WORSE, BETTER } = AirQuality.Config.CompareCategoryIndexes;
        const today = Number(todayCategoryIndex);
        const yesterday = Number(yesterdayCategoryIndex);

        // -1、0 和 null 都表示“无可用等级”，不能参与好转/恶化比较。
        if (![today, yesterday].every(categoryIndex => Number.isFinite(categoryIndex) && categoryIndex > 0)) {
            Console.error("CompareCategoryIndexes", "categoryIndex无效");
            return UNKNOWN;
        } else {
            const diff = today - yesterday;
            if (diff === 0) {
                Console.info("✅ CompareCategoryIndexes");
                return SAME;
            } else if (diff > 0) {
                Console.info("✅ CompareCategoryIndexes");
                return WORSE;
            } else {
                Console.info("✅ CompareCategoryIndexes");
                return BETTER;
            }
        }
    }

    static ConvertUnits(pollutants, stpConversionFactors, pollutantScales) {
        Console.info("☑️ ConvertUnits");

        const friendlyUnits = AirQuality.Config.Units.Friendly;

        const convertedPollutants = pollutants.map(pollutant => {
            const pollutantScale = pollutantScales[pollutant.pollutantType];

            if (!pollutantScale) {
                Console.info("ConvertUnits", `No scale for ${pollutant.pollutantType}, skip`);
                return pollutant;
            }

            Console.info("ConvertUnits", `Converting ${pollutant.pollutantType}`);
            const amount = AirQuality.ConvertUnit(pollutant.amount, pollutant.units, pollutantScale.units, stpConversionFactors?.[pollutant.pollutantType] || -1, pollutantScale?.stpConversionFactor || -1);
            if (amount < 0) {
                Console.error(
                    "ConvertUnits",
                    `无法转换${pollutant.pollutantType}的单位`,
                    `${pollutant.amount} ${friendlyUnits[pollutant.units] ?? pollutant.units} (STP conversion factor: ${stpConversionFactors?.[pollutant.pollutantType] || -1}) -> ${amount} ${friendlyUnits[pollutantScale.units] ?? pollutantScale.units} (STP conversion factor: ${pollutantScale?.stpConversionFactor || -1})`,
                );
                return pollutant;
            }

            Console.info("ConvertUnits", `Converted ${pollutant.pollutantType}: ${amount} ${friendlyUnits[pollutantScale.units] ?? pollutantScale.units}`);
            return { ...pollutant, amount, units: pollutantScale.units };
        });
        Console.info("✅ ConvertUnits");
        return convertedPollutants;
    }

    /**
     * 修复污染物单位。
     *
     * 说明：
     * - 这是空气质量数据修复的统一入口（当前聚焦污染物单位修复）；
     * - 当前仅处理和风天气（QWeather）CO 单位场景：其 CO 原始单位为 mg/m3，
     *   需转换为 WeatherKit 使用的 µg/m3；
     * - 参考 WeatherKit PR #107（Horatio，Apache-2.0）的幂等修复：仅在明确标注
     *   mg/m3 时换算；Apple 原始 QWeather 产品的 CO 数值为 mg/m3 但可能误标为
     *   µg/m3，仅当入口显式声明 appleProduct 时按误标处理，避免对已归一化数据
     *   重复换算，也不按浓度大小猜测单位；
     * - 后续同类修复请统一收敛到本方法内，必要时可将本方法升级为 FixAirQuality。
     *
     * @param {any} airQuality - 空气质量数据对象
     * @param {{appleProduct?: boolean}} options - 仅 Apple 原始产品入口设为 true
     * @returns {any} 单位修复后的空气质量数据对象
     */
    static FixPollutantsUnits(airQuality, options = {}) {
        Console.info("☑️ FixPollutantsUnits");
        switch (airQuality?.metadata?.providerName) {
            case "和风天气":
            case "QWeather": {
                const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
                airQuality = {
                    ...airQuality,
                    pollutants: airQuality?.pollutants?.map(pollutant => (pollutant?.pollutantType === "CO" && (pollutant.units === mgm3 || (options.appleProduct === true && pollutant.units === ugm3)) ? { ...pollutant, amount: AirQuality.ConvertUnit(pollutant.amount, mgm3, ugm3), units: ugm3 } : pollutant)),
                };
                break;
            }
            default: {
                Console.info(`Provider ${airQuality?.metadata?.providerName} is no need to fix.`);
                break;
            }
        }
        Console.info("✅ FixPollutantsUnits");
        return airQuality;
    }

    static #GetStpConversionFactors(airQuality) {
        Console.info("☑️ GetStpConversionFactors");

        switch (airQuality?.metadata?.providerName) {
            case "和风天气":
            case "BreezoMeter":
            default: {
                Console.info("✅ GetStpConversionFactors", `STP conversion factors for ${airQuality?.metadata?.providerName}: US`);
                return AirQuality.Config.STP_ConversionFactors.US;
            }
        }
    }

    static Pollutants2AQI(airQuality, Settings, options = {}) {
        Console.info("☑️ Pollutants2AQI");
        const algorithm = options?.algorithm ?? Settings?.AirQuality?.Calculate?.Algorithm;
        const forcePrimaryPollutant = options?.forcePrimaryPollutant ?? Settings?.AirQuality?.Current?.Index?.ForceCNPrimaryPollutants;
        const allowOverRange = options?.allowOverRange ?? Settings?.AirQuality?.Calculate?.AllowOverRange;

        const stpConversionFactors = AirQuality.#GetStpConversionFactors(airQuality);
        const scale = AirQuality.Config.Scales[algorithm] ?? AirQuality.Config.Scales.UBA;

        switch (algorithm) {
            case "None": {
                return airQuality;
            }
            case "EU_EAQI": {
                // PollutantsToEAQI
                Console.info("☑️ PollutantsToEAQI");
                airQuality = AirQuality.#PollutantsToAirQuality(airQuality.pollutants, scale, { stpConversionFactors, allowOverRange: false });
                Console.info("✅ PollutantsToEAQI");
                break;
            }
            case "WAQI_InstantCast_US": {
                // PollutantsToInstantCastUS
                Console.info("☑️ PollutantsToInstantCastUS", `allowOverRange: ${allowOverRange}`);
                airQuality = AirQuality.#PollutantsToAirQuality(airQuality.pollutants, scale, { stpConversionFactors, allowOverRange });
                Console.info("✅ PollutantsToInstantCastUS");
                break;
            }
            case "WAQI_InstantCast_CN":
            case "WAQI_InstantCast_CN_25_DRAFT": {
                // PollutantsToInstantCastCN12 / PollutantsToInstantCastCN25 / #PollutantsToInstantCastCN
                Console.info("☑️ PollutantsToInstantCastCN", `allowOverRange: ${allowOverRange}`, `forcePrimaryPollutant: ${forcePrimaryPollutant}`);
                airQuality = AirQuality.#PollutantsToAirQuality(airQuality.pollutants, scale, { stpConversionFactors, allowOverRange });

                const isNotAvailable = !forcePrimaryPollutant && airQuality.index <= 50;
                if (isNotAvailable) {
                    Console.info("PollutantsToInstantCastCN", `Max index of pollutants ${airQuality.primaryPollutant} = ${airQuality.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
                }

                airQuality = {
                    ...airQuality,
                    primaryPollutant: isNotAvailable ? "NOT_AVAILABLE" : airQuality.primaryPollutant,
                };
                Console.info("✅ PollutantsToInstantCastCN");
                break;
            }
            case "CN_DEATH_AQHI":
            case "CA_AQHI":
            case "HK_AQHI":
            case "CN_DEATH_HK_AQHI": {
                // PollutantsToAQHI
                Console.info("☑️ PollutantsToAQHI");
                airQuality = AirQuality.#PollutantsToAQHI(airQuality.pollutants, scale, { stpConversionFactors });
                airQuality = {
                    ...airQuality,
                    index: airQuality.categoryIndex,
                };
                Console.info("✅ PollutantsToAQHI");
                break;
            }
            case "AQHI_Multi_CN":
            case "AQHI_Multi_CN_HK": {
                Console.info("☑️ PollutantsToAQHIMulti");
                airQuality = AirQuality.#PollutantsToAQHIMulti(airQuality.pollutants, scale, { stpConversionFactors });
                airQuality = {
                    ...airQuality,
                    index: airQuality.categoryIndex,
                };
                Console.info("✅ PollutantsToAQHIMulti");
                break;
            }
            case "UBA":
            default: {
                // PollutantsToUBA
                Console.info("☑️ PollutantsToUBA");
                airQuality = AirQuality.#PollutantsToAirQuality(airQuality.pollutants, scale, { stpConversionFactors, allowOverRange: true });
                airQuality = {
                    ...airQuality,
                    index: airQuality.categoryIndex,
                };
                Console.info("✅ PollutantsToUBA");
                break;
            }
        }

        Console.info("✅ Pollutants2AQI");
        return airQuality;
    }

    static ConvertPollutants(airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings) {
        const unitsMode = Settings?.AirQuality?.Current?.Pollutants?.Units?.Mode || "Scale";
        Console.info("☑️ ConvertPollutants", `mode: ${unitsMode}`);

        const getScale = scaleName => {
            const scales = AirQuality.Config.Scales;
            switch (scaleName) {
                case scales.HK_AQHI.weatherKitScale.name:
                    return scales.HK_AQHI;
                case scales.CA_AQHI.weatherKitScale.name:
                    return scales.CA_AQHI;
                case scales.HJ6332012.weatherKitScale.name:
                    return scales.WAQI_InstantCast_CN;
                case scales.EPA_NowCast.weatherKitScale.name:
                    return scales.WAQI_InstantCast_US;
                case scales.EU_EAQI.weatherKitScale.name:
                    return scales.EU_EAQI;
                default:
                    return scales[scaleName];
            }
        };

        const getPollutantScales = pollutantScales => {
            const { ugm3, ppb } = AirQuality.Config.Units.WeatherKit;
            const { US, EU } = AirQuality.Config.STP_ConversionFactors;
            const ugm3Scale = {
                OZONE: { units: ugm3, stpConversionFactor: -1 },
                NO2: { units: ugm3, stpConversionFactor: -1 },
                SO2: { units: ugm3, stpConversionFactor: -1 },
                CO: { units: ugm3, stpConversionFactor: -1 },
                C6H6: { units: ugm3, stpConversionFactor: -1 },
                NH3: { units: ugm3, stpConversionFactor: -1 },
                NO: { units: ugm3, stpConversionFactor: -1 },
            };
            const usPpbScale = {
                OZONE: { units: ppb, stpConversionFactor: US.OZONE },
                NO2: { units: ppb, stpConversionFactor: US.NO2 },
                SO2: { units: ppb, stpConversionFactor: US.SO2 },
                CO: { units: ppb, stpConversionFactor: US.CO },
                C6H6: { units: ppb, stpConversionFactor: US.C6H6 },
                NH3: { units: ppb, stpConversionFactor: US.NH3 },
                NO: { units: ppb, stpConversionFactor: US.NO },
            };
            const euPpbScale = {
                OZONE: { units: ppb, stpConversionFactor: EU.OZONE },
                NO2: { units: ppb, stpConversionFactor: EU.NO2 },
                SO2: { units: ppb, stpConversionFactor: EU.SO2 },
                CO: { units: ppb, stpConversionFactor: EU.CO },
                C6H6: { units: ppb, stpConversionFactor: EU.C6H6 },
                NH3: { units: ppb, stpConversionFactor: EU.NH3 },
                NO: { units: ppb, stpConversionFactor: EU.NO },
            };

            switch (unitsMode) {
                case "ugm3":
                    return { ...ugm3Scale, ...pollutantScales };
                case "EU_ppb":
                    return { ...euPpbScale, ...pollutantScales };
                case "US_ppb":
                    return { ...usPpbScale, ...pollutantScales };
                case "Force_ugm3":
                    return ugm3Scale;
                case "Force_EU_ppb":
                    return euPpbScale;
                case "Force_US_ppb":
                    return usPpbScale;
                case "Scale":
                default:
                    return pollutantScales;
            }
        };

        const replaceUnits = Settings?.AirQuality?.Current?.Pollutants?.Units?.Replace ?? [];
        const isIndexInjected = needInjectIndex && injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable;
        const currentScale = isIndexInjected ? injectedIndex?.scale : airQuality?.scale;
        const scaleName = replaceUnits.find(name => AirQuality.ScaleMatches(currentScale, name));

        const pollutants = injectedPollutants?.metadata && !injectedPollutants.metadata.temporarilyUnavailable ? injectedPollutants.pollutants : airQuality?.pollutants;
        Console.info("✅ ConvertPollutants");
        if (replaceUnits.includes(scaleName)) {
            if (isIndexInjected && Settings?.AirQuality?.Current?.Index?.Provider === "Calculate" && unitsMode === "Scale") {
                Console.info("ConvertPollutants", `Use pollutants from iRingo`);
                return injectedIndex.pollutants;
            } else {
                const scale = getScale(scaleName);
                if (!scale) {
                    Console.error("ConvertPollutants", `Unsupported scale name: ${scaleName}`);
                    return pollutants;
                }

                return AirQuality.ConvertUnits(pollutants, AirQuality.#GetStpConversionFactors(airQuality), getPollutantScales(scale.pollutants));
            }
        } else {
            return pollutants;
        }
    }

    // Apple 的无版本 AQ scale 路径会解析到当前资源；仅自定义 scale 明确配置版本时才拼接。
    static ToWeatherKitScale = ({ name, version }) => (version ? `${name}.${version}` : name);

    static ScaleMatches = (scale, name) => scale === name || (scale?.startsWith(`${name}.`) && /^\d+$/.test(scale.slice(name.length + 1)));

    /**
     * 根据“昨日对比指数来源”和当前空气质量 scale，选择用于昨日对比计算的算法。
     * - Calculate: 直接采用用户配置算法
     * - QWeather / ColorfulCloudsCN: 固定使用国标 InstantCast
     * - WeatherKit: 根据 scale 自动映射到内置算法
     * @param {any} airQuality - 当前空气质量对象（用于读取 scale）
     * @param {any} Settings - 全局设置对象
     * @returns {string} 选中的算法名；无法匹配时返回空字符串
     */
    static chooseAlogrithm(airQuality, Settings) {
        Console.info("☑️ chooseAlogrithm", `currentIndexProvider: ${Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider}`);

        switch (Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider) {
            case "Calculate": {
                Console.info("✅ chooseAlogrithm", `algorithm: ${Settings?.AirQuality?.Calculate?.Algorithm}`);
                return Settings?.AirQuality?.Calculate?.Algorithm;
            }
            case "QWeather":
            case "ColorfulCloudsCN": {
                Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_CN`);
                return "WAQI_InstantCast_CN";
            }
            case "WeatherKit": {
                const scales = AirQuality.Config.Scales;

                if (AirQuality.ScaleMatches(airQuality?.scale, scales.HJ6332012.weatherKitScale.name)) {
                    Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_CN`);
                    return "WAQI_InstantCast_CN";
                } else if (AirQuality.ScaleMatches(airQuality?.scale, scales.EPA_NowCast.weatherKitScale.name)) {
                    Console.info("✅ chooseAlogrithm", `algorithm: WAQI_InstantCast_US`);
                    return "WAQI_InstantCast_US";
                } else {
                    const supportedScales = [scales.EU_EAQI.weatherKitScale.name, scales.UBA.weatherKitScale.name];
                    const currentScale = supportedScales.find(name => AirQuality.ScaleMatches(airQuality?.scale, name));
                    if (currentScale) {
                        Console.info("✅ chooseAlogrithm", `algorithm: ${currentScale}`);
                        return currentScale;
                    }

                    Console.error("chooseAlogrithm", "没有找到合适的内置算法");
                    return "";
                }
            }
            default: {
                Console.error("chooseAlogrithm", "未知的currentIndexProvider");
                return "";
            }
        }
    }

    /**
     * 为 providerName 附加空气质量标准描述。
     * @param {any} airQuality - 空气质量对象
     * @param {any} Settings - 全局设置对象
     * @returns {string} 带标准描述的 providerName
     */
    static appendScaleToProviderName(airQuality, Settings) {
        const providerName = airQuality?.metadata?.providerName;
        switch (providerName) {
            case "和风天气":
                return `${providerName}（国标，12年2月版）`;
            case "彩云天气": {
                const useUsa = airQuality?.scale === AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.EPA_NowCast.weatherKitScale);
                return `${providerName}（${useUsa ? "美标，18年9月版" : "国标，12年2月版"}）`;
            }
            case "iRingo":
                switch (Settings?.AirQuality?.Calculate?.Algorithm) {
                    case "EU_EAQI":
                        return `${providerName} (ETC HE Report 2024/17)`;
                    case "WAQI_InstantCast_US":
                        return `${providerName} (WAQI InstantCast with EPA-454/B-24-002)`;
                    case "WAQI_InstantCast_CN":
                        return `${providerName} (InstantCast with HJ 633—2012)`;
                    case "WAQI_InstantCast_CN_25_DRAFT":
                        return `${providerName} (InstantCast with HJ 633 2025 DRAFT)`;
                    case "CN_DEATH_AQHI":
                        return `${providerName} (China CDC Death Risk AQHI)`;
                    case "CA_AQHI":
                        return `${providerName} (InstantCast with CA AQHI)`;
                    case "HK_AQHI":
                        return `${providerName} (InstantCast with HK AQHI)`;
                    case "CN_DEATH_HK_AQHI":
                        return `${providerName} (China CDC Death Risk + HK AQHI)`;
                    case "AQHI_Multi_CN":
                        return `${providerName} (AQHI-Multi for CN)`;
                    case "AQHI_Multi_CN_HK":
                        return `${providerName} (AQHI-Multi for CN+HK)`;
                    case "UBA":
                    default:
                        return `${providerName} (FB001846)`;
                }
            default:
                return providerName;
        }
    }

    /**
     * 计算单个污染物在目标标准下的 index。
     *
     * @param {{pollutantType: string, amount: number, units: string}} pollutant
     * 单个污染物数据。
     *
     * @param {string} pollutantType
     * 污染物类型（如 OZONE/PM2_5/NO2）。
     *
     * @param {{
     *   units: string,
     *   ranges: {
     *     min: { indexes: [number, number], amounts: [number, number] },
     *     max: { indexes: [number, number], amounts: [number, number] },
     *     value: Array<{ indexes: [number, number], amounts: [number, number] }>
     *   }
     * }} pollutantScale
     * 该污染物在目标标准下的分段阈值与单位。
     *
     * @param {Record<string, string>} friendlyUnits
     * 友好单位映射表（用于日志展示）。
     *
     * @returns {number}
     * 该污染物的 index；低于最小阈值时返回 min.indexes[0]；超上限时使用 max 区间外推。
     */
    static #ComputePollutantIndex(pollutant, pollutantType, pollutantScale, friendlyUnits) {
        if (!pollutantScale) {
            Console.warn("PollutantsToIndexes", `标准未定义污染物${pollutantType}，index将标记为-1`);
            return -1;
        }

        const { add, subtract, multiply, divide } = SimplePrecisionMath;

        Console.debug(`${pollutantType}: ${pollutant.amount} ${friendlyUnits[pollutant.units] ?? pollutant.units}`);

        const minValidAmount = pollutantScale.ranges.min.amounts[0];
        if (pollutant.amount < minValidAmount) {
            Console.error("PollutantsToIndexes", `${pollutantType}的含量无效：${pollutant.amount} ${friendlyUnits[pollutantScale.units]}需要 >= ${minValidAmount}`);
            return pollutantScale.ranges.min.indexes[0];
        }

        const isOverRange = pollutant.amount > pollutantScale.ranges.max.amounts[1];
        if (isOverRange) {
            Console.warn("PollutantsToIndexes", `检测到爆表指数！${pollutantType}：${pollutant.amount} ${friendlyUnits[pollutantScale.units]}`);
            Console.warn("PollutantsToIndexes", "注意身体！");
        }

        const { indexes, amounts } = isOverRange
            ? pollutantScale.ranges.max
            : pollutantScale.ranges.value.find(({ amounts }) => {
                  const [minAmount, maxAmount] = amounts;
                  return AirQuality.#CeilByPrecision(pollutant.amount, minAmount) >= minAmount && AirQuality.#CeilByPrecision(pollutant.amount, maxAmount) <= maxAmount;
              });
        Console.debug(`indexes: ${JSON.stringify(indexes)}`, `amounts: ${JSON.stringify(amounts)}`);

        const [minIndex, maxIndex] = indexes;
        const [minAmount, maxAmount] = amounts;
        const index = add(multiply(divide(subtract(maxIndex, minIndex), subtract(maxAmount, minAmount)), subtract(pollutant.amount, minAmount)), pollutant.amount > maxAmount ? maxIndex : minIndex);
        return index;
    }

    /**
     * 将污染物浓度映射为对应标准下的污染物指数（index）。
     *
     * 作用：
     * 1) 按 pollutantScales 定义，逐个污染物查找浓度区间；
     * 2) 使用 #ComputePollutantIndex 计算单污染物 index；
     * 3) 返回用于后续主污染物判定的一组 { pollutantType, index }。
     *
     * @param {Array<{pollutantType: string, amount: number, units: string}>} pollutants
     * 污染物列表。
     * - amount 的单位由 units 字段表示（如 µg/m³、mg/m³、ppb、ppm）。
     * - 进入该方法前应已与 pollutantScales 的目标单位对齐。
     *
     * @param {Record<string, {
     *   units: string,
     *   ranges: {
     *     min: { indexes: [number, number], amounts: [number, number] },
     *     max: { indexes: [number, number], amounts: [number, number] },
     *     value: Array<{ indexes: [number, number], amounts: [number, number] }>
     *   }
     * }>} pollutantScales
     * 指标标准定义，包含每种污染物的单位及分段阈值。
     *
     * @returns {Array<{pollutantType: string, index: number}>}
     * 每种标准污染物对应的 index 列表。
     * - 若标准所需污染物缺失，返回该污染物 index=-1。
     */
    static #PollutantsToIndexes(pollutants = [], pollutantScales) {
        return pollutants.map(pollutant => {
            const index = AirQuality.#ComputePollutantIndex(pollutant, pollutant.pollutantType, pollutantScales?.[pollutant.pollutantType], AirQuality.Config.Units.Friendly);
            pollutant.index = index;
            return pollutant;
        });
    }

    static PrimaryPollutant(pollutants = [], categories) {
        Console.info("☑️ PrimaryPollutant");
        const failedPollutant = { pollutantType: "NOT_AVAILABLE", index: -1, categoryIndex: -1 };

        if (!Array.isArray(pollutants) || pollutants.length === 0) {
            Console.debug(`pollutants: ${JSON.stringify(pollutants)}`);
            Console.error("PrimaryPollutant", "pollutants无效");
            return failedPollutant;
        }

        const indexesWithCategory = pollutants
            .filter(({ index }) => Number.isFinite(index))
            .map(pollutant => ({
                ...pollutant,
                categoryIndex: AirQuality.CategoryIndex(pollutant.index, categories),
            }))
            .sort((a, b) => b.index - a.index);

        if (indexesWithCategory.length === 0) {
            Console.debug(`pollutants: ${JSON.stringify(pollutants)}`, `indexesWithCategory: ${JSON.stringify(indexesWithCategory)}`);
            Console.error("PrimaryPollutant", "找不到有效的index");
            return failedPollutant;
        }

        const maxCategoryIndex = indexesWithCategory.reduce((max, { categoryIndex }) => (categoryIndex > max ? categoryIndex : max), Number.NEGATIVE_INFINITY);
        const primaryPollutants = indexesWithCategory.filter(({ categoryIndex }) => categoryIndex === maxCategoryIndex);

        if (primaryPollutants.length > 1) {
            Console.warn("PrimaryPollutant", `检测到多个同级别的污染物，maxCategoryIndex：${maxCategoryIndex}`);
            primaryPollutants.map(({ pollutantType, index }) => Console.warn("GetPrimaryPollutants", `${pollutantType}：${index}`));
        }

        const primaryPollutant = primaryPollutants[0];
        Console.info("✅ PrimaryPollutant", `primaryPollutant: ${JSON.stringify(primaryPollutant)}`);
        return primaryPollutant;
    }

    /**
     * 将污染物浓度转换为统一 airQuality 结构。
     *
     * 作用：
     * 1) 按 scale 定义将污染物转换到目标单位（可选）；
     * 2) 计算各污染物指数并确定主污染物；
     * 3) 产出 WeatherKit 风格 airQuality，并按需执行 index 上限裁剪。
     *
     * @param {Array<{pollutantType: string, amount: number, units: string}>} pollutants
     * 原始污染物数组。
     * - amount 的物理单位由每个元素的 units 字段决定（如 µg/m³、mg/m³、ppb、ppm）。
     *
     * @param {{
     *   weatherKitScale: {name: string, version?: string, maxIndex?: number},
     *   pollutants: Record<string, {units: string, stpConversionFactor?: number, ranges: any}>,
     *   categories: {significantIndex: number, ranges: Array<{categoryIndex: number, indexes: number[]}>}
     * }} scale
     * AQI 标准配置。
     * - scale.pollutants[*].units 为目标单位。
     * - scale.weatherKitScale.maxIndex 为可选 index 上限。
     *
     * @param {{
     *   stpConversionFactors?: Record<string, number>,
     *   allowOverRange?: boolean
     * }} [options]
     * 计算选项。
     * - stpConversionFactors：单位换算因子表（无量纲）。提供时会先执行单位转换。
     * - allowOverRange：是否允许 index 超出 maxIndex；默认 true。
     *
     * @returns {{
     *   index: number,
     *   isSignificant: boolean,
     *   categoryIndex: number,
     *   pollutants: Array<{pollutantType: string, amount: number, units: string}>,
     *   metadata: {providerName: string, temporarilyUnavailable: boolean},
     *   primaryPollutant: string,
     *   scale: string
     * } | {metadata: {providerName: string, temporarilyUnavailable: boolean}}}
     * 返回标准化 airQuality；当输入无效时返回 temporarilyUnavailable 结果。
     */
    static #PollutantsToAirQuality(pollutants, scale, options = {}) {
        Console.info("☑️ PollutantsToAirQuality");
        const stpConversionFactors = options?.stpConversionFactors;
        const allowOverRange = options?.allowOverRange ?? true;

        if (!Array.isArray(pollutants) || pollutants.length === 0) {
            Console.debug(`pollutants: ${JSON.stringify(pollutants)}`);
            Console.error("PollutantsToAirQuality", "pollutants无效");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true } };
        }

        let newPollutants = [];
        if (stpConversionFactors) {
            newPollutants = AirQuality.ConvertUnits(pollutants, stpConversionFactors, scale.pollutants);
        }

        newPollutants = AirQuality.#PollutantsToIndexes(newPollutants, scale.pollutants);
        Console.debug("PollutantsToAirQuality", `convertedPollutants: ${JSON.stringify(newPollutants)}`);

        const primaryPollutant = AirQuality.PrimaryPollutant(newPollutants, scale.categories);
        const maxIndex = scale?.weatherKitScale?.maxIndex;
        const index = allowOverRange || !Number.isFinite(maxIndex) ? Math.round(primaryPollutant.index) : Math.min(Math.round(primaryPollutant.index), maxIndex);
        Console.info("✅ PollutantsToAirQuality");
        return {
            index,
            isSignificant: primaryPollutant.categoryIndex >= scale.categories.significantIndex,
            categoryIndex: primaryPollutant.categoryIndex,
            pollutants: newPollutants,
            metadata: { providerName: "iRingo", temporarilyUnavailable: false },
            primaryPollutant: primaryPollutant.pollutantType,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };
    }

    /**
     * 将污染物浓度转换为空气质量健康指数（AQHI）。
     *
     * 公式来源：
     * [10.1016/j.atmosenv.2024.120473]{@link https://doi.org/10.1016/j.atmosenv.2024.120473}
     *
     * 健康风险增幅（%AR）：
     * %AR(total) = %AR(NO2) + %AR(SO2) + %AR(O3) + max(%AR(PM10), %AR(PM2.5))
     * %AR(X) = [exp(β(X) × C(X)) – 1] × 100
     * C(X) 为各污染物 3 小时移动平均浓度（µg/m³）。
     *
     * @param {Array<{pollutantType: string, amount: number, units: string}>} pollutants
     * @param {{ weatherKitScale: object, categories: object, betas: object }} scale
     * @param {{ stpConversionFactors?: object }} [options]
     * @returns {object} 标准化 airQuality 对象
     */
    static #PollutantsToAQHI(pollutants, scale, options = {}) {
        Console.info("☑️ PollutantsToAQHI");

        if (!Array.isArray(pollutants) || pollutants.length === 0) {
            Console.debug(`pollutants: ${JSON.stringify(pollutants)}`);
            Console.error("PollutantsToAQHI", "pollutants无效");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true } };
        }

        const stpConversionFactors = options?.stpConversionFactors;
        const { ugm3 } = AirQuality.Config.Units.WeatherKit;

        // 先做单位转换（目标单位均为 µg/m³）
        const convertedPollutants = stpConversionFactors ? AirQuality.ConvertUnits(pollutants, stpConversionFactors, scale.pollutants) : pollutants;

        // 按 pollutantType 索引浓度
        const getAmount = type => {
            const p = convertedPollutants.find(({ pollutantType }) => pollutantType === type);
            if (!p) return null;
            if (p.units !== ugm3) {
                Console.warn("PollutantsToAQHI", `${type} 单位不是 µg/m³（${p.units}），跳过`);
                return null;
            }
            return p.amount;
        };

        const { betas } = scale;
        const ar = (beta, concentration) => {
            if (concentration === null || concentration < 0) return 0;
            return (Math.exp(beta * concentration) - 1) * 100;
        };

        const arNO2 = ar(betas.NO2 || 0, getAmount("NO2"));
        const arSO2 = ar(betas.SO2 || 0, getAmount("SO2"));
        const arO3 = ar(betas.O3 || 0, getAmount("OZONE"));
        const arPM10 = ar(betas.PM10 || 0, getAmount("PM10"));
        const arPM2_5 = ar(betas.PM2_5 || 0, getAmount("PM2_5"));
        const arPM = Math.max(arPM10, arPM2_5);

        const totalAR = arNO2 + arSO2 + arO3 + arPM;
        Console.info("PollutantsToAQHI", `%AR: NO2=${arNO2.toFixed(4)}, SO2=${arSO2.toFixed(4)}, O3=${arO3.toFixed(4)}, PM=${arPM.toFixed(4)} (PM10=${arPM10.toFixed(4)}, PM2.5=${arPM2_5.toFixed(4)}), total=${totalAR.toFixed(4)}`);

        // 设置每个污染物的内部 index 为它的 %AR 值
        convertedPollutants.forEach(p => {
            switch (p.pollutantType) {
                case "NO2":
                    p.index = arNO2;
                    break;
                case "SO2":
                    p.index = arSO2;
                    break;
                case "OZONE":
                    p.index = arO3;
                    break;
                case "PM10":
                    p.index = arPM10;
                    break;
                case "PM2_5":
                    p.index = arPM2_5;
                    break;
                default:
                    p.index = -1;
            }
        });

        // 将 %AR 映射到 1–11 的 categoryIndex (即 AQHI 指数)
        const categoryIndex = AirQuality.CategoryIndex(totalAR, scale.categories);

        // 以最大 %AR 对应的污染物作为主污染物
        const primaryPollutant = convertedPollutants.reduce((max, cur) => (cur.index > max.index ? cur : max), { pollutantType: "NOT_AVAILABLE", index: -1 });

        Console.info("✅ PollutantsToAQHI", `AQHI: ${categoryIndex}, primaryPollutant: ${primaryPollutant.pollutantType}`);
        return {
            index: totalAR,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            categoryIndex,
            pollutants: convertedPollutants,
            metadata: { providerName: "iRingo", temporarilyUnavailable: false },
            primaryPollutant: primaryPollutant.pollutantType,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };
    }

    static #PollutantsToAQHIMulti(pollutants, scale, options = {}) {
        Console.info("☑️ PollutantsToAQHIMulti");

        if (!Array.isArray(pollutants) || pollutants.length === 0) {
            Console.debug(`pollutants: ${JSON.stringify(pollutants)}`);
            Console.error("PollutantsToAQHIMulti", "pollutants无效");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true } };
        }

        const stpConversionFactors = options?.stpConversionFactors;
        const { ugm3 } = AirQuality.Config.Units.WeatherKit;
        const convertedPollutants = stpConversionFactors ? AirQuality.ConvertUnits(pollutants, stpConversionFactors, scale.pollutants) : pollutants;

        const getAmount = type => {
            const p = convertedPollutants.find(({ pollutantType }) => pollutantType === type);
            if (!p) return null;
            if (p.units !== ugm3) {
                Console.warn("PollutantsToAQHIMulti", `${type} 单位不是 µg/m³（${p.units}），跳过`);
                return null;
            }
            return p.amount;
        };

        const { beta, weights } = scale;
        const contributions = {
            OZONE: (weights.O3 || 0) * Math.max(getAmount("OZONE") || 0, 0),
            NO2: (weights.NO2 || 0) * Math.max(getAmount("NO2") || 0, 0),
            PM10: (weights.PM10 || 0) * Math.max(getAmount("PM10") || 0, 0),
            PM2_5: (weights.PM2_5 || 0) * Math.max(getAmount("PM2_5") || 0, 0),
            SO2: (weights.SO2 || 0) * Math.max(getAmount("SO2") || 0, 0),
        };
        // When risk(PM 10) > 1.2 * risk(PM 2.5)
        const usePM10 = contributions.PM10 > 0 && (contributions.PM2_5 <= 0 || contributions.PM10 > contributions.PM2_5 * 1.2);
        const pmContribution = usePM10 ? contributions.PM10 : contributions.PM2_5;
        const totalWeighted = contributions.OZONE + contributions.NO2 + contributions.SO2 + pmContribution;
        const totalRisk = (beta || 0) * totalWeighted;

        Console.info(
            "PollutantsToAQHIMulti",
            `risk: O3=${contributions.OZONE.toFixed(4)}, NO2=${contributions.NO2.toFixed(4)}, PM10=${contributions.PM10.toFixed(4)}, PM2.5=${contributions.PM2_5.toFixed(4)}, usePM10=${usePM10}, SO2=${contributions.SO2.toFixed(4)}, totalWeighted=${totalWeighted.toFixed(4)}, totalRisk=${totalRisk.toFixed(4)}`,
        );

        convertedPollutants.forEach(p => {
            switch (p.pollutantType) {
                case "OZONE":
                    p.index = contributions.OZONE;
                    break;
                case "NO2":
                    p.index = contributions.NO2;
                    break;
                case "PM10":
                    p.index = contributions.PM10;
                    break;
                case "PM2_5":
                    p.index = contributions.PM2_5;
                    break;
                case "SO2":
                    p.index = contributions.SO2;
                    break;
                default:
                    p.index = -1;
            }
        });

        const categoryIndex = AirQuality.CategoryIndex(totalRisk, scale.categories);
        const primaryPollutant = convertedPollutants.reduce((max, cur) => (cur.index > max.index ? cur : max), { pollutantType: "NOT_AVAILABLE", index: -1 });

        Console.info("✅ PollutantsToAQHIMulti", `AQHI: ${categoryIndex}, primaryPollutant: ${primaryPollutant.pollutantType}`);
        return {
            index: totalRisk,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            categoryIndex,
            pollutants: convertedPollutants,
            metadata: { providerName: "iRingo", temporarilyUnavailable: false },
            primaryPollutant: primaryPollutant.pollutantType,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };
    }

    static Config = {
        Scales: {
            /**
             * LQI (DE) - Der Luftqualitätsindex (LQI) des Umweltbundesamtes
             * Germany Air Quality Index
             * [Der Luftqualitätsindex - LQI | Umweltbundesamt]{@link https://www.umweltbundesamt.de/themen/luft/luftqualitaet/der-luftqualitaetsindex-lqi}
             * [Überarbeitung des UBA LQI nach der Herausgabe der WHO AQG 2021]{@link https://www.umweltbundesamt.de/system/files/medien/11850/publikationen/08_2025_uug.pdf}
             */
            UBA: {
                weatherKitScale: {
                    name: "UBA",
                },
                // Indexes below for calculation only, not for display
                categories: {
                    significantIndex: 4, // schlecht
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 0.99] }, // sehr gut
                        { categoryIndex: 2, indexes: [1, 1.99] }, // gut
                        { categoryIndex: 3, indexes: [2, 2.99] }, // mäßig
                        { categoryIndex: 4, indexes: [3, 3.99] }, // schlecht
                        { categoryIndex: 5, indexes: [4, Number.POSITIVE_INFINITY] }, // sehr schlecht
                    ],
                },
                pollutants: {
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 0.99], amounts: [0, 10] },
                            max: { indexes: [3, 3.99], amounts: [61, 100] },
                            value: [
                                { indexes: [0, 0.99], amounts: [0, 10] }, // sehr gut
                                { indexes: [1, 1.99], amounts: [11, 30] }, // gut
                                { indexes: [2, 2.99], amounts: [31, 60] }, // mäßig
                                { indexes: [3, 3.99], amounts: [61, 100] }, // schlecht
                                { indexes: [4, Number.POSITIVE_INFINITY], amounts: [101, Number.POSITIVE_INFINITY] }, // sehr schlecht
                            ],
                        },
                    },
                    PM10: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 0.99], amounts: [0, 9] },
                            max: { indexes: [3, 3.99], amounts: [55, 90] },
                            value: [
                                { indexes: [0, 0.99], amounts: [0, 9] }, // sehr gut
                                { indexes: [1, 1.99], amounts: [10, 27] }, // gut
                                { indexes: [2, 2.99], amounts: [28, 54] }, // mäßig
                                { indexes: [3, 3.99], amounts: [55, 90] }, // schlecht
                                { indexes: [4, Number.POSITIVE_INFINITY], amounts: [91, Number.POSITIVE_INFINITY] }, // sehr schlecht
                            ],
                        },
                    },
                    PM2_5: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 0.99], amounts: [0, 5] },
                            max: { indexes: [3, 3.99], amounts: [31, 50] },
                            value: [
                                { indexes: [0, 0.99], amounts: [0, 5] }, // sehr gut
                                { indexes: [1, 1.99], amounts: [6, 15] }, // gut
                                { indexes: [2, 2.99], amounts: [16, 30] }, // mäßig
                                { indexes: [3, 3.99], amounts: [31, 50] }, // schlecht
                                { indexes: [4, Number.POSITIVE_INFINITY], amounts: [51, Number.POSITIVE_INFINITY] }, // sehr schlecht
                            ],
                        },
                    },
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 0.99], amounts: [0, 24] },
                            max: { indexes: [3, 3.99], amounts: [145, 240] },
                            value: [
                                { indexes: [0, 0.99], amounts: [0, 24] }, // sehr gut
                                { indexes: [1, 1.99], amounts: [25, 72] }, // gut
                                { indexes: [2, 2.99], amounts: [73, 144] }, // mäßig
                                { indexes: [3, 3.99], amounts: [145, 240] }, // schlecht
                                { indexes: [4, Number.POSITIVE_INFINITY], amounts: [241, Number.POSITIVE_INFINITY] }, // sehr schlecht
                            ],
                        },
                    },
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 0.99], amounts: [0, 10] },
                            max: { indexes: [3, 3.99], amounts: [61, 100] },
                            value: [
                                { indexes: [0, 0.99], amounts: [0, 10] }, // sehr gut
                                { indexes: [1, 1.99], amounts: [11, 30] }, // gut
                                { indexes: [2, 2.99], amounts: [31, 60] }, // mäßig
                                { indexes: [3, 3.99], amounts: [61, 100] }, // schlecht
                                { indexes: [4, Number.POSITIVE_INFINITY], amounts: [101, Number.POSITIVE_INFINITY] }, // sehr schlecht
                            ],
                        },
                    },
                },
            },
            /**
             * EAQI (EU) - European Air Quality Index
             * [ETC HE Report 2024/17: EEA´s revision of the European air quality index bands]{@link https://www.eionet.europa.eu/etcs/etc-he/products/etc-he-products/etc-he-reports/etc-he-report-2024-17-eeas-revision-of-the-european-air-quality-index-bands}
             */
            EU_EAQI: {
                weatherKitScale: {
                    name: "EU.EAQI",
                    maxIndex: 60,
                },
                // Indexes below for calculation only, not for display
                categories: {
                    significantIndex: 4, // Poor
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 9] }, // Good
                        { categoryIndex: 2, indexes: [10, 19] }, // Fair
                        { categoryIndex: 3, indexes: [20, 29] }, // Moderate
                        { categoryIndex: 4, indexes: [30, 39] }, // Poor
                        { categoryIndex: 5, indexes: [40, 49] }, // Very Poor
                        { categoryIndex: 6, indexes: [50, Number.POSITIVE_INFINITY] }, // Extremely Poor
                    ],
                },
                pollutants: {
                    PM2_5: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 9], amounts: [0, 5] },
                            max: { indexes: [40, 49], amounts: [91, 140] },
                            value: [
                                { indexes: [0, 9], amounts: [0, 5] }, // Good
                                { indexes: [10, 19], amounts: [6, 15] }, // Fair
                                { indexes: [20, 29], amounts: [16, 50] }, // Moderate
                                { indexes: [30, 39], amounts: [51, 90] }, // Poor
                                { indexes: [40, 49], amounts: [91, 140] }, // Very Poor
                                { indexes: [50, Number.POSITIVE_INFINITY], amounts: [141, Number.POSITIVE_INFINITY] }, // Extremely Poor
                            ],
                        },
                    },
                    PM10: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 9], amounts: [0, 15] },
                            max: { indexes: [40, 49], amounts: [196, 270] },
                            value: [
                                { indexes: [0, 9], amounts: [0, 15] }, // Good
                                { indexes: [10, 19], amounts: [16, 45] }, // Fair
                                { indexes: [20, 29], amounts: [46, 120] }, // Moderate
                                { indexes: [30, 39], amounts: [121, 195] }, // Poor
                                { indexes: [40, 49], amounts: [196, 270] }, // Very Poor
                                { indexes: [50, Number.POSITIVE_INFINITY], amounts: [271, Number.POSITIVE_INFINITY] }, // Extremely Poor
                            ],
                        },
                    },
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 9], amounts: [0, 60] },
                            max: { indexes: [40, 49], amounts: [161, 180] },
                            value: [
                                { indexes: [0, 9], amounts: [0, 60] }, // Good
                                { indexes: [10, 19], amounts: [61, 100] }, // Fair
                                { indexes: [20, 29], amounts: [101, 120] }, // Moderate
                                { indexes: [30, 39], amounts: [121, 160] }, // Poor
                                { indexes: [40, 49], amounts: [161, 180] }, // Very Poor
                                { indexes: [50, Number.POSITIVE_INFINITY], amounts: [181, Number.POSITIVE_INFINITY] }, // Extremely Poor
                            ],
                        },
                    },
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 9], amounts: [0, 10] },
                            max: { indexes: [40, 49], amounts: [101, 150] },
                            value: [
                                { indexes: [0, 9], amounts: [0, 10] }, // Good
                                { indexes: [10, 19], amounts: [11, 25] }, // Fair
                                { indexes: [20, 29], amounts: [26, 60] }, // Moderate
                                { indexes: [30, 39], amounts: [61, 100] }, // Poor
                                { indexes: [40, 49], amounts: [101, 150] }, // Very Poor
                                { indexes: [50, Number.POSITIVE_INFINITY], amounts: [151, Number.POSITIVE_INFINITY] }, // Extremely Poor
                            ],
                        },
                    },
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 9], amounts: [0, 20] },
                            max: { indexes: [40, 49], amounts: [191, 275] },
                            value: [
                                { indexes: [0, 9], amounts: [0, 20] }, // Good
                                { indexes: [10, 19], amounts: [21, 40] }, // Fair
                                { indexes: [20, 29], amounts: [41, 125] }, // Moderate
                                { indexes: [30, 39], amounts: [126, 190] }, // Poor
                                { indexes: [40, 49], amounts: [191, 275] }, // Very Poor
                                { indexes: [50, Number.POSITIVE_INFINITY], amounts: [276, Number.MAX_VALUE] }, // Extremely Poor
                            ],
                        },
                    },
                },
            },
            /**
             * China AQI standard.
             * [环境空气质量指数（AQI）技术规定（试行）]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
             */
            HJ6332012: {
                weatherKitScale: {
                    name: "HJ6332012",
                },
                categories: {
                    significantIndex: 3, // 轻度污染
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 50] }, // 优
                        { categoryIndex: 2, indexes: [51, 100] }, // 良
                        { categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
                        { categoryIndex: 4, indexes: [151, 200] }, // 中度污染
                        { categoryIndex: 5, indexes: [201, 300] }, // 重度污染
                        { categoryIndex: 6, indexes: [301, 500] }, // 严重污染
                    ],
                },
                pollutants: {
                    SO2_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [2101, 2620] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 150] },
                                { indexes: [101, 150], amounts: [151, 475] },
                                { indexes: [151, 200], amounts: [476, 800] },
                                { indexes: [201, 300], amounts: [801, 1600] },
                                { indexes: [301, 400], amounts: [1601, 2100] },
                                { indexes: [401, 500], amounts: [2101, 2620] },
                            ],
                        },
                    },
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 150] },
                            max: { indexes: [151, 200], amounts: [651, 800] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 150] },
                                { indexes: [51, 100], amounts: [151, 500] },
                                { indexes: [101, 150], amounts: [501, 650] },
                                { indexes: [151, 200], amounts: [651, 800] },
                                // 二氧化硫（SO2）1小时平均浓度高于800 ug/m3的，不再进行其空气质量分指数计算，二氧化硫（SO2）空气质量分指数按24小时平均浓度计算的分指数报告。
                            ],
                        },
                    },
                    NO2_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 40] },
                            max: { indexes: [401, 500], amounts: [751, 940] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 40] },
                                { indexes: [51, 100], amounts: [41, 80] },
                                { indexes: [101, 150], amounts: [81, 180] },
                                { indexes: [151, 200], amounts: [181, 280] },
                                { indexes: [201, 300], amounts: [281, 565] },
                                { indexes: [301, 400], amounts: [566, 750] },
                                { indexes: [401, 500], amounts: [751, 940] },
                            ],
                        },
                    },
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [401, 500], amounts: [3091, 3840] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 200] },
                                { indexes: [101, 150], amounts: [201, 700] },
                                { indexes: [151, 200], amounts: [701, 1200] },
                                { indexes: [201, 300], amounts: [1201, 2340] },
                                { indexes: [301, 400], amounts: [2341, 3090] },
                                { indexes: [401, 500], amounts: [3091, 3840] },
                            ],
                        },
                    },
                    PM10_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [501, 600] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 150] },
                                { indexes: [101, 150], amounts: [151, 250] },
                                { indexes: [151, 200], amounts: [251, 350] },
                                { indexes: [201, 300], amounts: [351, 420] },
                                { indexes: [301, 400], amounts: [421, 500] },
                                { indexes: [401, 500], amounts: [501, 600] },
                            ],
                        },
                    },
                    CO_24H: {
                        units: "MILLIGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 2] },
                            max: { indexes: [401, 500], amounts: [49, 60] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 2] },
                                { indexes: [51, 100], amounts: [3, 4] },
                                { indexes: [101, 150], amounts: [5, 14] },
                                { indexes: [151, 200], amounts: [15, 24] },
                                { indexes: [201, 300], amounts: [25, 36] },
                                { indexes: [301, 400], amounts: [37, 48] },
                                { indexes: [401, 500], amounts: [49, 60] },
                            ],
                        },
                    },
                    CO: {
                        units: "MILLIGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 5] },
                            max: { indexes: [401, 500], amounts: [121, 150] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 5] },
                                { indexes: [51, 100], amounts: [6, 10] },
                                { indexes: [101, 150], amounts: [11, 35] },
                                { indexes: [151, 200], amounts: [36, 60] },
                                { indexes: [201, 300], amounts: [61, 90] },
                                { indexes: [301, 400], amounts: [91, 120] },
                                { indexes: [401, 500], amounts: [121, 150] },
                            ],
                        },
                    },
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 160] },
                            max: { indexes: [401, 500], amounts: [1001, 1200] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 160] },
                                { indexes: [51, 100], amounts: [161, 200] },
                                { indexes: [101, 150], amounts: [201, 300] },
                                { indexes: [151, 200], amounts: [301, 400] },
                                { indexes: [201, 300], amounts: [401, 800] },
                                { indexes: [301, 400], amounts: [801, 1000] },
                                { indexes: [401, 500], amounts: [1001, 1200] },
                            ],
                        },
                    },
                    OZONE_8H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [201, 300], amounts: [266, 800] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 160] },
                                { indexes: [101, 150], amounts: [161, 215] },
                                { indexes: [151, 200], amounts: [216, 265] },
                                { indexes: [201, 300], amounts: [266, 800] },
                                // 臭氧（O3）8小时平均浓度值高于800 ug/m3的，不再进行其空气质量分指数计算，臭氧（O3）空气质量分指数按1小时平均浓度计算的分指数报告。
                            ],
                        },
                    },
                    PM2_5_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [401, 500], amounts: [351, 500] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 35] },
                                { indexes: [51, 100], amounts: [36, 75] },
                                { indexes: [101, 150], amounts: [76, 115] },
                                { indexes: [151, 200], amounts: [116, 150] },
                                { indexes: [201, 300], amounts: [151, 250] },
                                { indexes: [301, 400], amounts: [251, 350] },
                                { indexes: [401, 500], amounts: [351, 500] },
                            ],
                        },
                    },
                },
            },
            /**
             * China AQI standard (2025 draft).
             * [关于公开征求《环境空气质量标准（征求意见稿）》等3项生态环境标准意见的通知]{@link https://www.mee.gov.cn/xxgk2018/xxgk/xxgk06/202512/t20251215_1137858.html}
             */
            HJ6332025_DRAFT: {
                weatherKitScale: {
                    name: "HJ6332012",
                },
                categories: {
                    significantIndex: 3, // 轻度污染
                    ranges: [
                        { categoryIndex: 1, indexes: [1, 50] }, // 优
                        { categoryIndex: 2, indexes: [51, 100] }, // 良
                        { categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
                        { categoryIndex: 4, indexes: [151, 200] }, // 中度污染
                        { categoryIndex: 5, indexes: [201, 300] }, // 重度污染
                        { categoryIndex: 6, indexes: [301, 500] }, // 严重污染
                    ],
                },
                pollutants: {
                    SO2_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [2101, 2620] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 150] },
                                { indexes: [101, 150], amounts: [151, 475] },
                                { indexes: [151, 200], amounts: [476, 800] },
                                { indexes: [201, 300], amounts: [801, 1600] },
                                { indexes: [301, 400], amounts: [1601, 2100] },
                                { indexes: [401, 500], amounts: [2101, 2620] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 150] },
                            max: { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 150] },
                                { indexes: [51, 100], amounts: [151, 500] },
                                { indexes: [101, 150], amounts: [501, 650] },
                                { indexes: [151, 200], amounts: [651, 800] },
                                // SO2 1小时平均浓度值高于800 μg/m3的，IAQI按照200计。
                                { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    NO2_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 40] },
                            max: { indexes: [401, 500], amounts: [751, 940] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 40] },
                                { indexes: [51, 100], amounts: [41, 80] },
                                { indexes: [101, 150], amounts: [81, 180] },
                                { indexes: [151, 200], amounts: [181, 280] },
                                { indexes: [201, 300], amounts: [281, 565] },
                                { indexes: [301, 400], amounts: [566, 750] },
                                { indexes: [401, 500], amounts: [751, 940] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [401, 500], amounts: [3091, 3840] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 200] },
                                { indexes: [101, 150], amounts: [201, 700] },
                                { indexes: [151, 200], amounts: [701, 1200] },
                                { indexes: [201, 300], amounts: [1201, 2340] },
                                { indexes: [301, 400], amounts: [2341, 3090] },
                                { indexes: [401, 500], amounts: [3091, 3840] },
                            ],
                        },
                    },
                    CO_24H: {
                        units: "MILLIGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 2] },
                            max: { indexes: [401, 500], amounts: [49, 60] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 2] },
                                { indexes: [51, 100], amounts: [3, 4] },
                                { indexes: [101, 150], amounts: [5, 14] },
                                { indexes: [151, 200], amounts: [15, 24] },
                                { indexes: [201, 300], amounts: [25, 36] },
                                { indexes: [301, 400], amounts: [37, 48] },
                                { indexes: [401, 500], amounts: [49, 60] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    CO: {
                        units: "MILLIGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 5] },
                            max: { indexes: [401, 500], amounts: [121, 150] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 5] },
                                { indexes: [51, 100], amounts: [6, 10] },
                                { indexes: [101, 150], amounts: [11, 35] },
                                { indexes: [151, 200], amounts: [36, 60] },
                                { indexes: [201, 300], amounts: [61, 90] },
                                { indexes: [301, 400], amounts: [91, 120] },
                                { indexes: [401, 500], amounts: [121, 150] },
                            ],
                        },
                    },
                    OZONE_8H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [300, 300], amounts: [801, Number.POSITIVE_INFINITY] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 160] },
                                { indexes: [101, 150], amounts: [161, 215] },
                                { indexes: [151, 200], amounts: [216, 265] },
                                { indexes: [201, 300], amounts: [266, 800] },
                                // O3 8小时平均浓度值高于800 μg/m3的，IAQI按照300计。
                                { indexes: [300, 300], amounts: [801, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 160] },
                            max: { indexes: [401, 500], amounts: [1001, 1200] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 160] },
                                { indexes: [51, 100], amounts: [161, 200] },
                                { indexes: [101, 150], amounts: [201, 300] },
                                { indexes: [151, 200], amounts: [301, 400] },
                                { indexes: [201, 300], amounts: [401, 800] },
                                { indexes: [301, 400], amounts: [801, 1000] },
                                { indexes: [401, 500], amounts: [1001, 1200] },
                            ],
                        },
                    },
                    PM10_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [501, 600] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 120] },
                                { indexes: [101, 150], amounts: [121, 250] },
                                { indexes: [151, 200], amounts: [251, 350] },
                                { indexes: [201, 300], amounts: [351, 420] },
                                { indexes: [301, 400], amounts: [421, 500] },
                                { indexes: [401, 500], amounts: [501, 600] },
                            ],
                        },
                    },
                    PM2_5_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [401, 500], amounts: [351, 500] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 30] },
                                { indexes: [51, 100], amounts: [31, 60] },
                                { indexes: [101, 150], amounts: [61, 115] },
                                { indexes: [151, 200], amounts: [116, 150] },
                                { indexes: [201, 300], amounts: [151, 250] },
                                { indexes: [301, 400], amounts: [251, 350] },
                                { indexes: [401, 500], amounts: [351, 500] },
                            ],
                        },
                    },
                },
            },
            /**
             * US AQI standard, not equal to NowCast.
             * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI) (EPA 454/B-24-002, May 2024)]{@link https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf}
             */
            EPA_NowCast: {
                weatherKitScale: {
                    name: "EPA_NowCast",
                    version: "2604",
                },
                categories: {
                    significantIndex: 3, // Unhealthy for Sensitive Groups
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 50] }, // Good
                        { categoryIndex: 2, indexes: [51, 100] }, // Moderate
                        { categoryIndex: 3, indexes: [101, 150] }, // Unhealthy for Sensitive Groups
                        { categoryIndex: 4, indexes: [151, 200] }, // Unhealthy
                        { categoryIndex: 5, indexes: [201, 300] }, // Very Unhealthy
                        { categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // Hazardous
                    ],
                },
                pollutants: {
                    OZONE_8H: {
                        units: "PARTS_PER_MILLION",
                        stpConversionFactor: 1.96189649169881,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 0.054] },
                            max: { indexes: [201, 300], amounts: [0.106, 0.2] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 0.054] }, // Good
                                { indexes: [51, 100], amounts: [0.055, 0.07] }, // Moderate
                                { indexes: [101, 150], amounts: [0.071, 0.085] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [0.086, 0.105] }, // Unhealthy
                                { indexes: [201, 300], amounts: [0.106, 0.2] }, // Very Unhealthy
                                // Note 2:
                                // 8-hour O3 values do not define higher AQI values (≥ 301).
                                // AQI values of 301 or higher are calculated with 1-hour O3 concentrations.
                                { indexes: [301, Number.POSITIVE_INFINITY], amounts: [0.201, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    OZONE: {
                        units: "PARTS_PER_MILLION",
                        stpConversionFactor: 1.96189649169881,
                        ranges: {
                            min: { indexes: [101, 150], amounts: [0.125, 0.164] },
                            max: { indexes: [301, 500], amounts: [0.405, 0.604] },
                            value: [
                                // Note 1:
                                // Areas are generally required to report the AQI based on 8-hour O3 values. However,
                                // there are a small number of areas where an AQI based on 1-hour O3 values would be more precautionary.
                                // In these cases, in addition to calculating the 8-hour O3 index value,
                                // the 1-hour O3 value may be calculated, and the maximum of the two values reported.
                                { indexes: [101, 150], amounts: [0.125, 0.164] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [0.165, 0.204] }, // Unhealthy
                                { indexes: [201, 300], amounts: [0.205, 0.404] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [0.405, 0.604] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [0.605, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    PM2_5_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 9] },
                            max: { indexes: [301, 500], amounts: [225.5, 325.4] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 9] }, // Good
                                { indexes: [51, 100], amounts: [9.1, 35.4] }, // Moderate
                                { indexes: [101, 150], amounts: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
                                // Note 3 of PM2.5 can be found in EPA 454/B-18-007:
                                // If a different SHL for PM2.5 is promulgated, these numbers will change accordingly.
                                //
                                // It is believed that they forgot to remove this note
                                { indexes: [151, 200], amounts: [55.5, 125.4] }, // Unhealthy
                                { indexes: [201, 300], amounts: [125.5, 225.4] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [225.5, 325.4] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [325.5, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    PM10_24H: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 54] },
                            max: { indexes: [301, 500], amounts: [425, 604] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 54] }, // Good
                                { indexes: [51, 100], amounts: [55, 154] }, // Moderate
                                { indexes: [101, 150], amounts: [155, 254] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [255, 354] }, // Unhealthy
                                { indexes: [201, 300], amounts: [355, 424] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [425, 604] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [605, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    CO_8H: {
                        units: "PARTS_PER_MILLION",
                        stpConversionFactor: 1.14491990608754,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 4.4] },
                            max: { indexes: [301, 500], amounts: [30.5, 50.4] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 4.4] }, // Good
                                { indexes: [51, 100], amounts: [4.5, 9.4] }, // Moderate
                                { indexes: [101, 150], amounts: [9.5, 12.4] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [12.5, 15.4] }, // Unhealthy
                                { indexes: [201, 300], amounts: [15.5, 30.4] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [30.5, 50.4] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [50.5, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    SO2: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 2.618396263625692,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [301, 500], amounts: [605, 1004] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 35] }, // Good
                                { indexes: [51, 100], amounts: [36, 75] }, // Moderate
                                { indexes: [101, 150], amounts: [76, 185] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [186, 304] }, // Unhealthy
                                // Note 3 of SO2:
                                // 1-hour SO2 values do not define higher AQI values (≥ 200).
                                // AQI values of 200 or greater are calculated with 24-hour SO2 concentrations.
                                //
                                // It is believed that they forgot to remove this note
                                { indexes: [201, 300], amounts: [305, 604] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [605, 1004] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [1005, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    NO2: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 1.880472698306222,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 53] },
                            max: { indexes: [301, 500], amounts: [1250, 2049] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 53] }, // Good
                                { indexes: [51, 100], amounts: [54, 100] }, // Moderate
                                { indexes: [101, 150], amounts: [101, 360] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [361, 649] }, // Unhealthy
                                { indexes: [201, 300], amounts: [650, 1249] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [1250, 2049] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [2050, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                },
            },
            /**
             * WAQI InstantCast in EPA_NowCast. Basically is a method to calculate indexes based on 1-hour pollutants.
             * [A Beginner's Guide to Air Quality Instant-Cast and Now-Cast.]{@link https://aqicn.org/faq/2015-03-15/air-quality-nowcast-a-beginners-guide/}
             * [Ozone AQI Scale update]{@link https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/}
             */
            WAQI_InstantCast_US: {
                weatherKitScale: {
                    name: "EPA_NowCast",
                    maxIndex: 500,
                },
                categories: {
                    significantIndex: 3, // Unhealthy for Sensitive Groups
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 50] }, // Good
                        { categoryIndex: 2, indexes: [51, 100] }, // Moderate
                        { categoryIndex: 3, indexes: [101, 150] }, // Unhealthy for Sensitive Groups
                        { categoryIndex: 4, indexes: [151, 200] }, // Unhealthy
                        { categoryIndex: 5, indexes: [201, 300] }, // Very Unhealthy
                        { categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // Hazardous
                    ],
                },
                // Eventually we will convert it to ppb
                pollutants: {
                    // [Ozone AQI Scale update](https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/)
                    OZONE: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 1.96189649169881,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 62.5] },
                            max: { indexes: [301, 500], amounts: [405.1, 605] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 62.5] }, // Good
                                { indexes: [51, 100], amounts: [62.6, 101.5] }, // Moderate
                                { indexes: [101, 150], amounts: [101.6, 152.5] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [152.6, 205] }, // Unhealthy
                                { indexes: [201, 300], amounts: [205.1, 405] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [405.1, 605] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [605.1, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    PM2_5: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 9] },
                            max: { indexes: [301, 500], amounts: [225.5, 325.4] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 9] }, // Good
                                { indexes: [51, 100], amounts: [9.1, 35.4] }, // Moderate
                                { indexes: [101, 150], amounts: [35.5, 55.4] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [55.5, 125.4] }, // Unhealthy
                                { indexes: [201, 300], amounts: [125.5, 225.4] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [225.5, 325.4] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [325.5, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    PM10: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 54] },
                            max: { indexes: [301, 500], amounts: [425, 604] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 54] }, // Good
                                { indexes: [51, 100], amounts: [55, 154] }, // Moderate
                                { indexes: [101, 150], amounts: [155, 254] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [255, 354] }, // Unhealthy
                                { indexes: [201, 300], amounts: [355, 424] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [425, 604] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [605, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    CO: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 1.144511152104645,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 4400] },
                            max: { indexes: [301, 500], amounts: [30401, 50400] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 4400] }, // Good
                                { indexes: [51, 100], amounts: [4401, 9400] }, // Moderate
                                { indexes: [101, 150], amounts: [9401, 12400] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [12401, 15400] }, // Unhealthy
                                { indexes: [201, 300], amounts: [15401, 30400] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [30401, 50400] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [50401, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    SO2: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 2.618396263625692,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [301, 500], amounts: [605, 1004] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 35] }, // Good
                                { indexes: [51, 100], amounts: [36, 75] }, // Moderate
                                { indexes: [101, 150], amounts: [76, 185] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [186, 304] }, // Unhealthy
                                { indexes: [201, 300], amounts: [305, 604] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [605, 1004] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [1005, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                    NO2: {
                        units: "PARTS_PER_BILLION",
                        stpConversionFactor: 1.880472698306222,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 53] },
                            max: { indexes: [301, 500], amounts: [1250, 2049] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 53] }, // Good
                                { indexes: [51, 100], amounts: [54, 100] }, // Moderate
                                { indexes: [101, 150], amounts: [101, 360] }, // Unhealthy for Sensitive Groups
                                { indexes: [151, 200], amounts: [361, 649] }, // Unhealthy
                                { indexes: [201, 300], amounts: [650, 1249] }, // Very Unhealthy
                                { indexes: [301, 500], amounts: [1250, 2049] }, // Hazardous
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [2050, Number.POSITIVE_INFINITY] }, // Hazardous
                            ],
                        },
                    },
                },
            },
            /**
             * WAQI InstantCast in HJ6332012.
             * Use 24-hour SO2 when > 800, 24-hour PM10 and PM2.5 as 1-hour.
             * 1-hour for others.
             */
            WAQI_InstantCast_CN: {
                weatherKitScale: {
                    name: "HJ6332012",
                    maxIndex: 500,
                },
                categories: {
                    significantIndex: 3, // 轻度污染
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 50] }, // 优
                        { categoryIndex: 2, indexes: [51, 100] }, // 良
                        { categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
                        { categoryIndex: 4, indexes: [151, 200] }, // 中度污染
                        { categoryIndex: 5, indexes: [201, 300] }, // 重度污染
                        { categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // 严重污染
                    ],
                },
                pollutants: {
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 150] },
                            max: { indexes: [401, 500], amounts: [2101, 2620] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 150] },
                                { indexes: [51, 100], amounts: [151, 500] },
                                { indexes: [101, 150], amounts: [501, 650] },
                                { indexes: [151, 200], amounts: [651, 800] },
                                { indexes: [201, 300], amounts: [801, 1600] },
                                { indexes: [301, 400], amounts: [1601, 2100] },
                                { indexes: [401, 500], amounts: [2101, 2620] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [2602, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [401, 500], amounts: [3091, 3840] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 200] },
                                { indexes: [101, 150], amounts: [201, 700] },
                                { indexes: [151, 200], amounts: [701, 1200] },
                                { indexes: [201, 300], amounts: [1201, 2340] },
                                { indexes: [301, 400], amounts: [2341, 3090] },
                                { indexes: [401, 500], amounts: [3091, 3840] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [3841, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    PM10: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [501, 600] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 150] },
                                { indexes: [101, 150], amounts: [151, 250] },
                                { indexes: [151, 200], amounts: [251, 350] },
                                { indexes: [201, 300], amounts: [351, 420] },
                                { indexes: [301, 400], amounts: [421, 500] },
                                { indexes: [401, 500], amounts: [501, 600] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [601, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    CO: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 5000] },
                            max: { indexes: [401, 500], amounts: [120001, 150000] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 5000] },
                                { indexes: [51, 100], amounts: [5001, 10000] },
                                { indexes: [101, 150], amounts: [10001, 35000] },
                                { indexes: [151, 200], amounts: [35001, 60000] },
                                { indexes: [201, 300], amounts: [60001, 90000] },
                                { indexes: [301, 400], amounts: [90001, 120000] },
                                { indexes: [401, 500], amounts: [120001, 150000] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [150001, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 160] },
                            max: { indexes: [401, 500], amounts: [1001, 1200] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 160] },
                                { indexes: [51, 100], amounts: [161, 200] },
                                { indexes: [101, 150], amounts: [201, 300] },
                                { indexes: [151, 200], amounts: [301, 400] },
                                { indexes: [201, 300], amounts: [401, 800] },
                                { indexes: [301, 400], amounts: [801, 1000] },
                                { indexes: [401, 500], amounts: [1001, 1200] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [1201, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    PM2_5: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [401, 500], amounts: [351, 500] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 35] },
                                { indexes: [51, 100], amounts: [36, 75] },
                                { indexes: [101, 150], amounts: [76, 115] },
                                { indexes: [151, 200], amounts: [116, 150] },
                                { indexes: [201, 300], amounts: [151, 250] },
                                { indexes: [301, 400], amounts: [251, 350] },
                                { indexes: [401, 500], amounts: [351, 500] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [501, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                },
            },
            WAQI_InstantCast_CN_25_DRAFT: {
                weatherKitScale: {
                    name: "HJ6332012",
                    maxIndex: 500,
                },
                categories: {
                    significantIndex: 3, // 轻度污染
                    ranges: [
                        { categoryIndex: 1, indexes: [1, 50] }, // 优
                        { categoryIndex: 2, indexes: [51, 100] }, // 良
                        { categoryIndex: 3, indexes: [101, 150] }, // 轻度污染
                        { categoryIndex: 4, indexes: [151, 200] }, // 中度污染
                        { categoryIndex: 5, indexes: [201, 300] }, // 重度污染
                        { categoryIndex: 6, indexes: [301, Number.POSITIVE_INFINITY] }, // 严重污染
                    ],
                },
                pollutants: {
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    SO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 150] },
                            max: { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 150] },
                                { indexes: [51, 100], amounts: [151, 500] },
                                { indexes: [101, 150], amounts: [501, 650] },
                                { indexes: [151, 200], amounts: [651, 800] },
                                // SO2 1小时平均浓度值高于800 μg/m3的，IAQI按照200计。
                                { indexes: [200, 200], amounts: [801, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    NO2: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 100] },
                            max: { indexes: [401, 500], amounts: [3091, 3840] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 100] },
                                { indexes: [51, 100], amounts: [101, 200] },
                                { indexes: [101, 150], amounts: [201, 700] },
                                { indexes: [151, 200], amounts: [701, 1200] },
                                { indexes: [201, 300], amounts: [1201, 2340] },
                                { indexes: [301, 400], amounts: [2341, 3090] },
                                { indexes: [401, 500], amounts: [3091, 3840] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [3841, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    CO: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 5000] },
                            max: { indexes: [401, 500], amounts: [120001, 150000] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 5000] },
                                { indexes: [51, 100], amounts: [5001, 10000] },
                                { indexes: [101, 150], amounts: [10001, 35000] },
                                { indexes: [151, 200], amounts: [35001, 60000] },
                                { indexes: [201, 300], amounts: [60001, 90000] },
                                { indexes: [301, 400], amounts: [90001, 120000] },
                                { indexes: [401, 500], amounts: [120001, 150000] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [150001, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    // SO2、NO2、CO和O3 1小时平均浓度限值仅用于实时报。
                    OZONE: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 160] },
                            max: { indexes: [401, 500], amounts: [1001, 1200] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 160] },
                                { indexes: [51, 100], amounts: [161, 200] },
                                { indexes: [101, 150], amounts: [201, 300] },
                                { indexes: [151, 200], amounts: [301, 400] },
                                { indexes: [201, 300], amounts: [401, 800] },
                                { indexes: [301, 400], amounts: [801, 1000] },
                                { indexes: [401, 500], amounts: [1001, 1200] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [1201, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    PM10: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 50] },
                            max: { indexes: [401, 500], amounts: [501, 600] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 50] },
                                { indexes: [51, 100], amounts: [51, 120] },
                                { indexes: [101, 150], amounts: [121, 250] },
                                { indexes: [151, 200], amounts: [251, 350] },
                                { indexes: [201, 300], amounts: [351, 420] },
                                { indexes: [301, 400], amounts: [421, 500] },
                                { indexes: [401, 500], amounts: [501, 600] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [601, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                    PM2_5: {
                        units: "MICROGRAMS_PER_CUBIC_METER",
                        stpConversionFactor: -1,
                        ranges: {
                            min: { indexes: [0, 50], amounts: [0, 35] },
                            max: { indexes: [401, 500], amounts: [351, 500] },
                            value: [
                                { indexes: [0, 50], amounts: [0, 30] },
                                { indexes: [51, 100], amounts: [31, 60] },
                                { indexes: [101, 150], amounts: [61, 115] },
                                { indexes: [151, 200], amounts: [116, 150] },
                                { indexes: [201, 300], amounts: [151, 250] },
                                { indexes: [301, 400], amounts: [251, 350] },
                                { indexes: [401, 500], amounts: [351, 500] },
                                { indexes: [501, Number.POSITIVE_INFINITY], amounts: [501, Number.POSITIVE_INFINITY] },
                            ],
                        },
                    },
                },
            },
            /**
             * Hong Kong Air Quality Health Index (AQHI).
             * [10.1016/j.atmosenv.2024.120473]{@link https://doi.org/10.1016/j.atmosenv.2024.120473}
             * [AQHI 說明 | 香港環境保護署]{@link https://www.aqhi.gov.hk/tc/what-is-aqhi/faqs.html}
             */
            HK_AQHI: {
                weatherKitScale: {
                    name: "HK.AQHI",
                },
                categories: {
                    significantIndex: 7, // 高 (AQHI 7 及以上)
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 1.87] },
                        { categoryIndex: 2, indexes: [1.88, 3.73] },
                        { categoryIndex: 3, indexes: [3.74, 5.6] },
                        { categoryIndex: 4, indexes: [5.61, 7.46] },
                        { categoryIndex: 5, indexes: [7.47, 9.33] },
                        { categoryIndex: 6, indexes: [9.34, 11.2] },
                        { categoryIndex: 7, indexes: [11.21, 12.81] },
                        { categoryIndex: 8, indexes: [12.82, 14.94] },
                        { categoryIndex: 9, indexes: [14.95, 17.08] },
                        { categoryIndex: 10, indexes: [17.09, 19.21] },
                        { categoryIndex: 11, indexes: [19.22, Number.POSITIVE_INFINITY] },
                    ],
                },
                // β 系数（回归系数），浓度单位 µg/m³
                betas: {
                    NO2: 0.0004462559,
                    SO2: 0.0001393235,
                    O3: 0.0004888034,
                    PM10: 0.0002821751,
                    PM2_5: 0.0002180567,
                },
                // pollutants 仅声明目标单位（均为 µg/m³），供 ConvertUnits 使用
                pollutants: {
                    NO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    SO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    OZONE: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM10: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
            /**
             * Canada Air Quality Health Index (AQHI).
             * [10.1016/j.atmosenv.2024.120473]{@link https://doi.org/10.1016/j.atmosenv.2024.120473}
             */
            CA_AQHI: {
                weatherKitScale: {
                    name: "CA.AQHI",
                },
                categories: {
                    significantIndex: 7, // High Health Risk (AQHI > 7)
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 1.04] },
                        { categoryIndex: 2, indexes: [1.05, 2.08] },
                        { categoryIndex: 3, indexes: [2.09, 3.12] },
                        { categoryIndex: 4, indexes: [3.13, 4.16] },
                        { categoryIndex: 5, indexes: [4.17, 5.2] },
                        { categoryIndex: 6, indexes: [5.21, 6.24] },
                        { categoryIndex: 7, indexes: [6.25, 7.28] },
                        { categoryIndex: 8, indexes: [7.29, 8.32] },
                        { categoryIndex: 9, indexes: [8.33, 9.36] },
                        { categoryIndex: 10, indexes: [9.37, 10.4] },
                        { categoryIndex: 11, indexes: [10.41, Number.POSITIVE_INFINITY] },
                    ],
                },
                // β 系数（回归系数），浓度单位 µg/m³
                betas: {
                    NO2: 0.000871,
                    O3: 0.000537,
                    PM2_5: 0.000487,
                },
                pollutants: {
                    NO2: { units: "PARTS_PER_BILLION", stpConversionFactor: -1 },
                    OZONE: { units: "PARTS_PER_BILLION", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
            /**
             * China Air Quality Health Index (AQHI).
             * [10.1016/j.atmosenv.2024.120473]{@link https://doi.org/10.1016/j.atmosenv.2024.120473}
             */
            CN_DEATH_AQHI: {
                weatherKitScale: {
                    name: "CN.AQHI",
                },
                categories: {
                    significantIndex: 6, // 四级 (AQHI 6 及以上)
                    // Categories in AQHI: 一级：0~1，二级：2~3.5，三级：3.6~5，四级：6~10，五级：11
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 2.004] },
                        { categoryIndex: 2, indexes: [2.005, 4.008] },
                        // 3: 4.009~6.012
                        { categoryIndex: 3, indexes: [4.009, 7.018] },
                        // 4: 6.013~8.016
                        { categoryIndex: 4, indexes: [7.018, 8.016] },
                        { categoryIndex: 5, indexes: [8.017, 10.02] },
                        { categoryIndex: 6, indexes: [10.021, 12.024] },
                        { categoryIndex: 7, indexes: [12.025, 14.028] },
                        { categoryIndex: 8, indexes: [14.029, 16.032] },
                        { categoryIndex: 9, indexes: [16.033, 18.036] },
                        { categoryIndex: 10, indexes: [18.037, 20.04] },
                        { categoryIndex: 11, indexes: [20.041, Number.POSITIVE_INFINITY] },
                    ],
                },
                // β 系数（回归系数），浓度单位 µg/m³
                betas: {
                    NO2: 0.0009,
                    SO2: 0.00059,
                    O3: 0.00024,
                    PM2_5: 0.00022,
                },
                pollutants: {
                    NO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    SO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    OZONE: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
            CN_DEATH_HK_AQHI: {
                weatherKitScale: {
                    name: "CN.AQHI",
                },
                categories: {
                    significantIndex: 6, // 四级 (AQHI 6 及以上)
                    // Categories in AQHI: 一级：0~1，二级：2~3.5，三级：3.6~5，四级：6~10，五级：11
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 2.004] },
                        { categoryIndex: 2, indexes: [2.005, 4.008] },
                        // 3: 4.009~6.012
                        { categoryIndex: 3, indexes: [4.009, 7.018] },
                        // 4: 6.013~8.016
                        { categoryIndex: 4, indexes: [7.018, 8.016] },
                        { categoryIndex: 5, indexes: [8.017, 10.02] },
                        { categoryIndex: 6, indexes: [10.021, 12.024] },
                        { categoryIndex: 7, indexes: [12.025, 14.028] },
                        { categoryIndex: 8, indexes: [14.029, 16.032] },
                        { categoryIndex: 9, indexes: [16.033, 18.036] },
                        { categoryIndex: 10, indexes: [18.037, 20.04] },
                        { categoryIndex: 11, indexes: [20.041, Number.POSITIVE_INFINITY] },
                    ],
                },
                // β 系数（回归系数），浓度单位 µg/m³
                betas: {
                    NO2: 0.0009,
                    SO2: 0.00059,
                    O3: 0.00024,
                    PM10: 0.0002821751,
                    PM2_5: 0.0002180567,
                },
                pollutants: {
                    NO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    SO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    OZONE: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM10: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
            AQHI_Multi_CN: {
                weatherKitScale: {
                    name: "CA.AQHI",
                },
                categories: {
                    significantIndex: 7,
                    // 以 WHO AQG 2021: PM2.5 24h=15, O3=100, NO2=25, SO2=40 对应的风险值校准 AQHI=3。
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 5.8453] },
                        { categoryIndex: 2, indexes: [5.8454, 11.6906] },
                        { categoryIndex: 3, indexes: [11.6907, 17.536] },
                        { categoryIndex: 4, indexes: [17.5361, 23.3812] },
                        { categoryIndex: 5, indexes: [23.3813, 29.2265] },
                        { categoryIndex: 6, indexes: [29.2266, 35.0718] },
                        { categoryIndex: 7, indexes: [35.0719, 40.9171] },
                        { categoryIndex: 8, indexes: [40.9172, 46.7624] },
                        { categoryIndex: 9, indexes: [46.7625, 52.6077] },
                        { categoryIndex: 10, indexes: [52.6078, 58.453] },
                        { categoryIndex: 11, indexes: [58.4531, Number.POSITIVE_INFINITY] },
                    ],
                },
                beta: 0.369991,
                weights: {
                    O3: 0.271273,
                    NO2: 0.390781,
                    PM2_5: 0.120648,
                    SO2: 0.217224,
                },
                pollutants: {
                    NO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    SO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    OZONE: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
            AQHI_Multi_CN_HK: {
                weatherKitScale: {
                    name: "CA.AQHI",
                },
                categories: {
                    significantIndex: 7,
                    // 以 WHO AQG 2021: PM2.5 24h=15, O3=100, NO2=25, SO2=40 对应的风险值校准 AQHI=3。
                    ranges: [
                        { categoryIndex: 1, indexes: [0, 5.8453] },
                        { categoryIndex: 2, indexes: [5.8454, 11.6906] },
                        { categoryIndex: 3, indexes: [11.6907, 17.536] },
                        { categoryIndex: 4, indexes: [17.5361, 23.3812] },
                        { categoryIndex: 5, indexes: [23.3813, 29.2265] },
                        { categoryIndex: 6, indexes: [29.2266, 35.0718] },
                        { categoryIndex: 7, indexes: [35.0719, 40.9171] },
                        { categoryIndex: 8, indexes: [40.9172, 46.7624] },
                        { categoryIndex: 9, indexes: [46.7625, 52.6077] },
                        { categoryIndex: 10, indexes: [52.6078, 58.453] },
                        { categoryIndex: 11, indexes: [58.4531, Number.POSITIVE_INFINITY] },
                    ],
                },
                beta: 0.369991,
                weights: {
                    O3: 0.271273,
                    NO2: 0.390781,
                    // Risk from HK AQHI: HK_AQHI_RR(PM10) / HK_AQHI_RR(PM2.5) * AQHI_MULTI_CN_RR(PM2.5)
                    PM10: 0.156123,
                    PM2_5: 0.120648,
                    SO2: 0.217224,
                },
                pollutants: {
                    NO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    SO2: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    OZONE: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM10: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                    PM2_5: { units: "MICROGRAMS_PER_CUBIC_METER", stpConversionFactor: -1 },
                },
            },
        },
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
        },
        CompareCategoryIndexes: {
            BETTER: "BETTER",
            SAME: "SAME",
            UNKNOWN: "UNKNOWN",
            WORSE: "WORSE",
        },
        Units: {
            WeatherKit: {
                ugm3: "MICROGRAMS_PER_CUBIC_METER",
                mgm3: "MILLIGRAMS_PER_CUBIC_METER",
                ppb: "PARTS_PER_BILLION",
                ppm: "PARTS_PER_MILLION",
            },
            Friendly: {
                MICROGRAMS_PER_CUBIC_METER: "μg/m3",
                MILLIGRAMS_PER_CUBIC_METER: "mg/m3",
                PARTS_PER_BILLION: "ppb",
                PARTS_PER_MILLION: "ppm",
            },
        },
        /**
         * Standard Conditions for Temperature and Pressure
         * [Ozone AQI: Using concentrations in milligrams or ppb?]{@link https://aqicn.org/faq/2015-09-06/ozone-aqi-using-concentrations-in-milligrams-or-ppb/}
         * [Understanding Units of Measurement - Terrie K. Boguski, P.E. (CHSR)]{@link https://cfpub.epa.gov/ncer_abstracts/index.cfm/fuseaction/display.files/fileid/14285}
         *
         * (amount * 12.187 * molecularWeight) / (temperatureInCelsius + 273.15)
         *
         * - 12.187 is the inverse of gas constant.
         * - 273.15 is the 0 celsius in kelvin.
         * - temperatureInCelsius is 25 in US, 20 in EU.
         */
        STP_ConversionFactors: {
            US: {
                OZONE: 1.96189649169881, // 47.997 g/mol
                SO2: 2.618396263625692, // 64.058 g/mol
                NO2: 1.880472698306222, // 46.005 g/mol
                CO: 1.14491990608754, // 28.01 g/mol
                C6H6: 3.192940861982224, // 78.114 g/mol
                NH3: 0.696148908267651, // 17.031 g/mol
                NO: 1.226507201073285, // 30.006 g/mol
            },
            EU: {
                OZONE: 1.995358823128092, // 47.997 g/mol
                SO2: 2.663055930411053, // 64.058 g/mol
                NO2: 1.912546256182842, // 46.005 g/mol
                CO: 1.164447791233157, // 28.01 g/mol
                C6H6: 3.247400027289784, // 78.114 g/mol
                NH3: 0.708022503837626, // 17.031 g/mol
                NO: 1.247426648473478, // 30.006 g/mol
            },
        },
    };

    static ConvertUnit(amount, from, to, fromStpConversionFactor = -1, toStpConversionFactor = -1) {
        Console.info("☑️ ConvertUnit");
        const friendlyUnits = AirQuality.Config.Units.Friendly;
        Console.info(`Convert ${amount} from ${friendlyUnits[from]} with ${fromStpConversionFactor} to ${friendlyUnits[to]} with ${toStpConversionFactor}`);
        if (amount < 0) {
            Console.error("ConvertUnit", `Amount ${amount} < 0`);
            return -1;
        }

        const numAmount = Number(amount.toFixed(15));

        const { ugm3, mgm3, ppb, ppm } = AirQuality.Config.Units.WeatherKit;
        const ppx = [ppb, ppm];
        const units = [...ppx, ugm3, mgm3];
        if (!units.includes(from) || !units.includes(to)) {
            Console.error("ConvertUnit", "不支持的单位", `from: ${from}`, `to: ${to}`);
            return -1;
        }

        const isPpxFrom = ppx.includes(from);
        const isPpxTo = ppx.includes(to);
        const isBothPpx = isPpxFrom && isPpxTo;
        if (isBothPpx && fromStpConversionFactor !== toStpConversionFactor) {
            if (fromStpConversionFactor <= 0 || toStpConversionFactor <= 0) {
                Console.error("ConvertUnit", "无效的STP conversion factor", `fromStpConversionFactor: ${fromStpConversionFactor}`, `toStpConversionFactor: ${toStpConversionFactor}`);
                return -1;
            }

            const intermediate = AirQuality.ConvertUnit(numAmount, from, ugm3, fromStpConversionFactor);
            return AirQuality.ConvertUnit(intermediate, ugm3, to, -1, toStpConversionFactor);
        }

        if (!isBothPpx && isPpxFrom && fromStpConversionFactor <= 0) {
            Console.error("ConvertUnit", `fromStpConversionFactor ${fromStpConversionFactor} <= 0`);
            return -1;
        }

        if (!isBothPpx && isPpxTo && toStpConversionFactor <= 0) {
            Console.error("ConvertUnit", `toStpConversionFactor ${toStpConversionFactor} <= 0`);
            return -1;
        }

        const { multiply, divide } = SimplePrecisionMath;
        switch (from) {
            case ppm:
                switch (to) {
                    case ppm:
                        Console.info("✅ ConvertUnit");
                        return numAmount;
                    case ppb:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, 1000);
                    case mgm3:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, fromStpConversionFactor);
                    case ugm3: {
                        const inPpb = AirQuality.ConvertUnit(numAmount, from, ppb);
                        Console.info("✅ ConvertUnit");
                        return multiply(inPpb, fromStpConversionFactor);
                    }
                    default:
                        return -1;
                }
            case ppb:
                switch (to) {
                    case ppb:
                        Console.info("✅ ConvertUnit");
                        return numAmount;
                    case ppm:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, 0.001);
                    case mgm3: {
                        const inPpm = AirQuality.ConvertUnit(numAmount, from, ppm);
                        Console.info("✅ ConvertUnit");
                        return multiply(inPpm, fromStpConversionFactor);
                    }
                    case ugm3:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, fromStpConversionFactor);
                    default:
                        return -1;
                }
            case mgm3:
                switch (to) {
                    case mgm3:
                        Console.info("✅ ConvertUnit");
                        return numAmount;
                    case ugm3:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, 1000);
                    case ppm:
                        Console.info("✅ ConvertUnit");
                        return divide(numAmount, toStpConversionFactor);
                    case ppb: {
                        const inUgM3 = AirQuality.ConvertUnit(numAmount, from, ugm3);
                        Console.info("✅ ConvertUnit");
                        return divide(inUgM3, toStpConversionFactor);
                    }
                    default:
                        return -1;
                }
            case ugm3:
                switch (to) {
                    case ugm3:
                        Console.info("✅ ConvertUnit");
                        return numAmount;
                    case mgm3:
                        Console.info("✅ ConvertUnit");
                        return multiply(numAmount, 0.001);
                    case ppm: {
                        const inMgM3 = AirQuality.ConvertUnit(numAmount, from, mgm3);
                        Console.info("✅ ConvertUnit");
                        return divide(inMgM3, toStpConversionFactor);
                    }
                    case ppb:
                        Console.info("✅ ConvertUnit");
                        return divide(numAmount, toStpConversionFactor);
                    default:
                        return -1;
                }
            default:
                return -1;
        }
    }
}

class Weather {
    static Name = "Weather";
    static Version = "0.3.0";
    static Author = "Virgil Clyne & 001";

    /**
     * 将 DSWRF（W/m²）估算为 UV Index（整数）
     * @param {number} dswrf - 向下短波辐射通量
     * @param {number} k - UV 占比系数，可选，默认 0.04
     * @returns {number} UV Index（四舍五入为整数）
     */
    static ConvertDSWRF(dswrf, k = 0.04) {
        Console.info("☑️ ConvertDSWRF");
        const uvIndex = Math.round((Math.max(dswrf, 0) * k) / 0.025); // 估算 UV Index
        //Console.debug(`UV Index: ${uvIndex}`);
        Console.info("✅ ConvertDSWRF");
        // 限制结果在 0~11，并四舍五入为整数
        return Math.min(uvIndex, 11);
    }

    /**
     * 将新的气象数组合并到原始气象数组
     * @param {array} to - 原始气象数组
     * @param {array} from - 新的气象数组
     * @returns {array} 原始气象数组
     */
    static mergeForecast(to = [], from = []) {
        let i = 0,
            j = 0;
        while (i < to.length) {
            const forecastStart = to[i].forecastStart;
            const newForecastStart = j < from.length ? from[j].forecastStart : Number.POSITIVE_INFINITY;

            if (forecastStart === newForecastStart) {
                //Console.debug(`${i}: ${newForecastStart} -> ${forecastStart}`);
                // 原地把 from[j] 的字段合入 to[i]（A 冲突字段保留 or 被覆盖，看你需要）
                if (Object.hasOwn(from[j], "daytimeForecast")) from[j].daytimeForecast = { ...to[i].daytimeForecast, ...from[j].daytimeForecast };
                if (Object.hasOwn(from[j], "overnightForecast")) from[j].overnightForecast = { ...to[i].overnightForecast, ...from[j].overnightForecast };
                if (Object.hasOwn(from[j], "restOfDayForecast")) from[j].restOfDayForecast = { ...to[i].restOfDayForecast, ...from[j].restOfDayForecast };
                Object.assign(to[i], from[j]); // 或者：Object.assign(to[i], {/* 自定义映射 */})
                i++;
                j++;
            } else if (newForecastStart < forecastStart) {
                //Console.debug(`${j}: ${newForecastStart} -> X`);
                j++; // 让 from 追上 to
            } else {
                //Console.debug(`${i}: X -> ${forecastStart}`);
                i++; // to 无匹配，保留 to[i]
            }
        }
        return to; // 可选：返回同一个引用
    }

    static ConvertWeatherCode(skycon) {
        switch (skycon) {
            // 晴天
            case "晴":
            case "CLEAR_DAY":
            case "CLEAR_NIGHT":
                return "CLEAR";

            // 多云相关
            case "多云":
            case "PARTLY_CLOUDY_DAY":
            case "PARTLY_CLOUDY_NIGHT":
                return "PARTLY_CLOUDY";
            case "少云":
                return "MOSTLY_CLEAR";
            case "晴间多云":
                return "PARTLY_CLOUDY";
            case "阴":
            case "CLOUDY":
                return "CLOUDY";

            // 风相关
            case "WIND":
                return "WINDY";

            // 雾霾相关
            case "薄雾":
            case "雾":
            case "浓雾":
            case "强浓雾":
            case "大雾":
            case "特强浓雾":
            case "FOG":
                return "FOGGY";
            case "霾":
            case "中度霾":
            case "重度霾":
            case "严重霾":
            case "LIGHT_HAZE":
            case "MODERATE_HAZE":
            case "HEAVY_HAZE":
                return "HAZE";

            // 沙尘相关(Apple 缺失 DUST/SAND 定义，暂用 HAZE 代替)
            case "扬沙":
            case "浮尘":
            case "沙尘暴":
            case "强沙尘暴":
            case "DUST":
            case "SAND":
                return "HAZE";

            // 降雨相关
            case "小雨":
            case "毛毛雨/细雨":
            case "LIGHT_RAIN":
                return "DRIZZLE";
            case "雨":
            case "阵雨":
            case "中雨":
            case "小到中雨":
            case "MODERATE_RAIN":
                return "RAIN";
            case "大雨":
            case "中到大雨":
                return "HEAVY_RAIN";
            case "暴雨":
            case "大暴雨":
            case "强降雨":
            case "特大暴雨":
            case "大到暴雨":
            case "暴雨到大暴雨":
            case "大暴雨到特大暴雨":
            case "极端降雨":
            case "HEAVY_RAIN":
                return "HEAVY_RAIN";
            case "雷阵雨":
            case "强雷阵雨":
            case "STORM_RAIN":
            case "雷阵雨伴有冰雹":
                return "THUNDERSTORMS";

            // 降雪相关
            case "小雪":
            case "LIGHT_SNOW":
                return "FLURRIES";
            case "雪":
            case "阵雪":
            case "中雪":
            case "小到中雪":
            case "MODERATE_SNOW":
                return "SNOW";
            case "大雪":
            case "中到大雪":
            case "HEAVY_SNOW":
                return "HEAVY_SNOW";
            case "暴雪":
            case "大到暴雪":
            case "STORM_SNOW":
                return "BLIZZARD";

            // 雨雪混合
            case "雨夹雪":
            case "雨雪天气":
            case "阵雨夹雪":
            case "冻雨":
                return "FREEZING_DRIZZLE";

            // 温度相关
            case "热":
            case "冷":

            // 未知
            case "未知":
            default:
                Console.debug(`skycon: ${skycon}`);
                return null;
        }
    }

    static ConvertWeatherCodeField(skycon) {
        const conditionCode = Weather.ConvertWeatherCode(skycon);
        // 未知 provider 值必须省略；写入 null 会覆盖 Apple 原值并被 FlatBuffer 编成 CLEAR。
        return conditionCode == null ? {} : { conditionCode };
    }

    static ConvertMoonPhase(moonPhase) {
        switch (moonPhase) {
            case "新月":
                return "NEW";
            case "蛾眉月":
                return "WAXING_CRESCENT";
            case "上弦月":
                return "FIRST_QUARTER";
            case "盈凸月":
                return "WAXING_GIBBOUS";
            case "满月":
                return "FULL";
            case "亏凸月":
                return "WANING_GIBBOUS";
            case "下弦月":
                return "THIRD_QUARTER";
            case "残月":
                return "WANING_CRESCENT";
            default:
                Console.debug(`moonPhase: ${moonPhase}`);
                return null;
        }
    }
}

const t=new Int32Array(2);var s;new Float32Array(t.buffer),new Float64Array(t.buffer),new Uint16Array(new Uint8Array([1,0]).buffer)[0],function(t){t[t.UTF8_BYTES=1]="UTF8_BYTES",t[t.UTF16_STRING=2]="UTF16_STRING";}(s||(s={}));class i{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsForecastMinute(t,s){return (s||new i).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsForecastMinute(t,s){return t.setPosition(t.position()+4),(s||new i).__init(t.readInt32(t.position())+t.position(),t)}startTime(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}precipitationChance(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationIntensity(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readFloat32(this.bb_pos+t):0}perceivedPrecipitationIntensity(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readFloat32(this.bb_pos+t):0}static startForecastMinute(t){t.startObject(4);}static addStartTime(t,s){t.addFieldInt32(0,s,0);}static addPrecipitationChance(t,s){t.addFieldInt8(1,s,0);}static addPrecipitationIntensity(t,s){t.addFieldFloat32(2,s,0);}static addPerceivedPrecipitationIntensity(t,s){t.addFieldFloat32(3,s,0);}static endForecastMinute(t){return t.endObject()}static createForecastMinute(t,s,e,o,n){return i.startForecastMinute(t),i.addStartTime(t,s),i.addPrecipitationChance(t,e),i.addPrecipitationIntensity(t,o),i.addPerceivedPrecipitationIntensity(t,n),i.endForecastMinute(t)}}class e{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsUUID(t,s){return (s||new e).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsUUID(t,s){return t.setPosition(t.position()+4),(s||new e).__init(t.readInt32(t.position())+t.position(),t)}bytes(t){const s=this.bb.__offset(this.bb_pos,4);return s?this.bb.readUint8(this.bb.__vector(this.bb_pos+s)+t):0}bytesLength(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.__vector_len(this.bb_pos+t):0}bytesArray(){const t=this.bb.__offset(this.bb_pos,4);return t?new Uint8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startUUID(t){t.startObject(1);}static addBytes(t,s){t.addFieldOffset(0,s,0);}static createBytesVector(t,s){t.startVector(1,s.length,1);for(let i=s.length-1;i>=0;i--)t.addInt8(s[i]);return t.endVector()}static startBytesVector(t,s){t.startVector(1,s,1);}static endUUID(t){return t.endObject()}static createUUID(t,s){return e.startUUID(t),e.addBytes(t,s),e.endUUID(t)}}var o,n,a=Object.freeze({__proto__:null,ForecastMinute:i,UUID:e});!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.MUCH_WORSE=1]="MUCH_WORSE",t[t.WORSE=2]="WORSE",t[t.SAME=3]="SAME",t[t.BETTER=4]="BETTER",t[t.MUCH_BETTER=5]="MUCH_BETTER";}(o||(o={})),function(t){t[t.APPLE_INTERNAL=0]="APPLE_INTERNAL",t[t.MODELED=1]="MODELED",t[t.STATION=2]="STATION",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4";}(n||(n={}));let b=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsMetadata(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsMetadata(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}attributionUrl(t){const s=this.bb.__offset(this.bb_pos,4);return s?this.bb.__string(this.bb_pos+s,t):null}expireTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}language(t){const s=this.bb.__offset(this.bb_pos,8);return s?this.bb.__string(this.bb_pos+s,t):null}latitude(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readFloat32(this.bb_pos+t):0}longitude(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readFloat32(this.bb_pos+t):0}providerLogo(t){const s=this.bb.__offset(this.bb_pos,14);return s?this.bb.__string(this.bb_pos+s,t):null}providerName(t){const s=this.bb.__offset(this.bb_pos,16);return s?this.bb.__string(this.bb_pos+s,t):null}readTime(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readUint32(this.bb_pos+t):0}reportedTime(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readUint32(this.bb_pos+t):0}temporarilyUnavailable(){const t=this.bb.__offset(this.bb_pos,22);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}sourceType(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readInt8(this.bb_pos+t):n.APPLE_INTERNAL}static startMetadata(t){t.startObject(11);}static addAttributionUrl(t,s){t.addFieldOffset(0,s,0);}static addExpireTime(t,s){t.addFieldInt32(1,s,0);}static addLanguage(t,s){t.addFieldOffset(2,s,0);}static addLatitude(t,s){t.addFieldFloat32(3,s,0);}static addLongitude(t,s){t.addFieldFloat32(4,s,0);}static addProviderLogo(t,s){t.addFieldOffset(5,s,0);}static addProviderName(t,s){t.addFieldOffset(6,s,0);}static addReadTime(t,s){t.addFieldInt32(7,s,0);}static addReportedTime(t,s){t.addFieldInt32(8,s,0);}static addTemporarilyUnavailable(t,s){t.addFieldInt8(9,+s,0);}static addSourceType(t,s){t.addFieldInt8(10,s,n.APPLE_INTERNAL);}static endMetadata(t){return t.endObject()}static createMetadata(s,i,e,o,n,a,b,r,d,_,h,c){return t.startMetadata(s),t.addAttributionUrl(s,i),t.addExpireTime(s,e),t.addLanguage(s,o),t.addLatitude(s,n),t.addLongitude(s,a),t.addProviderLogo(s,b),t.addProviderName(s,r),t.addReadTime(s,d),t.addReportedTime(s,_),t.addTemporarilyUnavailable(s,h),t.addSourceType(s,c),t.endMetadata(s)}};var r,d;!function(t){t[t.NOT_AVAILABLE=0]="NOT_AVAILABLE",t[t.C6H6=1]="C6H6",t[t.NH3=2]="NH3",t[t.NMHC=3]="NMHC",t[t.NO=4]="NO",t[t.NO2=5]="NO2",t[t.NOX=6]="NOX",t[t.OZONE=7]="OZONE",t[t.PM2_5=8]="PM2_5",t[t.SO2=9]="SO2",t[t.PM10=10]="PM10",t[t.CO=11]="CO",t[t.UNKNOWN12=12]="UNKNOWN12",t[t.UNKNOWN13=13]="UNKNOWN13";}(r||(r={})),function(t){t[t.PARTS_PER_BILLION=0]="PARTS_PER_BILLION",t[t.MICROGRAMS_PER_CUBIC_METER=1]="MICROGRAMS_PER_CUBIC_METER",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3";}(d||(d={}));let _=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsPollutant(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsPollutant(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}pollutantType(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):r.NOT_AVAILABLE}amount(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readFloat32(this.bb_pos+t):0}units(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):d.PARTS_PER_BILLION}static startPollutant(t){t.startObject(3);}static addPollutantType(t,s){t.addFieldInt8(0,s,r.NOT_AVAILABLE);}static addAmount(t,s){t.addFieldFloat32(1,s,0);}static addUnits(t,s){t.addFieldInt8(2,s,d.PARTS_PER_BILLION);}static endPollutant(t){return t.endObject()}static createPollutant(s,i,e,o){return t.startPollutant(s),t.addPollutantType(s,i),t.addAmount(s,e),t.addUnits(s,o),t.endPollutant(s)}},h=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsAirQuality(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsAirQuality(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}categoryIndex(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt8(this.bb_pos+t):0}index(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt16(this.bb_pos+t):0}isSignificant(){const t=this.bb.__offset(this.bb_pos,10);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}pollutants(t,s){const i=this.bb.__offset(this.bb_pos,12);return i?(s||new _).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}pollutantsLength(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}previousDayComparison(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):o.UNKNOWN}primaryPollutant(){const t=this.bb.__offset(this.bb_pos,16);return t?this.bb.readInt8(this.bb_pos+t):r.NOT_AVAILABLE}scale(t){const s=this.bb.__offset(this.bb_pos,18);return s?this.bb.__string(this.bb_pos+s,t):null}static startAirQuality(t){t.startObject(8);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addCategoryIndex(t,s){t.addFieldInt8(1,s,0);}static addIndex(t,s){t.addFieldInt16(2,s,0);}static addIsSignificant(t,s){t.addFieldInt8(3,+s,0);}static addPollutants(t,s){t.addFieldOffset(4,s,0);}static createPollutantsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPollutantsVector(t,s){t.startVector(4,s,4);}static addPreviousDayComparison(t,s){t.addFieldInt8(5,s,o.UNKNOWN);}static addPrimaryPollutant(t,s){t.addFieldInt8(6,s,r.NOT_AVAILABLE);}static addScale(t,s){t.addFieldOffset(7,s,0);}static endAirQuality(t){return t.endObject()}static createAirQuality(s,i,e,o,n,a,b,r,d){return t.startAirQuality(s),t.addMetadata(s,i),t.addCategoryIndex(s,e),t.addIndex(s,o),t.addIsSignificant(s,n),t.addPollutants(s,a),t.addPreviousDayComparison(s,b),t.addPrimaryPollutant(s,r),t.addScale(s,d),t.endAirQuality(s)}};class c{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsArticles(t,s){return (s||new c).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsArticles(t,s){return t.setPosition(t.position()+4),(s||new c).__init(t.readInt32(t.position())+t.position(),t)}id(t){const s=this.bb.__offset(this.bb_pos,4);return s?this.bb.__string(this.bb_pos+s,t):null}supportedStorefronts(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?this.bb.__string(this.bb.__vector(this.bb_pos+i)+4*t,s):null}supportedStorefrontsLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}alertIds(t,s){const i=this.bb.__offset(this.bb_pos,8);return i?(s||new e).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}alertIdsLength(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}phenomena(t,s){const i=this.bb.__offset(this.bb_pos,10);return i?this.bb.__string(this.bb.__vector(this.bb_pos+i)+4*t,s):null}phenomenaLength(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}headlineOverride(t){const s=this.bb.__offset(this.bb_pos,12);return s?this.bb.__string(this.bb_pos+s,t):null}locale(t){const s=this.bb.__offset(this.bb_pos,14);return s?this.bb.__string(this.bb_pos+s,t):null}static startArticles(t){t.startObject(6);}static addId(t,s){t.addFieldOffset(0,s,0);}static addSupportedStorefronts(t,s){t.addFieldOffset(1,s,0);}static createSupportedStorefrontsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startSupportedStorefrontsVector(t,s){t.startVector(4,s,4);}static addAlertIds(t,s){t.addFieldOffset(2,s,0);}static createAlertIdsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startAlertIdsVector(t,s){t.startVector(4,s,4);}static addPhenomena(t,s){t.addFieldOffset(3,s,0);}static createPhenomenaVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPhenomenaVector(t,s){t.startVector(4,s,4);}static addHeadlineOverride(t,s){t.addFieldOffset(4,s,0);}static addLocale(t,s){t.addFieldOffset(5,s,0);}static endArticles(t){return t.endObject()}static createArticles(t,s,i,e,o,n,a){return c.startArticles(t),c.addId(t,s),c.addSupportedStorefronts(t,i),c.addAlertIds(t,e),c.addPhenomena(t,o),c.addHeadlineOverride(t,n),c.addLocale(t,a),c.endArticles(t)}}var p,l,u,f,N,O,I,F;!function(t){t[t.MEAN=0]="MEAN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5";}(p||(p={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.OBSERVED=1]="OBSERVED",t[t.LIKELY=2]="LIKELY",t[t.POSSIBLE=3]="POSSIBLE",t[t.UNLIKELY=4]="UNLIKELY",t[t.UNKNOWN5=5]="UNKNOWN5";}(l||(l={})),function(t){t[t.STEADY=0]="STEADY",t[t.INC=1]="INC",t[t.DEC=2]="DEC",t[t.UNKNOWN3=3]="UNKNOWN3";}(u||(u={}));class A{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsChange(t,s){return (s||new A).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsChange(t,s){return t.setPosition(t.position()+4),(s||new A).__init(t.readInt32(t.position())+t.position(),t)}forecastStart(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}maxTemperatureChange(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):u.STEADY}minTemperatureChange(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):u.STEADY}dayPrecipitationChange(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):u.STEADY}nightPrecipitationChange(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):u.STEADY}static startChange(t){t.startObject(6);}static addForecastStart(t,s){t.addFieldInt32(0,s,0);}static addForecastEnd(t,s){t.addFieldInt32(1,s,0);}static addMaxTemperatureChange(t,s){t.addFieldInt8(2,s,u.STEADY);}static addMinTemperatureChange(t,s){t.addFieldInt8(3,s,u.STEADY);}static addDayPrecipitationChange(t,s){t.addFieldInt8(4,s,u.STEADY);}static addNightPrecipitationChange(t,s){t.addFieldInt8(5,s,u.STEADY);}static endChange(t){return t.endObject()}static createChange(t,s,i,e,o,n,a){return A.startChange(t),A.addForecastStart(t,s),A.addForecastEnd(t,i),A.addMaxTemperatureChange(t,e),A.addMinTemperatureChange(t,o),A.addDayPrecipitationChange(t,n),A.addNightPrecipitationChange(t,a),A.endChange(t)}}!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.TEMPERATURE_MAX=1]="TEMPERATURE_MAX",t[t.PRECIPITATION=2]="PRECIPITATION",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UVI=4]="UVI";}(f||(f={})),function(t){t[t.MUCHHIGHER=0]="MUCHHIGHER",t[t.HIGHER=1]="HIGHER",t[t.NORMAL=2]="NORMAL",t[t.LOWER=3]="LOWER",t[t.MUCHLOWER=4]="MUCHLOWER",t[t.UNKNOWN5=5]="UNKNOWN5";}(N||(N={}));class m{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsComparison(t,s){return (s||new m).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsComparison(t,s){return t.setPosition(t.position()+4),(s||new m).__init(t.readInt32(t.position())+t.position(),t)}condition(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):f.UNKNOWN0}currentValue(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readFloat32(this.bb_pos+t):0}baselineValue(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readFloat32(this.bb_pos+t):0}deviation(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):N.MUCHHIGHER}baselineType(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readUint32(this.bb_pos+t):0}baselineStartDate(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readUint32(this.bb_pos+t):0}static startComparison(t){t.startObject(6);}static addCondition(t,s){t.addFieldInt8(0,s,f.UNKNOWN0);}static addCurrentValue(t,s){t.addFieldFloat32(1,s,0);}static addBaselineValue(t,s){t.addFieldFloat32(2,s,0);}static addDeviation(t,s){t.addFieldInt8(3,s,N.MUCHHIGHER);}static addBaselineType(t,s){t.addFieldInt32(4,s,0);}static addBaselineStartDate(t,s){t.addFieldInt32(5,s,0);}static endComparison(t){return t.endObject()}static createComparison(t,s,i,e,o,n,a){return m.startComparison(t),m.addCondition(t,s),m.addCurrentValue(t,i),m.addBaselineValue(t,e),m.addDeviation(t,o),m.addBaselineType(t,n),m.addBaselineStartDate(t,a),m.endComparison(t)}}!function(t){t[t.CLEAR=0]="CLEAR",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.SLEET=3]="SLEET",t[t.POSSIBLE_SLEET=4]="POSSIBLE_SLEET",t[t.HEAVY_RAIN=5]="HEAVY_RAIN",t[t.RAIN=6]="RAIN",t[t.DRIZZLE=7]="DRIZZLE",t[t.POSSIBLE_DRIZZLE=8]="POSSIBLE_DRIZZLE",t[t.HEAVY_SNOW=9]="HEAVY_SNOW",t[t.SNOW=10]="SNOW",t[t.UNKNOWN11=11]="UNKNOWN11",t[t.UNKNOWN12=12]="UNKNOWN12",t[t.UNKNOWN13=13]="UNKNOWN13",t[t.UNKNOWN14=14]="UNKNOWN14",t[t.UNKNOWN15=15]="UNKNOWN15",t[t.UNKNOWN16=16]="UNKNOWN16",t[t.UNKNOWN17=17]="UNKNOWN17",t[t.UNKNOWN18=18]="UNKNOWN18";}(O||(O={})),function(t){t[t.CLEAR=0]="CLEAR",t[t.START=1]="START",t[t.STOP=2]="STOP",t[t.START_STOP=3]="START_STOP",t[t.STOP_START=4]="STOP_START",t[t.CONSTANT=5]="CONSTANT",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.UNKNOWN7=7]="UNKNOWN7";}(I||(I={})),function(t){t[t.FIRST_AT=0]="FIRST_AT",t[t.SECOND_AT=1]="SECOND_AT",t[t.UNKNOWN2=2]="UNKNOWN2";}(F||(F={}));let U=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsParameter(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsParameter(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}type(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):F.FIRST_AT}date(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}static startParameter(t){t.startObject(2);}static addType(t,s){t.addFieldInt8(0,s,F.FIRST_AT);}static addDate(t,s){t.addFieldInt32(1,s,0);}static endParameter(t){return t.endObject()}static createParameter(s,i,e){return t.startParameter(s),t.addType(s,i),t.addDate(s,e),t.endParameter(s)}},W=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsCondition(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsCondition(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}startTime(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}endTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}forecastToken(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):I.CLEAR}beginCondition(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):O.CLEAR}endCondition(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):O.CLEAR}parameters(t,s){const i=this.bb.__offset(this.bb_pos,14);return i?(s||new U).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}parametersLength(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}static startCondition(t){t.startObject(6);}static addStartTime(t,s){t.addFieldInt32(0,s,0);}static addEndTime(t,s){t.addFieldInt32(1,s,0);}static addForecastToken(t,s){t.addFieldInt8(2,s,I.CLEAR);}static addBeginCondition(t,s){t.addFieldInt8(3,s,O.CLEAR);}static addEndCondition(t,s){t.addFieldInt8(4,s,O.CLEAR);}static addParameters(t,s){t.addFieldOffset(5,s,0);}static createParametersVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startParametersVector(t,s){t.startVector(4,s,4);}static endCondition(t){return t.endObject()}static createCondition(s,i,e,o,n,a,b){return t.startCondition(s),t.addStartTime(s,i),t.addEndTime(s,e),t.addForecastToken(s,o),t.addBeginCondition(s,n),t.addEndCondition(s,a),t.addParameters(s,b),t.endCondition(s)}};var P,T,y,S;!function(t){t[t.CLEAR=0]="CLEAR",t[t.RAIN=1]="RAIN",t[t.SNOW=2]="SNOW",t[t.SLEET=3]="SLEET",t[t.HAIL=4]="HAIL",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.MIXED=6]="MIXED";}(P||(P={}));class C{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsPrecipitationAmountByType(t,s){return (s||new C).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsPrecipitationAmountByType(t,s){return t.setPosition(t.position()+4),(s||new C).__init(t.readInt32(t.position())+t.position(),t)}precipitationType(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):P.CLEAR}expected(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readFloat32(this.bb_pos+t):0}minimumSnow(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readFloat32(this.bb_pos+t):0}maximumSnow(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readFloat32(this.bb_pos+t):0}expectedSnow(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readFloat32(this.bb_pos+t):0}static startPrecipitationAmountByType(t){t.startObject(5);}static addPrecipitationType(t,s){t.addFieldInt8(0,s,P.CLEAR);}static addExpected(t,s){t.addFieldFloat32(1,s,0);}static addMinimumSnow(t,s){t.addFieldFloat32(2,s,0);}static addMaximumSnow(t,s){t.addFieldFloat32(3,s,0);}static addExpectedSnow(t,s){t.addFieldFloat32(4,s,0);}static endPrecipitationAmountByType(t){return t.endObject()}static createPrecipitationAmountByType(t,s,i,e,o,n){return C.startPrecipitationAmountByType(t),C.addPrecipitationType(t,s),C.addExpected(t,i),C.addMinimumSnow(t,e),C.addMaximumSnow(t,o),C.addExpectedSnow(t,n),C.endPrecipitationAmountByType(t)}}!function(t){t[t.RISING=0]="RISING",t[t.FALLING=1]="FALLING",t[t.STEADY=2]="STEADY",t[t.UNKNOWN3=3]="UNKNOWN3";}(T||(T={})),function(t){t[t.CLEAR=0]="CLEAR",t[t.BLIZZARD=1]="BLIZZARD",t[t.PRECIPITATION=2]="PRECIPITATION",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.CLOUDY=5]="CLOUDY",t[t.DRIZZLE=6]="DRIZZLE",t[t.FLURRIES=7]="FLURRIES",t[t.FOGGY=8]="FOGGY",t[t.FREEZING_DRIZZLE=9]="FREEZING_DRIZZLE",t[t.UNKNOWN10=10]="UNKNOWN10",t[t.UNKNOWN11=11]="UNKNOWN11",t[t.UNKNOWN12=12]="UNKNOWN12",t[t.HAZE=13]="HAZE",t[t.HEAVY_RAIN=14]="HEAVY_RAIN",t[t.HEAVY_SNOW=15]="HEAVY_SNOW",t[t.UNKNOWN16=16]="UNKNOWN16",t[t.UNKNOWN17=17]="UNKNOWN17",t[t.ISOLATED_THUNDERSTORMS=18]="ISOLATED_THUNDERSTORMS",t[t.MOSTLY_CLEAR=19]="MOSTLY_CLEAR",t[t.MOSTLY_CLOUDY=20]="MOSTLY_CLOUDY",t[t.PARTLY_CLOUDY=21]="PARTLY_CLOUDY",t[t.RAIN=22]="RAIN",t[t.UNKNOWN23=23]="UNKNOWN23",t[t.UNKNOWN24=24]="UNKNOWN24",t[t.UNKNOWN25=25]="UNKNOWN25",t[t.SNOW=26]="SNOW",t[t.UNKNOWN27=27]="UNKNOWN27",t[t.UNKNOWN28=28]="UNKNOWN28",t[t.UNKNOWN29=29]="UNKNOWN29",t[t.THUNDERSTORMS=30]="THUNDERSTORMS",t[t.UNKNOWN31=31]="UNKNOWN31",t[t.WINDY=32]="WINDY",t[t.WINTRY_MIX=33]="WINTRY_MIX",t[t.UNKNOWN34=34]="UNKNOWN34",t[t.UNKNOWN35=35]="UNKNOWN35",t[t.UNKNOWN36=36]="UNKNOWN36",t[t.UNKNOWN37=37]="UNKNOWN37",t[t.UNKNOWN38=38]="UNKNOWN38",t[t.UNKNOWN39=39]="UNKNOWN39",t[t.UNKNOWN40=40]="UNKNOWN40",t[t.UNKNOWN41=41]="UNKNOWN41",t[t.UNKNOWN42=42]="UNKNOWN42",t[t.UNKNOWN43=43]="UNKNOWN43",t[t.UNKNOWN44=44]="UNKNOWN44";}(y||(y={}));class E{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsCurrentWeatherData(t,s){return (s||new E).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsCurrentWeatherData(t,s){return t.setPosition(t.position()+4),(s||new E).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}asOf(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}cloudCover(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverLowAltPct(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverMidAltPct(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverHighAltPct(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):0}conditionCode(){const t=this.bb.__offset(this.bb_pos,16);return t?this.bb.readInt8(this.bb_pos+t):y.CLEAR}daylight(){const t=this.bb.__offset(this.bb_pos,18);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}humidity(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readInt8(this.bb_pos+t):0}perceivedPrecipitationIntensity(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmount1h(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmount6h(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmount24h(){const t=this.bb.__offset(this.bb_pos,28);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountNext1h(){const t=this.bb.__offset(this.bb_pos,30);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountNext6h(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountNext24h(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountNext1hByType(t,s){const i=this.bb.__offset(this.bb_pos,36);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountNext1hByTypeLength(){const t=this.bb.__offset(this.bb_pos,36);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationAmountNext6hByType(t,s){const i=this.bb.__offset(this.bb_pos,38);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountNext6hByTypeLength(){const t=this.bb.__offset(this.bb_pos,38);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationAmountNext24hByType(t,s){const i=this.bb.__offset(this.bb_pos,40);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountNext24hByTypeLength(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationAmountPrevious1hByType(t,s){const i=this.bb.__offset(this.bb_pos,42);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountPrevious1hByTypeLength(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationAmountPrevious6hByType(t,s){const i=this.bb.__offset(this.bb_pos,44);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountPrevious6hByTypeLength(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationAmountPrevious24hByType(t,s){const i=this.bb.__offset(this.bb_pos,46);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountPrevious24hByTypeLength(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationIntensity(){const t=this.bb.__offset(this.bb_pos,48);return t?this.bb.readFloat32(this.bb_pos+t):0}pressure(){const t=this.bb.__offset(this.bb_pos,50);return t?this.bb.readFloat32(this.bb_pos+t):0}pressureTrend(){const t=this.bb.__offset(this.bb_pos,52);return t?this.bb.readInt8(this.bb_pos+t):T.RISING}snowfallAmount1h(){const t=this.bb.__offset(this.bb_pos,54);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallAmount6h(){const t=this.bb.__offset(this.bb_pos,56);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallAmount24h(){const t=this.bb.__offset(this.bb_pos,58);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallAmountNext1h(){const t=this.bb.__offset(this.bb_pos,60);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallAmountNext6h(){const t=this.bb.__offset(this.bb_pos,62);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallAmountNext24h(){const t=this.bb.__offset(this.bb_pos,64);return t?this.bb.readFloat32(this.bb_pos+t):0}temperature(){const t=this.bb.__offset(this.bb_pos,66);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureApparent(){const t=this.bb.__offset(this.bb_pos,68);return t?this.bb.readFloat32(this.bb_pos+t):0}unknown34(){const t=this.bb.__offset(this.bb_pos,70);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureDewPoint(){const t=this.bb.__offset(this.bb_pos,72);return t?this.bb.readFloat32(this.bb_pos+t):0}uvIndex(){const t=this.bb.__offset(this.bb_pos,74);return t?this.bb.readInt8(this.bb_pos+t):0}visibility(){const t=this.bb.__offset(this.bb_pos,76);return t?this.bb.readFloat32(this.bb_pos+t):0}windDirection(){const t=this.bb.__offset(this.bb_pos,78);return t?this.bb.readInt16(this.bb_pos+t):0}windGust(){const t=this.bb.__offset(this.bb_pos,80);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeed(){const t=this.bb.__offset(this.bb_pos,82);return t?this.bb.readFloat32(this.bb_pos+t):0}static startCurrentWeatherData(t){t.startObject(40);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addAsOf(t,s){t.addFieldInt32(1,s,0);}static addCloudCover(t,s){t.addFieldInt8(2,s,0);}static addCloudCoverLowAltPct(t,s){t.addFieldInt8(3,s,0);}static addCloudCoverMidAltPct(t,s){t.addFieldInt8(4,s,0);}static addCloudCoverHighAltPct(t,s){t.addFieldInt8(5,s,0);}static addConditionCode(t,s){t.addFieldInt8(6,s,y.CLEAR);}static addDaylight(t,s){t.addFieldInt8(7,+s,0);}static addHumidity(t,s){t.addFieldInt8(8,s,0);}static addPerceivedPrecipitationIntensity(t,s){t.addFieldFloat32(9,s,0);}static addPrecipitationAmount1h(t,s){t.addFieldFloat32(10,s,0);}static addPrecipitationAmount6h(t,s){t.addFieldFloat32(11,s,0);}static addPrecipitationAmount24h(t,s){t.addFieldFloat32(12,s,0);}static addPrecipitationAmountNext1h(t,s){t.addFieldFloat32(13,s,0);}static addPrecipitationAmountNext6h(t,s){t.addFieldFloat32(14,s,0);}static addPrecipitationAmountNext24h(t,s){t.addFieldFloat32(15,s,0);}static addPrecipitationAmountNext1hByType(t,s){t.addFieldOffset(16,s,0);}static createPrecipitationAmountNext1hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountNext1hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationAmountNext6hByType(t,s){t.addFieldOffset(17,s,0);}static createPrecipitationAmountNext6hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountNext6hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationAmountNext24hByType(t,s){t.addFieldOffset(18,s,0);}static createPrecipitationAmountNext24hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountNext24hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationAmountPrevious1hByType(t,s){t.addFieldOffset(19,s,0);}static createPrecipitationAmountPrevious1hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountPrevious1hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationAmountPrevious6hByType(t,s){t.addFieldOffset(20,s,0);}static createPrecipitationAmountPrevious6hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountPrevious6hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationAmountPrevious24hByType(t,s){t.addFieldOffset(21,s,0);}static createPrecipitationAmountPrevious24hByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountPrevious24hByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationIntensity(t,s){t.addFieldFloat32(22,s,0);}static addPressure(t,s){t.addFieldFloat32(23,s,0);}static addPressureTrend(t,s){t.addFieldInt8(24,s,T.RISING);}static addSnowfallAmount1h(t,s){t.addFieldFloat32(25,s,0);}static addSnowfallAmount6h(t,s){t.addFieldFloat32(26,s,0);}static addSnowfallAmount24h(t,s){t.addFieldFloat32(27,s,0);}static addSnowfallAmountNext1h(t,s){t.addFieldFloat32(28,s,0);}static addSnowfallAmountNext6h(t,s){t.addFieldFloat32(29,s,0);}static addSnowfallAmountNext24h(t,s){t.addFieldFloat32(30,s,0);}static addTemperature(t,s){t.addFieldFloat32(31,s,0);}static addTemperatureApparent(t,s){t.addFieldFloat32(32,s,0);}static addUnknown34(t,s){t.addFieldFloat32(33,s,0);}static addTemperatureDewPoint(t,s){t.addFieldFloat32(34,s,0);}static addUvIndex(t,s){t.addFieldInt8(35,s,0);}static addVisibility(t,s){t.addFieldFloat32(36,s,0);}static addWindDirection(t,s){t.addFieldInt16(37,s,0);}static addWindGust(t,s){t.addFieldFloat32(38,s,0);}static addWindSpeed(t,s){t.addFieldFloat32(39,s,0);}static endCurrentWeatherData(t){return t.endObject()}static createCurrentWeatherData(t,s,i,e,o,n,a,b,r,d,_,h,c,p,l,u,f,N,O,I,F,A,m,U,W,P,T,y,S,C,g,K,R,L,w,v,M,D,V,x,H){return E.startCurrentWeatherData(t),E.addMetadata(t,s),E.addAsOf(t,i),E.addCloudCover(t,e),E.addCloudCoverLowAltPct(t,o),E.addCloudCoverMidAltPct(t,n),E.addCloudCoverHighAltPct(t,a),E.addConditionCode(t,b),E.addDaylight(t,r),E.addHumidity(t,d),E.addPerceivedPrecipitationIntensity(t,_),E.addPrecipitationAmount1h(t,h),E.addPrecipitationAmount6h(t,c),E.addPrecipitationAmount24h(t,p),E.addPrecipitationAmountNext1h(t,l),E.addPrecipitationAmountNext6h(t,u),E.addPrecipitationAmountNext24h(t,f),E.addPrecipitationAmountNext1hByType(t,N),E.addPrecipitationAmountNext6hByType(t,O),E.addPrecipitationAmountNext24hByType(t,I),E.addPrecipitationAmountPrevious1hByType(t,F),E.addPrecipitationAmountPrevious6hByType(t,A),E.addPrecipitationAmountPrevious24hByType(t,m),E.addPrecipitationIntensity(t,U),E.addPressure(t,W),E.addPressureTrend(t,P),E.addSnowfallAmount1h(t,T),E.addSnowfallAmount6h(t,y),E.addSnowfallAmount24h(t,S),E.addSnowfallAmountNext1h(t,C),E.addSnowfallAmountNext6h(t,g),E.addSnowfallAmountNext24h(t,K),E.addTemperature(t,R),E.addTemperatureApparent(t,L),E.addUnknown34(t,w),E.addTemperatureDewPoint(t,v),E.addUvIndex(t,M),E.addVisibility(t,D),E.addWindDirection(t,V),E.addWindGust(t,x),E.addWindSpeed(t,H),E.endCurrentWeatherData(t)}}class g{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsDayPartForecast(t,s){return (s||new g).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsDayPartForecast(t,s){return t.setPosition(t.position()+4),(s||new g).__init(t.readInt32(t.position())+t.position(),t)}forecastStart(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}cloudCover(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverLowAltPct(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverMidAltPct(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverHighAltPct(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):0}conditionCode(){const t=this.bb.__offset(this.bb_pos,16);return t?this.bb.readInt8(this.bb_pos+t):y.CLEAR}humidity(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readInt8(this.bb_pos+t):0}humidityMax(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readInt8(this.bb_pos+t):0}humidityMin(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationAmount(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountByType(t,s){const i=this.bb.__offset(this.bb_pos,26);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountByTypeLength(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationChance(){const t=this.bb.__offset(this.bb_pos,28);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationType(){const t=this.bb.__offset(this.bb_pos,30);return t?this.bb.readInt8(this.bb_pos+t):P.CLEAR}snowfallAmount(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureMax(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureMin(){const t=this.bb.__offset(this.bb_pos,36);return t?this.bb.readFloat32(this.bb_pos+t):0}visibilityMax(){const t=this.bb.__offset(this.bb_pos,38);return t?this.bb.readFloat32(this.bb_pos+t):0}visibilityMin(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.readFloat32(this.bb_pos+t):0}windDirection(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.readInt16(this.bb_pos+t):0}windGustSpeedMax(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeed(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeedMax(){const t=this.bb.__offset(this.bb_pos,48);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationIntensityMax(){const t=this.bb.__offset(this.bb_pos,50);return t?this.bb.readFloat32(this.bb_pos+t):0}perceivedPrecipitationIntensityMax(){const t=this.bb.__offset(this.bb_pos,52);return t?this.bb.readFloat32(this.bb_pos+t):0}uvIndexMin(){const t=this.bb.__offset(this.bb_pos,54);return t?this.bb.readInt8(this.bb_pos+t):0}uvIndexMax(){const t=this.bb.__offset(this.bb_pos,56);return t?this.bb.readInt8(this.bb_pos+t):0}temperatureApparentMin(){const t=this.bb.__offset(this.bb_pos,58);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureApparentMax(){const t=this.bb.__offset(this.bb_pos,60);return t?this.bb.readFloat32(this.bb_pos+t):0}daylight(){const t=this.bb.__offset(this.bb_pos,62);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}static startDayPartForecast(t){t.startObject(30);}static addForecastStart(t,s){t.addFieldInt32(0,s,0);}static addForecastEnd(t,s){t.addFieldInt32(1,s,0);}static addCloudCover(t,s){t.addFieldInt8(2,s,0);}static addCloudCoverLowAltPct(t,s){t.addFieldInt8(3,s,0);}static addCloudCoverMidAltPct(t,s){t.addFieldInt8(4,s,0);}static addCloudCoverHighAltPct(t,s){t.addFieldInt8(5,s,0);}static addConditionCode(t,s){t.addFieldInt8(6,s,y.CLEAR);}static addHumidity(t,s){t.addFieldInt8(7,s,0);}static addHumidityMax(t,s){t.addFieldInt8(8,s,0);}static addHumidityMin(t,s){t.addFieldInt8(9,s,0);}static addPrecipitationAmount(t,s){t.addFieldFloat32(10,s,0);}static addPrecipitationAmountByType(t,s){t.addFieldOffset(11,s,0);}static createPrecipitationAmountByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationChance(t,s){t.addFieldInt8(12,s,0);}static addPrecipitationType(t,s){t.addFieldInt8(13,s,P.CLEAR);}static addSnowfallAmount(t,s){t.addFieldFloat32(14,s,0);}static addTemperatureMax(t,s){t.addFieldFloat32(15,s,0);}static addTemperatureMin(t,s){t.addFieldFloat32(16,s,0);}static addVisibilityMax(t,s){t.addFieldFloat32(17,s,0);}static addVisibilityMin(t,s){t.addFieldFloat32(18,s,0);}static addWindDirection(t,s){t.addFieldInt16(19,s,0);}static addWindGustSpeedMax(t,s){t.addFieldFloat32(20,s,0);}static addWindSpeed(t,s){t.addFieldFloat32(21,s,0);}static addWindSpeedMax(t,s){t.addFieldFloat32(22,s,0);}static addPrecipitationIntensityMax(t,s){t.addFieldFloat32(23,s,0);}static addPerceivedPrecipitationIntensityMax(t,s){t.addFieldFloat32(24,s,0);}static addUvIndexMin(t,s){t.addFieldInt8(25,s,0);}static addUvIndexMax(t,s){t.addFieldInt8(26,s,0);}static addTemperatureApparentMin(t,s){t.addFieldFloat32(27,s,0);}static addTemperatureApparentMax(t,s){t.addFieldFloat32(28,s,0);}static addDaylight(t,s){t.addFieldInt8(29,+s,0);}static endDayPartForecast(t){return t.endObject()}static createDayPartForecast(t,s,i,e,o,n,a,b,r,d,_,h,c,p,l,u,f,N,O,I,F,A,m,U,W,P,T,y,S,C,E){return g.startDayPartForecast(t),g.addForecastStart(t,s),g.addForecastEnd(t,i),g.addCloudCover(t,e),g.addCloudCoverLowAltPct(t,o),g.addCloudCoverMidAltPct(t,n),g.addCloudCoverHighAltPct(t,a),g.addConditionCode(t,b),g.addHumidity(t,r),g.addHumidityMax(t,d),g.addHumidityMin(t,_),g.addPrecipitationAmount(t,h),g.addPrecipitationAmountByType(t,c),g.addPrecipitationChance(t,p),g.addPrecipitationType(t,l),g.addSnowfallAmount(t,u),g.addTemperatureMax(t,f),g.addTemperatureMin(t,N),g.addVisibilityMax(t,O),g.addVisibilityMin(t,I),g.addWindDirection(t,F),g.addWindGustSpeedMax(t,A),g.addWindSpeed(t,m),g.addWindSpeedMax(t,U),g.addPrecipitationIntensityMax(t,W),g.addPerceivedPrecipitationIntensityMax(t,P),g.addUvIndexMin(t,T),g.addUvIndexMax(t,y),g.addTemperatureApparentMin(t,S),g.addTemperatureApparentMax(t,C),g.addDaylight(t,E),g.endDayPartForecast(t)}}!function(t){t[t.NEW=0]="NEW",t[t.WAXING_CRESCENT=1]="WAXING_CRESCENT",t[t.FIRST_QUARTER=2]="FIRST_QUARTER",t[t.WAXING_GIBBOUS=3]="WAXING_GIBBOUS",t[t.FULL=4]="FULL",t[t.WANING_GIBBOUS=5]="WANING_GIBBOUS",t[t.THIRD_QUARTER=6]="THIRD_QUARTER",t[t.WANING_CRESCENT=7]="WANING_CRESCENT",t[t.UNKNOWN8=8]="UNKNOWN8";}(S||(S={}));class K{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsDayWeatherConditions(t,s){return (s||new K).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsDayWeatherConditions(t,s){return t.setPosition(t.position()+4),(s||new K).__init(t.readInt32(t.position())+t.position(),t)}forecastStart(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}conditionCode(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):y.CLEAR}humidityMax(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}humidityMin(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):0}maxUvIndex(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):0}moonPhase(){const t=this.bb.__offset(this.bb_pos,16);return t?this.bb.readInt8(this.bb_pos+t):S.NEW}moonrise(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readUint32(this.bb_pos+t):0}moonset(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readUint32(this.bb_pos+t):0}precipitationAmount(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmountByType(t,s){const i=this.bb.__offset(this.bb_pos,24);return i?(s||new C).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}precipitationAmountByTypeLength(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.__vector_len(this.bb_pos+t):0}precipitationChance(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationType(){const t=this.bb.__offset(this.bb_pos,28);return t?this.bb.readInt8(this.bb_pos+t):P.CLEAR}snowfallAmount(){const t=this.bb.__offset(this.bb_pos,30);return t?this.bb.readFloat32(this.bb_pos+t):0}solarMidnight(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readUint32(this.bb_pos+t):0}solarNoon(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readUint32(this.bb_pos+t):0}sunrise(){const t=this.bb.__offset(this.bb_pos,36);return t?this.bb.readUint32(this.bb_pos+t):0}sunriseCivil(){const t=this.bb.__offset(this.bb_pos,38);return t?this.bb.readUint32(this.bb_pos+t):0}sunriseNautical(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.readUint32(this.bb_pos+t):0}sunriseAstronomical(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.readUint32(this.bb_pos+t):0}sunset(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.readUint32(this.bb_pos+t):0}sunsetCivil(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.readUint32(this.bb_pos+t):0}sunsetNautical(){const t=this.bb.__offset(this.bb_pos,48);return t?this.bb.readUint32(this.bb_pos+t):0}sunsetAstronomical(){const t=this.bb.__offset(this.bb_pos,50);return t?this.bb.readUint32(this.bb_pos+t):0}temperatureMax(){const t=this.bb.__offset(this.bb_pos,52);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureMaxTime(){const t=this.bb.__offset(this.bb_pos,54);return t?this.bb.readUint32(this.bb_pos+t):0}temperatureMin(){const t=this.bb.__offset(this.bb_pos,56);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureMinTime(){const t=this.bb.__offset(this.bb_pos,58);return t?this.bb.readUint32(this.bb_pos+t):0}windGustSpeedMax(){const t=this.bb.__offset(this.bb_pos,60);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeedAvg(){const t=this.bb.__offset(this.bb_pos,62);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeedMax(){const t=this.bb.__offset(this.bb_pos,64);return t?this.bb.readFloat32(this.bb_pos+t):0}visibilityMax(){const t=this.bb.__offset(this.bb_pos,66);return t?this.bb.readFloat32(this.bb_pos+t):0}visibilityMin(){const t=this.bb.__offset(this.bb_pos,68);return t?this.bb.readFloat32(this.bb_pos+t):0}daytimeForecast(t){const s=this.bb.__offset(this.bb_pos,70);return s?(t||new g).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}overnightForecast(t){const s=this.bb.__offset(this.bb_pos,72);return s?(t||new g).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}restOfDayForecast(t){const s=this.bb.__offset(this.bb_pos,74);return s?(t||new g).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}static startDayWeatherConditions(t){t.startObject(36);}static addForecastStart(t,s){t.addFieldInt32(0,s,0);}static addForecastEnd(t,s){t.addFieldInt32(1,s,0);}static addConditionCode(t,s){t.addFieldInt8(2,s,y.CLEAR);}static addHumidityMax(t,s){t.addFieldInt8(3,s,0);}static addHumidityMin(t,s){t.addFieldInt8(4,s,0);}static addMaxUvIndex(t,s){t.addFieldInt8(5,s,0);}static addMoonPhase(t,s){t.addFieldInt8(6,s,S.NEW);}static addMoonrise(t,s){t.addFieldInt32(7,s,0);}static addMoonset(t,s){t.addFieldInt32(8,s,0);}static addPrecipitationAmount(t,s){t.addFieldFloat32(9,s,0);}static addPrecipitationAmountByType(t,s){t.addFieldOffset(10,s,0);}static createPrecipitationAmountByTypeVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPrecipitationAmountByTypeVector(t,s){t.startVector(4,s,4);}static addPrecipitationChance(t,s){t.addFieldInt8(11,s,0);}static addPrecipitationType(t,s){t.addFieldInt8(12,s,P.CLEAR);}static addSnowfallAmount(t,s){t.addFieldFloat32(13,s,0);}static addSolarMidnight(t,s){t.addFieldInt32(14,s,0);}static addSolarNoon(t,s){t.addFieldInt32(15,s,0);}static addSunrise(t,s){t.addFieldInt32(16,s,0);}static addSunriseCivil(t,s){t.addFieldInt32(17,s,0);}static addSunriseNautical(t,s){t.addFieldInt32(18,s,0);}static addSunriseAstronomical(t,s){t.addFieldInt32(19,s,0);}static addSunset(t,s){t.addFieldInt32(20,s,0);}static addSunsetCivil(t,s){t.addFieldInt32(21,s,0);}static addSunsetNautical(t,s){t.addFieldInt32(22,s,0);}static addSunsetAstronomical(t,s){t.addFieldInt32(23,s,0);}static addTemperatureMax(t,s){t.addFieldFloat32(24,s,0);}static addTemperatureMaxTime(t,s){t.addFieldInt32(25,s,0);}static addTemperatureMin(t,s){t.addFieldFloat32(26,s,0);}static addTemperatureMinTime(t,s){t.addFieldInt32(27,s,0);}static addWindGustSpeedMax(t,s){t.addFieldFloat32(28,s,0);}static addWindSpeedAvg(t,s){t.addFieldFloat32(29,s,0);}static addWindSpeedMax(t,s){t.addFieldFloat32(30,s,0);}static addVisibilityMax(t,s){t.addFieldFloat32(31,s,0);}static addVisibilityMin(t,s){t.addFieldFloat32(32,s,0);}static addDaytimeForecast(t,s){t.addFieldOffset(33,s,0);}static addOvernightForecast(t,s){t.addFieldOffset(34,s,0);}static addRestOfDayForecast(t,s){t.addFieldOffset(35,s,0);}static endDayWeatherConditions(t){return t.endObject()}}class R{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsDailyForecastData(t,s){return (s||new R).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsDailyForecastData(t,s){return t.setPosition(t.position()+4),(s||new R).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}days(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new K).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}daysLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startDailyForecastData(t){t.startObject(2);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addDays(t,s){t.addFieldOffset(1,s,0);}static createDaysVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startDaysVector(t,s){t.startVector(4,s,4);}static endDailyForecastData(t){return t.endObject()}static createDailyForecastData(t,s,i){return R.startDailyForecastData(t),R.addMetadata(t,s),R.addDays(t,i),R.endDailyForecastData(t)}}let L=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsForecastPeriodSummary(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsForecastPeriodSummary(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}startTime(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}endTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}condition(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):P.CLEAR}precipitationChance(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationIntensity(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readFloat32(this.bb_pos+t):0}static startForecastPeriodSummary(t){t.startObject(5);}static addStartTime(t,s){t.addFieldInt32(0,s,0);}static addEndTime(t,s){t.addFieldInt32(1,s,0);}static addCondition(t,s){t.addFieldInt8(2,s,P.CLEAR);}static addPrecipitationChance(t,s){t.addFieldInt8(3,s,0);}static addPrecipitationIntensity(t,s){t.addFieldFloat32(4,s,0);}static endForecastPeriodSummary(t){return t.endObject()}static createForecastPeriodSummary(s,i,e,o,n,a){return t.startForecastPeriodSummary(s),t.addStartTime(s,i),t.addEndTime(s,e),t.addCondition(s,o),t.addPrecipitationChance(s,n),t.addPrecipitationIntensity(s,a),t.endForecastPeriodSummary(s)}};class w{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsForecastPeriodic(t,s){return (s||new w).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsForecastPeriodic(t,s){return t.setPosition(t.position()+4),(s||new w).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}static startForecastPeriodic(t){t.startObject(1);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static endForecastPeriodic(t){return t.endObject()}static createForecastPeriodic(t,s){return w.startForecastPeriodic(t),w.addMetadata(t,s),w.endForecastPeriodic(t)}}class v{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsHistoricalComparison(t,s){return (s||new v).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsHistoricalComparison(t,s){return t.setPosition(t.position()+4),(s||new v).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}comparisons(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new m).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}comparisonsLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startHistoricalComparison(t){t.startObject(2);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addComparisons(t,s){t.addFieldOffset(1,s,0);}static createComparisonsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startComparisonsVector(t,s){t.startVector(4,s,4);}static endHistoricalComparison(t){return t.endObject()}static createHistoricalComparison(t,s,i){return v.startHistoricalComparison(t),v.addMetadata(t,s),v.addComparisons(t,i),v.endHistoricalComparison(t)}}class M{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsHourWeatherConditions(t,s){return (s||new M).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsHourWeatherConditions(t,s){return t.setPosition(t.position()+4),(s||new M).__init(t.readInt32(t.position())+t.position(),t)}forecastStart(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}cloudCover(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverLowAltPct(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverMidAltPct(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}cloudCoverHighAltPct(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):0}conditionCode(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):y.CLEAR}daylight(){const t=this.bb.__offset(this.bb_pos,16);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}humidity(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readInt8(this.bb_pos+t):0}perceivedPrecipitationIntensity(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationAmount(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationIntensity(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readFloat32(this.bb_pos+t):0}precipitationChance(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationType(){const t=this.bb.__offset(this.bb_pos,28);return t?this.bb.readInt8(this.bb_pos+t):P.CLEAR}pressure(){const t=this.bb.__offset(this.bb_pos,30);return t?this.bb.readFloat32(this.bb_pos+t):0}pressureTrend(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readInt8(this.bb_pos+t):T.RISING}snowfallAmount(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readFloat32(this.bb_pos+t):0}snowfallIntensity(){const t=this.bb.__offset(this.bb_pos,36);return t?this.bb.readFloat32(this.bb_pos+t):0}temperature(){const t=this.bb.__offset(this.bb_pos,38);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureApparent(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.readFloat32(this.bb_pos+t):0}unknown20(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.readFloat32(this.bb_pos+t):0}temperatureDewPoint(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.readFloat32(this.bb_pos+t):0}uvIndex(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.readInt8(this.bb_pos+t):0}visibility(){const t=this.bb.__offset(this.bb_pos,48);return t?this.bb.readFloat32(this.bb_pos+t):0}windDirection(){const t=this.bb.__offset(this.bb_pos,50);return t?this.bb.readInt16(this.bb_pos+t):0}windGust(){const t=this.bb.__offset(this.bb_pos,52);return t?this.bb.readFloat32(this.bb_pos+t):0}windSpeed(){const t=this.bb.__offset(this.bb_pos,54);return t?this.bb.readFloat32(this.bb_pos+t):0}static startHourWeatherConditions(t){t.startObject(26);}static addForecastStart(t,s){t.addFieldInt32(0,s,0);}static addCloudCover(t,s){t.addFieldInt8(1,s,0);}static addCloudCoverLowAltPct(t,s){t.addFieldInt8(2,s,0);}static addCloudCoverMidAltPct(t,s){t.addFieldInt8(3,s,0);}static addCloudCoverHighAltPct(t,s){t.addFieldInt8(4,s,0);}static addConditionCode(t,s){t.addFieldInt8(5,s,y.CLEAR);}static addDaylight(t,s){t.addFieldInt8(6,+s,0);}static addHumidity(t,s){t.addFieldInt8(7,s,0);}static addPerceivedPrecipitationIntensity(t,s){t.addFieldFloat32(8,s,0);}static addPrecipitationAmount(t,s){t.addFieldFloat32(9,s,0);}static addPrecipitationIntensity(t,s){t.addFieldFloat32(10,s,0);}static addPrecipitationChance(t,s){t.addFieldInt8(11,s,0);}static addPrecipitationType(t,s){t.addFieldInt8(12,s,P.CLEAR);}static addPressure(t,s){t.addFieldFloat32(13,s,0);}static addPressureTrend(t,s){t.addFieldInt8(14,s,T.RISING);}static addSnowfallAmount(t,s){t.addFieldFloat32(15,s,0);}static addSnowfallIntensity(t,s){t.addFieldFloat32(16,s,0);}static addTemperature(t,s){t.addFieldFloat32(17,s,0);}static addTemperatureApparent(t,s){t.addFieldFloat32(18,s,0);}static addUnknown20(t,s){t.addFieldFloat32(19,s,0);}static addTemperatureDewPoint(t,s){t.addFieldFloat32(20,s,0);}static addUvIndex(t,s){t.addFieldInt8(21,s,0);}static addVisibility(t,s){t.addFieldFloat32(22,s,0);}static addWindDirection(t,s){t.addFieldInt16(23,s,0);}static addWindGust(t,s){t.addFieldFloat32(24,s,0);}static addWindSpeed(t,s){t.addFieldFloat32(25,s,0);}static endHourWeatherConditions(t){return t.endObject()}static createHourWeatherConditions(t,s,i,e,o,n,a,b,r,d,_,h,c,p,l,u,f,N,O,I,F,A,m,U,W,P,T){return M.startHourWeatherConditions(t),M.addForecastStart(t,s),M.addCloudCover(t,i),M.addCloudCoverLowAltPct(t,e),M.addCloudCoverMidAltPct(t,o),M.addCloudCoverHighAltPct(t,n),M.addConditionCode(t,a),M.addDaylight(t,b),M.addHumidity(t,r),M.addPerceivedPrecipitationIntensity(t,d),M.addPrecipitationAmount(t,_),M.addPrecipitationIntensity(t,h),M.addPrecipitationChance(t,c),M.addPrecipitationType(t,p),M.addPressure(t,l),M.addPressureTrend(t,u),M.addSnowfallAmount(t,f),M.addSnowfallIntensity(t,N),M.addTemperature(t,O),M.addTemperatureApparent(t,I),M.addUnknown20(t,F),M.addTemperatureDewPoint(t,A),M.addUvIndex(t,m),M.addVisibility(t,U),M.addWindDirection(t,W),M.addWindGust(t,P),M.addWindSpeed(t,T),M.endHourWeatherConditions(t)}}class D{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsHourlyForecastData(t,s){return (s||new D).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsHourlyForecastData(t,s){return t.setPosition(t.position()+4),(s||new D).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}hours(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new M).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}hoursLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startHourlyForecastData(t){t.startObject(2);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addHours(t,s){t.addFieldOffset(1,s,0);}static createHoursVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startHoursVector(t,s){t.startVector(4,s,4);}static endHourlyForecastData(t){return t.endObject()}static createHourlyForecastData(t,s,i){return D.startHourlyForecastData(t),D.addMetadata(t,s),D.addHours(t,i),D.endHourlyForecastData(t)}}var V,x;!function(t){t[t.NORMAL=0]="NORMAL",t[t.LOW=1]="LOW",t[t.HIGH=2]="HIGH",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5";}(V||(V={}));class H{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsLocationInfo(t,s){return (s||new H).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsLocationInfo(t,s){return t.setPosition(t.position()+4),(s||new H).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}preciseName(t){const s=this.bb.__offset(this.bb_pos,6);return s?this.bb.__string(this.bb_pos+s,t):null}countryCode(t){const s=this.bb.__offset(this.bb_pos,8);return s?this.bb.__string(this.bb_pos+s,t):null}timeZone(t){const s=this.bb.__offset(this.bb_pos,10);return s?this.bb.__string(this.bb_pos+s,t):null}primaryName(t){const s=this.bb.__offset(this.bb_pos,12);return s?this.bb.__string(this.bb_pos+s,t):null}static startLocationInfo(t){t.startObject(5);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addPreciseName(t,s){t.addFieldOffset(1,s,0);}static addCountryCode(t,s){t.addFieldOffset(2,s,0);}static addTimeZone(t,s){t.addFieldOffset(3,s,0);}static addPrimaryName(t,s){t.addFieldOffset(4,s,0);}static endLocationInfo(t){return t.endObject()}static createLocationInfo(t,s,i,e,o,n){return H.startLocationInfo(t),H.addMetadata(t,s),H.addPreciseName(t,i),H.addCountryCode(t,e),H.addTimeZone(t,o),H.addPrimaryName(t,n),H.endLocationInfo(t)}}!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.AIR_QUALITY_DETAILS=1]="AIR_QUALITY_DETAILS",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.UNKNOWN7=7]="UNKNOWN7",t[t.UNKNOWN8=8]="UNKNOWN8",t[t.TEMPERATURE_FEELS_LIKE_DETAILS=9]="TEMPERATURE_FEELS_LIKE_DETAILS",t[t.UNKNOWN10=10]="UNKNOWN10",t[t.TRENDS=11]="TRENDS",t[t.UV_DETAILS=12]="UV_DETAILS",t[t.UNKNOWN13=13]="UNKNOWN13",t[t.WIND_DETAILS=14]="WIND_DETAILS",t[t.UNKNOWN15=15]="UNKNOWN15",t[t.UNKNOWN16=16]="UNKNOWN16",t[t.UNKNOWN17=17]="UNKNOWN17",t[t.UNKNOWN18=18]="UNKNOWN18";}(x||(x={}));class B{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsPlacement(t,s){return (s||new B).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsPlacement(t,s){return t.setPosition(t.position()+4),(s||new B).__init(t.readInt32(t.position())+t.position(),t)}priority(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):0}articles(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new c).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}articlesLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}placement(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):x.UNKNOWN0}static startPlacement(t){t.startObject(3);}static addPriority(t,s){t.addFieldInt8(0,s,0);}static addArticles(t,s){t.addFieldOffset(1,s,0);}static createArticlesVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startArticlesVector(t,s){t.startVector(4,s,4);}static addPlacement(t,s){t.addFieldInt8(2,s,x.UNKNOWN0);}static endPlacement(t){return t.endObject()}static createPlacement(t,s,i,e){return B.startPlacement(t),B.addPriority(t,s),B.addArticles(t,i),B.addPlacement(t,e),B.endPlacement(t)}}class j{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsNews(t,s){return (s||new j).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsNews(t,s){return t.setPosition(t.position()+4),(s||new j).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}placements(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new B).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}placementsLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}static startNews(t){t.startObject(2);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addPlacements(t,s){t.addFieldOffset(1,s,0);}static createPlacementsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPlacementsVector(t,s){t.startVector(4,s,4);}static endNews(t){return t.endObject()}static createNews(t,s,i){return j.startNews(t),j.addMetadata(t,s),j.addPlacements(t,i),j.endNews(t)}}let G=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsNextHourForecastData(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsNextHourForecastData(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}condition(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new W).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}conditionLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}summary(t,s){const i=this.bb.__offset(this.bb_pos,8);return i?(s||new L).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}summaryLength(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}forecastStart(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readUint32(this.bb_pos+t):0}minutes(t,s){const e=this.bb.__offset(this.bb_pos,14);return e?(s||new i).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+e)+4*t),this.bb):null}minutesLength(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}static startNextHourForecastData(t){t.startObject(6);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addCondition(t,s){t.addFieldOffset(1,s,0);}static createConditionVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startConditionVector(t,s){t.startVector(4,s,4);}static addSummary(t,s){t.addFieldOffset(2,s,0);}static createSummaryVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startSummaryVector(t,s){t.startVector(4,s,4);}static addForecastStart(t,s){t.addFieldInt32(3,s,0);}static addForecastEnd(t,s){t.addFieldInt32(4,s,0);}static addMinutes(t,s){t.addFieldOffset(5,s,0);}static createMinutesVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startMinutesVector(t,s){t.startVector(4,s,4);}static endNextHourForecastData(t){return t.endObject()}static createNextHourForecastData(s,i,e,o,n,a,b){return t.startNextHourForecastData(s),t.addMetadata(s,i),t.addCondition(s,e),t.addSummary(s,o),t.addForecastStart(s,n),t.addForecastEnd(s,a),t.addMinutes(s,b),t.endNextHourForecastData(s)}};var Y,z,Z,k;!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.SHELTER=1]="SHELTER",t[t.EVACUATE=2]="EVACUATE",t[t.PREPARE=3]="PREPARE",t[t.EXECUTE=4]="EXECUTE",t[t.AVOID=5]="AVOID",t[t.MONITOR=6]="MONITOR",t[t.ACCESS=7]="ACCESS",t[t.ALLCLEAR=8]="ALLCLEAR",t[t.NONE=9]="NONE",t[t.UNKNOWN10=10]="UNKNOWN10";}(Y||(Y={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.EXTREME=1]="EXTREME",t[t.SEVERE=2]="SEVERE",t[t.MODERATE=3]="MODERATE",t[t.MINOR=4]="MINOR",t[t.UNKNOWN5=5]="UNKNOWN5";}(z||(z={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.UNKNOWN7=7]="UNKNOWN7",t[t.UNKNOWN8=8]="UNKNOWN8",t[t.UNKNOWN9=9]="UNKNOWN9",t[t.STATEMENT=10]="STATEMENT",t[t.WARNING=11]="WARNING",t[t.ADVISORY=12]="ADVISORY",t[t.UNKNOWN13=13]="UNKNOWN13";}(Z||(Z={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.IMMEDIATE=1]="IMMEDIATE",t[t.EXPECTED=2]="EXPECTED",t[t.FUTURE=3]="FUTURE",t[t.PAST=4]="PAST",t[t.UNKNOWN5=5]="UNKNOWN5";}(k||(k={}));let Q=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeatherAlertSummary(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsWeatherAlertSummary(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}id(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new e).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}areaId(t){const s=this.bb.__offset(this.bb_pos,6);return s?this.bb.__string(this.bb_pos+s,t):null}areaName(t){const s=this.bb.__offset(this.bb_pos,8);return s?this.bb.__string(this.bb_pos+s,t):null}attributionUrl(t){const s=this.bb.__offset(this.bb_pos,10);return s?this.bb.__string(this.bb_pos+s,t):null}countryCode(t){const s=this.bb.__offset(this.bb_pos,12);return s?this.bb.__string(this.bb_pos+s,t):null}description(t){const s=this.bb.__offset(this.bb_pos,14);return s?this.bb.__string(this.bb_pos+s,t):null}token(t){const s=this.bb.__offset(this.bb_pos,16);return s?this.bb.__string(this.bb_pos+s,t):null}effectiveTime(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readUint32(this.bb_pos+t):0}expireTime(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readUint32(this.bb_pos+t):0}issuedTime(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readUint32(this.bb_pos+t):0}eventOnsetTime(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readUint32(this.bb_pos+t):0}eventEndTime(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.readUint32(this.bb_pos+t):0}detailsUrl(t){const s=this.bb.__offset(this.bb_pos,28);return s?this.bb.__string(this.bb_pos+s,t):null}phenomenon(t){const s=this.bb.__offset(this.bb_pos,30);return s?this.bb.__string(this.bb_pos+s,t):null}severity(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readInt8(this.bb_pos+t):z.UNKNOWN}significance(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readInt8(this.bb_pos+t):Z.UNKNOWN}source(t){const s=this.bb.__offset(this.bb_pos,36);return s?this.bb.__string(this.bb_pos+s,t):null}eventSource(t){const s=this.bb.__offset(this.bb_pos,38);return s?this.bb.__string(this.bb_pos+s,t):null}urgency(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.readInt8(this.bb_pos+t):k.UNKNOWN}certainty(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.readInt8(this.bb_pos+t):l.UNKNOWN}importance(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.readInt8(this.bb_pos+t):V.NORMAL}responses(t){const s=this.bb.__offset(this.bb_pos,46);return s?this.bb.readInt8(this.bb.__vector(this.bb_pos+s)+t):0}responsesLength(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.__vector_len(this.bb_pos+t):0}responsesArray(){const t=this.bb.__offset(this.bb_pos,46);return t?new Int8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}unknown23(){const t=this.bb.__offset(this.bb_pos,48);return t?this.bb.readInt8(this.bb_pos+t):0}unknown24(){const t=this.bb.__offset(this.bb_pos,50);return t?this.bb.readInt8(this.bb_pos+t):0}unknown25(){const t=this.bb.__offset(this.bb_pos,52);return t?this.bb.readInt8(this.bb_pos+t):0}unknown26(){const t=this.bb.__offset(this.bb_pos,54);return t?this.bb.readInt8(this.bb_pos+t):0}static startWeatherAlertSummary(t){t.startObject(26);}static addId(t,s){t.addFieldOffset(0,s,0);}static addAreaId(t,s){t.addFieldOffset(1,s,0);}static addAreaName(t,s){t.addFieldOffset(2,s,0);}static addAttributionUrl(t,s){t.addFieldOffset(3,s,0);}static addCountryCode(t,s){t.addFieldOffset(4,s,0);}static addDescription(t,s){t.addFieldOffset(5,s,0);}static addToken(t,s){t.addFieldOffset(6,s,0);}static addEffectiveTime(t,s){t.addFieldInt32(7,s,0);}static addExpireTime(t,s){t.addFieldInt32(8,s,0);}static addIssuedTime(t,s){t.addFieldInt32(9,s,0);}static addEventOnsetTime(t,s){t.addFieldInt32(10,s,0);}static addEventEndTime(t,s){t.addFieldInt32(11,s,0);}static addDetailsUrl(t,s){t.addFieldOffset(12,s,0);}static addPhenomenon(t,s){t.addFieldOffset(13,s,0);}static addSeverity(t,s){t.addFieldInt8(14,s,z.UNKNOWN);}static addSignificance(t,s){t.addFieldInt8(15,s,Z.UNKNOWN);}static addSource(t,s){t.addFieldOffset(16,s,0);}static addEventSource(t,s){t.addFieldOffset(17,s,0);}static addUrgency(t,s){t.addFieldInt8(18,s,k.UNKNOWN);}static addCertainty(t,s){t.addFieldInt8(19,s,l.UNKNOWN);}static addImportance(t,s){t.addFieldInt8(20,s,V.NORMAL);}static addResponses(t,s){t.addFieldOffset(21,s,0);}static createResponsesVector(t,s){t.startVector(1,s.length,1);for(let i=s.length-1;i>=0;i--)t.addInt8(s[i]);return t.endVector()}static startResponsesVector(t,s){t.startVector(1,s,1);}static addUnknown23(t,s){t.addFieldInt8(22,s,0);}static addUnknown24(t,s){t.addFieldInt8(23,s,0);}static addUnknown25(t,s){t.addFieldInt8(24,s,0);}static addUnknown26(t,s){t.addFieldInt8(25,s,0);}static endWeatherAlertSummary(t){return t.endObject()}static createWeatherAlertSummary(s,i,e,o,n,a,b,r,d,_,h,c,p,l,u,f,N,O,I,F,A,m,U,W,P,T,y){return t.startWeatherAlertSummary(s),t.addId(s,i),t.addAreaId(s,e),t.addAreaName(s,o),t.addAttributionUrl(s,n),t.addCountryCode(s,a),t.addDescription(s,b),t.addToken(s,r),t.addEffectiveTime(s,d),t.addExpireTime(s,_),t.addIssuedTime(s,h),t.addEventOnsetTime(s,c),t.addEventEndTime(s,p),t.addDetailsUrl(s,l),t.addPhenomenon(s,u),t.addSeverity(s,f),t.addSignificance(s,N),t.addSource(s,O),t.addEventSource(s,I),t.addUrgency(s,F),t.addCertainty(s,A),t.addImportance(s,m),t.addResponses(s,U),t.addUnknown23(s,W),t.addUnknown24(s,P),t.addUnknown25(s,T),t.addUnknown26(s,y),t.endWeatherAlertSummary(s)}},X=class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeatherAlertCollectionData(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsWeatherAlertCollectionData(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}detailsUrl(t){const s=this.bb.__offset(this.bb_pos,6);return s?this.bb.__string(this.bb_pos+s,t):null}alerts(t,s){const i=this.bb.__offset(this.bb_pos,8);return i?(s||new Q).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}alertsLength(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}static startWeatherAlertCollectionData(t){t.startObject(3);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addDetailsUrl(t,s){t.addFieldOffset(1,s,0);}static addAlerts(t,s){t.addFieldOffset(2,s,0);}static createAlertsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startAlertsVector(t,s){t.startVector(4,s,4);}static endWeatherAlertCollectionData(t){return t.endObject()}static createWeatherAlertCollectionData(s,i,e,o){return t.startWeatherAlertCollectionData(s),t.addMetadata(s,i),t.addDetailsUrl(s,e),t.addAlerts(s,o),t.endWeatherAlertCollectionData(s)}};class q{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeatherChanges(t,s){return (s||new q).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsWeatherChanges(t,s){return t.setPosition(t.position()+4),(s||new q).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new b).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}forecastStart(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readUint32(this.bb_pos+t):0}changes(t,s){const i=this.bb.__offset(this.bb_pos,10);return i?(s||new A).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}changesLength(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.__vector_len(this.bb_pos+t):0}static startWeatherChanges(t){t.startObject(4);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addForecastStart(t,s){t.addFieldInt32(1,s,0);}static addForecastEnd(t,s){t.addFieldInt32(2,s,0);}static addChanges(t,s){t.addFieldOffset(3,s,0);}static createChangesVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startChangesVector(t,s){t.startVector(4,s,4);}static endWeatherChanges(t){return t.endObject()}static createWeatherChanges(t,s,i,e,o){return q.startWeatherChanges(t),q.addMetadata(t,s),q.addForecastStart(t,i),q.addForecastEnd(t,e),q.addChanges(t,o),q.endWeatherChanges(t)}}var J,$,tt,st,it,et,ot,nt,at,bt,rt,dt,_t,ht=Object.freeze({__proto__:null,AirQuality:h,Articles:c,get BaselineType(){return p},get Certainty(){return l},Change:A,Common:a,Comparison:m,get ComparisonTrend(){return o},get ComparisonType(){return f},Condition:W,get ConditionType(){return O},CurrentWeatherData:E,DailyForecastData:R,DayPartForecast:g,DayWeatherConditions:K,get Deviation(){return N},get Direction(){return u},ForecastPeriodSummary:L,ForecastPeriodic:w,get ForecastToken(){return I},HistoricalComparison:v,HourWeatherConditions:M,HourlyForecastData:D,get ImportanceType(){return V},LocationInfo:H,Metadata:b,get MoonPhase(){return S},News:j,NextHourForecastData:G,Parameter:U,get ParameterType(){return F},Placement:B,get PlacementType(){return x},Pollutant:_,get PollutantType(){return r},PrecipitationAmountByType:C,get PrecipitationType(){return P},get PressureTrend(){return T},get ResponseType(){return Y},get Severity(){return z},get SignificanceType(){return Z},get SourceType(){return n},get UnitType(){return d},get Urgency(){return k},Weather:class t{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeather(s,i){return (i||new t).__init(s.readInt32(s.position())+s.position(),s)}static getSizePrefixedRootAsWeather(s,i){return s.setPosition(s.position()+4),(i||new t).__init(s.readInt32(s.position())+s.position(),s)}airQuality(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new h).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}currentWeather(t){const s=this.bb.__offset(this.bb_pos,6);return s?(t||new E).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}forecastDaily(t){const s=this.bb.__offset(this.bb_pos,8);return s?(t||new R).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}forecastHourly(t){const s=this.bb.__offset(this.bb_pos,10);return s?(t||new D).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}forecastNextHour(t){const s=this.bb.__offset(this.bb_pos,12);return s?(t||new G).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}news(t){const s=this.bb.__offset(this.bb_pos,14);return s?(t||new j).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}weatherAlerts(t){const s=this.bb.__offset(this.bb_pos,16);return s?(t||new X).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}weatherChanges(t){const s=this.bb.__offset(this.bb_pos,18);return s?(t||new q).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}historicalComparisons(t){const s=this.bb.__offset(this.bb_pos,20);return s?(t||new v).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}locationInfo(t){const s=this.bb.__offset(this.bb_pos,22);return s?(t||new H).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}static startWeather(t){t.startObject(10);}static addAirQuality(t,s){t.addFieldOffset(0,s,0);}static addCurrentWeather(t,s){t.addFieldOffset(1,s,0);}static addForecastDaily(t,s){t.addFieldOffset(2,s,0);}static addForecastHourly(t,s){t.addFieldOffset(3,s,0);}static addForecastNextHour(t,s){t.addFieldOffset(4,s,0);}static addNews(t,s){t.addFieldOffset(5,s,0);}static addWeatherAlerts(t,s){t.addFieldOffset(6,s,0);}static addWeatherChanges(t,s){t.addFieldOffset(7,s,0);}static addHistoricalComparisons(t,s){t.addFieldOffset(8,s,0);}static addLocationInfo(t,s){t.addFieldOffset(9,s,0);}static endWeather(t){return t.endObject()}static finishWeatherBuffer(t,s){t.finish(s);}static finishSizePrefixedWeatherBuffer(t,s){t.finish(s,void 0,true);}},WeatherAlertCollectionData:X,WeatherAlertSummary:Q,WeatherChanges:q,get WeatherCondition(){return y}});!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.WORSE=2]="WORSE",t[t.SAME=3]="SAME",t[t.BETTER=4]="BETTER";}(J||(J={})),function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.MODELED=2]="MODELED",t[t.STATION=3]="STATION";}($||($={}));class ct{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsMetadata(t,s){return (s||new ct).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsMetadata(t,s){return t.setPosition(t.position()+4),(s||new ct).__init(t.readInt32(t.position())+t.position(),t)}attributionUrl(t){const s=this.bb.__offset(this.bb_pos,4);return s?this.bb.__string(this.bb_pos+s,t):null}expireTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}language(t){const s=this.bb.__offset(this.bb_pos,8);return s?this.bb.__string(this.bb_pos+s,t):null}latitude(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readFloat32(this.bb_pos+t):0}longitude(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readFloat32(this.bb_pos+t):0}providerLogo(t){const s=this.bb.__offset(this.bb_pos,14);return s?this.bb.__string(this.bb_pos+s,t):null}providerName(t){const s=this.bb.__offset(this.bb_pos,16);return s?this.bb.__string(this.bb_pos+s,t):null}readTime(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readUint32(this.bb_pos+t):0}reportedTime(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readUint32(this.bb_pos+t):0}temporarilyUnavailable(){const t=this.bb.__offset(this.bb_pos,22);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}sourceType(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readInt8(this.bb_pos+t):$.UNKNOWN0}static startMetadata(t){t.startObject(11);}static addAttributionUrl(t,s){t.addFieldOffset(0,s,0);}static addExpireTime(t,s){t.addFieldInt32(1,s,0);}static addLanguage(t,s){t.addFieldOffset(2,s,0);}static addLatitude(t,s){t.addFieldFloat32(3,s,0);}static addLongitude(t,s){t.addFieldFloat32(4,s,0);}static addProviderLogo(t,s){t.addFieldOffset(5,s,0);}static addProviderName(t,s){t.addFieldOffset(6,s,0);}static addReadTime(t,s){t.addFieldInt32(7,s,0);}static addReportedTime(t,s){t.addFieldInt32(8,s,0);}static addTemporarilyUnavailable(t,s){t.addFieldInt8(9,+s,0);}static addSourceType(t,s){t.addFieldInt8(10,s,$.UNKNOWN0);}static endMetadata(t){return t.endObject()}static createMetadata(t,s,i,e,o,n,a,b,r,d,_,h){return ct.startMetadata(t),ct.addAttributionUrl(t,s),ct.addExpireTime(t,i),ct.addLanguage(t,e),ct.addLatitude(t,o),ct.addLongitude(t,n),ct.addProviderLogo(t,a),ct.addProviderName(t,b),ct.addReadTime(t,r),ct.addReportedTime(t,d),ct.addTemporarilyUnavailable(t,_),ct.addSourceType(t,h),ct.endMetadata(t)}}!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.NOT_AVAILABLE=1]="NOT_AVAILABLE",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.NO=5]="NO",t[t.NO2=6]="NO2",t[t.NOX=7]="NOX",t[t.OZONE=8]="OZONE",t[t.PM2_5=9]="PM2_5",t[t.SO2=10]="SO2",t[t.PM10=11]="PM10",t[t.CO=12]="CO";}(tt||(tt={})),function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.PARTS_PER_BILLION=1]="PARTS_PER_BILLION",t[t.MICROGRAMS_PER_CUBIC_METER=2]="MICROGRAMS_PER_CUBIC_METER";}(st||(st={}));class pt{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsPollutant(t,s){return (s||new pt).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsPollutant(t,s){return t.setPosition(t.position()+4),(s||new pt).__init(t.readInt32(t.position())+t.position(),t)}pollutantType(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):tt.UNKNOWN0}amount(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readFloat32(this.bb_pos+t):0}units(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):st.UNKNOWN0}static startPollutant(t){t.startObject(3);}static addPollutantType(t,s){t.addFieldInt8(0,s,tt.UNKNOWN0);}static addAmount(t,s){t.addFieldFloat32(1,s,0);}static addUnits(t,s){t.addFieldInt8(2,s,st.UNKNOWN0);}static endPollutant(t){return t.endObject()}static createPollutant(t,s,i,e){return pt.startPollutant(t),pt.addPollutantType(t,s),pt.addAmount(t,i),pt.addUnits(t,e),pt.endPollutant(t)}}class lt{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsAirQuality(t,s){return (s||new lt).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsAirQuality(t,s){return t.setPosition(t.position()+4),(s||new lt).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new ct).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}categoryIndex(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readInt8(this.bb_pos+t):0}index(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt16(this.bb_pos+t):0}isSignificant(){const t=this.bb.__offset(this.bb_pos,10);return !!t&&!!this.bb.readInt8(this.bb_pos+t)}pollutants(t,s){const i=this.bb.__offset(this.bb_pos,12);return i?(s||new pt).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}pollutantsLength(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.__vector_len(this.bb_pos+t):0}previousDayComparison(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.readInt8(this.bb_pos+t):J.UNKNOWN}primaryPollutant(){const t=this.bb.__offset(this.bb_pos,16);return t?this.bb.readInt8(this.bb_pos+t):tt.UNKNOWN0}scale(t){const s=this.bb.__offset(this.bb_pos,18);return s?this.bb.__string(this.bb_pos+s,t):null}static startAirQuality(t){t.startObject(8);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addCategoryIndex(t,s){t.addFieldInt8(1,s,0);}static addIndex(t,s){t.addFieldInt16(2,s,0);}static addIsSignificant(t,s){t.addFieldInt8(3,+s,0);}static addPollutants(t,s){t.addFieldOffset(4,s,0);}static createPollutantsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startPollutantsVector(t,s){t.startVector(4,s,4);}static addPreviousDayComparison(t,s){t.addFieldInt8(5,s,J.UNKNOWN);}static addPrimaryPollutant(t,s){t.addFieldInt8(6,s,tt.UNKNOWN0);}static addScale(t,s){t.addFieldOffset(7,s,0);}static endAirQuality(t){return t.endObject()}static createAirQuality(t,s,i,e,o,n,a,b,r){return lt.startAirQuality(t),lt.addMetadata(t,s),lt.addCategoryIndex(t,i),lt.addIndex(t,e),lt.addIsSignificant(t,o),lt.addPollutants(t,n),lt.addPreviousDayComparison(t,a),lt.addPrimaryPollutant(t,b),lt.addScale(t,r),lt.endAirQuality(t)}}!function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.LIKELY=2]="LIKELY";}(it||(it={})),function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.CLEAR=1]="CLEAR",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.RAIN=7]="RAIN",t[t.DRIZZLE=8]="DRIZZLE";}(et||(et={})),function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.CLEAR=1]="CLEAR",t[t.START=2]="START",t[t.STOP=3]="STOP",t[t.START_STOP=4]="START_STOP",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.CONSTANT=6]="CONSTANT";}(ot||(ot={})),function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.FIRST_AT=1]="FIRST_AT",t[t.SECOND_AT=2]="SECOND_AT";}(nt||(nt={}));class ut{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsParameter(t,s){return (s||new ut).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsParameter(t,s){return t.setPosition(t.position()+4),(s||new ut).__init(t.readInt32(t.position())+t.position(),t)}type(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readInt8(this.bb_pos+t):nt.UNKNOWN0}date(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}static startParameter(t){t.startObject(2);}static addType(t,s){t.addFieldInt8(0,s,nt.UNKNOWN0);}static addDate(t,s){t.addFieldInt32(1,s,0);}static endParameter(t){return t.endObject()}static createParameter(t,s,i){return ut.startParameter(t),ut.addType(t,s),ut.addDate(t,i),ut.endParameter(t)}}class ft{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsCondition(t,s){return (s||new ft).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsCondition(t,s){return t.setPosition(t.position()+4),(s||new ft).__init(t.readInt32(t.position())+t.position(),t)}startTime(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}endTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}forecastToken(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.readInt8(this.bb_pos+t):ot.UNKNOWN0}beginCondition(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):et.UNKNOWN0}endCondition(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readInt8(this.bb_pos+t):et.UNKNOWN0}parameters(t,s){const i=this.bb.__offset(this.bb_pos,14);return i?(s||new ut).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}parametersLength(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}static startCondition(t){t.startObject(6);}static addStartTime(t,s){t.addFieldInt32(0,s,0);}static addEndTime(t,s){t.addFieldInt32(1,s,0);}static addForecastToken(t,s){t.addFieldInt8(2,s,ot.UNKNOWN0);}static addBeginCondition(t,s){t.addFieldInt8(3,s,et.UNKNOWN0);}static addEndCondition(t,s){t.addFieldInt8(4,s,et.UNKNOWN0);}static addParameters(t,s){t.addFieldOffset(5,s,0);}static createParametersVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startParametersVector(t,s){t.startVector(4,s,4);}static endCondition(t){return t.endObject()}static createCondition(t,s,i,e,o,n,a){return ft.startCondition(t),ft.addStartTime(t,s),ft.addEndTime(t,i),ft.addForecastToken(t,e),ft.addBeginCondition(t,o),ft.addEndCondition(t,n),ft.addParameters(t,a),ft.endCondition(t)}}class Nt{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsForecastPeriodSummary(t,s){return (s||new Nt).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsForecastPeriodSummary(t,s){return t.setPosition(t.position()+4),(s||new Nt).__init(t.readInt32(t.position())+t.position(),t)}startTime(){const t=this.bb.__offset(this.bb_pos,4);return t?this.bb.readUint32(this.bb_pos+t):0}endTime(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.readUint32(this.bb_pos+t):0}precipitationChance(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readInt8(this.bb_pos+t):0}precipitationIntensity(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readFloat32(this.bb_pos+t):0}static startForecastPeriodSummary(t){t.startObject(5);}static addStartTime(t,s){t.addFieldInt32(0,s,0);}static addEndTime(t,s){t.addFieldInt32(1,s,0);}static addPrecipitationChance(t,s){t.addFieldInt8(3,s,0);}static addPrecipitationIntensity(t,s){t.addFieldFloat32(4,s,0);}static endForecastPeriodSummary(t){return t.endObject()}static createForecastPeriodSummary(t,s,i,e,o){return Nt.startForecastPeriodSummary(t),Nt.addStartTime(t,s),Nt.addEndTime(t,i),Nt.addPrecipitationChance(t,e),Nt.addPrecipitationIntensity(t,o),Nt.endForecastPeriodSummary(t)}}!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.LOW=2]="LOW";}(at||(at={}));class Ot{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsNextHourForecastData(t,s){return (s||new Ot).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsNextHourForecastData(t,s){return t.setPosition(t.position()+4),(s||new Ot).__init(t.readInt32(t.position())+t.position(),t)}metadata(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new ct).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}condition(t,s){const i=this.bb.__offset(this.bb_pos,6);return i?(s||new ft).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}conditionLength(){const t=this.bb.__offset(this.bb_pos,6);return t?this.bb.__vector_len(this.bb_pos+t):0}summary(t,s){const i=this.bb.__offset(this.bb_pos,8);return i?(s||new Nt).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}summaryLength(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}forecastStart(){const t=this.bb.__offset(this.bb_pos,10);return t?this.bb.readUint32(this.bb_pos+t):0}forecastEnd(){const t=this.bb.__offset(this.bb_pos,12);return t?this.bb.readUint32(this.bb_pos+t):0}minutes(t,s){const e=this.bb.__offset(this.bb_pos,14);return e?(s||new i).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+e)+4*t),this.bb):null}minutesLength(){const t=this.bb.__offset(this.bb_pos,14);return t?this.bb.__vector_len(this.bb_pos+t):0}static startNextHourForecastData(t){t.startObject(6);}static addMetadata(t,s){t.addFieldOffset(0,s,0);}static addCondition(t,s){t.addFieldOffset(1,s,0);}static createConditionVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startConditionVector(t,s){t.startVector(4,s,4);}static addSummary(t,s){t.addFieldOffset(2,s,0);}static createSummaryVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startSummaryVector(t,s){t.startVector(4,s,4);}static addForecastStart(t,s){t.addFieldInt32(3,s,0);}static addForecastEnd(t,s){t.addFieldInt32(4,s,0);}static addMinutes(t,s){t.addFieldOffset(5,s,0);}static createMinutesVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startMinutesVector(t,s){t.startVector(4,s,4);}static endNextHourForecastData(t){return t.endObject()}static createNextHourForecastData(t,s,i,e,o,n,a){return Ot.startNextHourForecastData(t),Ot.addMetadata(t,s),Ot.addCondition(t,i),Ot.addSummary(t,e),Ot.addForecastStart(t,o),Ot.addForecastEnd(t,n),Ot.addMinutes(t,a),Ot.endNextHourForecastData(t)}}!function(t){t[t.UNKNOWN0=0]="UNKNOWN0",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.MONITOR=7]="MONITOR";}(bt||(bt={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.MODERATE=3]="MODERATE",t[t.MINOR=4]="MINOR";}(rt||(rt={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.UNKNOWN2=2]="UNKNOWN2",t[t.UNKNOWN3=3]="UNKNOWN3",t[t.UNKNOWN4=4]="UNKNOWN4",t[t.UNKNOWN5=5]="UNKNOWN5",t[t.UNKNOWN6=6]="UNKNOWN6",t[t.UNKNOWN7=7]="UNKNOWN7",t[t.UNKNOWN8=8]="UNKNOWN8",t[t.UNKNOWN9=9]="UNKNOWN9",t[t.STATEMENT=10]="STATEMENT";}(dt||(dt={})),function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.UNKNOWN1=1]="UNKNOWN1",t[t.EXPECTED=2]="EXPECTED";}(_t||(_t={}));class It{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeatherAlertSummary(t,s){return (s||new It).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsWeatherAlertSummary(t,s){return t.setPosition(t.position()+4),(s||new It).__init(t.readInt32(t.position())+t.position(),t)}id(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new e).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}areaId(t){const s=this.bb.__offset(this.bb_pos,6);return s?this.bb.__string(this.bb_pos+s,t):null}attributionUrl(t){const s=this.bb.__offset(this.bb_pos,10);return s?this.bb.__string(this.bb_pos+s,t):null}countryCode(t){const s=this.bb.__offset(this.bb_pos,12);return s?this.bb.__string(this.bb_pos+s,t):null}description(t){const s=this.bb.__offset(this.bb_pos,14);return s?this.bb.__string(this.bb_pos+s,t):null}token(t){const s=this.bb.__offset(this.bb_pos,16);return s?this.bb.__string(this.bb_pos+s,t):null}effectiveTime(){const t=this.bb.__offset(this.bb_pos,18);return t?this.bb.readUint32(this.bb_pos+t):0}expireTime(){const t=this.bb.__offset(this.bb_pos,20);return t?this.bb.readUint32(this.bb_pos+t):0}issuedTime(){const t=this.bb.__offset(this.bb_pos,22);return t?this.bb.readUint32(this.bb_pos+t):0}eventOnsetTime(){const t=this.bb.__offset(this.bb_pos,24);return t?this.bb.readUint32(this.bb_pos+t):0}eventEndTime(){const t=this.bb.__offset(this.bb_pos,26);return t?this.bb.readUint32(this.bb_pos+t):0}detailsUrl(t){const s=this.bb.__offset(this.bb_pos,28);return s?this.bb.__string(this.bb_pos+s,t):null}phenomenon(t){const s=this.bb.__offset(this.bb_pos,30);return s?this.bb.__string(this.bb_pos+s,t):null}severity(){const t=this.bb.__offset(this.bb_pos,32);return t?this.bb.readInt8(this.bb_pos+t):rt.UNKNOWN}significance(){const t=this.bb.__offset(this.bb_pos,34);return t?this.bb.readInt8(this.bb_pos+t):dt.UNKNOWN}source(t){const s=this.bb.__offset(this.bb_pos,36);return s?this.bb.__string(this.bb_pos+s,t):null}eventSource(t){const s=this.bb.__offset(this.bb_pos,38);return s?this.bb.__string(this.bb_pos+s,t):null}urgency(){const t=this.bb.__offset(this.bb_pos,40);return t?this.bb.readInt8(this.bb_pos+t):_t.UNKNOWN}certainty(){const t=this.bb.__offset(this.bb_pos,42);return t?this.bb.readInt8(this.bb_pos+t):it.UNKNOWN}importance(){const t=this.bb.__offset(this.bb_pos,44);return t?this.bb.readInt8(this.bb_pos+t):at.UNKNOWN0}responses(t){const s=this.bb.__offset(this.bb_pos,46);return s?this.bb.readInt8(this.bb.__vector(this.bb_pos+s)+t):0}responsesLength(){const t=this.bb.__offset(this.bb_pos,46);return t?this.bb.__vector_len(this.bb_pos+t):0}responsesArray(){const t=this.bb.__offset(this.bb_pos,46);return t?new Int8Array(this.bb.bytes().buffer,this.bb.bytes().byteOffset+this.bb.__vector(this.bb_pos+t),this.bb.__vector_len(this.bb_pos+t)):null}static startWeatherAlertSummary(t){t.startObject(22);}static addId(t,s){t.addFieldOffset(0,s,0);}static addAreaId(t,s){t.addFieldOffset(1,s,0);}static addAttributionUrl(t,s){t.addFieldOffset(3,s,0);}static addCountryCode(t,s){t.addFieldOffset(4,s,0);}static addDescription(t,s){t.addFieldOffset(5,s,0);}static addToken(t,s){t.addFieldOffset(6,s,0);}static addEffectiveTime(t,s){t.addFieldInt32(7,s,0);}static addExpireTime(t,s){t.addFieldInt32(8,s,0);}static addIssuedTime(t,s){t.addFieldInt32(9,s,0);}static addEventOnsetTime(t,s){t.addFieldInt32(10,s,0);}static addEventEndTime(t,s){t.addFieldInt32(11,s,0);}static addDetailsUrl(t,s){t.addFieldOffset(12,s,0);}static addPhenomenon(t,s){t.addFieldOffset(13,s,0);}static addSeverity(t,s){t.addFieldInt8(14,s,rt.UNKNOWN);}static addSignificance(t,s){t.addFieldInt8(15,s,dt.UNKNOWN);}static addSource(t,s){t.addFieldOffset(16,s,0);}static addEventSource(t,s){t.addFieldOffset(17,s,0);}static addUrgency(t,s){t.addFieldInt8(18,s,_t.UNKNOWN);}static addCertainty(t,s){t.addFieldInt8(19,s,it.UNKNOWN);}static addImportance(t,s){t.addFieldInt8(20,s,at.UNKNOWN0);}static addResponses(t,s){t.addFieldOffset(21,s,0);}static createResponsesVector(t,s){t.startVector(1,s.length,1);for(let i=s.length-1;i>=0;i--)t.addInt8(s[i]);return t.endVector()}static startResponsesVector(t,s){t.startVector(1,s,1);}static endWeatherAlertSummary(t){return t.endObject()}static createWeatherAlertSummary(t,s,i,e,o,n,a,b,r,d,_,h,c,p,l,u,f,N,O,I,F,A){return It.startWeatherAlertSummary(t),It.addId(t,s),It.addAreaId(t,i),It.addAttributionUrl(t,e),It.addCountryCode(t,o),It.addDescription(t,n),It.addToken(t,a),It.addEffectiveTime(t,b),It.addExpireTime(t,r),It.addIssuedTime(t,d),It.addEventOnsetTime(t,_),It.addEventEndTime(t,h),It.addDetailsUrl(t,c),It.addPhenomenon(t,p),It.addSeverity(t,l),It.addSignificance(t,u),It.addSource(t,f),It.addEventSource(t,N),It.addUrgency(t,O),It.addCertainty(t,I),It.addImportance(t,F),It.addResponses(t,A),It.endWeatherAlertSummary(t)}}class Ft{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeatherAlertCollectionData(t,s){return (s||new Ft).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsWeatherAlertCollectionData(t,s){return t.setPosition(t.position()+4),(s||new Ft).__init(t.readInt32(t.position())+t.position(),t)}detailsUrl(t){const s=this.bb.__offset(this.bb_pos,6);return s?this.bb.__string(this.bb_pos+s,t):null}alerts(t,s){const i=this.bb.__offset(this.bb_pos,8);return i?(s||new It).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos+i)+4*t),this.bb):null}alertsLength(){const t=this.bb.__offset(this.bb_pos,8);return t?this.bb.__vector_len(this.bb_pos+t):0}static startWeatherAlertCollectionData(t){t.startObject(3);}static addDetailsUrl(t,s){t.addFieldOffset(1,s,0);}static addAlerts(t,s){t.addFieldOffset(2,s,0);}static createAlertsVector(t,s){t.startVector(4,s.length,4);for(let i=s.length-1;i>=0;i--)t.addOffset(s[i]);return t.endVector()}static startAlertsVector(t,s){t.startVector(4,s,4);}static endWeatherAlertCollectionData(t){return t.endObject()}static createWeatherAlertCollectionData(t,s,i){return Ft.startWeatherAlertCollectionData(t),Ft.addDetailsUrl(t,s),Ft.addAlerts(t,i),Ft.endWeatherAlertCollectionData(t)}}class At{bb=null;bb_pos=0;__init(t,s){return this.bb_pos=t,this.bb=s,this}static getRootAsWeather(t,s){return (s||new At).__init(t.readInt32(t.position())+t.position(),t)}static getSizePrefixedRootAsWeather(t,s){return t.setPosition(t.position()+4),(s||new At).__init(t.readInt32(t.position())+t.position(),t)}airQuality(t){const s=this.bb.__offset(this.bb_pos,4);return s?(t||new lt).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}forecastNextHour(t){const s=this.bb.__offset(this.bb_pos,14);return s?(t||new Ot).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}weatherAlerts(t){const s=this.bb.__offset(this.bb_pos,22);return s?(t||new Ft).__init(this.bb.__indirect(this.bb_pos+s),this.bb):null}static startWeather(t){t.startObject(15);}static addAirQuality(t,s){t.addFieldOffset(0,s,0);}static addForecastNextHour(t,s){t.addFieldOffset(5,s,0);}static addWeatherAlerts(t,s){t.addFieldOffset(9,s,0);}static endWeather(t){return t.endObject()}static finishWeatherBuffer(t,s){t.finish(s);}static finishSizePrefixedWeatherBuffer(t,s){t.finish(s,void 0,true);}}var mt=Object.freeze({__proto__:null,AirQuality:lt,get Certainty(){return it},Common:a,get ComparisonTrend(){return J},Condition:ft,get ConditionType(){return et},ForecastPeriodSummary:Nt,get ForecastToken(){return ot},get ImportanceType(){return at},Metadata:ct,NextHourForecastData:Ot,Parameter:ut,get ParameterType(){return nt},Pollutant:pt,get PollutantType(){return tt},get ResponseType(){return bt},get Severity(){return rt},get SignificanceType(){return dt},get SourceType(){return $},get UnitType(){return st},get Urgency(){return _t},Weather:At,WeatherAlertCollectionData:Ft,WeatherAlertSummary:It});

class ForecastNextHour {
    Name = "ForecastNextHour";
    Version = "v1.6.5";
    Author = "iRingo";

    // iOS 27 hides NextHour data once its metadata is more than 15 minutes old.
    static ExpirationInterval = 10 * 60;

    static #Configs = {
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
        },
        WeatherCondition: {
            晴朗: "CLEAR",
            雨夹雪: "SLEET",
            小雨: "DRIZZLE",
            下雨: "RAIN",
            中雨: "RAIN",
            大雨: "HEAVY_RAIN",
            小雪: "FLURRIES",
            下雪: "SNOW",
            中雪: "SNOW",
            大雪: "HEAVY_SNOW",
            冰雹: "HAIL",
        },
        PrecipitationType: {
            晴朗: "CLEAR",
            雨夹雪: "SLEET",
            rain: "RAIN",
            雨: "RAIN",
            snow: "SNOW",
            雪: "SNOW",
            冰雹: "HAIL",
        },
        Precipitation: {
            Level: {
                INVALID: -1,
                NO: 0,
                LIGHT: 1,
                MODERATE: 2,
                HEAVY: 3,
                EXTREME: 4,
            },
            Range: {
                /**
                 * [降水强度 | 彩云天气 API]{@link https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/precip.html}
                 */
                radar: {
                    NO: [0, 0.031],
                    LIGHT: [0.031, 0.25],
                    MODERATE: [0.25, 0.35],
                    HEAVY: [0.35, 0.48],
                    EXTREME: [0.48, Number.MAX_VALUE],
                },
                mmph: {
                    NO: [0, 0.08],
                    LIGHT: [0.08, 3.44],
                    MODERATE: [3.44, 11.33],
                    HEAVY: [11.33, 51.3],
                    EXTREME: [51.3, Number.MAX_VALUE],
                },
                precipitation: {
                    NO: [0, 0.01],
                    LIGHT: [0.01, 0.6],
                    MODERATE: [0.6, 1.65],
                    HEAVY: [1.65, 8.0],
                    EXTREME: [8.0, 205.0],
                },
            },
        },
    };

    static WeatherCondition(sentence) {
        Console.info("☑️ WeatherCondition", `sentence: ${sentence}`);
        // 完整短语排在通用词前，首次命中即可，避免“雨夹雪”又被“雪”覆盖。
        const weatherCondition = Object.entries(ForecastNextHour.#Configs.WeatherCondition).find(([key]) => sentence.includes(key))?.[1] ?? "CLEAR";
        Console.info(`✅ WeatherCondition: ${weatherCondition}`);
        return weatherCondition;
    }

    // 根据描述文本猜测降水类型
    static PrecipitationType(sentence) {
        Console.info("☑️ PrecipitationType", `sentence: ${sentence}`);
        const precipitationType = Object.entries(ForecastNextHour.#Configs.PrecipitationType).find(([key]) => sentence.includes(key))?.[1] ?? "CLEAR";
        Console.info(`✅ PrecipitationType: ${precipitationType}`);
        return precipitationType;
    }

    static Minute(minutes = [], description = "", units = "mmph") {
        Console.info("☑️ Minute");
        const precipitationType = ForecastNextHour.PrecipitationType(description);
        // refer: https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/precip.html

        minutes = minutes.map((minute, i) => {
            // 根据precipitationIntensity来猜测生成perceivedPrecipitationIntensity
            minute.precipitationIntensity = Math.trunc(minute.precipitationIntensity * 1000000) / 1000000;
            minute.perceivedPrecipitationIntensity = ForecastNextHour.#ConvertPrecipitationIntensity(minute.precipitationIntensity, units);
            // 然后根据perceivedPrecipitationIntensity和precipitationChance来猜测生成condition和summaryCondition
            if (minute.perceivedPrecipitationIntensity > 2) {
                // 大雨，强烈感知
                switch (precipitationType) {
                    case "RAIN":
                        minute.condition = "HEAVY_RAIN";
                        break;
                    case "SNOW":
                        minute.condition = "HEAVY_SNOW";
                        break;
                    default:
                        minute.condition = precipitationType;
                        break;
                }

                minute.summaryCondition = precipitationType;
                minute.clear = false;
            } else if (minute.perceivedPrecipitationIntensity > 1) {
                // 中雨，明显感知
                switch (precipitationType) {
                    case "RAIN":
                        minute.condition = "RAIN";
                        break;
                    case "SNOW":
                        minute.condition = "SNOW";
                        break;
                    default:
                        minute.condition = precipitationType;
                        break;
                }
                minute.summaryCondition = precipitationType;
                minute.clear = false;
            } else if (minute.perceivedPrecipitationIntensity > 0.1) {
                // ❓ perceivedPrecipitationIntensity 小于 0.1, 苹果天气显示为无降水
                // 小雨，可以感知到
                switch (precipitationType) {
                    case "RAIN":
                        minute.condition = "DRIZZLE";
                        break;
                    case "SNOW":
                        minute.condition = "FLURRIES";
                        break;
                    default:
                        minute.condition = precipitationType;
                        break;
                }
                minute.summaryCondition = precipitationType;
                minute.clear = false;
            } else if (minute.perceivedPrecipitationIntensity > 0) {
                // 可能降水
                switch (precipitationType) {
                    case "RAIN":
                        minute.condition = "POSSIBLE_DRIZZLE";
                        break;
                    case "SNOW":
                        minute.condition = "POSSIBLE_FLURRIES";
                        break;
                    default:
                        minute.condition = `POSSIBLE_${precipitationType}`;
                        break;
                }
                minute.summaryCondition = precipitationType;
                minute.clear = false;
            } else {
                minute.condition = "CLEAR";
                minute.summaryCondition = "CLEAR";
                minute.clear = true;
            }
            //Console.debug(`minutes[${i}]`, JSON.stringify(minute, null, 2));
            return minute;
        });

        Console.info("✅ Minute");
        return minutes;
    }

    static Summary(minutes = []) {
        Console.info("☑️ Summary");
        const Summaries = [];
        const Summary = {
            condition: "CLEAR",
            startTime: 0,
            precipitationChance: 0,
            precipitationIntensity: 0,
            //beginCondition: "",
            //endCondition: "",
            maxCondition: "",
            clear: true,
        };
        const Length = Math.min(71, minutes.length);
        for (let i = 0; i < Length; i++) {
            const minute = minutes[i];
            const previousMinute = minutes[i - 1];
            switch (i) {
                case 0: // 第一个
                    Summary.startTime = minute.startTime;
                    Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
                    Summary.precipitationChance = minute.precipitationChance;
                    Summary.precipitationIntensity = minute.precipitationIntensity;
                    //Summary.beginCondition = minute.condition;
                    //Summary.endCondition = "";
                    Summary.maxCondition = minute.condition;
                    Summary.clear = minute.clear;
                    break;
                case Length - 1: // 最后一个
                    Summary.endTime = 0; // ⚠️空值必须写零！
                    //Summary.endCondition = minute.condition;
                    Summary.clear = minute.clear;
                    Console.debug(`Summaries[${i}]`, JSON.stringify({ ...minute, ...Summary }, null, 2));
                    Summaries.push({ ...Summary });
                    break;
                default: // 中间
                    if (minute.summaryCondition !== previousMinute.summaryCondition) {
                        // 结束当前summary
                        Summary.endTime = minute.startTime;
                        //Summary.endCondition = previousMinute.condition;
                        Console.debug(`Summaries[${i}]`, JSON.stringify({ ...previousMinute, ...Summary }, null, 2));
                        Summaries.push({ ...Summary });

                        // 开始新的summary
                        Summary.startTime = minute.startTime;
                        Summary.condition = minute.summaryCondition; // condition 只关心降水类型，不关心具体强弱描述
                        Summary.precipitationChance = minute.precipitationChance;
                        Summary.precipitationIntensity = minute.precipitationIntensity;
                        //Summary.beginCondition = minute.condition;
                        //Summary.endCondition = ""; // 重置
                        Summary.maxCondition = minute.condition; // 重置
                        Summary.clear = minute.clear;
                    } else {
                        // 条件相同，更新最大值
                        Summary.precipitationChance = Math.max(Summary.precipitationChance, minute.precipitationChance);
                        Summary.precipitationIntensity = Math.max(Summary.precipitationIntensity, minute.precipitationIntensity);
                        if (Summary.precipitationIntensity === minute.precipitationIntensity) Summary.maxCondition = minute.condition;
                    }
                    break;
            }
        }
        Console.debug(`Summaries: ${JSON.stringify(Summaries, null, 2)}`);
        Console.info("✅ Summary");
        return Summaries;
    }

    static Condition(summaries = []) {
        Console.info("☑️ Condition");
        const Conditions = [];
        if (!summaries.length) {
            Console.debug(`Conditions: ${JSON.stringify(Conditions, null, 2)}`);
            Console.info("✅ Condition");
            return Conditions;
        }

        // Summary() emits alternating clear/precipitation runs. Preserve the
        // previous empty result for unsupported direct callers that violate it.
        for (let i = 1; i < summaries.length; i++) {
            if (summaries[i - 1].clear === summaries[i].clear) {
                Console.warn("Condition", `Adjacent summaries have the same clear state at indexes ${i - 1} and ${i}`);
                Console.debug(`Conditions: ${JSON.stringify(Conditions, null, 2)}`);
                Console.info("✅ Condition");
                return Conditions;
            }
        }

        for (let i = 0; i < summaries.length; i++) {
            const current = summaries[i];
            const next = summaries[i + 1];
            const afterNext = summaries[i + 2];

            if (current.clear) {
                if (!next) {
                    Conditions.push({
                        beginCondition: current.maxCondition,
                        endCondition: current.maxCondition,
                        forecastToken: "CLEAR",
                        parameters: [],
                        startTime: current.startTime,
                        endTime: 0,
                    });
                } else if (afterNext) {
                    Conditions.push({
                        beginCondition: next.maxCondition,
                        endCondition: next.maxCondition,
                        forecastToken: "START_STOP",
                        parameters: [
                            { date: next.startTime, type: "FIRST_AT" },
                            { date: next.endTime, type: "SECOND_AT" },
                        ],
                        startTime: current.startTime,
                        endTime: current.endTime,
                    });
                } else {
                    Conditions.push({
                        beginCondition: next.maxCondition,
                        endCondition: next.maxCondition,
                        forecastToken: "START",
                        parameters: [{ date: next.startTime, type: "FIRST_AT" }],
                        startTime: current.startTime,
                        endTime: current.endTime,
                    });
                }
            } else if (!next) {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: current.maxCondition,
                    forecastToken: "CONSTANT",
                    parameters: [],
                    startTime: current.startTime,
                    endTime: 0,
                });
            } else if (afterNext) {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: afterNext.maxCondition,
                    forecastToken: "STOP_START",
                    parameters: [
                        { date: current.endTime, type: "FIRST_AT" },
                        { date: afterNext.startTime, type: "SECOND_AT" },
                    ],
                    startTime: current.startTime,
                    endTime: current.endTime,
                });
            } else {
                Conditions.push({
                    beginCondition: current.maxCondition,
                    endCondition: current.maxCondition,
                    forecastToken: "STOP",
                    parameters: [{ date: current.endTime, type: "FIRST_AT" }],
                    startTime: current.startTime,
                    endTime: current.endTime,
                });
            }
        }
        // pinned WK2 schema 不认识的值会被 FlatBuffer 当成 0（CLEAR），因此整条条件必须跳过。
        const safeConditions = Conditions.filter(condition => {
            const supported = [condition.beginCondition, condition.endCondition].every(value => typeof ht.ConditionType[value] === "number");
            if (!supported) Console.warn("Condition", `Unsupported ConditionType: ${condition.beginCondition}/${condition.endCondition}`);
            return supported;
        });
        Console.debug(`Conditions: ${JSON.stringify(safeConditions, null, 2)}`);
        Console.info("✅ Condition");
        return safeConditions;
    }

    static #ConvertPrecipitationIntensity(precipitationIntensity, units = "mmph") {
        //Console.info("☑️ ConvertPrecipitationIntensity");
        //Console.debug(`precipitationIntensity: ${precipitationIntensity}`, `units: ${units}`);
        const Range = ForecastNextHour.#Configs.Precipitation.Range[units];
        let perceivedPrecipitationIntensity = 0;

        if (precipitationIntensity === 0) {
            // 无降水
            perceivedPrecipitationIntensity = 0;
        } else if (precipitationIntensity > Range.NO[0] && precipitationIntensity <= Range.NO[1]) {
            // 轻微降水，可能感知不到
            perceivedPrecipitationIntensity = 0; // 轻微降水通常感知不到
        } else if (precipitationIntensity > Range.LIGHT[0] && precipitationIntensity <= Range.LIGHT[1]) {
            // 小雨，可以感知到
            // 根据强度计算感知强度，在0-1之间
            perceivedPrecipitationIntensity = Math.min(1, (precipitationIntensity - Range.LIGHT[0]) / (Range.LIGHT[1] - Range.LIGHT[0]));
        } else if (precipitationIntensity > Range.MODERATE[0] && precipitationIntensity <= Range.MODERATE[1]) {
            // 中雨，明显感知
            // 根据强度计算感知强度，在1-2之间
            perceivedPrecipitationIntensity = 1 + Math.min(1, (precipitationIntensity - Range.MODERATE[0]) / (Range.MODERATE[1] - Range.MODERATE[0]));
        } else if (precipitationIntensity > Range.HEAVY[0]) {
            // 大雨，强烈感知
            // 根据强度计算感知强度，在2-3之间
            perceivedPrecipitationIntensity = 2 + Math.min(1, (precipitationIntensity - Range.HEAVY[0]) / (Range.HEAVY[1] - Range.HEAVY[0]));
        }

        // 使用Math.trunc保留一位小数（性能最快，截断不四舍五入）
        perceivedPrecipitationIntensity = Math.trunc(perceivedPrecipitationIntensity * 1000) / 1000;

        //Console.debug(`perceivedPrecipitationIntensity: ${perceivedPrecipitationIntensity}`);
        //Console.info(`✅ ConvertPrecipitationIntensity`);
        return perceivedPrecipitationIntensity;
    }
}

/**
 * 根据数据源名称返回对应版本的标志；Apple、WeatherKit、空值及未知来源不补标志。
 * Return the versioned logo for a provider; Apple, WeatherKit, empty, and unknown providers do not receive a logo.
 * @param {string | null | undefined} providerName - 数据源名称。
 * Provider name.
 * @param {string} [version="v2"] - 标志资源版本。
 * Logo asset version.
 * @returns {string | undefined} 匹配的数据源标志地址。
 * Matched provider logo URL.
 */
function providerNameToLogo(providerName, version = "v2") {
    Console.info("☑️ providerNameToLogo", `providerName: ${providerName}`, `version: ${version}`);
    const normalizedProviderName = providerName?.split("\n")?.[0]?.trim();
    if (!normalizedProviderName || ["apple", "apple weather", "weatherkit"].includes(normalizedProviderName.toLowerCase())) {
        Console.info("✅ providerNameToLogo");
        return;
    }
    let providerLogo;
    switch (normalizedProviderName) {
        case "WAQI":
        case "World Air Quality Index Project":
            switch (version) {
                case "v1":
                    providerLogo = "https://waqi.info/images/logo.png";
                    break;
                case "v2":
                    providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/WAQI.png`;
                    break;
            }
            break;
        case "ColofulClouds":
        case "彩云天气":
            providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/ColorfulClouds.png`;
            break;
        case "气象在线":
        case "WeatherOL":
            providerLogo = `https://raw.githubusercontent.com/NSRingo/WeatherKit/main/images/icon/${version}/WeatherOL.png`;
            break;
        case "QWeather":
        case "和风天气":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/QWeather.png`;
            break;
        case "The Weather Channel":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/TWC.png`;
            break;
        case "BreezoMeter":
            providerLogo = `https://weatherkit.apple.com/assets/${version}/BreezoMeter.png`;
            break;
    }
    Console.info("✅ providerNameToLogo");
    return providerLogo;
}

class ColorfulClouds {
    constructor(parameters, token) {
        this.Name = "ColorfulClouds";
        this.Version = "4.3.0";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.endpoint = `https://api.caiyunapp.com/v2.6/${token}/${parameters.longitude},${parameters.latitude}`;
        this.headers = { Referer: "https://caiyunapp.com/" };
        this.token = token;
        this.version = parameters.version;
        this.language =
            this.#Config.Language[
                String(parameters.language ?? "")
                    .trim()
                    .toLowerCase()
            ] ?? this.#Config.Language[""];
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
        this.weatherKitLanguage = String(parameters.weatherKitLanguage ?? parameters.language ?? "").trim() || "zh-CN";
    }

    #cache = {
        alert: {},
        realtime: {},
    };

    #Config = {
        Language: {
            "": "zh_CN",
            ja: "ja",
            "ja-jp": "ja",
            en: "en_US",
            "en-gb": "en_GB",
            "en-au": "en_US",
            "en-ca": "en_US",
            "en-us": "en_US",
            zh: "zh_CN",
            "zh-cn": "zh_CN",
            "zh-hans": "zh_CN",
            "zh-hans-cn": "zh_CN",
            "zh-sg": "zh_CN",
            "zh-hant": "zh_TW",
            "zh-hant-hk": "zh_TW",
            "zh-hant-mo": "zh_TW",
            "zh-hant-tw": "zh_TW",
            "zh-hk": "zh_TW",
            "zh-mo": "zh_TW",
            "zh-tw": "zh_TW",
        },
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
        },
        WeatherAlert: {
            Events: {
                "01": "台风",
                "02": "暴雨",
                "03": "暴雪",
                "04": "寒潮",
                "05": "大风",
                "06": "沙尘暴",
                "07": "高温",
                "08": "干旱",
                "09": "雷电",
                10: "冰雹",
                11: "霜冻",
                12: "大雾",
                13: "霾",
                14: "道路结冰",
                15: "森林火险",
                16: "雷雨大风",
                17: "春季沙尘天气趋势预警",
                18: "沙尘",
            },
            Severities: {
                "00": "unknown",
                "01": "minor",
                "02": "moderate",
                "03": "severe",
                "04": "extreme",
                1: "extreme",
                2: "severe",
                3: "moderate",
                4: "minor",
                5: "unknown",
            },
            Sources: {
                1: "US National Weather Service",
                2: "Environment and Climate Change Canada",
            },
            Certainties: {
                1: "observed",
                2: "likely",
                3: "possible",
                4: "unlikely",
                5: "unknown",
            },
            Urgencies: {
                1: "immediate",
                2: "expected",
                3: "future",
                4: "past",
                5: "unknown",
            },
            Categories: {
                1: "Geo",
                2: "Met",
                3: "Safety",
                4: "Security",
                5: "Rescue",
                6: "Fire",
                7: "Health",
                8: "Env",
                9: "Transport",
                10: "Infra",
                11: "CBRNE",
                12: "Other",
            },
        },
        Availability: {
            Minutely: [
                "CN",
                "HK",
                "MO",
                "TW",
                "IT",
                "LT",
                "MT",
                "FR",
                "SK",
                "NO",
                "BY",
                "IS",
                "CZ",
                "SI",
                "DE",
                "ES",
                "UA",
                "DK",
                "PL",
                "FI",
                "SE",
                "HR",
                "RU",
                "RO",
                "PT",
                "EE",
                "RS",
                "AT",
                "GR",
                "HU",
                "FJ",
                "GU",
                "MH",
                "NC",
                "TR",
                "BH",
                "SA",
                "ID",
                "IR",
                "SG",
                "OM",
                "PH",
                "IN",
                "KH",
                "CY",
                "MY",
                "VN",
                "KW",
                "TH",
                "KR",
                "KP",
                "CA",
                "BS",
                "KY",
                "MX",
                "PA",
                "MQ",
                "CU",
                "BM",
                "PR",
                "CW",
                "GP",
                "NI",
                "BR",
                "GF",
                "CO",
                "GY",
                "PY",
                "AR",
            ],
            AirQuality: ["CN", "HK", "MO"],
        },
    };

    async #RealTime() {
        Console.info("☑️ RealTime");

        if (this.#cache.realtime?.result?.realtime?.status === "ok") {
            Console.info("✅ RealTime", "Using cache");
            return this.#cache.realtime;
        }

        const request = {
            url: `${this.endpoint}/realtime?lang=${this.language}&alert=true`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok": {
                    switch (body?.result?.realtime?.status) {
                        case "ok": {
                            this.#cache.realtime = body;
                            break;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.realtime?.status, reason: body?.result?.realtime }));
                    }
                    switch (body?.result?.alert?.status) {
                        case "ok":
                            this.#cache.alert = body.result.alert;
                            break;
                        case "error":
                        case undefined:
                            break;
                    }
                    Console.info("✅ RealTime");
                    return body;
                }
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`RealTime: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ RealTime");
        }
        return {};
    }

    async Minutely() {
        Console.info("☑️ Minutely");
        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.Minutely.includes(this.country)) {
            Console.warn("Minutely", `Unsupported country: ${this.country}`);
            return;
        }

        const request = {
            url: `${this.endpoint}/minutely?unit=metric:v2&lang=${this.language}`,
            headers: this.headers,
        };
        let forecastNextHour;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.minutely?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            const metadata = {
                                attributionUrl: "https://www.caiyunapp.com/h5",
                                expireTime: timeStamp + ForecastNextHour.ExpirationInterval,
                                language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                                latitude: body?.location?.[0],
                                longitude: body?.location?.[1],
                                providerLogo: providerNameToLogo("彩云天气", this.version),
                                providerName: "彩云天气",
                                readTime: timeStamp,
                                reportedTime: body?.server_time,
                                temporarilyUnavailable: false,
                                sourceType: "MODELED",
                            };
                            body.result.minutely.probability = body.result.minutely.probability.map(probability => Math.round(probability * 100));
                            let minuteStemp = new Date(body?.server_time * 1000).setSeconds(0, 0);
                            minuteStemp = minuteStemp.valueOf() / 1000 - 60;
                            forecastNextHour = {
                                metadata: metadata,
                                condition: [],
                                forecastEnd: 0,
                                forecastStart: minuteStemp,
                                minutes: body?.result?.minutely?.precipitation_2h?.map((precipitationIntensity, index) => {
                                    const minute = {
                                        perceivedPrecipitationIntensity: 0,
                                        precipitationChance: 0,
                                        precipitationIntensity: precipitationIntensity,
                                        startTime: minuteStemp + 60 * index,
                                    };
                                    if (index < 30) minute.precipitationChance = body?.result?.minutely?.probability?.[0];
                                    else if (index < 60) minute.precipitationChance = body?.result?.minutely?.probability?.[1];
                                    else if (index < 90) minute.precipitationChance = body?.result?.minutely?.probability?.[2];
                                    else minute.precipitationChance = body?.result?.minutely?.probability?.[3];
                                    return minute;
                                }),
                                summary: [],
                            };
                            forecastNextHour.minutes.length = Math.min(85, forecastNextHour.minutes.length);
                            forecastNextHour.forecastEnd = minuteStemp + 60 * forecastNextHour.minutes.length;
                            forecastNextHour.minutes = ForecastNextHour.Minute(forecastNextHour.minutes, body?.result?.minutely?.description, "mmph");
                            forecastNextHour.summary = ForecastNextHour.Summary(forecastNextHour.minutes);
                            forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);
                            break;
                        }
                        case "error":
                        case "failed":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.minutely?.status, reason: body?.result?.minutely }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Minutely: ${error}`);
        } finally {
            //Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
            Console.info("✅ Minutely");
        }
        return forecastNextHour;
    }

    /**
     * 从彩云实况缓存读取 v2.6 预警，并标准化为 WeatherAlerts.mergeAlerts 可消费的来源结构。
     * Read Caiyun v2.6 alerts from the realtime cache and normalize them for WeatherAlerts.mergeAlerts.
     * @link https://docs.caiyunapp.com/weather-api/v2/v2.6/5-alert.html
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlert() {
        Console.info("☑️ WeatherAlert");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://www.caiyunapp.com/h5",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=ColorfulClouds`,
            alerts: [],
            areaName: "",
            source: "彩云天气",
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            await this.#RealTime();
            if (!Array.isArray(this.#cache.alert?.content)) throw Error(JSON.stringify(this.#cache.alert));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlerts(this.#cache.alert) };
        } catch (error) {
            Console.error(`WeatherAlert: ${error}`);
        } finally {
            Console.info("✅ WeatherAlert");
        }
        return weatherAlerts;
    }

    /**
     * 拉取彩云 v3 CAP 预警，并标准化为 WeatherAlerts.mergeAlerts 可消费的来源结构。
     * Fetch Caiyun v3 CAP alerts and normalize them for WeatherAlerts.mergeAlerts.
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlertV3CAP() {
        Console.info("☑️ WeatherAlertV3CAP");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://www.caiyunapp.com/h5",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=ColorfulClouds`,
            alerts: [],
            areaName: "",
            source: "彩云天气",
        };
        const url = new URL("https://singer.caiyunhub.com/v3/cap_alert/location");
        url.searchParams.set("token", this.token);
        url.searchParams.set("longitude", this.longitude);
        url.searchParams.set("latitude", this.latitude);
        url.searchParams.set("language", this.language);
        const request = {
            url: url.toString(),
            headers: this.headers,
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            const response = await fetch(request);
            const body = JSON.parse(response?.body ?? "{}");
            if (response?.ok === false) {
                Console.warn("WeatherAlertV3CAP", `upstreamStatus: ${response.statusCode ?? response.status}`);
                return failedWeatherAlerts;
            }
            if (!Array.isArray(body?.alerts)) throw Error(JSON.stringify(body?.error ?? body?.reason ?? body?.code ?? body));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlertsV3CAP(body) };
        } catch (error) {
            Console.error(`WeatherAlertV3CAP: ${error}`);
        } finally {
            Console.info("✅ WeatherAlertV3CAP");
        }
        return weatherAlerts;
    }

    async #Hourly(hourlysteps = 273, begin = undefined) {
        Console.info("☑️ Hourly", `hourlysteps: ${hourlysteps}`, `begin: ${begin}`);
        const request = {
            url: `${this.endpoint}/hourly?hourlysteps=${hourlysteps}&lang=${this.language}`,
            headers: this.headers,
        };
        if (begin) request.url += `&begin=${begin}`;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.hourly?.status) {
                        case "ok": {
                            Console.info("✅ Hourly");
                            return body;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.hourly?.status, reason: body?.result?.hourly }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Hourly: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(this.airQuality, null, 2)}`);
            Console.info("✅ Hourly");
        }
        return {};
    }

    async Daily(dailysteps = 10, begin = undefined) {
        Console.info("☑️ Daily");
        const request = {
            url: `${this.endpoint}/daily?dailysteps=${dailysteps}&lang=${this.language}`,
            headers: this.headers,
        };
        if (begin) request.url += `&begin=${begin}`;
        let forecastDaily;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok":
                    switch (body?.result?.daily?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            const metadata = {
                                attributionUrl: "https://www.caiyunapp.com/h5",
                                expireTime: timeStamp + 60 * 60,
                                language: "zh-CN", // `${this.language}-${this.country}`,
                                latitude: body?.location?.[0],
                                longitude: body?.location?.[1],
                                providerLogo: providerNameToLogo("彩云天气", this.version),
                                providerName: "彩云天气",
                                readTime: timeStamp,
                                reportedTime: body?.server_time,
                                temporarilyUnavailable: false,
                                sourceType: "STATION",
                            };
                            forecastDaily = {
                                metadata: metadata,
                                days: [],
                            };
                            for (let i = 0; i < dailysteps; i++) {
                                const timeStamp = (new Date(body?.result?.daily?.skycon?.[i]?.date).getTime() / 1000) | 0;
                                forecastDaily.days.push({
                                    forecastStart: timeStamp,
                                    forecastEnd: timeStamp + 24 * 3600, // 24 hours
                                    ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon?.[i]?.value),
                                    humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100),
                                    humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100),
                                    // maxUvIndex: Weather.ConvertDSWRF(body?.result?.daily?.dswrf?.[i]?.max), // ConvertDSWRF 转换不准确
                                    // moonPhase: "", // Not given
                                    // moonrise: body?.result?.daily?.astro?.[i].sunset.time, // Not given
                                    // moonset: body?.result?.daily?.astro?.[i].sunrise.time, // Not given
                                    // Caiyun `avg` is an average rate (mm/h), not WeatherKit's accumulated amount (mm).
                                    // Leave both amount fields absent so the merge keeps Apple's paired scalar/by-type totals.
                                    // precipitationAmountByType: [], // Not given
                                    precipitationChance: body?.result?.daily?.precipitation?.[i]?.probability,
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // solarMidnight: 0, // Not given
                                    // solarNoon: 0, // Not given
                                    //sunrise: body?.result?.daily?.astro?.[i].sunrise.time, // 未转换
                                    // sunriseAstronomical: 0, // Not given
                                    // sunriseCivil: 0, // Not given
                                    // sunriseNautical: 0, // Not given
                                    //sunset: body?.result?.daily?.astro?.[i].sunset.time, // 未转换
                                    // sunsetAstronomical: 0, // Not given
                                    // sunsetCivil: 0, // Not given
                                    // sunsetNautical: 0, // Not given
                                    temperatureMax: body?.result?.daily?.temperature?.[i]?.max,
                                    // temperatureMaxTime: 0, // Not given
                                    temperatureMin: body?.result?.daily?.temperature?.[i]?.min,
                                    // temperatureMinTime: 0, // Not given
                                    visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000,
                                    visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000,
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeedAvg: body?.result?.daily?.wind?.[i]?.avg?.speed,
                                    windSpeedMax: body?.result?.daily?.wind?.[i]?.max?.speed,
                                    daytimeForecast: {
                                        forecastStart: timeStamp + 8 * 3600, // 8 hours
                                        forecastEnd: timeStamp + 8 * 3600 + 12 * 3600, // 8 + 12 hours
                                        cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
                                        // cloudCoverHighAltPct: 0, // Not given
                                        // cloudCoverLowAltPct: 0, // Not given
                                        // cloudCoverMidAltPct: 0, // Not given
                                        ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon_08h_20h?.[i]?.value),
                                        // humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
                                        // humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
                                        // Caiyun `avg` is mm/h and cannot replace WeatherKit's accumulated precipitation total.
                                        // precipitationAmountByType: [], // Not given
                                        precipitationChance: body?.result?.daily?.precipitation_08h_20h?.[i]?.probability,
                                        // precipitationType: "", // Not given
                                        // snowfallAmount: 0, // Not given
                                        temperatureMax: body?.result?.daily?.temperature_08h_20h?.[i]?.max,
                                        temperatureMin: body?.result?.daily?.temperature_08h_20h?.[i]?.min,
                                        // visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000, // Not given
                                        // visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000, // Not given
                                        windDirection: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.direction,
                                        // windGustSpeedMax: 0, // Not given
                                        windSpeed: body?.result?.daily?.wind_08h_20h?.[i]?.avg?.speed,
                                        windSpeedMax: body?.result?.daily?.wind_08h_20h?.[i]?.max?.speed,
                                    },
                                    overnightForecast: {
                                        forecastStart: timeStamp + 20 * 3600, // 20 hours
                                        forecastEnd: timeStamp + 20 * 3600 + 12 * 3600, // 20 + 12 hours
                                        cloudCover: body?.result?.daily?.cloudrate?.[i]?.avg,
                                        // cloudCoverHighAltPct: 0, // Not given
                                        // cloudCoverLowAltPct: 0, // Not given
                                        // cloudCoverMidAltPct: 0, // Not given
                                        ...Weather.ConvertWeatherCodeField(body?.result?.daily?.skycon_20h_32h?.[i]?.value),
                                        // humidityMax: Math.round(body?.result?.daily?.humidity?.[i]?.max * 100), // Not given
                                        // humidityMin: Math.round(body?.result?.daily?.humidity?.[i]?.min * 100), // Not given
                                        // Caiyun `avg` is mm/h and cannot replace WeatherKit's accumulated precipitation total.
                                        // precipitationAmountByType: [], // Not given
                                        precipitationChance: body?.result?.daily?.precipitation_20h_32h?.[i]?.probability,
                                        // precipitationType: "", // Not given
                                        // snowfallAmount: 0, // Not given
                                        temperatureMax: body?.result?.daily?.temperature_20h_32h?.[i]?.max,
                                        temperatureMin: body?.result?.daily?.temperature_20h_32h?.[i]?.min,
                                        // visibilityMax: body?.result?.daily?.visibility?.[i]?.max * 1000, // Not given
                                        // visibilityMin: body?.result?.daily?.visibility?.[i]?.min * 1000, // Not given
                                        windDirection: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.direction,
                                        // windGustSpeedMax: 0, // Not given
                                        windSpeed: body?.result?.daily?.wind_20h_32h?.[i]?.avg?.speed,
                                        windSpeedMax: body?.result?.daily?.wind_20h_32h?.[i]?.max?.speed,
                                    },
                                });
                            }
                            break;
                        }
                        case "error":
                        case undefined:
                            throw Error(JSON.stringify({ status: body?.result?.daily?.status, reason: body?.result?.daily }));
                    }
                    break;
                case "error":
                case "failed":
                case undefined:
                    throw Error(JSON.stringify(body ?? {}));
            }
        } catch (error) {
            Console.error(`Daily: ${error}`);
        } finally {
            //Console.debug(`Daily: ${JSON.stringify(Daily, null, 2)}`);
            Console.info("✅ Daily");
        }
        return forecastDaily;
    }

    #Metadata(reportedTime, location = [this.latitude, this.longitude], temporarilyUnavailable = false) {
        const timeStamp = Math.trunc(Date.now() / 1000);
        const [latitude, longitude] = location;
        return {
            longitude,
            providerName: "彩云天气",
            reportedTime: reportedTime ?? timeStamp,
            latitude,
            expireTime: timeStamp + 60 * 60,
            attributionUrl: "https://www.caiyunapp.com/h5",
            providerLogo: providerNameToLogo("彩云天气", this.version),
            temporarilyUnavailable,
            readTime: timeStamp,
            sourceType: "MODELED",
        };
    }

    /**
     * 创建 WeatherKit 格式的污染物对象
     * @link https://docs.caiyunapp.com/weather-api/v2/v2.6/1-realtime.html
     * @param {Object} pollutantsObj - 污染物对象
     * @param {String} [scale] - AQI 标准（如 HJ6332012）
     * @returns {Object} 修复后的污染物对象
     */
    #CreatePollutants(pollutantsObj = {}, scale = "") {
        Console.info("☑️ CreatePollutants");
        const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
        const pollutants = Object.entries(pollutantsObj)
            .map(([name, amount]) => {
                switch (name) {
                    case "co":
                        return {
                            amount: AirQuality.ConvertUnit(amount ?? -1, mgm3, ugm3),
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                            index: scale === "HJ6332012" ? pollutantsObj.co_iaqi_chn : undefined,
                        };
                    case "no":
                    case "no2":
                    case "so2":
                    case "o3":
                    case "nox":
                    case "pm25":
                    case "pm10":
                        return {
                            amount: amount ?? -1,
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                            index: scale === "HJ6332012" ? pollutantsObj[`${name}_iaqi_chn`] : undefined,
                        };
                    default:
                        return null;
                }
            })
            .filter(Boolean);

        Console.info("✅ CreatePollutants");
        return pollutants;
    }

    /**
     * 获取当前空气质量并转换为 WeatherKit 风格结构。
     *
     * 逻辑概览：
     * 1) 校验国家/地区是否支持空气质量；
     * 2) 拉取 realtime 数据并做可用性检查；
     * 3) 构建通用空气质量基础结构（metadata/pollutants）；
     * 4) 按 useUsa 选择 US 或 CN 口径生成 index、categoryIndex 与 primaryPollutant。
     *
     * @param {boolean} [useUsa=true]
     * 是否使用美国 AQI 口径。
     * - true: 使用 `EPA_NowCast`（usa）；
     * - false: 使用 `HJ6332012`（chn）。
     *
     * @param {boolean} [forcePrimaryPollutant=true]
     * 在 CN 口径下是否强制展示主污染物。
     * - true: 始终展示计算得到的主污染物；
     * - false: 当主污染物 index <= 50 时返回 `NOT_AVAILABLE`。
     *
     * @returns {Promise<{
     *   metadata: any,
     *   pollutants: Array<{amount: number, pollutantType: string, units: string}>,
     *   previousDayComparison: string,
     *   categoryIndex?: number,
     *   index?: number,
     *   isSignificant?: boolean,
     *   primaryPollutant?: string,
     *   scale?: string
     * }>}
     * 成功时返回完整空气质量对象；不可用时返回 temporarilyUnavailable 的降级对象。
     */
    async CurrentAirQuality(useUsa = true, forcePrimaryPollutant = true) {
        Console.info("☑️ CurrentAirQuality");
        // 统一失败兜底对象，任一关键步骤失败时直接返回。
        const failedAirQuality = {
            metadata: this.#Metadata(undefined, undefined, true),
            pollutants: [],
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        // 可用性判断：当前数据源不支持该国家/地区时直接返回兜底结果。
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("CurrentAirQuality", `Unsupported country: ${this.country}`);
            return failedAirQuality;
        }

        // 拉取实时数据（内部已带缓存）。
        const realtime = await this.#RealTime();

        // realtime 主体缺失，视为不可用。
        if (!realtime.result) {
            Console.error("CurrentAirQuality", "无法获取realtime数据");
            return failedAirQuality;
        }

        // 彩云在不支持位置时 usa 描述为空字符串。
        if (realtime.result.realtime.air_quality.description.usa === "") {
            Console.error("CurrentAirQuality", `不支持的位置`);
            return failedAirQuality;
        }

        // 构建与算法无关的基础空气质量结构。
        const particularAirQuality = {
            metadata: this.#Metadata(realtime.result.realtime.air_quality.obs_time, realtime.location),
            pollutants: this.#CreatePollutants(realtime.result.realtime.air_quality, useUsa ? undefined : "HJ6332012"),
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        // US 口径：直接使用 usa AQI，并按 EPA_NowCast 分类。
        if (useUsa) {
            const scale = AirQuality.Config.Scales.EPA_NowCast;
            const index = realtime.result.realtime.air_quality.aqi.usa;
            const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);

            const airQuality = {
                ...particularAirQuality,
                categoryIndex,
                index,
                isSignificant: categoryIndex >= scale.categories.significantIndex,
                primaryPollutant: "NOT_AVAILABLE",
                scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
            };
            Console.info("✅ CurrentAirQuality");
            return airQuality;
        } else {
            // CN 口径：使用 chn AQI，并基于分污染物 IAQI 判定主污染物。
            const scale = AirQuality.Config.Scales.HJ6332012;
            const index = realtime.result.realtime.air_quality.aqi.chn;
            const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);

            const primaryPollutant = AirQuality.PrimaryPollutant(particularAirQuality.pollutants, scale.categories);
            // 当不强制展示主污染物且整体空气质量较好（<=50）时，主污染物置为不可用。
            const isNotAvailable = !forcePrimaryPollutant && primaryPollutant.index <= 50;
            if (isNotAvailable) {
                Console.info("CurrentAirQuality", `Max index of pollutants ${primaryPollutant.pollutantType} = ${primaryPollutant.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
            }

            const airQuality = {
                ...particularAirQuality,
                categoryIndex,
                index,
                isSignificant: categoryIndex >= scale.categories.significantIndex,
                primaryPollutant: isNotAvailable ? "NOT_AVAILABLE" : primaryPollutant.pollutantType,
                scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
            };
            Console.info("✅ CurrentAirQuality");
            return airQuality;
        }
    }

    async CurrentWeather() {
        Console.info("☑️ CurrentWeather");
        const realtime = await this.#RealTime();
        if (!realtime.result) {
            Console.error("CurrentWeather", "无法获取realtime数");
            return {
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        Console.info("✅ CurrentWeather");
        return {
            metadata: this.#Metadata(realtime.result.server_time, realtime.location),
            cloudCover: Math.round(realtime.result.realtime.cloudrate * 100),
            ...Weather.ConvertWeatherCodeField(realtime.result.realtime.skycon),
            humidity: Math.round(realtime.result.realtime.humidity * 100),
            // uvIndex: Weather.ConvertDSWRF(body?.result?.realtime?.dswrf), // ConvertDSWRF 转换不准确
            perceivedPrecipitationIntensity: realtime.result.realtime.precipitation.local.intensity,
            pressure: realtime.result.realtime.pressure / 100,
            temperature: realtime.result.realtime.temperature,
            temperatureApparent: realtime.result.realtime.apparent_temperature,
            visibility: realtime.result.realtime.visibility * 1000,
            windDirection: realtime.result.realtime.wind.direction,
            windSpeed: realtime.result.realtime.wind.speed,
        };
    }

    async YesterdayAirQuality(useUsa = true) {
        Console.info("☑️ YesterdayAirQuality");

        const yesterdayHourly = await this.#Hourly(1, Math.trunc((Date.now() - 864e5) / 1000));
        const scale = useUsa ? AirQuality.Config.Scales.EPA_NowCast : AirQuality.Config.Scales.HJ6332012;
        const particularAirQuality = {
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            pollutants: [],
            primaryPollutant: "NOT_AVAILABLE",
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };

        if (!yesterdayHourly.result) {
            Console.error("YesterdayAirQuality", "无法获取hourly数据");
            return {
                ...particularAirQuality,
                categoryIndex: -1,
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        const { usa, chn } = yesterdayHourly.result.hourly.air_quality.aqi[0].value;
        if (usa === 0 && chn === 0) {
            Console.warn("YesterdayAirQuality", "usa和chn的AQI值都为0，不支持的位置？");
        }

        const index = useUsa ? usa : chn;
        const categoryIndex = AirQuality.CategoryIndex(index, scale.categories);
        const isSignificant = categoryIndex >= scale.categories.significantIndex;
        Console.debug(`index: ${index}`);

        Console.info("✅ YesterdayAirQuality", `categoryIndex: ${categoryIndex}`);
        return {
            ...particularAirQuality,
            index,
            categoryIndex,
            isSignificant,
            metadata: this.#Metadata(yesterdayHourly.result.server_time, yesterdayHourly.location),
        };
    }

    async ForecastHourly(hourlysteps, begin) {
        Console.info("☑️ ForecastHourly");
        const hourly = await this.#Hourly(hourlysteps, begin);
        if (!hourly.result) {
            Console.error("ForecastHourly", "Failed to get hourly data");
            return {
                metadata: this.#Metadata(undefined, undefined, true),
            };
        }

        Console.info("✅ ForecastHourly");
        return {
            metadata: this.#Metadata(hourly.result.server_time, hourly.location),
            hours: Array.from({ length: hourly.result.hourly.skycon.length }, (_, i) => ({
                cloudCover: hourly.result.hourly.cloudrate[i].value,
                // cloudCoverHighAltPct: 0, // Not given
                // cloudCoverLowAltPct: 0, // Not given
                // cloudCoverMidAltPct: 0, // Not given
                ...Weather.ConvertWeatherCodeField(hourly.result.hourly.skycon[i].value),
                // daylight: false, // Not given
                forecastStart: (new Date(hourly.result.hourly.skycon[i].datetime).getTime() / 1000) | 0,
                humidity: Math.round(hourly.result.hourly.humidity[i].value * 100),
                // perceivedPrecipitationIntensity: "", // Not given
                precipitationAmount: hourly.result.hourly.precipitation[i].value,
                precipitationChance: hourly.result.hourly.precipitation[i].probability,
                // precipitationIntensity: 0, // Not given
                // precipitationType: "", // Not given
                pressure: hourly.result.hourly.pressure[i].value / 100,
                // pressureTrend: "", // Not given
                // snowfallAmount: 0, // Not given
                // snowfallIntensity: 0, // Not given
                temperature: hourly.result.hourly.temperature[i].value,
                temperatureApparent: hourly.result.hourly.apparent_temperature[i].value,
                // temperatureDewPoint: 0, // Not given
                // uvIndex: 0, // Not given
                visibility: hourly.result.hourly.visibility[i].value * 1000,
                windDirection: hourly.result.hourly.wind[i].direction,
                // windGust: 0, // Not given
                windSpeed: hourly.result.hourly.wind[i].speed,
            })),
        };
    }

    #CreateWeatherAlerts(body) {
        Console.info("☑️ CreateWeatherAlerts");
        const convertedAlerts = (Array.isArray(body?.content) ? body.content : [])
            .map(alert => {
                const issuedTime = this.#DateISOString(alert?.pubtimestamp);
                if (!issuedTime) return undefined;
                const code = String(alert?.code ?? "").trim();
                const eventName = this.#Config.WeatherAlert.Events[code.slice(0, 2)] ?? "";
                const source = String(alert?.source ?? "").trim();
                return {
                    ...(alert?.adcode ? { areaId: String(alert.adcode).trim() } : {}),
                    ...(alert?.location ? { areaName: String(alert.location).trim() } : {}),
                    certainty: "unknown",
                    description: String(alert?.title ?? "").trim(),
                    effectiveTime: issuedTime,
                    eventOnsetTime: issuedTime,
                    guidelines: [],
                    identifier: alert?.alertId,
                    issuedTime,
                    ...(eventName ? { eventName } : {}),
                    message: String(alert?.description ?? alert?.title ?? "").trim(),
                    phenomenon: eventName || "Other",
                    reportedAt: issuedTime,
                    severity: this.#Config.WeatherAlert.Severities[code.slice(2, 4)] || "unknown",
                    ...(source ? { source } : {}),
                    standard: "",
                    ...(code ? { token: code } : {}),
                    urgency: "unknown",
                };
            })
            .filter(Boolean);
        Console.info("✅ CreateWeatherAlerts");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || "彩云天气",
        };
    }

    #CreateWeatherAlertsV3CAP(body) {
        Console.info("☑️ CreateWeatherAlertsV3CAP");
        const convertedAlerts = (Array.isArray(body?.alerts) ? body.alerts : [])
            .map(alert => {
                const issuedTime = this.#DateISOString(alert?.sent_time);
                if (!issuedTime) return undefined;
                const effectiveTime = this.#DateISOString(alert?.effective_time) || issuedTime;
                const expireTime = this.#DateISOString(alert?.expires_time);
                const eventOnsetTime = this.#DateISOString(alert?.onset_time) || effectiveTime;
                const area = Array.isArray(alert?.areas) ? alert.areas.find(item => item) : undefined;
                const geocode = Array.isArray(area?.geocodes) ? area.geocodes.find(item => item?.value) : undefined;
                const source = String(alert?.sender_name ?? "").trim() || this.#Config.WeatherAlert.Sources[Number(alert?.source)] || "";
                const eventName = String(alert?.event_name ?? "").trim();
                return {
                    ...(geocode?.value ? { areaId: String(geocode.value).trim() } : {}),
                    ...(area?.area_desc ? { areaName: String(area.area_desc).trim() } : {}),
                    certainty: this.#Config.WeatherAlert.Certainties[Number(alert?.certainty)] || "unknown",
                    description: String(alert?.headline ?? "").trim(),
                    effectiveTime,
                    eventOnsetTime,
                    ...(expireTime ? { eventEndTime: expireTime, expireTime } : {}),
                    guidelines: this.#SplitWeatherAlertGuidelines(alert?.instruction),
                    identifier: alert?.id,
                    issuedTime,
                    ...(eventName ? { eventName } : {}),
                    message: String(alert?.description ?? alert?.headline ?? "").trim(),
                    phenomenon: (Array.isArray(alert?.categories) ? alert.categories : []).map(category => this.#Config.WeatherAlert.Categories[Number(category)]).find(Boolean) || eventName || "Other",
                    reportedAt: issuedTime,
                    severity: this.#Config.WeatherAlert.Severities[Number(alert?.severity)] || "unknown",
                    ...(source ? { source } : {}),
                    standard: "",
                    urgency: this.#Config.WeatherAlert.Urgencies[Number(alert?.urgency)] || "unknown",
                };
            })
            .filter(Boolean);
        Console.info("✅ CreateWeatherAlertsV3CAP");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || "彩云天气",
        };
    }

    #DateISOString(value) {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds <= 0) return "";
        return new Date(seconds * 1000).toISOString();
    }

    #SplitWeatherAlertGuidelines(instruction) {
        return String(instruction ?? "")
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*\d+[.、]\s*/, "").trim())
            .filter(Boolean);
    }
}

/**
 * MatchEnum - 用于比对 JSON 接口和 Flatbuffer 接口的枚举值是否一致
 *
 * 变量命名约定：
 * - jsonValue: JSON 接口返回的枚举字符串值，如 "RAIN", "MINOR"
 * - protoValue: Flatbuffer 接口返回的枚举字符串值，如 "RAIN", "MINOR"
 * - protoEnumIndex: 枚举的数字索引，如 Severity["MINOR"] = 4
 *
 * 比较逻辑：jsonValue 与 protoValue 进行字符串比较
 * 通知格式：json: {jsonValue} / proto: {protoEnumIndex}-{protoValue}
 */
class MatchEnum {
    constructor(proto, version) {
        this.Name = "MatchEnum";
        this.Version = "0.0.4";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.request = $request;
        this.json = {};
        this.proto = proto;
        switch (version) {
            case "v3":
                this.enumTypes = mt;
                break;
            case "v2":
            default:
                this.enumTypes = ht;
                break;
        }
    }

    async init() {
        if (this.request.headers.Accept) this.request.headers.Accept = "application/json";
        if (this.request.headers.accept) this.request.headers.accept = "application/json";

        try {
            this.json = await fetch(this.request).then(res => JSON.parse(res?.body ?? "{}"));
        } catch (error) {
            Console.error("初始化过程中发生错误:", error);
        }
    }

    airQuality() {
        const jsonTime = this.json?.airQuality?.metadata?.reportedTime;
        const protoTime = this.proto?.airQuality?.metadata?.reportedTime;
        const jsonValue = this.json?.airQuality?.previousDayComparison;
        const protoValue = this.proto?.airQuality?.previousDayComparison;
        const protoEnumIndex = this.enumTypes.ComparisonTrend[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("ComparisonTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
        this.json?.airQuality?.pollutants?.forEach(pollutant => {
            const jsonValue = pollutant?.pollutantType;
            const protoEnumIndex = this.enumTypes.PollutantType[pollutant?.pollutantType];
            const protoValue = this.enumTypes.PollutantType[protoEnumIndex];
            if (jsonValue !== protoValue) {
                $notification.post("PollutantType", "", `json: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
        this.json?.airQuality?.pollutants?.forEach(pollutant => {
            const jsonValue = pollutant?.units;
            const protoEnumIndex = this.enumTypes.UnitType[pollutant?.units];
            const protoValue = this.enumTypes.UnitType[protoEnumIndex];
            if (jsonValue !== protoValue) {
                $notification.post("UnitType", "", `json: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    weatherCondition() {
        const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
        const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
        const jsonValue = this.json?.currentWeather?.conditionCode;
        const protoValue = this.proto?.currentWeather?.conditionCode;
        const protoEnumIndex = this.enumTypes.WeatherCondition[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("WeatherCondition", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
    }

    pressureTrend() {
        const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
        const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
        const jsonValue = this.json?.currentWeather?.pressureTrend;
        const protoValue = this.proto?.currentWeather?.pressureTrend;
        const protoEnumIndex = this.enumTypes.PressureTrend[protoValue];
        if (jsonValue !== protoValue) {
            $notification.post("PressureTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
        }
    }

    conditionType() {
        this.json?.forecastNextHour?.condition?.forEach(condition => {
            const jsonValue = condition?.beginCondition;
            const jsonStartTime = condition?.startTime;
            const protoCondition = this.proto?.forecastNextHour?.condition?.find(c => c?.startTime === jsonStartTime);
            const protoValue = protoCondition?.beginCondition;
            const protoEnumIndex = this.enumTypes.ConditionType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ConditionType", "", `startTime: ${jsonStartTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    forecastToken() {
        this.json?.forecastNextHour?.condition?.forEach(condition => {
            const jsonValue = condition?.forecastToken;
            const jsonStartTime = condition?.startTime;
            const protoCondition = this.proto?.forecastNextHour?.condition?.find(c => c?.startTime === jsonStartTime);
            const protoValue = protoCondition?.forecastToken;
            const protoEnumIndex = this.enumTypes.ForecastToken[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ForecastToken", "", `startTime: ${jsonStartTime}\njson: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    severity() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.severity;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.severity;
            const protoEnumIndex = this.enumTypes.Severity[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Severity", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    significanceType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.significance;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.significance;
            const protoEnumIndex = this.enumTypes.SignificanceType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("SignificanceType", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    urgency() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.urgency;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.urgency;
            const protoEnumIndex = this.enumTypes.Urgency[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Urgency", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    certainty() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.certainty;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.certainty;
            const protoEnumIndex = this.enumTypes.Certainty[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("Certainty", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    importanceType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            const jsonValue = alert?.importance;
            const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.importance;
            const protoEnumIndex = this.enumTypes.ImportanceType[protoValue];
            if (jsonValue !== protoValue) {
                $notification.post("ImportanceType", "", `json[${i}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
            }
        });
    }

    responseType() {
        this.json?.weatherAlerts?.alerts?.forEach((alert, i) => {
            alert?.responses?.forEach((response, j) => {
                const jsonValue = response;
                const protoValue = this.proto?.weatherAlerts?.alerts?.[i]?.responses?.[j];
                const protoEnumIndex = this.enumTypes.ResponseType[protoValue];
                if (jsonValue !== protoValue) {
                    $notification.post("ResponseType", "", `json[${i}][${j}]: ${jsonValue}\nproto: ${protoEnumIndex}-${protoValue}`);
                }
            });
        });
    }

    placementType() {
        this.json?.news?.placements?.forEach((jsonPlacement, i) => {
            const jsonArticleIds = jsonPlacement?.articles?.map(a => a?.id) ?? [];
            const jsonHeadlines = jsonPlacement?.articles?.map(a => a?.headlineOverride) ?? [];
            // 通过 articles 的 id 或 headlineOverride 匹配对应的 proto placement
            let protoIndex = -1;
            const protoPlacement = this.proto?.news?.placements?.find((p, idx) => {
                const protoArticleIds = p?.articles?.map(a => a?.id) ?? [];
                const protoHeadlines = p?.articles?.map(a => a?.headlineOverride) ?? [];
                // 检查是否有相同的 article id 或 headline
                const matched = jsonArticleIds.some(id => protoArticleIds.includes(id)) || jsonHeadlines.some(h => h && protoHeadlines.includes(h));
                if (matched) protoIndex = idx;
                return matched;
            });
            if (protoPlacement) {
                const jsonValue = jsonPlacement?.placement;
                const protoValue = protoPlacement?.placement;
                const protoEnumIndex = this.enumTypes.PlacementType[protoValue];
                if (jsonValue !== protoValue) {
                    const headline = jsonHeadlines[0] ?? jsonArticleIds[0] ?? "";
                    $notification.post("PlacementType", "", `article: ${headline}\njson[${i}]: ${jsonValue}\nproto[${protoIndex}]: ${protoEnumIndex}-${protoValue}`);
                }
            }
        });
    }
}

class QWeather {
    static #MaximumWeatherAlertPageSize = 2 * 1024 * 1024;

    constructor(parameters, token, host = "devapi.qweather.com") {
        this.Name = "QWeather";
        this.Version = "5.3.1";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.endpoint = `https://${host}`;
        this.headers = { "X-QW-Api-Key": token };
        this.version = parameters.version;
        this.language =
            this.#Config.Language[
                String(parameters.language ?? "")
                    .trim()
                    .toLowerCase()
            ] ?? (String(parameters.language ?? "").trim() ? parameters.language : this.#Config.Language[""]);
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
        this.weatherKitLanguage = String(parameters.weatherKitLanguage ?? parameters.language ?? "").trim() || "zh-CN";
    }

    #cache = {
        airQualityCurrent: {},
    };

    #Config = {
        Language: {
            "": "zh",
            en: "en",
            "en-au": "en",
            "en-ca": "en",
            "en-gb": "en",
            "en-us": "en",
            ja: "ja",
            "ja-jp": "ja",
            zh: "zh",
            "zh-cn": "zh-hans",
            "zh-sg": "zh-hans",
            "zh-hans": "zh-hans",
            "zh-hans-cn": "zh-hans",
            "zh-hant-hk": "zh-hant",
            "zh-hant-mo": "zh-hant",
            "zh-hant-tw": "zh-hant",
            "zh-hk": "zh-hant",
            "zh-mo": "zh-hant",
            "zh-tw": "zh-hant",
        },
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm2p5: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
            na: "NOT_AVAILABLE",
            undefined: "NOT_AVAILABLE",
            null: "NOT_AVAILABLE",
        },
        Units: {
            "μg/m3": "MICROGRAMS_PER_CUBIC_METER",
            "mg/m3": "MILLIGRAMS_PER_CUBIC_METER",
            ppb: "PARTS_PER_BILLION",
            ppm: "PARTS_PER_MILLION",
        },
        WeatherAlert: {
            // QWeather 没有提供 CAP category，本表按官方事件名称映射；具体类别必须先于 Met 匹配。
            // QWeather does not provide CAP category; this table maps official event names, with specific categories matched before Met.
            EventCategories: [
                { category: "Geo", codes: [[1013, 1013], [1037, 1037], [1241, 1251], [1603, 1603], [2032, 2032], [2159, 2159], [2163, 2163], [2320, 2323], [2348, 2348], [2363, 2363], [2373, 2373], [2378, 2378], [2399, 2400], [3140, 3140], [3144, 3144]] },
                { category: "Safety", codes: [[1044, 1045], [1218, 1218], [2419, 2420], [2713, 2713]] },
                { category: "Security", codes: [] },
                { category: "Rescue", codes: [] },
                { category: "Fire", codes: [[1025, 1026], [1041, 1041], [1077, 1077], [1084, 1084], [1605, 1605], [2005, 2005], [2132, 2132], [2158, 2158], [2192, 2192], [2207, 2207], [2302, 2302], [2349, 2349], [2414, 2414], [2743, 2743], [3139, 3139]] },
                { category: "Health", codes: [[1024, 1024], [1042, 1042], [1066, 1066], [1068, 1069], [1071, 1072], [1082, 1082], [1210, 1210], [2851, 2851]] },
                { category: "Env", codes: [[1029, 1029], [1032, 1032], [1067, 1067], [1074, 1074], [1217, 1217], [1271, 1274], [2202, 2202], [2374, 2374], [2389, 2389], [2413, 2413], [2527, 2527]] },
                { category: "Transport", codes: [[1021, 1021], [1046, 1046], [1057, 1057], [2077, 2078], [2300, 2301], [2328, 2328], [2360, 2360], [2375, 2376], [2385, 2388], [2415, 2415], [2554, 2554], [2722, 2723], [2791, 2797]] },
                { category: "Infra", codes: [[1081, 1081], [1203, 1204], [1216, 1216], [1221, 1221]] },
                { category: "CBRNE", codes: [] },
                { category: "Other", codes: [[2166, 2166], [3106, 3106], [3147, 3147], [9999, 9999]] },
                {
                    category: "Met",
                    codes: [[1001, 1089], [1201, 1221], [1241, 1251], [1271, 1274], [1601, 1610], [1701, 1710], [1801, 1805], [2001, 2007], [2029, 2033], [2050, 2054], [2070, 2085], [2100, 2109], [2111, 2111], [2120, 2135], [2150, 2150], [2152, 2168], [2190, 2193], [2200, 2205], [2207, 2221], [2300, 2309], [2311, 2328], [2330, 2333], [2341, 2341], [2343, 2343], [2345, 2346], [2348, 2400], [2409, 2409], [2411, 2426], [2501, 2502], [2521, 2532], [2550, 2554], [2581, 2581], [2601, 2620], [2641, 2641], [2713, 2713], [2722, 2723], [2743, 2743], [2749, 2749], [2751, 2753], [2755, 2756], [2791, 2797], [2801, 2804], [2839, 2853], [2873, 2874], [3101, 3107], [3131, 3148]],
                },
            ],
        },
        Availability: {
            Minutely: ["CN", "HK", "MO"],
            AirQuality: ["AD", "BE", "BG", "CA", "CN", "HR", "CZ", "DK", "FI", "FR", "DE", "GI", "GR", "HK", "HU", "IE", "JP", "KR", "LV", "LT", "MO", "MT", "NL", "MK", "NO", "PL", "PT", "RO", "RS", "SG", "SK", "SI", "ES", "SE", "CH", "TW", "TH", "GB", "US"],
        },
    };

    static async GetLocationsGrid(qweatherCache, setCache) {
        Console.info("☑️ GetLocationsGrid");
        const locationsGrid = qweatherCache?.locationsGrid;
        // cache within 30 days
        if (locationsGrid?.lastUpdated && locationsGrid.lastUpdated + 30 * 24 * 60 * 60 * 1000 > Date.now()) {
            Console.info("✅ GetLocationsGrid", "Cache found!");
            return locationsGrid.data;
        } else {
            Console.info("⚠️ GetLocationsGrid", "Cache not found or stale, fetching...");
            const response = await fetch({
                headers: locationsGrid?.etag ? { "If-None-Match": locationsGrid?.etag } : undefined,
                url: "https://raw.githubusercontent.com/NSRingo/QWeather-Location-Grid/refs/heads/main/data/qweather-china-city-list-grid.json",
            });

            if (response.status === 304) {
                Console.info("✅ GetLocationsGrid", "Cache not modified");
                setCache({ ...qweatherCache, locationsGrid: { ...locationsGrid, lastUpdated: Date.now() } });
                return locationsGrid.data;
            }

            const newLocationsGrid = JSON.parse(response.body);
            setCache({
                ...qweatherCache,
                locationsGrid: { etag: response.headers.ETag, lastUpdated: Date.now(), data: newLocationsGrid },
            });
            Console.info("✅ GetLocationsGrid");
            return newLocationsGrid;
        }
    }

    // Codes by Claude AI
    static GetLocationInfo(locationsGrid, latitude, longitude) {
        Console.info("☑️ GetLocationInfo");

        const { gridSize, grid } = locationsGrid;

        // Haversine距离计算
        const distance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // 地球半径(km)
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLng = ((lng2 - lng1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const getNearbyGridKeys = (lat, lng, radius = 2) => {
            const centerX = Math.floor(lng / gridSize);
            const centerY = Math.floor(lat / gridSize);
            const keys = [];

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    keys.push(`${centerX + dx},${centerY + dy}`);
                }
            }

            return keys;
        };

        const findNearestFast = (lat, lng) => {
            const keys = getNearbyGridKeys(lat, lng, 2);
            let nearest = null;
            let minDist = Number.POSITIVE_INFINITY;

            for (const key of keys) {
                const locations = grid[key];
                if (!locations) continue;

                for (const loc of locations) {
                    const dist = distance(lat, lng, loc.latitude, loc.longitude);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = loc;
                    }
                }
            }

            return nearest;
        };

        const nearest = findNearestFast(latitude, longitude);
        Console.info("✅ GetLocationInfo");
        return nearest;
    }

    /**
     * 从 FlatBuffer 的 QWeather 预警页面链接中提取地区标识。
     * Extract the location identifier from a FlatBuffer QWeather severe-weather URL.
     * @param {string | null | undefined} value 预警页面链接 / Severe-weather URL.
     * @returns {string | undefined} 地区标识 / Location identifier.
     */
    static ParseWeatherAlertPageURL(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:" || url.hostname !== "www.qweather.com") return undefined;
            if (url.search !== "?from=AppleWeatherService" || url.hash) return undefined;
            return decodeURIComponent(url.pathname).match(/^\/{1,2}(?:en\/)?severe-weather\/([^/]+)\.html$/)?.[1];
        } catch {
            return undefined;
        }
    }

    /**
     * 生成 QWeather 灾害预警页面链接。
     * Build a QWeather severe-weather page URL.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @param {boolean} includeAppleSource 是否附加 Apple 来源参数 / Whether to append the Apple source parameter.
     * @returns {URL} QWeather 页面链接 / QWeather page URL.
     */
    static BuildWeatherAlertPageURL(identifier, language = "zh-CN", includeAppleSource = true) {
        identifier = identifier?.trim();
        const url = new URL("https://www.qweather.com");
        url.pathname = language.toLowerCase().startsWith("en") ? `/en/severe-weather/${identifier}.html` : `/severe-weather/${identifier}.html`;
        if (includeAppleSource) url.searchParams.set("from", "AppleWeatherService");
        return url;
    }

    /**
     * 生成内部使用的 Apple 天气预警详情链接。
     * Build the internally rewritten Apple weather alert details URL.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @returns {string} Apple 预警详情链接 / Apple alert details URL.
     */
    static BuildAppleAlertDetailsURL(identifier, language = "zh-CN") {
        return `https://weatherkit.apple.com/alertDetails/index.html?ids=${encodeURIComponent(identifier)}&lang=${encodeURIComponent(language)}&party=qweather`;
    }

    /**
     * 从 QWeather HTML 提取原始预警来源记录。
     * Extract raw alert source records from QWeather HTML.
     * @param {string} html QWeather 页面 HTML / QWeather page HTML.
     * @returns {{alerts: Array<object>, areaName: string, source: string}} 提取后的来源集合 / Extracted source collection.
     */
    static ExtractWeatherAlertPage(html) {
        const sourceHtml = String(html ?? "");
        let city = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<h1[^>]*class=["'][^"']*c-submenu__location[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
        if (!city) {
            const titleText = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<title>([\s\S]*?)<\/title>/i);
            city = titleText.replace(/\s*(?:severe weather warning|灾害预警|天气预警).*$/i, "").trim();
        }
        const administration = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<span[^>]*class=["'][^"']*c-submenu__location-adm[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
        const dataSource = QWeather.#FirstWeatherAlertPageMatch(sourceHtml, /<a[^>]*class=["'][^"']*data-source__txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
            .replace(/^(?:预警数据来源|Warning data source)\s*[:：]\s*/i, "")
            .trim();
        const starts = Array.from(sourceHtml.matchAll(/<div[^>]*class=["']([^"']*\bc-city-warning-events\b[^"']*)["'][^>]*>/gi), match => ({
            index: match.index,
            contentStart: match.index + match[0].length,
            className: match[1],
        }));
        const alerts = [];

        for (const [index, start] of starts.entries()) {
            let end = index + 1 < starts.length ? starts[index + 1].index : sourceHtml.length;
            const nearby = sourceHtml.indexOf('<div class="c-city-warning-around">', start.contentStart);
            if (nearby !== -1 && nearby < end) end = nearby;
            const block = sourceHtml.slice(start.contentStart, end);
            const description = QWeather.#FirstWeatherAlertPageMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i);
            const issueText = QWeather.#FirstWeatherAlertPageMatch(block, /<p[^>]*>\s*((?:Issue\s+date|发布\s*日期)\s*[:：][\s\S]*?)<\/p>/i)
                .replace(/^(?:Issue\s+date|发布\s*日期)\s*[:：]\s*/i, "")
                .trim();
            const message = QWeather.#FirstWeatherAlertPageMatch(block, /<p[^>]*class=["'][^"']*warning-events__txt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
            const standardBlock = block.match(/<div[^>]*class=["'][^"']*warning-explain[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const standard = QWeather.#FirstWeatherAlertPageMatch(standardBlock, /<h4[^>]*>[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
            const guideBlock = block.match(/<div[^>]*class=["'][^"']*warning-defense__txt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const guidelines = Array.from(guideBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), match =>
                QWeather.#DecodeWeatherAlertPageHTML(match[1])
                    .replace(/^\s*\d+[.、]\s*/, "")
                    .trim(),
            ).filter(Boolean);
            const normalizedIssueText = issueText && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(issueText) ? `${issueText.replace(" ", "T")}+08:00` : issueText;
            const issueDate = new Date(normalizedIssueText);
            if ((!description && !message) || Number.isNaN(issueDate.getTime())) continue;
            const headline = description || message;
            const parsedHeadline = QWeather.#ParseWeatherAlertPageHeadline(headline);
            const source = parsedHeadline.source || dataSource || "QWeather";

            const severitySource = `${start.className} ${description}`.toLowerCase();
            let severity = "unknown";
            switch (true) {
                case /warning--red|红色|\bred\b/.test(severitySource):
                    severity = "extreme";
                    break;
                case /warning--orange|橙色|\borange\b/.test(severitySource):
                    severity = "severe";
                    break;
                case /warning--yellow|黄色|\byellow\b/.test(severitySource):
                    severity = "moderate";
                    break;
                case /warning--blue|蓝色|\bblue\b/.test(severitySource):
                    severity = "minor";
                    break;
            }

            alerts.push({
                description: headline,
                ...(parsedHeadline.eventName ? { eventName: parsedHeadline.eventName } : {}),
                guidelines,
                issuedTime: issueDate.toISOString(),
                message,
                reportedAt: issueDate.toISOString(),
                severity,
                source,
                standard,
            });
        }

        return {
            alerts,
            areaName: city || administration,
            source: alerts.find(alert => alert?.source)?.source || dataSource || "QWeather",
        };
    }

    /**
     * 抓取并提取 QWeather 灾害预警页面。
     * Fetch and extract a QWeather severe-weather page.
     * @param {string} identifier 地区标识 / Location identifier.
     * @param {string} language WeatherKit 语言 / WeatherKit language.
     * @param {Record<string, string | string[] | undefined>} requestHeaders 原请求头 / Original request headers.
     * @returns {Promise<{alerts: Array<object>, areaName: string, source: string}>} 来源集合 / Source collection.
     */
    static async FetchWeatherAlertPage(identifier, language = "zh-CN", requestHeaders = {}) {
        const sourceUrl = QWeather.BuildWeatherAlertPageURL(identifier, language);
        const normalizedHeaders = Object.fromEntries(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), value]));
        const sourceHeaders = {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": normalizedHeaders["accept-language"] ?? language,
            Referer: "https://www.qweather.com/",
        };
        if (normalizedHeaders["user-agent"]) sourceHeaders["User-Agent"] = normalizedHeaders["user-agent"];

        Console.info("☑️ QWeather.FetchWeatherAlertPage", `url: ${sourceUrl}`, `language: ${language}`);
        const sourceResponse = await fetch({
            url: sourceUrl.toString(),
            headers: sourceHeaders,
            "auto-cookie": false,
        });
        const contentType = sourceResponse.headers?.["Content-Type"] ?? sourceResponse.headers?.["content-type"] ?? "";
        Console.info("QWeather.FetchWeatherAlertPage", `status: ${sourceResponse.statusCode ?? sourceResponse.status}`, `contentType: ${contentType || "undefined"}`);
        if (!sourceResponse.ok) {
            Console.warn("QWeather.FetchWeatherAlertPage", `upstreamStatus: ${sourceResponse.statusCode ?? sourceResponse.status}`);
            return { alerts: [], areaName: "", source: "QWeather" };
        }
        if (!contentType.toLowerCase().includes("text/html")) {
            Console.warn("QWeather.FetchWeatherAlertPage", `unexpectedContentType: ${contentType || "undefined"}`);
            return { alerts: [], areaName: "", source: "QWeather" };
        }
        const html = String(sourceResponse.body ?? "");
        const sourceSize = new TextEncoder().encode(html).byteLength;
        Console.debug("QWeather.FetchWeatherAlertPage", `bodyBytes: ${sourceSize}`);
        if (sourceSize > QWeather.#MaximumWeatherAlertPageSize) throw new RangeError("QWeather alert page is too large");

        const extracted = QWeather.ExtractWeatherAlertPage(html);
        Console.info("✅ QWeather.FetchWeatherAlertPage", `alerts: ${extracted.alerts.length}`, `source: ${extracted.source}`);
        const areaId = identifier.match(/-(\d+)$/)?.[1];
        return {
            ...extracted,
            alerts: extracted.alerts.map(alert => ({
                ...alert,
                ...(areaId && !alert.areaId ? { areaId } : {}),
                ...(extracted.areaName && !alert.areaName ? { areaName: extracted.areaName } : {}),
            })),
        };
    }

    async GeoAPI(path = "city/lookup") {
        Console.info("☑️ GeoAPI");
        const request = {
            url: `${this.endpoint}/geo/v2/${path}?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let metadata;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200":
                    metadata = {
                        attributionUrl: body?.location?.[0]?.fxLink,
                        latitude: body?.location?.[0]?.lat,
                        longitude: body?.location?.[0]?.lon,
                        providerName: "和风天气",
                        locationID: body?.location?.[0]?.id,
                    };
                    break;
                default:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`GeoAPI: ${error}`);
        } finally {
            Console.debug(`metadata: ${JSON.stringify(metadata, null, 2)}`);
            Console.info("✅ GeoAPI");
        }
        return metadata;
    }

    /**
     * 拉取 QWeather weatheralert/v1/current，并标准化为 WeatherAlerts.Build 可消费的来源结构。
     * Fetch QWeather weatheralert/v1/current and normalize it for WeatherAlerts.Build.
     * @returns {Promise<{metadata: object, detailsUrl: string, alerts: Array<object>, areaName: string, source: string}>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlert() {
        Console.info("☑️ WeatherAlert");
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: "https://developer.qweather.com/attribution.html",
            },
            detailsUrl: `https://weatherkit.apple.com/alertDetails/index.html?ids=${this.latitude},${this.longitude}&lang=${encodeURIComponent(this.weatherKitLanguage)}&party=QWeather`,
            alerts: [],
            areaName: "",
            source: "国家预警信息发布中心",
        };
        const request = {
            url: `${this.endpoint}/weatheralert/v1/current/${this.latitude}/${this.longitude}?lang=${this.language}`,
            headers: {
                ...this.headers,
                Accept: "application/json",
            },
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            const response = await fetch(request);
            const body = JSON.parse(response?.body ?? "{}");
            if (response?.ok === false) {
                Console.warn("WeatherAlert", `upstreamStatus: ${response.statusCode ?? response.status}`);
                return failedWeatherAlerts;
            }
            if (!body?.metadata || !Array.isArray(body?.alerts)) throw Error(JSON.stringify(body?.error ?? body?.code ?? body));
            weatherAlerts = { ...failedWeatherAlerts, ...this.#CreateWeatherAlerts(body) };
        } catch (error) {
            Console.error(`WeatherAlert: ${error}`);
        } finally {
            Console.info("✅ WeatherAlert");
        }
        return weatherAlerts;
    }

    /**
     * 拉取 QWeather 灾害预警页面，并生成 WeatherKit 顶级预警对象。
     * Fetch a QWeather severe-weather page and build a top-level WeatherKit alert object.
     * @param {string | URL | null | undefined} url QWeather 预警页面链接 / QWeather severe-weather page URL.
     * @returns {Promise<object | undefined>} WeatherKit 顶级预警对象 / Top-level WeatherKit alert object.
     */
    async WeatherAlertWeb(url) {
        Console.info("☑️ WeatherAlertWeb");
        const identifier = QWeather.ParseWeatherAlertPageURL(url);
        if (!identifier) {
            Console.info("✅ WeatherAlertWeb", "Unsupported URL");
            return undefined;
        }
        const failedWeatherAlerts = {
            metadata: {
                attributionUrl: String(url),
            },
            detailsUrl: QWeather.BuildAppleAlertDetailsURL(identifier, this.weatherKitLanguage),
            alerts: [],
            areaName: "",
            source: "QWeather",
        };
        let weatherAlerts = failedWeatherAlerts;
        try {
            weatherAlerts = { ...failedWeatherAlerts, ...(await QWeather.FetchWeatherAlertPage(identifier, this.weatherKitLanguage)) };
        } catch (error) {
            Console.error(`WeatherAlertWeb: ${error}`);
        } finally {
            Console.info("✅ WeatherAlertWeb");
        }
        return weatherAlerts;
    }

    async WeatherNow() {
        Console.info("☑️ WeatherNow");
        const request = {
            url: `${this.endpoint}/v7/weather/now?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let currentWeather;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    currentWeather = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime: (new Date(body?.now?.pubTime).getTime() / 1000) | 0,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        cloudCover: Number.parseInt(body?.now?.cloud, 10),
                        ...Weather.ConvertWeatherCodeField(body?.now?.text),
                        humidity: Number.parseInt(body?.now?.humidity, 10),
                        perceivedPrecipitationIntensity: Number.parseFloat(body?.now?.precip),
                        pressure: Number.parseFloat(body?.now?.pressure),
                        temperature: Number.parseFloat(body?.now?.temp),
                        temperatureApparent: Number.parseFloat(body?.now?.feelsLike),
                        temperatureDewPoint: Number.parseFloat(body?.now?.dew),
                        visibility: Number.parseFloat(body?.now?.vis) * 1000,
                        windDirection: Number.parseInt(body?.now?.wind360, 10),
                        windSpeed: Number.parseFloat(body?.now?.windSpeed),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`WeatherNow: ${error}`);
        } finally {
            //Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
            Console.info("✅ WeatherNow");
        }
        return currentWeather;
    }

    async AirNow() {
        Console.info("☑️ AirNow");
        const request = {
            url: `${this.endpoint}/v7/air/now?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    airQuality = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime: (new Date(body?.now?.pubTime).getTime() / 1000) | 0,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        categoryIndex: Number.parseInt(body?.now?.level, 10),
                        index: Number.parseInt(body?.now?.aqi, 10),
                        isSignificant: false,
                        pollutants: this.#CreatePollutantsV7(body?.now),
                        previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
                        primaryPollutant: this.#Config.Pollutants[body?.now?.primary] || "NOT_AVAILABLE",
                        scale: "HJ6332012",
                    };
                    if (body?.refer?.sources?.[0]) airQuality.metadata.providerName += `\n数据源: ${body?.refer?.sources?.[0]}`;
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`AirNow: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AirNow");
        }
        return airQuality;
    }

    async #AirQualityCurrent() {
        Console.info("☑️ AirQualityCurrent");

        if (this.#cache.airQualityCurrent?.metadata?.tag && !this.#cache.airQualityCurrent?.error) {
            Console.info("✅ AirQualityCurrent", "Using cache");
            return this.#cache.airQualityCurrent;
        }

        const request = {
            url: `${this.endpoint}/airquality/v1/current/${this.latitude}/${this.longitude}`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.error) {
                case undefined: {
                    this.#cache.airQualityCurrent = body;
                    return body;
                }
                default:
                    throw Error(JSON.stringify(body?.error, null, 2));
            }
        } catch (error) {
            Console.error(`AirQualityCurrent: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AirQualityCurrent");
        }
        return {};
    }

    async Minutely() {
        Console.info("☑️ Minutely");
        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.Minutely.includes(this.country)) {
            Console.warn("Minutely", `Unsupported country: ${this.country}`);
            return;
        }

        const request = {
            url: `${this.endpoint}/v7/minutely/5m?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastNextHour;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    const reportedTime = Math.trunc(new Date(body?.updateTime).getTime() / 1000);
                    let minuteStemp = new Date(body?.updateTime).setSeconds(0, 0);
                    minuteStemp = minuteStemp.valueOf() / 1000;
                    forecastNextHour = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + ForecastNextHour.ExpirationInterval,
                            language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            reportedTime,
                            temporarilyUnavailable: false,
                            sourceType: "MODELED",
                        },
                        condition: [],
                        forecastEnd: 0,
                        forecastStart: minuteStemp,
                        minutes: body?.minutely
                            ?.map((minutely, index) => {
                                const minute = {
                                    perceivedPrecipitationIntensity: 0,
                                    precipitationChance: 0,
                                    precipitationIntensity: Number.parseFloat(minutely.precip) * 12,
                                    startTime: new Date(minutely.fxTime) / 1000,
                                };
                                let minutes = [{ ...minute }, { ...minute }, { ...minute }, { ...minute }, { ...minute }];
                                minutes = minutes.map((minute, index) => {
                                    minute.startTime = minute.startTime + index * 60;
                                    return minute;
                                });
                                return minutes;
                            })
                            .flat(Number.POSITIVE_INFINITY),
                        summary: [],
                    };
                    forecastNextHour.minutes.length = Math.min(85, forecastNextHour.minutes.length);
                    forecastNextHour.forecastEnd = minuteStemp + 60 * forecastNextHour.minutes.length;
                    forecastNextHour.minutes = ForecastNextHour.Minute(forecastNextHour.minutes, body?.summary, "mmph");
                    forecastNextHour.summary = ForecastNextHour.Summary(forecastNextHour.minutes);
                    forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Minutely: ${error}`);
        } finally {
            //Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
            Console.info("✅ Minutely");
        }
        return forecastNextHour;
    }

    async Hourly(hours = 168) {
        Console.info("☑️ Hourly", `host: ${this.host}`);
        const request = {
            url: `${this.endpoint}/v7/weather/${hours}h?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastHourly;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    forecastHourly = {
                        metadata: {
                            attributionUrl: body?.fxLink,
                            expireTime: timeStamp + 60 * 60,
                            language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                            latitude: this.latitude,
                            longitude: this.longitude,
                            providerLogo: providerNameToLogo("和风天气", this.version),
                            providerName: "和风天气",
                            readTime: timeStamp,
                            // WeatherKit metadata 的 uint 时间字段使用 Unix epoch 秒，不能写入 Date 的毫秒值。
                            reportedTime: Math.trunc(new Date(body?.updateTime).getTime() / 1000),
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                        },
                        hours: body?.hourly?.map(hourly => {
                            return {
                                cloudCover: Number.parseInt(hourly?.cloud, 10),
                                // cloudCoverHighAltPct: 0, // Not given
                                // cloudCoverLowAltPct: 0, // Not given
                                // cloudCoverMidAltPct: 0, // Not given
                                ...Weather.ConvertWeatherCodeField(hourly?.text),
                                // daylight: false, // Not given
                                forecastStart: (new Date(hourly?.fxTime).getTime() / 1000) | 0,
                                humidity: Number.parseInt(hourly?.humidity, 10),
                                // perceivedPrecipitationIntensity: "", // Not given
                                precipitationAmount: Number.parseFloat(hourly?.precip),
                                precipitationChance: Number.parseInt(hourly?.pop, 10),
                                precipitationIntensity: Number.parseInt(hourly?.precip, 10),
                                // precipitationType: "", // Not given
                                pressure: Number.parseFloat(hourly?.pressure),
                                // pressureTrend: "", // Not given
                                // snowfallAmount: 0, // Not given
                                // snowfallIntensity: 0, // Not given
                                temperature: Number.parseFloat(hourly?.temp),
                                // temperatureApparent: 0, // Not given
                                temperatureDewPoint: Number.parseFloat(hourly?.dew),
                                // uvIndex: 0, // Not given
                                // visibility: 0, // Not given
                                windDirection: Number.parseInt(hourly?.wind360, 10),
                                // windGust: 0, // Not given
                                windSpeed: Number.parseFloat(hourly?.windSpeed),
                            };
                        }),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Hourly: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(forecastHourly, null, 2)}`);
            Console.info("✅ Hourly");
        }
        return forecastHourly;
    }

    async Daily(days = 10) {
        Console.info("☑️ Daily", `host: ${this.host}`);
        const request = {
            url: `${this.endpoint}/v7/weather/${days}d?location=${this.longitude},${this.latitude}`,
            headers: this.headers,
        };
        let forecastDaily;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    const reportedTime = new Date(body?.updateTime);
                    const metadata = {
                        attributionUrl: body?.fxLink,
                        expireTime: timeStamp + 60 * 60,
                        language: "zh-CN", // `${this.language}-${this.country}`, // body?.lang,
                        latitude: this.latitude,
                        longitude: this.longitude,
                        providerLogo: providerNameToLogo("和风天气", this.version),
                        providerName: "和风天气",
                        readTime: timeStamp,
                        // WeatherKit metadata 的 uint 时间字段使用 Unix epoch 秒，不能写入 Date 的毫秒值。
                        reportedTime: Math.trunc(reportedTime.getTime() / 1000),
                        temporarilyUnavailable: false,
                        sourceType: "STATION",
                    };
                    const timezoneOffset = reportedTime.getTimezoneOffset();
                    forecastDaily = {
                        metadata: metadata,
                        days: body?.daily?.map(daily => {
                            const timeStamp = ((Date.parse(daily?.fxDate) / 1000) | 0) + timezoneOffset * 60; // 本地转 Unix 时间戳
                            return {
                                forecastStart: timeStamp,
                                forecastEnd: timeStamp + 24 * 3600, // 24 hours
                                // conditionCode: Weather.ConvertWeatherCode(daily?.textDay), // Not given (用白天数据代替)
                                // humidity 用一整天的数据代替
                                // humidityMax: daily?.humidity, // Not Accurate
                                // humidityMin: daily?.humidity, // Not Accurate
                                maxUvIndex: Number.parseInt(daily?.uvIndex, 10),
                                moonPhase: Weather.ConvertMoonPhase(daily?.moonPhase),
                                moonrise: this.#ConvertTimeStamp(daily?.fxDate, daily?.moonrise),
                                moonset: this.#ConvertTimeStamp(daily?.fxDate, daily?.moonset),
                                // QWeather does not provide WeatherKit's paired by-type totals.
                                // Keep Apple's scalar/by-type amount pair atomic during the merge.
                                // precipitationAmountByType: [], // Not given
                                // precipitationChance: 0, // Not given
                                // precipitationType: "", // Not given
                                // snowfallAmount: 0, // Not given
                                // solarMidnight: 0, // Not given
                                // solarNoon: 0, // Not given
                                sunrise: this.#ConvertTimeStamp(daily?.fxDate, daily?.sunrise),
                                // sunriseAstronomical: 0, // Not given
                                // sunriseCivil: 0, // Not given
                                // sunriseNautical: 0, // Not given
                                sunset: this.#ConvertTimeStamp(daily?.fxDate, daily?.sunset),
                                // sunsetAstronomical: 0, // Not given
                                // sunsetCivil: 0, // Not given
                                // sunsetNautical: 0, // Not given
                                temperatureMax: Number.parseFloat(daily?.tempMax),
                                // temperatureMaxTime: 0, // Not given
                                temperatureMin: Number.parseFloat(daily?.tempMin),
                                // temperatureMinTime: 0, // Not given
                                // visibilityMax: 0, // Not given
                                // visibilityMin: 0, // Not given
                                // windGustSpeedMax: 0, // Not given
                                windSpeedAvg: (Number.parseFloat(daily?.windSpeedDay) * 7 + Number.parseFloat(daily?.windSpeedNight) * 17) / 24, // 加权平均：白天7小时，晚上17小时
                                // windSpeedMax: 0, // Not given
                                daytimeForecast: {
                                    forecastStart: timeStamp + 7 * 3600, // 7 hours
                                    forecastEnd: timeStamp + 7 * 3600 + 12 * 3600, // 7 + 12 hours
                                    // cloudCover: 0, // Not given
                                    // cloudCoverHighAltPct: 0, // Not given
                                    // cloudCoverLowAltPct: 0, // Not given
                                    // cloudCoverMidAltPct: 0, // Not given
                                    ...Weather.ConvertWeatherCodeField(daily?.textDay),
                                    // humidity 用一整天的数据代替
                                    // humidityMax: daily?.humidity, // Not Accurate
                                    // humidityMin: daily?.humidity, // Not Accurate
                                    // The daily total cannot be reused as a daytime-only accumulated amount.
                                    // precipitationAmountByType: [], // Not given
                                    // precipitationChance: 0, // Not given
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // temperatureMax: 0, // Not given
                                    // temperatureMin: 0, // Not given
                                    // visibility 用一整天的数据代替
                                    // visibilityMax: 0, // Not given
                                    // visibilityMin: 0, // Not given
                                    windDirection: Number.parseInt(daily?.wind360Day, 10),
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeed: Number.parseFloat(daily?.windSpeedDay),
                                    // windSpeedMax: 0, // Not given
                                },
                                overnightForecast: {
                                    forecastStart: timeStamp + 19 * 3600, // 19 hours
                                    forecastEnd: timeStamp + 19 * 3600 + 12 * 3600, // 19 + 12 hours
                                    // cloudCover: 0, // Not given
                                    // cloudCoverHighAltPct: 0, // Not given
                                    // cloudCoverLowAltPct: 0, // Not given
                                    // cloudCoverMidAltPct: 0, // Not given
                                    ...Weather.ConvertWeatherCodeField(daily?.textNight),
                                    // humidity 用一整天的数据代替
                                    // humidityMax: daily?.humidity, // Not Accurate
                                    // humidityMin: daily?.humidity, // Not Accurate
                                    // The daily total cannot be reused as an overnight-only accumulated amount.
                                    // precipitationAmountByType: [], // Not given
                                    // precipitationChance: 0, // Not given
                                    // precipitationType: "", // Not given
                                    // snowfallAmount: 0, // Not given
                                    // temperatureMax: 0, // Not given
                                    // temperatureMin: 0, // Not given
                                    // visibility 用一整天的数据代替
                                    // visibilityMax: 0, // Not given
                                    // visibilityMin: 0, // Not given
                                    windDirection: Number.parseInt(daily?.wind360Night, 10),
                                    // windGustSpeedMax: 0, // Not given
                                    windSpeed: Number.parseFloat(daily?.windSpeedNight),
                                    // windSpeedMax: 0, // Not given
                                },
                            };
                        }),
                    };
                    break;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`Daily: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(forecastDaily, null, 2)}`);
            Console.info("✅ Daily");
        }
        return forecastDaily;
    }

    async #HistoricalAir(locationID = new Number(), date = time("yyyyMMdd", Date.now() - 24 * 60 * 60 * 1000)) {
        Console.info("☑️ HistoricalAir", `locationID: ${locationID}`, `date: ${date}`);
        const request = {
            url: `${this.endpoint}/v7/historical/air?location=${locationID}&date=${date}`,
            headers: this.headers,
        };
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.code) {
                case "200": {
                    return body;
                }
                case "204":
                case "400":
                case "401":
                case "402":
                case "403":
                case "404":
                case "429":
                case "500":
                case undefined:
                    throw Error(body?.code);
            }
        } catch (error) {
            Console.error(`HistoricalAir: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ HistoricalAir");
        }
        return {};
    }

    #CreateWeatherAlerts(body) {
        Console.info("☑️ CreateWeatherAlerts");
        const convertedAlerts = (Array.isArray(body?.alerts) ? body.alerts : []).map(alert => this.#CreateWeatherAlert(alert)).filter(Boolean);
        Console.info("✅ CreateWeatherAlerts");
        return {
            alerts: convertedAlerts,
            areaName: convertedAlerts.find(alert => alert?.areaName)?.areaName ?? "",
            source: convertedAlerts.find(alert => alert?.source)?.source || (Array.isArray(body?.metadata?.attributions) ? body.metadata.attributions : []).find(item => item && !/延迟|过时|disclaimer|delayed|outdated/i.test(item)) || "国家预警信息发布中心",
        };
    }

    /**
     * 将单条 QWeather 预警转成 Apple alertDetails JSON 的中间记录。
     * Convert one QWeather alert item to the intermediate record used by Apple alertDetails JSON.
     * @param {any} alert QWeather alerts[] 项；senderName 为签发者，areaName 为受影响区域，onsetTime 为事件开始时间，eventType.name 为本地化事件名，eventType.code 用于分类和 token。
     * QWeather alerts[] item; senderName is the issuer, areaName is the affected area, onsetTime is the event onset, eventType.name is the localized event name, and eventType.code supplies the category and token.
     * @returns {object | undefined} 标准化后的预警记录 / Normalized alert record.
     */
    #CreateWeatherAlert(alert) {
        const issuedTime = this.#DateISOString(alert?.issuedTime || alert?.effectiveTime);
        if (!issuedTime) return undefined;
        const effectiveTime = this.#DateISOString(alert?.effectiveTime) || issuedTime;
        const expireTime = this.#DateISOString(alert?.expiresTime || alert?.expireTime);
        const eventOnsetTime = this.#DateISOString(alert?.eventOnsetTime || alert?.onsetTime || alert?.effectiveTime) || effectiveTime;
        const eventEndTime = this.#DateISOString(alert?.eventEndTime || alert?.endTime || alert?.expiresTime || alert?.expireTime);
        const source = String(alert?.senderName ?? "").trim();
        const areaId = String(alert?.areaId ?? alert?.areaCode ?? "").trim();
        const areaName = String(alert?.areaName ?? "").trim();
        const token = String(alert?.token ?? alert?.eventType?.code ?? alert?.icon ?? "").trim();
        const eventCode = Number(alert?.eventType?.code);
        const eventName = String(alert?.eventType?.name ?? "").trim();
        return {
            ...(areaId ? { areaId } : {}),
            ...(areaName ? { areaName } : {}),
            certainty: alert?.certainty ?? "unknown",
            description: String(alert?.headline ?? "").trim(),
            effectiveTime,
            ...(eventEndTime ? { eventEndTime } : {}),
            eventOnsetTime,
            ...(expireTime ? { expireTime } : {}),
            guidelines: this.#SplitWeatherAlertGuidelines(alert?.instruction ?? alert?.instructions),
            identifier: alert?.id,
            ...(alert?.importance ? { importance: alert.importance } : {}),
            issuedTime,
            ...(eventName ? { eventName } : {}),
            message: (String(alert?.description ?? "").trim() || String(alert?.headline ?? "").trim()).replace(/^\p{Ll}/u, character => character.toUpperCase()),
            phenomenon: (this.#Config.WeatherAlert.EventCategories.find(({ codes }) => codes.some(([start, end]) => eventCode >= start && eventCode <= end))?.category ?? eventName) || "Other",
            responses: Array.isArray(alert?.responseTypes) ? alert.responseTypes.map(response => String(response ?? "").trim()).filter(Boolean) : [],
            reportedAt: issuedTime,
            ...(alert?.significance ? { significance: alert.significance } : {}),
            ...(source ? { source } : {}),
            severity: alert?.severity ?? "unknown",
            standard: "",
            ...(token ? { token } : {}),
            urgency: alert?.urgency ?? "unknown",
        };
    }

    #Metadata(attributionUrl = `https://www.qweather.com/`, sourceType = "MODELED", temporarilyUnavailable = false) {
        const timeStamp = Date.now() / 1000;
        return {
            longitude: this.longitude,
            providerName: "和风天气",
            providerLogo: providerNameToLogo("和风天气", this.version),
            reportedTime: timeStamp,
            latitude: this.latitude,
            expireTime: timeStamp + 60 * 60,
            attributionUrl,
            temporarilyUnavailable,
            readTime: timeStamp,
            sourceType,
        };
    }

    /**
     * 创建 WeatherKit 格式污染物对象（airquality/v1/current 数据源）。
     * @link https://dev.qweather.com/docs/airquality/
     * @param {Array<{
     *   code: string,
     *   concentration: { value: number, unit: string },
     *   subIndexes?: Array<{ code: string, aqi: number }>
     * }>} pollutantsObj - 原始污染物数组。
     * @param {string} [scaleCode] - 目标指数口径 code（如 cn-mee / us-epa）。
     * @returns {Array<{
     *   pollutantType: string,
     *   amount: number,
     *   units: string,
     *   index?: number
     * }>} 转换后的污染物数组。
     */
    #CreatePollutants(pollutantsObj, scaleCode) {
        Console.info("☑️ CreatePollutants");
        Console.debug(`pollutantsObj: ${JSON.stringify(pollutantsObj)}`);

        // TODO: what is ppmC? https://dev.qweather.com/docs/resource/air-info/#pollutants
        const pollutants = pollutantsObj
            .filter(pollutant => pollutant.concentration.unit !== "ppmC")
            .map(({ code, concentration, subIndexes = [] }) => {
                const { value, unit } = concentration;
                const pollutantType = this.#Config.Pollutants[code];
                const indexObj = subIndexes.find(subIndex => subIndex.code === scaleCode);
                if (scaleCode && !indexObj) Console.warn("CreatePollutants", `No index for ${pollutantType} was found for required scale`);

                const friendlyUnits = AirQuality.Config.Units.Friendly;
                const { ugm3, mgm3, ppb, ppm } = AirQuality.Config.Units.WeatherKit;
                switch (unit) {
                    case friendlyUnits.MILLIGRAMS_PER_CUBIC_METER:
                        return { pollutantType, amount: AirQuality.ConvertUnit(value, mgm3, ugm3), units: ugm3, index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                    case friendlyUnits.PARTS_PER_MILLION:
                        return { pollutantType, amount: AirQuality.ConvertUnit(value, ppm, ppb), units: ppb, index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                    default:
                        return { pollutantType, amount: value, units: this.#Config.Units[unit], index: scaleCode ? (indexObj?.aqi ?? -1) : undefined };
                }
            });

        Console.info("✅ CreatePollutants");
        return pollutants;
    }

    /**
     * 创建 WeatherKit 格式污染物对象（v7/air/now 与 historical/air 数据源）。
     * @link https://dev.qweather.com/docs/resource/unit/
     * @param {Object} pollutantsObj - v7 接口返回的污染物键值对象。
     * @returns {Array<{amount: number, pollutantType: string, units: string}>} 转换后的污染物数组。
     */
    #CreatePollutantsV7(pollutantsObj) {
        Console.info("☑️ CreatePollutantsV7");
        Console.debug(`pollutantsObj: ${JSON.stringify(pollutantsObj)}`);

        const { mgm3, ugm3 } = AirQuality.Config.Units.WeatherKit;
        const pollutants = Object.entries(pollutantsObj)
            .map(([name, amount]) => {
                const parsedAmount = Number.parseFloat(amount);
                switch (name) {
                    case "co":
                        return {
                            amount: AirQuality.ConvertUnit(parsedAmount ?? -1, mgm3, ugm3),
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                        };
                    case "no":
                    case "no2":
                    case "so2":
                    case "o3":
                    case "nox":
                    case "pm25":
                    case "pm10":
                        return {
                            amount: parsedAmount ?? -1,
                            pollutantType: this.#Config.Pollutants[name],
                            units: ugm3,
                        };
                    default:
                        return null;
                }
            })
            .filter(Boolean);

        Console.info("✅ CreatePollutantsV7");
        return pollutants;
    }

    async CurrentAirQuality(forcePrimaryPollutant = true) {
        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("CurrentAirQuality", `Unsupported country: ${this.country}`);
            return {
                metadata: this.#Metadata(`https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`, undefined, true),
                pollutants: [],
                previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            };
        }

        const findSupportedIndex = indexes => {
            Console.info("☑️ findSupportedIndex");

            const supportedCodes = ["cn-mee", "cn-mee-1h", "eu-eea", "us-epa", "us-epa-nc"];
            for (const index of indexes) {
                if (supportedCodes.includes(index.code)) {
                    Console.info("✅ indexCodeToScale", `index.code: ${index.code}`);
                    return index;
                }
            }

            return {};
        };

        const indexCodeToScale = code => {
            Console.info("☑️ indexCodeToScale", `code: ${code}`);

            const { HJ6332012, EPA_NowCast, EU_EAQI } = AirQuality.Config.Scales;
            switch (code) {
                // We don't need calcualtion so they are same
                case "cn-mee":
                case "cn-mee-1h":
                    Console.info("✅ indexCodeToScale", "HJ6332012");
                    return HJ6332012;
                case "us-epa":
                case "us-epa-nc":
                    Console.info("✅ indexCodeToScale", "EPA_NowCast");
                    return EPA_NowCast;
                case "eu-eea":
                    Console.info("✅ indexCodeToScale", "EU_EAQI");
                    return EU_EAQI;
                default:
                    Console.error("indexCodeToScale", "不支持的code");
                    return {};
            }
        };

        Console.info("☑️ CurrentAirQuality");
        const airQualityCurrent = await this.#AirQualityCurrent();
        if (!Array.isArray(airQualityCurrent.pollutants)) {
            Console.error("AirQuality", "Failed to get current air quality data.");
            return {
                metadata: this.#Metadata(
                    // TODO: &lang=zh
                    `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
                    undefined,
                    true,
                ),
                pollutants: [],
                previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
            };
        }

        const supportedIndex = findSupportedIndex(airQualityCurrent.indexes);
        const scale = indexCodeToScale(supportedIndex?.code);

        const particularAirQuality = {
            metadata: this.#Metadata(
                // TODO: &lang=zh
                `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
            ),
            pollutants: this.#CreatePollutants(airQualityCurrent.pollutants, supportedIndex?.code),
            previousDayComparison: AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
        };

        if (!supportedIndex?.code || !scale?.categories) {
            Console.error("AirQuality", "No supported index found", `airQualityCurrent.indexes[].code = ${JSON.stringify(airQualityCurrent.indexes?.map(({ code }) => code))}`);
            return {
                ...particularAirQuality,
                index: -1,
                isSignificant: false,
                categoryIndex: -1,
                primaryPollutant: "NOT_AVAILABLE",
                scale: AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.HJ6332012.weatherKitScale),
            };
        }

        const index = Number(supportedIndex.aqi);
        const suppliedCategoryIndex = Number.parseInt(supportedIndex.level, 10);
        // QWeather 允许 level 为 null；此时按同一 scale 的区间回算，避免 NaN 编码成无效等级 0。
        const categoryIndex = Number.isFinite(suppliedCategoryIndex) && suppliedCategoryIndex > 0 ? suppliedCategoryIndex : AirQuality.CategoryIndex(index, scale.categories);
        const apiPrimaryPollutant = this.#Config.Pollutants[supportedIndex.primaryPollutant?.code] || "NOT_AVAILABLE";
        Console.debug(`apiPrimaryPollutant: ${apiPrimaryPollutant}`);

        if (!forcePrimaryPollutant && apiPrimaryPollutant === "NOT_AVAILABLE") {
            Console.info("CurrentAirQuality", "Max index of pollutants is <= 50, primaryPollutant will be NOT_AVAILABLE.");
        }

        const airQuality = {
            metadata: this.#Metadata(
                // TODO: &lang=zh
                `https://www.qweather.com/air/a/${this.latitude},${this.longitude}?from=AppleWeatherService`,
            ),
            categoryIndex,
            index,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            ...particularAirQuality,
            primaryPollutant: apiPrimaryPollutant,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };

        if (airQuality.primaryPollutant === "NOT_AVAILABLE") {
            const calculatedPrimaryPollutant = AirQuality.PrimaryPollutant(particularAirQuality.pollutants, scale.categories);
            const isNotAvailable = !forcePrimaryPollutant && calculatedPrimaryPollutant.index <= 50;
            if (isNotAvailable) {
                Console.info("CurrentAirQuality", `Max index of pollutants ${calculatedPrimaryPollutant.pollutantType} = ${calculatedPrimaryPollutant.index} is <= 50, primaryPollutant will be set to NOT_AVAILABLE.`);
            }
            if (!isNotAvailable) airQuality.primaryPollutant = calculatedPrimaryPollutant.pollutantType;
        }

        Console.info("✅ CurrentAirQuality");
        return airQuality;
    }

    async YesterdayAirQuality(locationInfo) {
        Console.info("☑️ YesterdayAirQuality", `locationInfo ${JSON.stringify(locationInfo)}`);
        const failedAirQuality = {
            metadata: this.#Metadata(undefined, undefined, true),
            categoryIndex: -1,
            pollutants: [],
        };

        // 判断可用性：当前数据源不支持这个国家/地区
        if (!this.#Config.Availability.AirQuality.includes(this.country)) {
            Console.warn("YesterdayAirQuality", `Unsupported country: ${this.country}`);
            return failedAirQuality;
        }

        // Some locationID at Hong Kong and Macau with length 9 is supported
        if (!locationInfo || locationInfo.iso === "TW" || locationInfo.id.length !== 9) {
            Console.error("YesterdayAirQuality", "Unsupported location");
            return failedAirQuality;
        }

        const historicalAir = await this.#HistoricalAir(locationInfo.id);
        if (!historicalAir.airHourly) {
            Console.error("YesterdayAirQuality", `Failed to get HistoricalAir(${locationInfo.id})`);
            return failedAirQuality;
        }

        const hour = new Date().getHours();
        const categoryIndex = Number.parseInt(historicalAir.airHourly[hour].level, 10);
        const index = Number.parseInt(historicalAir.airHourly[hour].aqi, 10);
        const pollutants = this.#CreatePollutantsV7(historicalAir.airHourly[hour]);
        Console.debug(`hour: ${hour}`, `index: ${index}`);

        Console.info("✅ YesterdayAirQuality", `pollutants: ${JSON.stringify(pollutants)}`, `categoryIndex: ${categoryIndex}`);
        return {
            metadata: this.#Metadata(historicalAir.fxLink),
            categoryIndex,
            index,
            pollutants,
            primaryPollutant: this.#Config.Pollutants[historicalAir.airHourly[hour].primary] || "NOT_AVAILABLE",
            scale: AirQuality.ToWeatherKitScale(AirQuality.Config.Scales.HJ6332012.weatherKitScale),
        };
    }

    #ConvertTimeStamp(fxDate, time) {
        const dateTime = `${fxDate}T${time}:00+08:00`;
        return (new Date(dateTime).getTime() / 1000) | 0;
    }

    #DateISOString(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    }

    #SplitWeatherAlertGuidelines(instruction) {
        return String(instruction ?? "")
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*\d+[.、]\s*/, "").trim())
            .filter(Boolean);
    }

    /**
     * 解码 QWeather 灾害预警页面中的 HTML 文本。
     * Decode HTML text from a QWeather severe-weather page.
     * @param {string} value HTML 文本 / HTML text.
     * @returns {string} 纯文本 / Plain text.
     */
    static #DecodeWeatherAlertPageHTML(value) {
        const normalized = String(value ?? "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/&apos;/gi, "&#39;")
            .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
            .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
        return Lodash.unescape(normalized)
            .replace(/\r/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    static #FirstWeatherAlertPageMatch(source, pattern, fallback = "") {
        const match = source.match(pattern);
        return match ? QWeather.#DecodeWeatherAlertPageHTML(match[1]) : fallback;
    }

    static #ParseWeatherAlertPageHeadline(description) {
        const title = String(description ?? "").trim();
        const chinese = title.match(/^(.+?)发布\s*[:：]?\s*(.+)$/);
        if (chinese?.[1] && chinese?.[2]) return { eventName: chinese[2].trim(), source: chinese[1].trim() };

        const cap = title.match(/^(.+?)\s+issued\b[\s\S]*\s+by\s+(.+)$/i);
        if (cap?.[1] && cap?.[2]) return { eventName: cap[1].trim(), source: cap[2].trim() };

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const context = issued[2].trim();
            const capContext = /^(?:for\b|\d{1,2}[/:.-]|\p{L}+\s+(?:\d{1,2}\b|at\b|until\b))/iu.test(context);
            return capContext ? { eventName: issued[1].trim(), source: "" } : { eventName: context, source: issued[1].trim() };
        }

        const issues = title.match(/^(.+?)\s+issues?\b\s*[:：]?\s*(.+)$/i);
        if (issues?.[1] && issues?.[2]) return { eventName: issues[2].trim(), source: issues[1].trim() };
        return { eventName: title, source: "" };
    }
}

class WAQI {
    constructor(parameters, token) {
        this.Name = "WAQI";
        this.Version = "1.4.3";
        Console.log(`🟧 ${this.Name} v${this.Version}`);
        this.headers = { Accept: "application/json" };
        this.token = token;
        this.version = parameters.version;
        this.language = parameters.language;
        this.latitude = parameters.latitude;
        this.longitude = parameters.longitude;
        this.country = parameters.country;
    }

    #Configs = {
        Pollutants: {
            co: "CO",
            no: "NO",
            no2: "NO2",
            so2: "SO2",
            o3: "OZONE",
            nox: "NOX",
            pm25: "PM2_5",
            pm10: "PM10",
            other: "NOT_AVAILABLE",
        },
    };

    /**
     * WAQI 只返回指数，不返回 WeatherKit 所需的分级与带版本 scale。
     * 在数据源边界一次性补齐，避免不同 WAQI 接口各自生成不一致的空气质量对象。
     */
    #NormalizeAirQuality(index, primaryPollutant = "NOT_AVAILABLE") {
        const scale = AirQuality.Config.Scales.WAQI_InstantCast_US;
        const numericIndex = Number.parseInt(index, 10);
        const categoryIndex = AirQuality.CategoryIndex(numericIndex, scale.categories);
        return {
            categoryIndex,
            index: numericIndex,
            isSignificant: categoryIndex >= scale.categories.significantIndex,
            primaryPollutant,
            scale: AirQuality.ToWeatherKitScale(scale.weatherKitScale),
        };
    }

    async Nearest(mapqVersion = "mapq") {
        Console.info("☑️ Nearest", `mapqVersion: ${mapqVersion}`);
        const request = {
            url: `https://api.waqi.info/${mapqVersion}/nearest?n=1&geo=1/${this.latitude}/${this.longitude}`,
            //"url": `https://mapq.waqi.info/${mapqVersion}/nearest/station/${stationId}?n=1`,
            headers: this.headers,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (mapqVersion) {
                case "mapq":
                    switch (body?.status) {
                        default:
                        case undefined: {
                            const timeStamp = (Date.now() / 1000) | 0;
                            airQuality = {
                                metadata: {
                                    attributionUrl: request.url,
                                    expireTime: timeStamp + 60 * 60,
                                    language: `${this.language}-${this.country}`,
                                    latitude: body?.d?.[0]?.geo?.[0],
                                    longitude: body?.d?.[0]?.geo?.[1],
                                    providerLogo: providerNameToLogo("WAQI", this.version),
                                    providerName: `World Air Quality Index Project\n监测站：${body?.d?.[0]?.nna}`,
                                    readTime: timeStamp,
                                    reportedTime: body?.d?.[0]?.t,
                                    temporarilyUnavailable: false,
                                    sourceType: "STATION",
                                    stationId: Number.parseInt(body?.d?.[0]?.x, 10),
                                    stationKey: body?.d?.[0]?.k,
                                },
                                ...this.#NormalizeAirQuality(body?.d?.[0]?.v, this.#Configs.Pollutants[body?.d?.[0]?.pol] || "NOT_AVAILABLE"),
                                //"previousDayComparison": "UNKNOWN",
                            };
                            break;
                        }
                        case "error":
                            throw JSON.stringify({ status: body?.status, reason: body?.message });
                    }
                    break;
                case "mapq2":
                    switch (body?.status) {
                        case "ok": {
                            const timeStamp = (Date.now() / 1000) | 0;
                            airQuality = {
                                metadata: {
                                    attributionUrl: request.url,
                                    language: `${this.language}-${this.country}`,
                                    latitude: body?.data?.stations?.[0]?.geo?.[0],
                                    longitude: body?.data?.stations?.[0]?.geo?.[1],
                                    expireTime: timeStamp + 60 * 60,
                                    providerLogo: providerNameToLogo("WAQI", this.version),
                                    providerName: `World Air Quality Index Project\n监测站：${body?.data?.stations?.[0]?.name}`,
                                    readTime: timeStamp,
                                    reportedTime: (new Date(body?.data?.stations?.[0]?.utime).getTime() / 1000) | 0,
                                    temporarilyUnavailable: false,
                                    sourceType: "STATION",
                                    stationId: Number.parseInt(body?.data?.stations?.[0]?.idx, 10),
                                },
                                ...this.#NormalizeAirQuality(body?.data?.stations?.[0]?.aqi),
                                //"previousDayComparison": "UNKNOWN",
                            };
                            break;
                        }
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.status, reason: body?.reason });
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            Console.error(`Nearest: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ Nearest");
        }
        return airQuality;
    }

    async Token(stationId = Number()) {
        Console.info("☑️ Token", `stationId: ${stationId}`);
        const request = {
            url: `https://api.waqi.info/api/token/${stationId}`,
            headers: this.headers,
        };
        let token;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "error":
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
                default:
                    switch (body?.rxs?.status) {
                        case "ok":
                            switch (body?.rxs?.obs?.[0]?.status) {
                                case "ok":
                                    token = body?.rxs?.obs?.[0]?.msg?.token;
                                    //uid = body?.rxs?.obs?.[0]?.uid;
                                    break;
                                case "error":
                                    throw JSON.stringify({ status: body?.rxs?.obs?.[0]?.status, reason: body?.rxs?.obs?.[0]?.msg });
                            }
                            break;
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.rxs?.status, reason: body?.rxs });
                    }
                    break;
            }
        } catch (error) {
            Console.error(`Token: ${error}`);
        } finally {
            //Console.debug(`token: ${token}`);
            Console.info("✅ Token");
        }
        return token;
    }

    async AQI(stationId = Number(), token = this.token) {
        Console.info("☑️ AQI", `stationId: ${stationId}`, `token: ${token}`);
        const request = {
            url: `https://api.waqi.info/api/feed/@${stationId}/aqi.json`,
            headers: this.headers,
            body: `token=${token}&id=${stationId}`,
        };
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "error":
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
                default:
                case undefined:
                    switch (body?.rxs?.status) {
                        case "ok":
                            switch (body?.rxs?.obs?.[0]?.status) {
                                case "ok": {
                                    const timeStamp = (Date.now() / 1000) | 0;
                                    airQuality = {
                                        metadata: {
                                            attributionUrl: body?.rxs?.obs?.[0]?.msg?.city?.url,
                                            expireTime: timeStamp + 60 * 60,
                                            language: `${this.language}-${this.country}`,
                                            latitude: body?.rxs?.obs?.[0]?.msg?.city?.geo?.[0],
                                            longitude: body?.rxs?.obs?.[0]?.msg?.city?.geo?.[1],
                                            providerLogo: providerNameToLogo("WAQI", this.version),
                                            providerName: `World Air Quality Index Project\n监测站：${body?.rxs?.obs?.[0]?.msg?.city?.name}`,
                                            readTime: timeStamp,
                                            reportedTime: body?.rxs?.obs?.[0]?.msg?.time?.v,
                                            temporarilyUnavailable: false,
                                            sourceType: "STATION",
                                            stationId: stationId,
                                        },
                                        ...this.#NormalizeAirQuality(body?.rxs?.obs?.[0]?.msg?.aqi, this.#Configs.Pollutants[body?.rxs?.obs?.[0]?.msg?.dominentpol] || "NOT_AVAILABLE"),
                                        //"previousDayComparison": "UNKNOWN",
                                    };
                                    break;
                                }
                                case "error":
                                case undefined:
                                    throw JSON.stringify({ status: body?.rxs?.[0]?.status, reason: body?.rxs?.obs?.[0]?.msg });
                            }
                            break;
                        case "error":
                        case undefined:
                            throw JSON.stringify({ status: body?.rxs?.status, reason: body?.rxs });
                    }
                    break;
            }
        } catch (error) {
            Console.error(`AQI: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AQI");
        }
        return airQuality;
    }

    async AQI2(stationId = Number(), token = this.token) {
        Console.info("☑️ AQI2", `stationId: ${stationId}`);
        const request = {
            url: `https://api2.waqi.info/feed/geo:${this.latitude};${this.longitude}/?token=${token}`,
            headers: this.headers,
        };
        if (stationId) request.url = `https://api2.waqi.info/feed/@${stationId}/?token=${token}`;
        let airQuality;
        try {
            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));
            switch (body?.status) {
                case "ok": {
                    const timeStamp = (Date.now() / 1000) | 0;
                    airQuality = {
                        metadata: {
                            attributionUrl: body?.data?.city?.url,
                            expireTime: timeStamp + 60 * 60,
                            language: `${this.language}-${this.country}`,
                            latitude: body?.data?.city?.geo?.[0],
                            longitude: body?.data?.city?.geo?.[1],
                            providerLogo: providerNameToLogo("WAQI", this.version),
                            providerName: `World Air Quality Index Project\n监测站：${body?.data?.city?.name}`,
                            readTime: timeStamp,
                            reportedTime: body?.data?.time?.v,
                            temporarilyUnavailable: false,
                            sourceType: "STATION",
                            stationId: stationId || Number.parseInt(body?.data?.idx, 10),
                        },
                        ...this.#NormalizeAirQuality(body?.data?.aqi, this.#Configs.Pollutants[body?.data?.dominentpol] || "NOT_AVAILABLE"),
                        //"previousDayComparison": "UNKNOWN",
                    };
                    break;
                }
                case "error":
                case undefined:
                    throw JSON.stringify({ status: body?.status, reason: body?.data });
            }
        } catch (error) {
            Console.error(`AQI2: ${error}`);
        } finally {
            //Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
            Console.info("✅ AQI2");
        }
        return airQuality;
    }
}

/**
 * 从来源页面提取的预警记录。
 * Alert record extracted from a source page.
 * @typedef {{
 *     areaId?: string,
 *     areaName?: string,
 *     certainty?: string,
 *     description: string,
 *     effectiveTime?: string,
 *     eventEndTime?: string,
 *     eventOnsetTime?: string,
 *     expireTime?: string,
 *     guidelines: string[],
 *     identifier?: string,
 *     importance?: string,
 *     issuedTime: string,
 *     message: string,
 *     eventName?: string,
 *     phenomenon?: string,
 *     responses?: string[],
 *     reportedAt: string,
 *     significance?: string,
 *     source?: string,
 *     severity: "unknown" | "extreme" | "severe" | "moderate" | "minor",
 *     standard: string,
 *     token?: string,
 *     urgency?: string,
 * }} ExtractedWeatherAlert
 */

/**
 * 从来源页面提取的预警集合。
 * Alert collection extracted from a source page.
 * @typedef {{
 *     alerts: ExtractedWeatherAlert[],
 *     areaName: string,
 *     source: string,
 * }} ExtractedWeatherAlerts
 */

/**
 * WeatherAlert 构造上下文。
 * WeatherAlert construction context.
 * @typedef {{
 *     attributionUrl: URL | string,
 *     countryCode?: string,
 *     eventSource?: string,
 *     identifier: string,
 *     language: string,
 * }} WeatherAlertContext
 */

/**
 * WeatherKit REST WeatherAlert。
 * WeatherKit REST WeatherAlert.
 * @typedef {{
 *     areaId?: string,
 *     areaName?: string,
 *     attributionURL: string,
 *     certainty: string,
 *     countryCode: string,
 *     description: string,
 *     detailsUrl: string,
 *     effectiveTime: string,
 *     eventEndTime?: string,
 *     eventOnsetTime?: string,
 *     eventSource: string,
 *     expireTime: string,
 *     id: string,
 *     importance?: string,
 *     issuedTime: string,
 *     reportedAt: string,
 *     messages: Array<{language: string, text: string}>,
 *     name: "WeatherAlert",
 *     precedence: number,
 *     phenomenon?: string,
 *     responses: string[],
 *     significance?: string,
 *     severity: string,
 *     source: string,
 *     token?: string,
 *     urgency: string,
 * }} WeatherAlert
 */

/**
 * WeatherKit REST WeatherAlert 集合转换器。
 * WeatherKit REST WeatherAlert collection converter.
 */
class WeatherAlerts {
    /**
     * 将新的来源预警数组合并到原始 Apple 预警数组。
     * Merge new source alerts into the original Apple alert array.
     * 来源完整标题优先；其他字段只补空值 / unknown，不改 url，也不新增 alert。
     * Prefer the complete provider title; only fill empty / unknown values for other fields without changing URLs or adding alerts.
     * @param {array} to - 原始 Apple 预警数组
     * @param {array} from - 新的来源预警数组
     * @returns {array} 原始 Apple 预警数组
     */
    static mergeAlerts(to = [], from = []) {
        if (!Array.isArray(to) || !Array.isArray(from)) return to;
        if (!to.length || !from.length) return to;
        WeatherAlerts.#LogMergeAlertsStart(to, from);
        const usedSourceAlertIndexes = new Set();
        for (let appleAlertIndex = 0; appleAlertIndex < to.length; appleAlertIndex++) {
            const appleAlert = to[appleAlertIndex];
            const sourceAlertIndex = WeatherAlerts.#FindSourceAlert(appleAlert, from, usedSourceAlertIndexes, appleAlertIndex);
            WeatherAlerts.#LogMergeAlertMatch(appleAlert, from, usedSourceAlertIndexes, appleAlertIndex, sourceAlertIndex);
            if (!appleAlert || sourceAlertIndex < 0 || !from[sourceAlertIndex]) {
                WeatherAlerts.#LogMergeAlertSkip(appleAlertIndex);
                continue;
            }
            usedSourceAlertIndexes.add(sourceAlertIndex);
            WeatherAlerts.#FillAlert(appleAlert, from[sourceAlertIndex], appleAlertIndex, sourceAlertIndex);
        }

        return to;
    }

    static #FillAlert(appleAlert, sourceAlert, appleAlertIndex, sourceAlertIndex) {
        let before;
        if (WeatherAlerts.#IsDebug()) before = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        const sourceExpireTime = sourceAlert.expireTime === "9999-12-31T23:59:59Z" ? undefined : sourceAlert.expireTime;
        WeatherAlerts.#FillText(appleAlert, "areaId", sourceAlert.areaId);
        WeatherAlerts.#FillText(appleAlert, "areaName", sourceAlert.areaName);
        WeatherAlerts.#FillTime(appleAlert, "effectiveTime", sourceAlert.effectiveTime ?? sourceAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventOnsetTime", sourceAlert.eventOnsetTime ?? sourceAlert.effectiveTime ?? sourceAlert.issuedTime ?? appleAlert.effectiveTime ?? appleAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventEndTime", sourceAlert.eventEndTime ?? sourceExpireTime ?? appleAlert.expireTime);
        WeatherAlerts.#FillTime(appleAlert, "expireTime", sourceExpireTime ?? sourceAlert.eventEndTime);
        WeatherAlerts.#FillTime(appleAlert, "issuedTime", sourceAlert.issuedTime ?? sourceAlert.effectiveTime);
        WeatherAlerts.#FillDescription(appleAlert, sourceAlert);
        WeatherAlerts.#FillText(appleAlert, "source", sourceAlert.source);
        WeatherAlerts.#FillEnum(appleAlert, "phenomenon", sourceAlert.phenomenon);
        WeatherAlerts.#FillText(appleAlert, "token", sourceAlert.token);
        WeatherAlerts.#FillResponses(appleAlert, sourceAlert);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "severity", sourceAlert.severity, ["UNKNOWN"]);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "certainty", sourceAlert.certainty);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "importance", sourceAlert.importance || WeatherAlerts.#ImportanceFromSeverity(sourceAlert.severity));
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "significance", sourceAlert.significance);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "urgency", sourceAlert.urgency);
        if (before) WeatherAlerts.#LogMergeAlertPatch(before, appleAlert, appleAlertIndex, sourceAlertIndex);
    }

    static #ToUnixSeconds(value) {
        if (value == null || value === "") return undefined;
        if (typeof value === "number") return value;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? undefined : Math.trunc(time / 1000);
    }

    static #FillText(appleAlert, key, sourceValue) {
        if (String(appleAlert?.[key] ?? "").trim()) return;
        const value = String(sourceValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillDescription(appleAlert, sourceAlert) {
        const sourceTitle = String(sourceAlert?.description ?? "").trim();
        const value = WeatherAlerts.#NormalizeWeatherAlertTitle(sourceAlert?.description, sourceAlert?.eventName);
        if (!value) return;
        const current = String(appleAlert?.description ?? "").trim();
        if (sourceTitle || !current || current.toLowerCase() === "other" || current.toLowerCase() === "unknown") appleAlert.description = value;
    }

    static #FillEnum(appleAlert, key, sourceValue, fallbackValues = ["unknown", "Other"]) {
        const current = String(appleAlert?.[key] ?? "").trim();
        const currentFallback = fallbackValues.some(value => current.toLowerCase() === String(value).toLowerCase());
        if (current && !currentFallback) return;
        const value = String(sourceValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillFlatBufferEnum(appleAlert, key, sourceValue, fallbackValues = ["UNKNOWN"]) {
        const value = WeatherAlerts.#FlatBufferWeatherAlertEnum(key, sourceValue);
        if (value) WeatherAlerts.#FillEnum(appleAlert, key, value, fallbackValues);
    }

    static #FillTime(appleAlert, key, sourceValue) {
        if (appleAlert?.[key]) return;
        const value = WeatherAlerts.#ToUnixSeconds(sourceValue);
        if (value !== undefined) appleAlert[key] = value;
    }

    static #FillResponses(appleAlert, sourceAlert) {
        if (Array.isArray(appleAlert?.responses) && appleAlert.responses.length) return;
        const responses = WeatherAlerts.#BuildFlatBufferResponses(sourceAlert.guidelines, sourceAlert.responses);
        if (responses.length) appleAlert.responses = responses;
    }

    static #BuildFlatBufferResponses(guidelines, preferredResponses = []) {
        const responses = [];
        for (const response of WeatherAlerts.#BuildResponses(guidelines, preferredResponses)) {
            const value = WeatherAlerts.#FlatBufferWeatherAlertEnum("responses", response);
            if (value && !responses.includes(value)) responses.push(value);
        }
        return responses;
    }

    static #FindSourceAlert(appleAlert, sourceAlerts, usedSourceAlertIndexes, appleAlertIndex) {
        let bestIndex = -1;
        let bestScore = 0;
        for (let index = 0; index < sourceAlerts.length; index++) {
            if (usedSourceAlertIndexes.has(index)) continue;
            const score = WeatherAlerts.#ScoreSourceAlert(appleAlert, sourceAlerts[index]);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }
        if (bestScore >= 30) return bestIndex;
        if (appleAlertIndex < sourceAlerts.length && !usedSourceAlertIndexes.has(appleAlertIndex)) return appleAlertIndex;
        return -1;
    }

    static #IsDebug() {
        return Console.logLevel === "DEBUG" || Console.logLevel === "ALL";
    }

    static #LogMergeAlertsStart(to, from) {
        if (!WeatherAlerts.#IsDebug()) return;
        Console.debug(
            "mergeAlerts",
            `appleAlertCount: ${to.length}`,
            `sourceAlertCount: ${from.length}`,
            `appleAlerts: ${JSON.stringify(to.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
            `sourceAlerts: ${JSON.stringify(from.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
        );
    }

    static #LogMergeAlertMatch(appleAlert, sourceAlerts, usedSourceAlertIndexes, appleAlertIndex, sourceAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const candidates = WeatherAlerts.#SourceAlertCandidates(appleAlert, sourceAlerts, usedSourceAlertIndexes);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `selectedSourceAlertIndex: ${sourceAlertIndex}`,
            `selectedScore: ${candidates[0]?.score ?? 0}`,
            `usedSameIndexFallback: ${sourceAlertIndex === appleAlertIndex && (candidates[0]?.score ?? 0) < 30}`,
            `candidates: ${JSON.stringify(candidates, null, 2)}`,
            `appleAlert: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex), null, 2)}`,
            `sourceAlert: ${JSON.stringify(sourceAlertIndex >= 0 ? WeatherAlerts.#WeatherAlertDebugSnapshot(sourceAlerts[sourceAlertIndex], sourceAlertIndex) : undefined, null, 2)}`,
        );
    }

    static #LogMergeAlertSkip(appleAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        Console.debug("mergeAlerts", `appleAlertIndex: ${appleAlertIndex}`, "skip: no matched source alert");
    }

    static #LogMergeAlertPatch(before, appleAlert, appleAlertIndex, sourceAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const after = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `sourceAlertIndex: ${sourceAlertIndex}`,
            `changed: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugChanges(before, after), null, 2)}`,
            `after: ${JSON.stringify(after, null, 2)}`,
        );
    }

    static #SourceAlertCandidates(appleAlert, sourceAlerts, usedSourceAlertIndexes) {
        const candidates = [];
        for (let index = 0; index < sourceAlerts.length; index++) {
            if (usedSourceAlertIndexes.has(index)) continue;
            candidates.push({
                index,
                score: WeatherAlerts.#ScoreSourceAlert(appleAlert, sourceAlerts[index]),
                sourceAlert: WeatherAlerts.#WeatherAlertDebugSnapshot(sourceAlerts[index], index),
            });
        }
        return candidates.sort((a, b) => b.score - a.score);
    }

    static #ScoreSourceAlert(appleAlert, sourceAlert) {
        let score = 0;
        const appleAreaId = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaId);
        const sourceAreaId = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.areaId);
        const appleAreaName = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaName);
        const sourceAreaName = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.areaName);
        const appleToken = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.token);
        const sourceToken = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.token);
        const appleDescription = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.description);
        const sourceDescription = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.description);
        const sourceEventName = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.eventName);
        const sourceMessage = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.message);
        const applePhenomenon = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.phenomenon);
        const sourcePhenomenon = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.phenomenon);
        const appleSeverity = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.severity);
        const sourceSeverity = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.severity);

        if (appleAreaId && sourceAreaId && appleAreaId === sourceAreaId) score += 60;
        if (appleAreaName && sourceAreaName && appleAreaName === sourceAreaName) score += 40;
        if (appleToken && sourceToken && appleToken === sourceToken) score += 50;
        if (appleDescription && sourceEventName && appleDescription === sourceEventName) score += 50;
        if (appleDescription && sourcePhenomenon && appleDescription === sourcePhenomenon) score += 50;
        if (appleDescription && sourceDescription && sourceDescription.includes(appleDescription)) score += 40;
        if (appleDescription && sourceMessage && sourceMessage.includes(appleDescription)) score += 30;
        if (applePhenomenon && sourcePhenomenon && (applePhenomenon === sourcePhenomenon || sourcePhenomenon.includes(applePhenomenon))) score += 30;
        if (appleSeverity && sourceSeverity && appleSeverity === sourceSeverity && appleSeverity !== "unknown") score += 10;
        return score;
    }

    static #NormalizeAlertMatchText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/预警信号|预警|警报|报告/g, "");
    }

    static #WeatherAlertDebugSnapshot(alert, index) {
        return {
            index,
            id: alert?.id ?? alert?.identifier,
            areaId: alert?.areaId,
            areaName: alert?.areaName,
            description: alert?.description,
            eventName: alert?.eventName,
            message: alert?.message,
            token: alert?.token,
            phenomenon: alert?.phenomenon,
            severity: alert?.severity,
            significance: alert?.significance,
            urgency: alert?.urgency,
            certainty: alert?.certainty,
            importance: alert?.importance,
            source: alert?.source,
            effectiveTime: alert?.effectiveTime,
            eventOnsetTime: alert?.eventOnsetTime,
            eventEndTime: alert?.eventEndTime,
            expireTime: alert?.expireTime,
            issuedTime: alert?.issuedTime,
            responses: alert?.responses,
            guidelines: alert?.guidelines,
        };
    }

    static #WeatherAlertDebugChanges(before, after) {
        const changed = {};
        for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed[key] = { before: before[key], after: after[key] };
        }
        return changed;
    }

    /**
     * 将提取后的来源记录构造成 WeatherKit REST WeatherAlert 数组。
     * Build the /api/v1/weatherAlerts JSON array consumed by Apple alertDetails.
     * @param {ExtractedWeatherAlerts} extracted 标准化后的来源数据；alert.source 映射官方页面“签发者”，areaName 映射“受影响区域”。
     * @param {WeatherAlertContext} context 构造上下文；identifier 用于稳定 UUID/areaId，attributionUrl 用于“查看警报来源”链接。
     * @returns {WeatherAlert[]} WeatherAlert 数组 / WeatherAlert array.
     */
    static Build(extracted, context) {
        const contextAreaId = context.identifier.match(/-(\d+)$/)?.[1];
        return extracted.alerts.map((alert, precedence) => {
            const uid = WeatherAlerts.#StableUUID(`${context.identifier}:${alert.identifier ?? precedence}`);
            const messages = [];
            for (const text of [alert.message, alert.standard, alert.guidelines?.filter(Boolean).join("\n")]) {
                if (text) messages.push({ language: context.language, text });
            }
            if (!messages.length && alert.description) messages.push({ language: context.language, text: alert.description });
            const responses = WeatherAlerts.#BuildResponses(alert.guidelines, alert.responses);
            const areaId = alert.areaId || contextAreaId;
            const areaName = alert.areaName || extracted.areaName;
            const effectiveTime = alert.effectiveTime ?? alert.issuedTime;
            const expireTime = alert.expireTime ?? "9999-12-31T23:59:59Z";
            const eventOnsetTime = alert.eventOnsetTime ?? effectiveTime;
            const eventEndTime = alert.eventEndTime ?? (alert.expireTime ? expireTime : undefined);
            const source = alert.source || extracted.source || "";
            const importance = alert.importance || WeatherAlerts.#ImportanceFromSeverity(alert.severity);
            const phenomenon = alert.phenomenon;
            const description = WeatherAlerts.#NormalizeWeatherAlertTitle(alert.description, alert.eventName);
            return {
                id: uid,
                ...(areaId ? { areaId } : {}),
                ...(areaName ? { areaName } : {}),
                attributionURL: context.attributionUrl.toString(),
                certainty: alert.certainty || "unknown",
                countryCode: context.countryCode ?? "",
                description,
                detailsUrl: `#${uid}`,
                effectiveTime,
                ...(eventEndTime ? { eventEndTime } : {}),
                ...(eventOnsetTime ? { eventOnsetTime } : {}),
                eventSource: context.eventSource ?? context.countryCode ?? "",
                expireTime,
                issuedTime: alert.issuedTime,
                ...(importance ? { importance } : {}),
                messages,
                name: "WeatherAlert",
                ...(phenomenon ? { phenomenon } : {}),
                precedence,
                responses,
                ...(alert.significance ? { significance: alert.significance } : {}),
                reportedAt: alert.reportedAt,
                severity: alert.severity,
                source,
                ...(alert.token ? { token: alert.token } : {}),
                urgency: alert.urgency || "unknown",
            };
        });
    }

    /**
     * 根据 Apple 官方样例中的 importance 分层，从来源严重度推导重要性。
     * Derive WeatherKit importance from source severity when upstream does not provide it.
     * @param {string} severity 预警严重度 / Alert severity.
     * @returns {"high" | "normal" | "low"} Apple WeatherAlert importance.
     */
    static #ImportanceFromSeverity(severity) {
        switch (String(severity ?? "").trim().toLowerCase()) {
            case "extreme":
            case "severe":
                return "high";
            case "minor":
                return "low";
            case "moderate":
            default:
                return "normal";
        }
    }

    /**
     * 将来源防御指南压缩为 Apple 前端能识别的动作 token。
     * Convert source defense guidance into Apple-recognized action tokens.
     * @param {string[]} guidelines 防御指南 / Defense guidance.
     * @returns {string[]} 动作 token / Action tokens.
     */
    static #BuildResponses(guidelines, preferredResponses = []) {
        const responses = WeatherAlerts.#NormalizeResponses(preferredResponses);
        if (responses.length) return responses;

        const inferredResponses = [];
        for (const guideline of guidelines ?? []) {
            const response = WeatherAlerts.#ResponseFromGuideline(guideline);
            if (response && !inferredResponses.includes(response)) inferredResponses.push(response);
        }
        return inferredResponses.length ? inferredResponses : (guidelines?.length ? ["monitor"] : []);
    }

    /**
     * 标准化动作 token 列表。
     * Normalize action token list.
     * @param {string[]} responses 动作 token / Action tokens.
     * @returns {string[]} 规范化后的动作 token / Normalized action tokens.
     */
    static #NormalizeResponses(responses) {
        const normalized = [];
        for (const response of responses ?? []) {
            const token = String(response ?? "").trim();
            if (token && !normalized.includes(token)) normalized.push(token);
        }
        return normalized;
    }

    /**
     * 根据单条防御指南推断 Apple 的动作 token。
     * Infer an Apple action token from one defense-guidance line.
     * @param {string} guideline 防御指南 / Defense guidance.
     * @returns {string | null} 动作 token / Action token.
     */
    static #ResponseFromGuideline(guideline) {
        const text = String(guideline ?? "").trim().toLowerCase();
        if (!text) return null;
        const compact = text.replace(/\s+/g, "");

        if (/撤离|疏散|转移|离开/.test(text) || compact.includes("evacuat")) return "evacuate";
        if (/就地|躲避|避难|避险|避风|室内|躲到|进入室内|待在室内/.test(text) || compact.includes("takeshelter") || compact.includes("seekshelter")) return "shelter";
        if (/执行|实施|预案|计划/.test(text) || compact.includes("execute") || compact.includes("carryout") || compact.includes("implement")) return "execute";
        if (/准备|防范|防护|备好|做好.*准备/.test(text) || compact.includes("prepare") || compact.includes("preparations")) return "prepare";
        if (/远离|避免|不要|切勿|勿|别/.test(text) || compact.includes("avoid") || compact.includes("stayaway") || compact.includes("keepaway") || compact.includes("donot") || compact.includes("dont")) return "avoid";
        if (/密切关注|持续关注|关注|留意|监测|观察|跟踪/.test(text) || compact.includes("monitor") || compact.includes("watch") || compact.includes("followup")) return "monitor";
        if (/评估|检查/.test(text) || compact.includes("assess") || compact.includes("inspect")) return "assess";
        if (/解除|恢复正常/.test(text) || compact.includes("allclear")) return "allClear";
        if (/无需|不需|无须/.test(text) || compact.includes("none")) return "none";
        return null;
    }

    static #FlatBufferWeatherAlertEnum(key, value) {
        const normalized = String(value ?? "").trim();
        if (!normalized) return "";
        switch (key) {
            case "certainty":
                return WeatherAlerts.#FlatBufferWeatherAlertCertainty(normalized);
            case "importance":
                return WeatherAlerts.#FlatBufferWeatherAlertImportance(normalized);
            case "responses":
                return WeatherAlerts.#FlatBufferWeatherAlertResponse(normalized);
            case "severity":
                return WeatherAlerts.#FlatBufferWeatherAlertSeverity(normalized);
            case "significance":
                return WeatherAlerts.#FlatBufferWeatherAlertSignificance(normalized);
            case "urgency":
                return WeatherAlerts.#FlatBufferWeatherAlertUrgency(normalized);
            default:
                return "";
        }
    }

    static #NormalizeFlatBufferWeatherAlertEnum(value) {
        return String(value ?? "").trim().replace(/[_\s-]+/g, "").toLowerCase();
    }

    static #FlatBufferWeatherAlertCertainty(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "observed":
                return "OBSERVED";
            case "likely":
                return "LIKELY";
            case "possible":
                return "POSSIBLE";
            case "unlikely":
                return "UNLIKELY";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertImportance(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "high":
                return "HIGH";
            case "normal":
                return "NORMAL";
            case "low":
                return "LOW";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertResponse(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "evacuate":
                return "EVACUATE";
            case "shelter":
                return "SHELTER";
            case "execute":
                return "EXECUTE";
            case "prepare":
                return "PREPARE";
            case "avoid":
                return "AVOID";
            case "monitor":
                return "MONITOR";
            case "assess":
                return "ASSESS";
            case "allclear":
                return "ALL_CLEAR";
            case "none":
                return "NONE";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertSeverity(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "unknown":
                return "UNKNOWN";
            case "extreme":
                return "EXTREME";
            case "severe":
                return "SEVERE";
            case "moderate":
                return "MODERATE";
            case "minor":
                return "MINOR";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertSignificance(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "advisory":
                return "ADVISORY";
            case "watch":
                return "WATCH";
            case "warning":
                return "WARNING";
            case "statement":
                return "STATEMENT";
            case "emergency":
                return "EMERGENCY";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertUrgency(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "immediate":
                return "IMMEDIATE";
            case "expected":
                return "EXPECTED";
            case "future":
                return "FUTURE";
            case "past":
                return "PAST";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    /**
     * 将来源标题规范化为 WeatherAlert 最终标题。
     * Normalize a provider headline into the final WeatherAlert title.
     * @param {string} description 预警标题 / Alert title.
     * @param {string} eventName 本地化事件名称 / Localized event name.
     * @returns {string} 规范化标题 / Normalized title.
     */
    static #NormalizeWeatherAlertTitle(description, eventName = "") {
        const title = String(description ?? "").trim();
        const fallback = WeatherAlerts.#TrimWeatherAlertTitle(eventName);
        if (!title) return fallback;

        const chinese = title.match(/^.+?(?:发布|更新|变更)\s*[:：]?\s*(.+)$/);
        if (chinese?.[1]) return WeatherAlerts.#TrimWeatherAlertTitle(chinese[1]);

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const titleBeforeIssued = WeatherAlerts.#TrimWeatherAlertTitle(issued[1]);
            const fallbackMatchesPrefix = Boolean(fallback) && WeatherAlerts.#NormalizeAlertMatchText(fallback) === WeatherAlerts.#NormalizeAlertMatchText(titleBeforeIssued);
            return fallbackMatchesPrefix ? fallback : WeatherAlerts.#FormatTranslatedEnglishAlertTitle(issued[2]) || fallback;
        }

        const issues = title.match(/^.+?\s+issues?\b\s*[:：]?\s*(.+)$/i);
        return issues?.[1] ? WeatherAlerts.#FormatTranslatedEnglishAlertTitle(issues[1]) || fallback : WeatherAlerts.#TrimWeatherAlertTitle(title) || fallback;
    }

    static #FormatTranslatedEnglishAlertTitle(title) {
        return WeatherAlerts.#TrimWeatherAlertTitle(title)
            .replace(/^(?:a|an|the)\s+/i, "")
            .replace(/\b\p{L}/gu, character => character.toUpperCase());
    }

    static #TrimWeatherAlertTitle(title) {
        return String(title ?? "")
            .trim()
            .replace(/\s*[\[【][^\]】]+[\]】]\s*$/u, "")
            .replace(/\s*[。．.]+\s*$/gu, "")
            .replace(/预警信号$/u, "预警")
            .replace(/預警信號$/u, "預警");
    }

    /**
     * 为同一预警生成跨运行环境稳定的 UUID。
     * Generate a stable UUID for the same alert across supported runtimes.
     * @param {string} value UUID 输入 / UUID input.
     * @returns {string} UUID 字符串 / UUID string.
     */
    static #StableUUID(value) {
        const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
        for (let index = 0; index < words.length; index++) {
            for (let offset = 0; offset < value.length; offset++) {
                words[index] ^= value.charCodeAt(offset) + index;
                words[index] = Math.imul(words[index], 0x01000193);
            }
        }
        const bytes = new Uint8Array(16);
        const view = new DataView(bytes.buffer);
        for (let index = 0; index < words.length; index++) view.setUint32(index * 4, words[index]);
        bytes[6] = (bytes[6] & 0x0f) | 0x50;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}

const ROOT_OFFSET_SIZE = 4;
const VTABLE_HEADER_SIZE = 4;
const VTABLE_ENTRY_SIZE = 2;
const OFFSET_FIELD_SIZE = 4;
const MAX_SCALAR_ALIGNMENT = 8;

/**
 * table 结构校验结果。
 * Result of a structural table inspection.
 *
 * @typedef {object} TableInspection
 * @property {number} fieldCount vtable 声明的字段数量 / Field count declared by the vtable.
 * @property {number} objectLength table 对象字节长度 / Object length in bytes.
 * @property {number} vtableLength vtable 字节长度 / VTable length in bytes.
 * @property {number} vtablePosition vtable 相对 arena 起点的位置 / VTable position relative to the arena start.
 */

/**
 * 校验任意 table 的结构边界，并返回其布局元数据。
 * Validate the structural bounds of any table and return its layout metadata.
 *
 * 校验读取范围、vtable 长度（偶数且不小于 4）、对象长度（不小于 4），
 * 以及每个已存在字段的偏移是否落在 `[4, objectLength)` 内；
 * 声明字段数超过 `maxFieldCount` 时抛出异常。结构非法时抛出 RangeError。
 * Validates the readable range, vtable length (even and at least 4), object length
 * (at least 4), and that every present field offset lies within `[4, objectLength)`;
 * throws when the declared field count exceeds `maxFieldCount`. Invalid structures throw a RangeError.
 *
 * @param {ByteBuffer} byteBuffer - FlatBuffer / FlatBuffer.
 * @param {number} tablePosition - table 位置 / Table position.
 * @param {number} [maxFieldCount=Infinity] - 允许的最大字段数 / Maximum allowed field count.
 * @returns {TableInspection} table 布局元数据 / Table layout metadata.
 */
function inspectTable(byteBuffer, tablePosition, maxFieldCount = Number.POSITIVE_INFINITY) {
	if (!byteBuffer || typeof byteBuffer.position !== "function" || typeof byteBuffer.capacity !== "function" || typeof byteBuffer.readInt32 !== "function" || typeof byteBuffer.readUint16 !== "function") {
		throw new TypeError("inspectTable source must be a FlatBuffers ByteBuffer");
	}
	if (typeof maxFieldCount !== "number" || !(Number.isSafeInteger(maxFieldCount) || maxFieldCount === Number.POSITIVE_INFINITY) || maxFieldCount < 0) throw new TypeError("inspectTable maxFieldCount must be a non-negative safe integer");
	return inspectTableStructure(byteBuffer, tablePosition, byteBuffer.position(), byteBuffer.capacity(), "table", maxFieldCount);
}

/**
 * 校验 table 结构并返回布局元数据，错误消息携带标签。
 * Validate table structure and return layout metadata, with labeled error messages.
 * @param {ByteBuffer} source - FlatBuffer / FlatBuffer.
 * @param {number} tablePosition - table 位置 / Table position.
 * @param {number} start - arena 起点 / Arena start.
 * @param {number} end - arena 终点 / Arena end.
 * @param {string} label - 错误标签 / Error label.
 * @param {number} maxFieldCount - 允许的最大字段数 / Maximum allowed field count.
 * @returns {TableInspection} table 布局元数据 / Table layout metadata.
 */
function inspectTableStructure(source, tablePosition, start, end, label, maxFieldCount, checkFieldOffsets = true) {
	ensureRange(tablePosition, ROOT_OFFSET_SIZE, start, end, label);
	const vtablePosition = tablePosition - source.readInt32(tablePosition);
	ensureRange(vtablePosition, VTABLE_HEADER_SIZE, start, end, `${label} vtable`);

	const vtableLength = source.readUint16(vtablePosition);
	const objectLength = source.readUint16(vtablePosition + VTABLE_ENTRY_SIZE);
	if (vtableLength < VTABLE_HEADER_SIZE || vtableLength % VTABLE_ENTRY_SIZE !== 0) {
		throw new RangeError(`${label} has an invalid vtable length: ${vtableLength}`);
	}
	if (objectLength < ROOT_OFFSET_SIZE) throw new RangeError(`${label} has an invalid object length: ${objectLength}`);

	ensureRange(vtablePosition, vtableLength, start, end, `${label} vtable`);
	ensureRange(tablePosition, objectLength, start, end, label);

	const fieldCount = (vtableLength - VTABLE_HEADER_SIZE) / VTABLE_ENTRY_SIZE;
	if (fieldCount > maxFieldCount) throw new RangeError(`${label} declares ${fieldCount} fields, exceeding the verified maximum of ${maxFieldCount}`);
	if (checkFieldOffsets) {
		for (let id = 0; id < fieldCount; id++) {
			const fieldOffset = source.readUint16(vtablePosition + VTABLE_HEADER_SIZE + id * VTABLE_ENTRY_SIZE);
			if (fieldOffset !== 0 && (fieldOffset < ROOT_OFFSET_SIZE || fieldOffset >= objectLength)) {
				throw new RangeError(`${label} field ${id} has an invalid field offset: ${fieldOffset}`);
			}
		}
	}
	return { fieldCount, objectLength, vtableLength, vtablePosition };
}

/**
 * 校验二进制读取范围。
 * Validate a binary read range.
 * @param {number} position - 起点 / Start position.
 * @param {number} length - 长度 / Length.
 * @param {number} start - arena 起点 / Arena start.
 * @param {number} end - arena 终点 / Arena end.
 * @param {string} label - 错误标签 / Error label.
 * @returns {void}
 */
function ensureRange(position, length, start, end, label) {
	if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < start || length < 0 || position + length > end) {
		throw new RangeError(`${label} is outside the FlatBuffer`);
	}
}

/**
 * @typedef {object} SlotBinary
 * @property {Uint8Array} bytes 二进制 arena / Binary arena.
 * @property {number} tablePosition 产品表相对 arena 起点的位置 / Product table position relative to the arena start.
 */

/**
 * @typedef {object} RootSlotFailure
 * @property {number} id 根 slot ID / Root slot ID.
 * @property {Error} error 读取失败 / Read failure.
 */

/**
 * 单个已请求根产品的读取或解码失败记录。
 * Read or decode failure record for one requested root product.
 *
 * @typedef {object} FlatBufferRootDecodeFailure
 * @property {string} name 根名称 / Root name.
 * @property {string} message 失败原因 / Failure message.
 */

/**
 * decodeWithReport 的分类报告。
 * Classified report returned by decodeWithReport.
 *
 * @typedef {object} FlatBufferRootDecodeReport
 * @property {Record<string, unknown>} json 已成功解码的根对象 / Successfully decoded root objects.
 * @property {string[]} missing 已请求但物理缺失的根名称；缺失是正常情况 / Requested root names absent from the source root; absence is normal.
 * @property {FlatBufferRootDecodeFailure[]} failures 已请求但读取或解码失败的根产品 / Requested root products that failed to read or decode.
 * @property {string[]} unknown 已请求但未注册 codec 的根名称 / Requested root names without a registered codec.
 */

/**
 * @typedef {object} RootSlotDictionary
 * @property {number} slotCount 根表声明的 slot 数量 / Slot count declared by the root table.
 * @property {number} presentSlotCount 根表中实际存在的 slot 数量 / Number of physically present root slots.
 * @property {Map<number, SlotBinary>} slots 有效 slot 字典 / Valid slot dictionary.
 * @property {RootSlotFailure[]} failures 可隔离的 slot 读取失败 / Isolated slot read failures.
 */

/**
 * @typedef {object} FlatBufferRootCodec
 * @property {new () => {__init(position: number, byteBuffer: ByteBuffer): unknown}} tableClass 产品表生成类 / Generated product table class.
 * @property {(table: unknown) => unknown} decode 产品表解码器 / Product table decoder.
 * @property {(builder: Builder, json: unknown) => number} encode 产品表编码器 / Product table encoder.
 */

/**
 * @typedef {object} FlatBufferRootProcessorOptions
 * @property {string} name 处理器名称和日志前缀 / Processor name and log prefix.
 * @property {Function} rootClass FlatBuffers 生成的根表类 / Generated FlatBuffers root table class.
 * @property {Readonly<Record<string, FlatBufferRootCodec>>} codecs 按根 accessor 名称注册的 codec / Codecs keyed by root accessor name.
 * @property {readonly string[]} configurableRootNames 受业务开关控制的根名称 / Root names controlled by business settings.
 */

/**
 * 使用生成的根表类配置 FlatBuffer 根 slot 编解码流程。
 * Configure FlatBuffer root-slot encoding and decoding with a generated root table class.
 */
class FlatBufferRootProcessor {
	#name;
	#fields;
	#fieldsById;
	#fieldsByName;
	#configurableRootNames;

	/**
	 * 创建并验证根表处理器配置。
	 * Create and validate a root table processor configuration.
	 * @param {FlatBufferRootProcessorOptions} options - 根表模型、codec 和运行期策略 / Root model, codecs, and runtime policy.
	 */
	constructor(options) {
		if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("FlatBufferRootProcessor options must be an object");

		try {
			if (typeof options.name !== "string" || options.name.length === 0) throw new TypeError("FlatBufferRootProcessor name must be a non-empty string");
			if (typeof options.rootClass !== "function" || !options.rootClass.prototype || typeof options.rootClass.prototype.__init !== "function") {
				throw new TypeError(`${options.name} rootClass must be a generated FlatBuffers table class`);
			}
			if (!options.codecs || typeof options.codecs !== "object" || Array.isArray(options.codecs)) {
				throw new TypeError(`${options.name} codecs must be an object`);
			}
			if (!Array.isArray(options.configurableRootNames)) throw new TypeError(`${options.name} configurableRootNames must be an array`);

			const rootNames = Object.getOwnPropertyNames(options.rootClass.prototype).filter(name => !["constructor", "__init"].includes(name));
			for (const rootName of rootNames) {
				if (typeof options.rootClass.prototype[rootName] !== "function") throw new TypeError(`${options.name} root accessor ${rootName} must be a function`);
				const suffix = `${rootName[0].toUpperCase()}${rootName.slice(1)}`;
				if (typeof options.rootClass[`add${suffix}`] !== "function") throw new TypeError(`${options.name} root accessor ${rootName} has no matching add${suffix}`);
			}

			const rootNameSet = new Set(rootNames);
			const codecs = new Map();
			for (const rootName of Object.keys(options.codecs)) {
				if (!rootNameSet.has(rootName)) throw new RangeError(`${options.name} codec ${rootName} is not a root accessor`);
				const codec = options.codecs[rootName];
				if (!codec || typeof codec !== "object" || Array.isArray(codec)) throw new TypeError(`${options.name} codec ${rootName} must be an object`);
				if (typeof codec.tableClass !== "function" || !codec.tableClass.prototype || typeof codec.tableClass.prototype.__init !== "function") {
					throw new TypeError(`${options.name} codec ${rootName} tableClass must be a generated FlatBuffers table class`);
				}
				if (typeof codec.decode !== "function") throw new TypeError(`${options.name} codec ${rootName} must provide decode`);
				if (typeof codec.encode !== "function") throw new TypeError(`${options.name} codec ${rootName} must provide encode`);
				codecs.set(rootName, Object.freeze({ decode: codec.decode, encode: codec.encode, tableClass: codec.tableClass }));
			}

			const configurableRootNames = new Set();
			for (const rootName of options.configurableRootNames) {
				if (typeof rootName !== "string" || rootName.length === 0) throw new TypeError(`${options.name} configurableRootNames must contain non-empty strings`);
				if (!rootNameSet.has(rootName)) throw new RangeError(`${options.name} configurable root ${rootName} is not a root accessor`);
				if (configurableRootNames.has(rootName)) throw new RangeError(`${options.name} configurable root ${rootName} is duplicated`);
				configurableRootNames.add(rootName);
			}

			const fields = rootNames.map((name, id) => Object.freeze({ codec: codecs.get(name), id, name }));
			this.#name = options.name;
			this.#fields = Object.freeze(fields);
			this.#fieldsById = new Map(fields.map(field => [field.id, field]));
			this.#fieldsByName = new Map(fields.map(field => [field.name, field]));
			this.#configurableRootNames = configurableRootNames;
		} catch (error) {
			Console.error(`${typeof options.name === "string" && options.name ? options.name : "FlatBufferRootProcessor"}.configure`, error);
			throw error;
		}
	}

	/**
	 * 根据处理器配置过滤受业务开关控制的根名称。
	 * Filter root names controlled by the processor's business configuration.
	 * @param {string[]} requestedRootNames - 原请求中的根名称 / Root names from the original request.
	 * @param {string[]} enabledRootNames - 当前启用的根名称 / Currently enabled root names.
	 * @returns {string[]} 保持原顺序的过滤结果 / Filtered names preserving their original order.
	 */
	filterRootNames(requestedRootNames, enabledRootNames) {
		try {
			this.#assertStringArray(requestedRootNames, "requestedRootNames");
			this.#assertStringArray(enabledRootNames, "enabledRootNames");
			const enabled = new Set(enabledRootNames);
			return requestedRootNames.filter(rootName => !this.#configurableRootNames.has(rootName) || enabled.has(rootName));
		} catch (error) {
			Console.error(`${this.#name}.filterRootNames`, error);
			throw error;
		}
	}

	/**
	 * 按物理 slot 顺序解码选中的根产品。
	 * Decode selected root products in physical slot order.
	 * @param {ByteBuffer} byteBuffer - 原始 FlatBuffer / Source FlatBuffer.
	 * @param {string[]} [rootNames=[]] - 要解码的根名称 / Root names to decode.
	 * @returns {Record<string, unknown>} 已成功解码的根对象 / Successfully decoded root objects.
	 */
	decode(byteBuffer, rootNames = []) {
		return this.decodeWithReport(byteBuffer, rootNames).json;
	}

	/**
	 * 按物理 slot 顺序解码选中的根产品，并返回分类报告。
	 * Decode selected root products in physical slot order and return a classified report.
	 *
	 * 报告区分三种可隔离的情况：物理缺失（源根表中没有该 slot）、
	 * 读取或解码失败（记 warn 日志并跳过该 slot，不影响其余 slot）、
	 * 以及未注册 codec 的未知名称。缺失是正常情况，不触发告警。
	 * 是否因失败而否决整体结果由调用方决定。
	 * The report distinguishes three isolated cases: physically missing (the slot is
	 * absent from the source root), read/decode failures (logged with warn and skipped
	 * without affecting the remaining slots), and requested names without a registered
	 * codec. Missing slots are normal and never raise warnings.
	 * Whether a failure vetoes the overall result is the caller's decision.
	 *
	 * @param {ByteBuffer} byteBuffer - 原始 FlatBuffer / Source FlatBuffer.
	 * @param {string[]} [rootNames=[]] - 要解码的根名称 / Root names to decode.
	 * @returns {FlatBufferRootDecodeReport} 解码结果与分类报告 / Decoded result and classified report.
	 */
	decodeWithReport(byteBuffer, rootNames = []) {
		try {
			this.#assertStringArray(rootNames, "rootNames");
		} catch (error) {
			Console.error(`${this.#name}.decode`, error);
			throw error;
		}

		const requested = new Set(rootNames);
		const json = {};
		let dictionary;
		try {
			dictionary = this.#readRootSlots(byteBuffer);
		} catch (error) {
			Console.error(`${this.#name}.decode`, error);
			throw error;
		}
		const slotReport = this.#logSlotDictionary("decode", dictionary);

		const presentIds = new Set([...dictionary.slots.keys(), ...dictionary.failures.map(failure => failure.id)]);
		const unknown = [...requested].filter(name => {
			const field = this.#fieldsByName.get(name);
			return !field || !field.codec;
		});
		const missing = [...requested].filter(name => {
			const field = this.#fieldsByName.get(name);
			if (!field) return false;
			return Boolean(field.codec) && !presentIds.has(field.id);
		});
		/** @type {{ name: string, message: string }[]} */
		const failures = [];
		const failureLabels = [];
		for (const { id, error } of dictionary.failures) {
			const field = this.#fieldsById.get(id);
			if (!field || !field.codec || !requested.has(field.name)) continue;
			const message = error.message;
			failures.push({ name: field.name, message });
			failureLabels.push(`${this.#slotLabel(id)}(${message})`);
		}
		let parsed = 0;

		for (const [id, frame] of [...dictionary.slots].sort(([left], [right]) => left - right)) {
			const field = this.#fieldsById.get(id);
			if (!field || !field.codec || !requested.has(field.name)) continue;

			try {
				const table = new field.codec.tableClass().__init(frame.tablePosition, new ByteBuffer(frame.bytes));
				json[field.name] = field.codec.decode(table);
				parsed++;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				failures.push({ name: field.name, message });
				failureLabels.push(`${this.#slotLabel(id)}(${message})`);
			}
		}

		const unknownLabels = slotReport.unknownLabels;
		const message = `${this.#name}.decode.parse：已知 ${slotReport.knownCount}/${dictionary.presentSlotCount}，解析 ${parsed}/${dictionary.presentSlotCount}，失败 ${failureLabels.length}/${dictionary.presentSlotCount}，未知 ${unknownLabels.length}/${dictionary.presentSlotCount}；失败=[${failureLabels.join(", ")}]；未知=[${unknownLabels.join(", ")}]；请求未知=[${unknown.join(", ")}]；缺失=[${missing.join(", ")}]`;
		if (failureLabels.length || unknownLabels.length || unknown.length) Console.warn(message);
		else Console.debug(message);
		return { json, missing, failures, unknown };
	}

	/**
	 * 独立编译 patch slot，并与原始根表合并组装。
	 * Compile patch slots independently and merge them into the source root table.
	 * @param {ByteBuffer | undefined} [byteBuffer=undefined] - 原始 FlatBuffer；省略时创建新根表 / Source FlatBuffer; omit to create a new root table.
	 * @param {Record<string, unknown>} [patch={}] - 按根名称组织的实际修改 / Actual changes keyed by root name.
	 * @returns {Uint8Array} 完整 FlatBuffer / Complete FlatBuffer.
	 */
	encode(byteBuffer = undefined, patch = {}) {
		if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
			const error = new TypeError(`${this.#name}.encode patch must be an object`);
			Console.error(`${this.#name}.encode`, error);
			throw error;
		}

		const patchKeys = Object.keys(patch);
		const compiled = new Map();
		const failures = [];
		const unknown = [];
		let known = 0;

		for (const name of patchKeys) {
			const field = this.#fieldsByName.get(name);
			if (!field || !field.codec) {
				unknown.push(name);
				continue;
			}
			known++;

			try {
				const data = patch[name];
				if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError(`${name} must be an object`);

				const builder = new Builder();
				const tableOffset = field.codec.encode(builder, data);
				if (!Number.isSafeInteger(tableOffset) || tableOffset <= 0) throw new Error(`${name} codec did not produce a table`);
				builder.finish(tableOffset);

				const bytes = builder.asUint8Array();
				const frameBuffer = new ByteBuffer(bytes);
				const tablePosition = frameBuffer.position() + frameBuffer.readUint32(frameBuffer.position());
				compiled.set(field.id, { bytes, tablePosition });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				failures.push(`${this.#slotLabel(field.id)}(${message})`);
			}
		}

		const compileMessage = `${this.#name}.encode.compile：已知 ${known}/${patchKeys.length}，编译 ${compiled.size}/${patchKeys.length}，失败 ${failures.length}/${patchKeys.length}，未知 ${unknown.length}/${patchKeys.length}；失败=[${failures.join(", ")}]；未知=[${unknown.join(", ")}]`;
		if (failures.length || unknown.length) Console.warn(compileMessage);
		else Console.debug(compileMessage);

		let sourceDictionary;
		if (byteBuffer !== undefined) {
			try {
				sourceDictionary = this.#readRootSlots(byteBuffer);
			} catch (error) {
				Console.error(`${this.#name}.encode`, error);
				throw error;
			}
		} else {
			sourceDictionary = { failures: [], presentSlotCount: 0, slotCount: 0, slots: new Map() };
		}
		this.#logSlotDictionary("encode", sourceDictionary);

		if (byteBuffer !== undefined && compiled.size === 0) {
			return byteBuffer.bytes().subarray(byteBuffer.position(), byteBuffer.capacity());
		}

		const slots = new Map(sourceDictionary.slots);
		for (const [id, frame] of compiled) slots.set(id, frame);

		try {
			const rawBody = this.#writeRootSlots(
				{
					failures: [],
					presentSlotCount: slots.size,
					slotCount: sourceDictionary.slotCount,
					slots,
				},
				this.#fields.length,
			);
			Console.debug(`${this.#name}.encode.assemble：输出 ${slots.size} 个 slot，替换 ${compiled.size} 个 slot`);
			return rawBody;
		} catch (error) {
			Console.error(`${this.#name}.encode`, error);
			throw error;
		}
	}

	/**
	 * 校验字符串数组 API 契约。
	 * Validate a string-array API contract.
	 * @param {unknown} value - 待校验值 / Value to validate.
	 * @param {string} label - 参数名称 / Parameter name.
	 * @returns {void}
	 */
	#assertStringArray(value, label) {
		if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new TypeError(`${this.#name}.${label} must be an array of strings`);
	}

	/**
	 * 顺序扫描根 vtable，并让所有有效 slot 共享原始 arena。
	 * Scan the root vtable sequentially while sharing the source arena across valid slots.
	 * @param {ByteBuffer} source - 原始 FlatBuffer / Source FlatBuffer.
	 * @returns {RootSlotDictionary} 根 slot 字典 / Root slot dictionary.
	 */
	#readRootSlots(source) {
		if (!source || typeof source.position !== "function" || typeof source.capacity !== "function" || typeof source.bytes !== "function") {
			throw new TypeError(`${this.#name} source must be a FlatBuffers ByteBuffer`);
		}

		const sourceStart = source.position();
		const sourceEnd = source.capacity();
		this.#ensureRange(sourceStart, ROOT_OFFSET_SIZE, sourceStart, sourceEnd, "root offset");

		const rootPosition = sourceStart + source.readUint32(sourceStart);
		const rootTable = this.#inspectTable(source, rootPosition, sourceStart, sourceEnd, "root table", false);
		const slotCount = (rootTable.vtableLength - VTABLE_HEADER_SIZE) / VTABLE_ENTRY_SIZE;
		const bytes = source.bytes().subarray(sourceStart, sourceEnd);
		const slots = new Map();
		const failures = [];
		let presentSlotCount = 0;

		for (let id = 0; id < slotCount; id++) {
			const fieldOffset = source.readUint16(rootTable.vtablePosition + VTABLE_HEADER_SIZE + id * VTABLE_ENTRY_SIZE);
			if (fieldOffset === 0) continue;
			presentSlotCount++;

			try {
				if (fieldOffset < ROOT_OFFSET_SIZE || fieldOffset + OFFSET_FIELD_SIZE > rootTable.objectLength) {
					throw new Error(`root slot ${id} has an invalid field offset: ${fieldOffset}`);
				}

				const fieldPosition = rootPosition + fieldOffset;
				this.#ensureRange(fieldPosition, OFFSET_FIELD_SIZE, sourceStart, sourceEnd, `root slot ${id}`);
				const relativeOffset = source.readUint32(fieldPosition);
				if (relativeOffset === 0) throw new Error(`root slot ${id} has a null table offset`);

				const tablePosition = fieldPosition + relativeOffset;
				this.#inspectTable(source, tablePosition, sourceStart, sourceEnd, `root slot ${id} table`);
				slots.set(id, { bytes, tablePosition: tablePosition - sourceStart });
			} catch (error) {
				failures.push({ id, error: error instanceof Error ? error : new Error(String(error)) });
			}
		}

		return { failures, presentSlotCount, slotCount, slots };
	}

	/**
	 * 将唯一 arena 嵌入一次，并重新组装根表。
	 * Embed each unique arena once and reassemble the root table.
	 * @param {RootSlotDictionary} dictionary - 待组装字典 / Dictionary to assemble.
	 * @param {number} schemaSlotCount - 当前模型的根 slot 数 / Root slot count of the current model.
	 * @returns {Uint8Array} 完整 FlatBuffer / Complete FlatBuffer.
	 */
	#writeRootSlots(dictionary, schemaSlotCount) {
		if (!dictionary || !(dictionary.slots instanceof Map)) throw new TypeError("FlatBuffer root slot dictionary must contain a slots Map");
		if (!Number.isSafeInteger(dictionary.slotCount) || dictionary.slotCount < 0) throw new RangeError(`Invalid FlatBuffer root slot count: ${dictionary.slotCount}`);
		if (!Number.isSafeInteger(schemaSlotCount) || schemaSlotCount < 0) throw new RangeError(`Invalid FlatBuffer schema slot count: ${schemaSlotCount}`);

		const builder = new Builder();
		const arenaOffsets = new Map();
		const tableOffsets = new Map();
		let slotCount = Math.max(dictionary.slotCount, schemaSlotCount);

		for (const [id, frame] of [...dictionary.slots].sort(([left], [right]) => left - right)) {
			if (!Number.isSafeInteger(id) || id < 0) throw new RangeError(`Invalid FlatBuffer root slot: ${id}`);
			if (!frame || !(frame.bytes instanceof Uint8Array)) throw new TypeError(`FlatBuffer root slot ${id} must contain Uint8Array bytes`);
			if (!Number.isSafeInteger(frame.tablePosition)) throw new RangeError(`Invalid FlatBuffer root slot ${id} table position: ${frame.tablePosition}`);

			const frameBuffer = new ByteBuffer(frame.bytes);
			this.#inspectTable(frameBuffer, frame.tablePosition, 0, frame.bytes.length, `root slot ${id} table`);

			let arenaStartOffset = arenaOffsets.get(frame.bytes);
			if (arenaStartOffset === undefined) {
				builder.startVector(1, frame.bytes.length, MAX_SCALAR_ALIGNMENT);
				for (let index = frame.bytes.length - 1; index >= 0; index--) builder.writeInt8(frame.bytes[index]);
				arenaStartOffset = builder.endVector() - OFFSET_FIELD_SIZE;
				arenaOffsets.set(frame.bytes, arenaStartOffset);
			}

			tableOffsets.set(id, arenaStartOffset - frame.tablePosition);
			slotCount = Math.max(slotCount, id + 1);
		}

		builder.startObject(slotCount);
		for (const [id, offset] of [...tableOffsets].sort(([left], [right]) => left - right)) builder.addFieldOffset(id, offset, 0);
		const root = builder.endObject();
		builder.finish(root);
		return builder.asUint8Array();
	}

	/**
	 * 校验 table 与 vtable 边界。
	 * Validate table and vtable boundaries.
	 * @param {ByteBuffer} source - FlatBuffer / FlatBuffer.
	 * @param {number} tablePosition - table 位置 / Table position.
	 * @param {number} sourceStart - arena 起点 / Arena start.
	 * @param {number} sourceEnd - arena 终点 / Arena end.
	 * @param {string} label - 错误标签 / Error label.
	 * @returns {{objectLength: number, vtableLength: number, vtablePosition: number}} table 元数据 / Table metadata.
	 */
	/**
	 * 校验 table 与 vtable 边界。
	 * Validate table and vtable boundaries.
	 * @param {ByteBuffer} source - FlatBuffer / FlatBuffer.
	 * @param {number} tablePosition - table 位置 / Table position.
	 * @param {number} sourceStart - arena 起点 / Arena start.
	 * @param {number} sourceEnd - arena 终点 / Arena end.
	 * @param {string} label - 错误标签 / Error label.
	 * @returns {TableInspection} table 布局元数据 / Table layout metadata.
	 */
	#inspectTable(source, tablePosition, sourceStart, sourceEnd, label, checkFieldOffsets = true) {
		return inspectTableStructure(source, tablePosition, sourceStart, sourceEnd, label, Number.POSITIVE_INFINITY, checkFieldOffsets);
	}

	/**
	 * 校验二进制读取范围。
	 * Validate a binary read range.
	 * @param {number} position - 起点 / Start position.
	 * @param {number} length - 长度 / Length.
	 * @param {number} start - arena 起点 / Arena start.
	 * @param {number} end - arena 终点 / Arena end.
	 * @param {string} label - 错误标签 / Error label.
	 * @returns {void}
	 */
	#ensureRange(position, length, start, end, label) {
		ensureRange(position, length, start, end, label);
	}

	/**
	 * 汇总 slot 字典读取结果。
	 * Summarize a root-slot dictionary read.
	 * @param {"encode" | "decode"} operation - 操作名称 / Operation name.
	 * @param {RootSlotDictionary} dictionary - 根 slot 字典 / Root slot dictionary.
	 * @returns {{knownCount: number, unknownLabels: string[]}} 后续解析统计 / Statistics for the parse phase.
	 */
	#logSlotDictionary(operation, dictionary) {
		const ids = [...dictionary.slots.keys(), ...dictionary.failures.map(failure => failure.id)].sort((left, right) => left - right);
		const knownCount = ids.filter(id => {
			const field = this.#fieldsById.get(id);
			if (!field) return false;
			return Boolean(field.codec);
		}).length;
		const unknownLabels = ids
			.filter(id => {
				const field = this.#fieldsById.get(id);
				return !field || !field.codec;
			})
			.map(id => this.#slotLabel(id));
		const failureLabels = dictionary.failures.map(({ id, error }) => `${this.#slotLabel(id)}(${error.message})`);
		const message = `${this.#name}.${operation}.slots：已知 ${knownCount}/${dictionary.presentSlotCount}，读取 ${dictionary.slots.size}/${dictionary.presentSlotCount}，失败 ${failureLabels.length}/${dictionary.presentSlotCount}，未知 ${unknownLabels.length}/${dictionary.presentSlotCount}；失败=[${failureLabels.join(", ")}]；未知=[${unknownLabels.join(", ")}]`;
		if (failureLabels.length || unknownLabels.length) Console.warn(message);
		else Console.debug(message);
		return { knownCount, unknownLabels };
	}

	/**
	 * 将 slot ID 格式化为模型名称或物理编号。
	 * Format a slot ID as a model name or physical identifier.
	 * @param {number} id - 根 slot ID / Root slot ID.
	 * @returns {string} 日志标签 / Log label.
	 */
	#slotLabel(id) {
		const field = this.#fieldsById.get(id);
		return field ? `${field.name}#${id}` : `slot#${id}`;
	}
}

var database = {
    WeatherKit: {
        Settings: {
            // 只有插件会修改的产品允许被配置关闭；其余 Apple 数据集必须始终透传。
            DataSets: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastNextHour", "weatherAlerts"],
            Weather: { Replace: ["CN"], Provider: "ColorfulClouds" },
            WeatherAlerts: { Provider: "QWeatherWeb" },
            NextHour: { Provider: "ColorfulClouds" },
            AirQuality: {
                Current: { Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [], Mode: "Scale" } }, Index: { Replace: ["HJ6332012", "EU.EAQI", "CN_AQHI", "EPA_NowCast"], Provider: "ColorfulCloudsUS", ForceCNPrimaryPollutants: true } },
                Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { PollutantsProvider: "QWeather", IndexProvider: "ColorfulCloudsUS" } },
                Calculate: { Algorithm: "EU_EAQI", AllowOverRange: true },
            },
            API: { WAQI: { Token: null }, QWeather: { Token: "bdd98ec1d87747f3a2e8b1741a5af796", Host: "devapi.qweather.com" }, ColorfulClouds: { Token: "Y2FpeXVuX25vdGlmeQ==" } },
        },
        Configs: {
            Availability: {
                v1: ["currentWeather", "dailyForecast", "hourlyForecast", "minuteForecast", "weatherAlerts"],
                v2: ["airQuality", "currentWeather", "forecastDaily", "forecastHourly", "forecastPeriodic", "historicalComparisons", "weatherChanges", "forecastNextHour", "weatherAlerts", "weatherAlertNotifications", "news"],
            },
            DataSets: {
                airQuality: "airQuality",
                currentWeather: "currentWeather",
                forecastDaily: "forecastDaily",
                forecastHourly: "forecastHourly",
                forecastNextHour: "forecastNextHour",
                news: "news",
                weatherAlerts: "weatherAlerts",
                weatherChange: "weatherChanges",
                trendComparison: "historicalComparisons",
                locationInfo: "locationInfo",
            },
        },
    },
    Default: {
        Settings: { LogLevel: "WARN" },
        Configs: {
            Storefront: {
                AE: "143481",
                AF: "143610",
                AG: "143540",
                AI: "143538",
                AL: "143575",
                AM: "143524",
                AO: "143564",
                AR: "143505",
                AT: "143445",
                AU: "143460",
                AZ: "143568",
                BA: "143612",
                BB: "143541",
                BD: "143490",
                BE: "143446",
                BF: "143578",
                BG: "143526",
                BH: "143559",
                BJ: "143576",
                BM: "143542",
                BN: "143560",
                BO: "143556",
                BR: "143503",
                BS: "143539",
                BT: "143577",
                BW: "143525",
                BY: "143565",
                BZ: "143555",
                CA: "143455",
                CD: "143613",
                CG: "143582",
                CH: "143459",
                CI: "143527",
                CL: "143483",
                CM: "143574",
                CN: "143465",
                CO: "143501",
                CR: "143495",
                CV: "143580",
                CY: "143557",
                CZ: "143489",
                DE: "143443",
                DK: "143458",
                DM: "143545",
                DO: "143508",
                DZ: "143563",
                EC: "143509",
                EE: "143518",
                EG: "143516",
                ES: "143454",
                FI: "143447",
                FJ: "143583",
                FM: "143591",
                FR: "143442",
                GA: "143614",
                GB: "143444",
                GD: "143546",
                GF: "143615",
                GH: "143573",
                GM: "143584",
                GR: "143448",
                GT: "143504",
                GW: "143585",
                GY: "143553",
                HK: "143463",
                HN: "143510",
                HR: "143494",
                HU: "143482",
                ID: "143476",
                IE: "143449",
                IL: "143491",
                IN: "143467",
                IQ: "143617",
                IS: "143558",
                IT: "143450",
                JM: "143511",
                JO: "143528",
                JP: "143462",
                KE: "143529",
                KG: "143586",
                KH: "143579",
                KN: "143548",
                KP: "143466",
                KR: "143466",
                KW: "143493",
                KY: "143544",
                KZ: "143517",
                TC: "143552",
                TD: "143581",
                TJ: "143603",
                TH: "143475",
                TM: "143604",
                TN: "143536",
                TO: "143608",
                TR: "143480",
                TT: "143551",
                TW: "143470",
                TZ: "143572",
                LA: "143587",
                LB: "143497",
                LC: "143549",
                LI: "143522",
                LK: "143486",
                LR: "143588",
                LT: "143520",
                LU: "143451",
                LV: "143519",
                LY: "143567",
                MA: "143620",
                MD: "143523",
                ME: "143619",
                MG: "143531",
                MK: "143530",
                ML: "143532",
                MM: "143570",
                MN: "143592",
                MO: "143515",
                MR: "143590",
                MS: "143547",
                MT: "143521",
                MU: "143533",
                MV: "143488",
                MW: "143589",
                MX: "143468",
                MY: "143473",
                MZ: "143593",
                NA: "143594",
                NE: "143534",
                NG: "143561",
                NI: "143512",
                NL: "143452",
                NO: "143457",
                NP: "143484",
                NR: "143606",
                NZ: "143461",
                OM: "143562",
                PA: "143485",
                PE: "143507",
                PG: "143597",
                PH: "143474",
                PK: "143477",
                PL: "143478",
                PT: "143453",
                PW: "143595",
                PY: "143513",
                QA: "143498",
                RO: "143487",
                RS: "143500",
                RU: "143469",
                RW: "143621",
                SA: "143479",
                SB: "143601",
                SC: "143599",
                SE: "143456",
                SG: "143464",
                SI: "143499",
                SK: "143496",
                SL: "143600",
                SN: "143535",
                SR: "143554",
                ST: "143598",
                SV: "143506",
                SZ: "143602",
                UA: "143492",
                UG: "143537",
                US: "143441",
                UY: "143514",
                UZ: "143566",
                VC: "143550",
                VE: "143502",
                VG: "143543",
                VN: "143471",
                VU: "143609",
                XK: "143624",
                YE: "143571",
                ZA: "143472",
                ZM: "143622",
                ZW: "143605",
            },
        },
    },
};

/**
 * 使用 Weather 根模型和产品 codec 配置通用根表处理器。
 * Configure the generic root-table processor with the Weather model and product codecs.
 */
const WeatherKit2 = new FlatBufferRootProcessor({
    codecs: {
        airQuality: { decode: decodeAirQuality$1, encode: encodeAirQuality$1, tableClass: ht.AirQuality },
        currentWeather: { decode: decodeCurrentWeather, encode: encodeCurrentWeather, tableClass: ht.CurrentWeatherData },
        forecastDaily: { decode: decodeForecastDaily, encode: encodeForecastDaily, tableClass: ht.DailyForecastData },
        forecastHourly: { decode: decodeForecastHourly, encode: encodeForecastHourly, tableClass: ht.HourlyForecastData },
        forecastNextHour: { decode: decodeForecastNextHour, encode: encodeForecastNextHour, tableClass: ht.NextHourForecastData },
        historicalComparisons: { decode: decodeHistoricalComparisons, encode: encodeHistoricalComparisons, tableClass: ht.HistoricalComparison },
        locationInfo: { decode: decodeLocationInfo, encode: encodeLocationInfo, tableClass: ht.LocationInfo },
        news: { decode: decodeNews, encode: encodeNews, tableClass: ht.News },
        weatherAlerts: { decode: decodeWeatherAlerts, encode: encodeWeatherAlerts, tableClass: ht.WeatherAlertCollectionData },
        weatherChanges: { decode: decodeWeatherChanges, encode: encodeWeatherChanges, tableClass: ht.WeatherChanges },
    },
    configurableRootNames: database.WeatherKit.Settings.DataSets,
    name: "WeatherKit2",
    rootClass: ht.Weather,
});

/**
 * 编码 air quality 产品表。 / Encode the air quality product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeAirQuality$1(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const pollutantsOffset = ht.AirQuality.createPollutantsVector(
        builder,
        data.pollutants.map(p => ht.Pollutant.createPollutant(builder, ht.PollutantType[p.pollutantType], p.amount, ht.UnitType[p.units])),
    );
    const scaleOffset = builder.createString(data.scale);
    return ht.AirQuality.createAirQuality(builder, metadataOffset, data.categoryIndex, data.index, data.isSignificant, pollutantsOffset, ht.ComparisonTrend[data.previousDayComparison], ht.PollutantType[data.primaryPollutant], scaleOffset);
}

/**
 * 编码 current weather 产品表。 / Encode the current weather product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeCurrentWeather(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const precipitationAmountNext1hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountNext1hByTypeVector(
        builder,
        data.precipitationAmountNext1hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext24hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountNext24hByTypeVector(
        builder,
        data.precipitationAmountNext24hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext6hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountNext6hByTypeVector(
        builder,
        data.precipitationAmountNext6hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious1hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountPrevious1hByTypeVector(
        builder,
        data.precipitationAmountPrevious1hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious24hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountPrevious24hByTypeVector(
        builder,
        data.precipitationAmountPrevious24hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious6hByTypeOffset = ht.CurrentWeatherData.createPrecipitationAmountPrevious6hByTypeVector(
        builder,
        data.precipitationAmountPrevious6hByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    return ht.CurrentWeatherData.createCurrentWeatherData(
        builder,
        metadataOffset,
        data.asOf,
        data.cloudCover,
        data.cloudCoverLowAltPct,
        data.cloudCoverMidAltPct,
        data.cloudCoverHighAltPct,
        ht.WeatherCondition[data.conditionCode],
        data.daylight,
        data.humidity,
        data.perceivedPrecipitationIntensity,
        data.precipitationAmount1h,
        data.precipitationAmount6h,
        data.precipitationAmount24h,
        data.precipitationAmountNext1h,
        data.precipitationAmountNext6h,
        data.precipitationAmountNext24h,
        precipitationAmountNext1hByTypeOffset,
        precipitationAmountNext6hByTypeOffset,
        precipitationAmountNext24hByTypeOffset,
        precipitationAmountPrevious1hByTypeOffset,
        precipitationAmountPrevious6hByTypeOffset,
        precipitationAmountPrevious24hByTypeOffset,
        data.precipitationIntensity,
        data.pressure,
        ht.PressureTrend[data.pressureTrend],
        data.snowfallAmount1h,
        data.snowfallAmount6h,
        data.snowfallAmount24h,
        data.snowfallAmountNext1h,
        data.snowfallAmountNext6h,
        data.snowfallAmountNext24h,
        data.temperature,
        data.temperatureApparent,
        data.unknown34,
        data.temperatureDewPoint,
        data.uvIndex,
        data.visibility,
        data.windDirection,
        data.windGust,
        data.windSpeed,
    );
}

/**
 * 编码 daily forecast 产品表。 / Encode the daily forecast product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeForecastDaily(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const daysOffsets = data.days.map(day => {
        const Offsets = {};
        Offsets.precipitationAmountByTypeOffest = ht.DayWeatherConditions.createPrecipitationAmountByTypeVector(
            builder,
            day.precipitationAmountByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
        );
        if (day.daytimeForecast) {
            Offsets.daytimeForecastPrecipitationAmountByTypeOffest = ht.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.daytimeForecast.precipitationAmountByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.daytimeForecastOffset = ht.DayPartForecast.createDayPartForecast(
                builder,
                day.daytimeForecast.forecastStart,
                day.daytimeForecast.forecastEnd,
                day.daytimeForecast.cloudCover,
                day.daytimeForecast.cloudCoverLowAltPct,
                day.daytimeForecast.cloudCoverMidAltPct,
                day.daytimeForecast.cloudCoverHighAltPct,
                ht.WeatherCondition[day.daytimeForecast.conditionCode],
                day.daytimeForecast.humidity,
                day.daytimeForecast.humidityMax,
                day.daytimeForecast.humidityMin,
                day.daytimeForecast.precipitationAmount,
                Offsets.daytimeForecastPrecipitationAmountByTypeOffest,
                day.daytimeForecast.precipitationChance,
                ht.PrecipitationType[day.daytimeForecast.precipitationType],
                day.daytimeForecast.snowfallAmount,
                day.daytimeForecast.temperatureMax,
                day.daytimeForecast.temperatureMin,
                day.daytimeForecast.visibilityMax,
                day.daytimeForecast.visibilityMin,
                day.daytimeForecast.windDirection,
                day.daytimeForecast.windGustSpeedMax,
                day.daytimeForecast.windSpeed,
                day.daytimeForecast.windSpeedMax,
                day.daytimeForecast.precipitationIntensityMax,
                day.daytimeForecast.perceivedPrecipitationIntensityMax,
                day.daytimeForecast.uvIndexMin,
                day.daytimeForecast.uvIndexMax,
                day.daytimeForecast.temperatureApparentMin,
                day.daytimeForecast.temperatureApparentMax,
                day.daytimeForecast.daylight,
            );
        }
        if (day.overnightForecast) {
            Offsets.overnightForecastPrecipitationAmountByTypeOffest = ht.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.overnightForecast.precipitationAmountByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.overnightForecastOffset = ht.DayPartForecast.createDayPartForecast(
                builder,
                day.overnightForecast.forecastStart,
                day.overnightForecast.forecastEnd,
                day.overnightForecast.cloudCover,
                day.overnightForecast.cloudCoverLowAltPct,
                day.overnightForecast.cloudCoverMidAltPct,
                day.overnightForecast.cloudCoverHighAltPct,
                ht.WeatherCondition[day.overnightForecast.conditionCode],
                day.overnightForecast.humidity,
                day.overnightForecast.humidityMax,
                day.overnightForecast.humidityMin,
                day.overnightForecast.precipitationAmount,
                Offsets.overnightForecastPrecipitationAmountByTypeOffest,
                day.overnightForecast.precipitationChance,
                ht.PrecipitationType[day.overnightForecast.precipitationType],
                day.overnightForecast.snowfallAmount,
                day.overnightForecast.temperatureMax,
                day.overnightForecast.temperatureMin,
                day.overnightForecast.visibilityMax,
                day.overnightForecast.visibilityMin,
                day.overnightForecast.windDirection,
                day.overnightForecast.windGustSpeedMax,
                day.overnightForecast.windSpeed,
                day.overnightForecast.windSpeedMax,
                day.overnightForecast.precipitationIntensityMax,
                day.overnightForecast.perceivedPrecipitationIntensityMax,
                day.overnightForecast.uvIndexMin,
                day.overnightForecast.uvIndexMax,
                day.overnightForecast.temperatureApparentMin,
                day.overnightForecast.temperatureApparentMax,
                day.overnightForecast.daylight,
            );
        }
        if (day.restOfDayForecast) {
            Offsets.restOfDayForecastPrecipitationAmountByTypeOffest = ht.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.restOfDayForecast.precipitationAmountByType.map(p => ht.PrecipitationAmountByType.createPrecipitationAmountByType(builder, ht.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.restOfDayForecastOffset = ht.DayPartForecast.createDayPartForecast(
                builder,
                day.restOfDayForecast.forecastStart,
                day.restOfDayForecast.forecastEnd,
                day.restOfDayForecast.cloudCover,
                day.restOfDayForecast.cloudCoverLowAltPct,
                day.restOfDayForecast.cloudCoverMidAltPct,
                day.restOfDayForecast.cloudCoverHighAltPct,
                ht.WeatherCondition[day.restOfDayForecast.conditionCode],
                day.restOfDayForecast.humidity,
                day.restOfDayForecast.humidityMax,
                day.restOfDayForecast.humidityMin,
                day.restOfDayForecast.precipitationAmount,
                Offsets.restOfDayForecastPrecipitationAmountByTypeOffest,
                day.restOfDayForecast.precipitationChance,
                ht.PrecipitationType[day.restOfDayForecast.precipitationType],
                day.restOfDayForecast.snowfallAmount,
                day.restOfDayForecast.temperatureMax,
                day.restOfDayForecast.temperatureMin,
                day.restOfDayForecast.visibilityMax,
                day.restOfDayForecast.visibilityMin,
                day.restOfDayForecast.windDirection,
                day.restOfDayForecast.windGustSpeedMax,
                day.restOfDayForecast.windSpeed,
                day.restOfDayForecast.windSpeedMax,
                day.restOfDayForecast.precipitationIntensityMax,
                day.restOfDayForecast.perceivedPrecipitationIntensityMax,
                day.restOfDayForecast.uvIndexMin,
                day.restOfDayForecast.uvIndexMax,
                day.restOfDayForecast.temperatureApparentMin,
                day.restOfDayForecast.temperatureApparentMax,
                day.restOfDayForecast.daylight,
            );
        }
        ht.DayWeatherConditions.startDayWeatherConditions(builder);
        ht.DayWeatherConditions.addForecastStart(builder, day.forecastStart);
        ht.DayWeatherConditions.addForecastEnd(builder, day.forecastEnd);
        ht.DayWeatherConditions.addConditionCode(builder, ht.WeatherCondition[day.conditionCode]);
        ht.DayWeatherConditions.addHumidityMax(builder, day.humidityMax);
        ht.DayWeatherConditions.addHumidityMin(builder, day.humidityMin);
        ht.DayWeatherConditions.addMaxUvIndex(builder, day.maxUvIndex);
        ht.DayWeatherConditions.addMoonPhase(builder, ht.MoonPhase[day.moonPhase]);
        ht.DayWeatherConditions.addMoonrise(builder, day.moonrise);
        ht.DayWeatherConditions.addMoonset(builder, day.moonset);
        ht.DayWeatherConditions.addPrecipitationAmount(builder, day.precipitationAmount);
        ht.DayWeatherConditions.addPrecipitationAmountByType(builder, Offsets.precipitationAmountByTypeOffest);
        ht.DayWeatherConditions.addPrecipitationChance(builder, day.precipitationChance);
        ht.DayWeatherConditions.addPrecipitationType(builder, ht.PrecipitationType[day.precipitationType]);
        ht.DayWeatherConditions.addSnowfallAmount(builder, day.snowfallAmount);
        ht.DayWeatherConditions.addSolarMidnight(builder, day.solarMidnight);
        ht.DayWeatherConditions.addSolarNoon(builder, day.solarNoon);
        ht.DayWeatherConditions.addSunrise(builder, day.sunrise);
        ht.DayWeatherConditions.addSunriseCivil(builder, day.sunriseCivil);
        ht.DayWeatherConditions.addSunriseNautical(builder, day.sunriseNautical);
        ht.DayWeatherConditions.addSunriseAstronomical(builder, day.sunriseAstronomical);
        ht.DayWeatherConditions.addSunset(builder, day.sunset);
        ht.DayWeatherConditions.addSunsetCivil(builder, day.sunsetCivil);
        ht.DayWeatherConditions.addSunsetNautical(builder, day.sunsetNautical);
        ht.DayWeatherConditions.addSunsetAstronomical(builder, day.sunsetAstronomical);
        ht.DayWeatherConditions.addTemperatureMax(builder, day.temperatureMax);
        ht.DayWeatherConditions.addTemperatureMaxTime(builder, day.temperatureMaxTime);
        ht.DayWeatherConditions.addTemperatureMin(builder, day.temperatureMin);
        ht.DayWeatherConditions.addTemperatureMinTime(builder, day.temperatureMinTime);
        ht.DayWeatherConditions.addVisibilityMax(builder, day.visibilityMax);
        ht.DayWeatherConditions.addVisibilityMin(builder, day.visibilityMin);
        ht.DayWeatherConditions.addWindGustSpeedMax(builder, day.windGustSpeedMax);
        ht.DayWeatherConditions.addWindSpeedAvg(builder, day.windSpeedAvg);
        ht.DayWeatherConditions.addWindSpeedMax(builder, day.windSpeedMax);
        if (day.daytimeForecast) ht.DayWeatherConditions.addDaytimeForecast(builder, Offsets.daytimeForecastOffset);
        if (day.overnightForecast) ht.DayWeatherConditions.addOvernightForecast(builder, Offsets.overnightForecastOffset);
        if (day.restOfDayForecast) ht.DayWeatherConditions.addRestOfDayForecast(builder, Offsets.restOfDayForecastOffset);
        return ht.DayWeatherConditions.endDayWeatherConditions(builder);
    });
    const daysOffset = ht.DailyForecastData.createDaysVector(builder, daysOffsets);
    return ht.DailyForecastData.createDailyForecastData(builder, metadataOffset, daysOffset);
}

/**
 * 编码 hourly forecast 产品表。 / Encode the hourly forecast product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeForecastHourly(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const hoursOffsets = data.hours.map(hour =>
        ht.HourWeatherConditions.createHourWeatherConditions(
            builder,
            hour.forecastStart,
            hour.cloudCover,
            hour.cloudCoverLowAltPct,
            hour.cloudCoverMidAltPct,
            hour.cloudCoverHighAltPct,
            ht.WeatherCondition[hour.conditionCode],
            hour.daylight,
            hour.humidity,
            hour.perceivedPrecipitationIntensity,
            hour.precipitationAmount,
            hour.precipitationIntensity,
            hour.precipitationChance,
            ht.PrecipitationType[hour.precipitationType],
            hour.pressure,
            ht.PressureTrend[hour.pressureTrend],
            hour.snowfallAmount,
            hour.snowfallIntensity,
            hour.temperature,
            hour.temperatureApparent,
            hour.unknown20,
            hour.temperatureDewPoint,
            hour.uvIndex,
            hour.visibility,
            hour.windDirection,
            hour.windGust,
            hour.windSpeed,
        ),
    );
    const hoursOffset = ht.HourlyForecastData.createHoursVector(builder, hoursOffsets);
    return ht.HourlyForecastData.createHourlyForecastData(builder, metadataOffset, hoursOffset);
}

/**
 * 编码 next-hour precipitation 产品表。 / Encode the next-hour precipitation product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeForecastNextHour(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    // 防御第三方数据：未知枚举传给 FlatBuffer 会静默编码为 CLEAR。
    // Defend against third-party data: unknown enums would otherwise be silently encoded as CLEAR.
    const conditionOffsets = data.condition
        .filter(condition => [condition.beginCondition, condition.endCondition].every(value => typeof ht.ConditionType[value] === "number"))
        .map(condition => {
            const parametersOffsets = condition.parameters.map(parameter => ht.Parameter.createParameter(builder, ht.ParameterType[parameter.type], parameter.date));
            const parametersOffset = ht.Condition.createParametersVector(builder, parametersOffsets);
            return ht.Condition.createCondition(builder, condition.startTime, condition.endTime, ht.ForecastToken[condition.forecastToken], ht.ConditionType[condition.beginCondition], ht.ConditionType[condition.endCondition], parametersOffset);
        });
    const conditionOffset = ht.NextHourForecastData.createConditionVector(builder, conditionOffsets);
    const summaryOffsets = data.summary.map(summary => ht.ForecastPeriodSummary.createForecastPeriodSummary(builder, summary.startTime, summary.endTime, ht.PrecipitationType[summary.condition], summary.precipitationChance, summary.precipitationIntensity));
    const summaryOffset = ht.NextHourForecastData.createSummaryVector(builder, summaryOffsets);
    const minutesOffsets = data.minutes.map(minute => ht.Common.ForecastMinute.createForecastMinute(builder, minute.startTime, minute.precipitationChance, minute.precipitationIntensity, minute.perceivedPrecipitationIntensity));
    const minutesOffset = ht.NextHourForecastData.createMinutesVector(builder, minutesOffsets);
    return ht.NextHourForecastData.createNextHourForecastData(builder, metadataOffset, conditionOffset, summaryOffset, data.forecastStart, data.forecastEnd, minutesOffset);
}

/**
 * 编码 news 产品表。 / Encode the news product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeNews(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const placementsOffsets = data.placements.map(placement => {
        const articlesOffsets = placement.articles.map(article => {
            const alertIdsOffsets = article.alertIds.map(alertId => createUuidOffset(builder, alertId)).filter(Boolean);
            const alertIdsOffset = ht.Articles.createAlertIdsVector(builder, alertIdsOffsets);
            const headlineOverrideOffset = builder.createString(article.headlineOverride);
            const idOffset = builder.createString(article.id);
            const localeOffset = builder.createString(article.locale);
            const phenomenaOffset = ht.Articles.createPhenomenaVector(
                builder,
                article.phenomena.map(phenomena => builder.createString(phenomena)),
            );
            const supportedStorefrontsOffset = ht.Articles.createSupportedStorefrontsVector(
                builder,
                article.supportedStorefronts.map(supportedStorefront => builder.createString(supportedStorefront)),
            );
            return ht.Articles.createArticles(builder, idOffset, supportedStorefrontsOffset, alertIdsOffset, phenomenaOffset, headlineOverrideOffset, localeOffset);
        });
        const articlesOffset = ht.Placement.createArticlesVector(builder, articlesOffsets);
        return ht.Placement.createPlacement(builder, placement.priority, articlesOffset, ht.PlacementType[placement.placement]);
    });
    const placementsOffset = ht.News.createPlacementsVector(builder, placementsOffsets);
    return ht.News.createNews(builder, metadataOffset, placementsOffset);
}

/**
 * 编码 weather alerts 产品表。 / Encode the weather alerts product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeWeatherAlerts(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const alertsOffsets = data.alerts.map(alert => {
        const responsesOffsets = alert.responses.map(response => ht.ResponseType[response]);
        const responsesOffset = ht.WeatherAlertSummary.createResponsesVector(builder, responsesOffsets);
        const idOffset = createUuidOffset(builder, alert.id);
        const areaIdOffset = builder.createString(alert.areaId);
        const areaNameOffset = builder.createString(alert.areaName);
        const attributionUrlOffset = builder.createString(alert.attributionUrl);
        const countryCodeOffset = builder.createString(alert.countryCode);
        const descriptionOffset = builder.createString(alert.description);
        const tokenOffset = builder.createString(alert.token);
        const detailsUrlOffset = builder.createString(alert.detailsUrl);
        const phenomenonOffset = builder.createString(alert.phenomenon);
        const sourceOffset = builder.createString(alert.source);
        const eventSourceOffset = builder.createString(alert.eventSource);
        return ht.WeatherAlertSummary.createWeatherAlertSummary(
            builder,
            idOffset,
            areaIdOffset,
            areaNameOffset,
            attributionUrlOffset,
            countryCodeOffset,
            descriptionOffset,
            tokenOffset,
            alert.effectiveTime,
            alert.expireTime,
            alert.issuedTime,
            alert.eventOnsetTime,
            alert.eventEndTime,
            detailsUrlOffset,
            phenomenonOffset,
            ht.Severity[alert.severity],
            ht.SignificanceType[alert.significance],
            sourceOffset,
            eventSourceOffset,
            ht.Urgency[alert.urgency],
            ht.Certainty[alert.certainty],
            ht.ImportanceType[alert.importance],
            responsesOffset,
            alert.unknown23,
            alert.unknown24,
            alert.unknown25,
            alert.unknown26,
        );
    });
    const alertsOffset = ht.WeatherAlertCollectionData.createAlertsVector(builder, alertsOffsets);
    const detailsUrlOffset = builder.createString(data.detailsUrl);
    return ht.WeatherAlertCollectionData.createWeatherAlertCollectionData(builder, metadataOffset, detailsUrlOffset, alertsOffset);
}

/**
 * 编码 weather changes 产品表。 / Encode the weather changes product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeWeatherChanges(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const changesOffsets = data.changes.map(change => ht.Change.createChange(builder, change.forecastStart, change.forecastEnd, ht.Direction[change.maxTemperatureChange], ht.Direction[change.minTemperatureChange], ht.Direction[change.dayPrecipitationChange], ht.Direction[change.nightPrecipitationChange]));
    const changesOffset = ht.WeatherChanges.createChangesVector(builder, changesOffsets);
    return ht.WeatherChanges.createWeatherChanges(builder, metadataOffset, data.forecastStart, data.forecastEnd, changesOffset);
}

/**
 * 编码 historical comparisons 产品表。 / Encode the historical comparisons product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeHistoricalComparisons(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    const comparisonsOffsets = data.comparisons.map(comparison => ht.Comparison.createComparison(builder, ht.ComparisonType[comparison.condition], comparison.currentValue, comparison.baselineValue, ht.Deviation[comparison.deviation], comparison.baselineType, comparison.baselineStartDate));
    const comparisonsOffset = ht.HistoricalComparison.createComparisonsVector(builder, comparisonsOffsets);
    return ht.HistoricalComparison.createHistoricalComparison(builder, metadataOffset, comparisonsOffset);
}

/**
 * 编码 location info 产品表。 / Encode the location info product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务对象 / Payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeLocationInfo(builder, data) {
    const metadataOffset = encodeMetadata$1(builder, data.metadata);
    return ht.LocationInfo.createLocationInfo(builder, metadataOffset, builder.createString(data.preciseName), builder.createString(data.countryCode), builder.createString(data.timeZone), builder.createString(data.primaryName));
}

/**
 * 解码 air quality 产品表。 / Decode the air quality product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeAirQuality$1(data) {
    const AirQualityData = data;
    data = {
        metadata: decodeMetadata$1(AirQualityData.metadata()),
        categoryIndex: AirQualityData.categoryIndex(),
        index: AirQualityData.index(),
        isSignificant: AirQualityData.isSignificant(),
        pollutants: [],
        previousDayComparison: ht.ComparisonTrend[AirQualityData.previousDayComparison()],
        primaryPollutant: ht.PollutantType[AirQualityData.primaryPollutant()],
        scale: AirQualityData.scale(),
    };
    for (let i = 0; i < AirQualityData.pollutantsLength(); i++)
        data.pollutants.push({
            amount: AirQualityData.pollutants(i).amount(),
            pollutantType: ht.PollutantType[AirQualityData.pollutants(i).pollutantType()],
            units: ht.UnitType[AirQualityData.pollutants(i).units()],
        });
    return data;
}

/**
 * 解码 current weather 产品表。 / Decode the current weather product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeCurrentWeather(data) {
    const CurrentWeatherData = data;
    data = {
        metadata: decodeMetadata$1(CurrentWeatherData.metadata()),
        asOf: CurrentWeatherData.asOf(),
        cloudCover: CurrentWeatherData.cloudCover(),
        cloudCoverHighAltPct: CurrentWeatherData.cloudCoverHighAltPct(),
        cloudCoverLowAltPct: CurrentWeatherData.cloudCoverLowAltPct(),
        cloudCoverMidAltPct: CurrentWeatherData.cloudCoverMidAltPct(),
        conditionCode: ht.WeatherCondition[CurrentWeatherData.conditionCode()],
        daylight: CurrentWeatherData.daylight(),
        humidity: CurrentWeatherData.humidity(),
        perceivedPrecipitationIntensity: CurrentWeatherData.perceivedPrecipitationIntensity(),
        precipitationAmount1h: CurrentWeatherData.precipitationAmount1h(),
        precipitationAmount24h: CurrentWeatherData.precipitationAmount24h(),
        precipitationAmount6h: CurrentWeatherData.precipitationAmount6h(),
        precipitationAmountNext1h: CurrentWeatherData.precipitationAmountNext1h(),
        precipitationAmountNext1hByType: [],
        precipitationAmountNext24h: CurrentWeatherData.precipitationAmountNext24h(),
        precipitationAmountNext24hByType: [],
        precipitationAmountNext6h: CurrentWeatherData.precipitationAmountNext6h(),
        precipitationAmountNext6hByType: [],
        precipitationAmountPrevious1hByType: [],
        precipitationAmountPrevious24hByType: [],
        precipitationAmountPrevious6hByType: [],
        precipitationIntensity: CurrentWeatherData.precipitationIntensity(),
        pressure: CurrentWeatherData.pressure(),
        pressureTrend: ht.PressureTrend[CurrentWeatherData.pressureTrend()],
        snowfallAmount1h: CurrentWeatherData.snowfallAmount1h(),
        snowfallAmount24h: CurrentWeatherData.snowfallAmount24h(),
        snowfallAmount6h: CurrentWeatherData.snowfallAmount6h(),
        snowfallAmountNext1h: CurrentWeatherData.snowfallAmountNext1h(),
        snowfallAmountNext24h: CurrentWeatherData.snowfallAmountNext24h(),
        snowfallAmountNext6h: CurrentWeatherData.snowfallAmountNext6h(),
        temperature: CurrentWeatherData.temperature(),
        temperatureApparent: CurrentWeatherData.temperatureApparent(),
        unknown34: CurrentWeatherData.unknown34(),
        temperatureDewPoint: CurrentWeatherData.temperatureDewPoint(),
        uvIndex: CurrentWeatherData.uvIndex(),
        visibility: CurrentWeatherData.visibility(),
        windDirection: CurrentWeatherData.windDirection(),
        windGust: CurrentWeatherData.windGust(),
        windSpeed: CurrentWeatherData.windSpeed(),
    };
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext1hByTypeLength(); i++)
        data.precipitationAmountNext1hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountNext1hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext24hByTypeLength(); i++)
        data.precipitationAmountNext24hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountNext24hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext6hByTypeLength(); i++)
        data.precipitationAmountNext6hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext6hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountNext6hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious1hByTypeLength(); i++)
        data.precipitationAmountPrevious1hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious1hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious24hByTypeLength(); i++)
        data.precipitationAmountPrevious24hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious24hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious6hByTypeLength(); i++)
        data.precipitationAmountPrevious6hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious6hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).minimumSnow(),
            precipitationType: ht.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious6hByType(i).precipitationType()],
        });
    return data;
}

/**
 * 解码 daily forecast 产品表。 / Decode the daily forecast product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeForecastDaily(data) {
    const DailyForecastData = data;
    data = {
        metadata: decodeMetadata$1(DailyForecastData.metadata()),
        days: [],
    };
    for (let i = 0; i < DailyForecastData.daysLength(); i++) {
        const day = {
            conditionCode: ht.WeatherCondition[DailyForecastData.days(i).conditionCode()],
            forecastEnd: DailyForecastData.days(i).forecastEnd(),
            forecastStart: DailyForecastData.days(i).forecastStart(),
            humidityMax: DailyForecastData.days(i).humidityMax(),
            humidityMin: DailyForecastData.days(i).humidityMin(),
            maxUvIndex: DailyForecastData.days(i).maxUvIndex(),
            moonPhase: ht.MoonPhase[DailyForecastData.days(i).moonPhase()],
            moonrise: DailyForecastData.days(i).moonrise(),
            moonset: DailyForecastData.days(i).moonset(),
            precipitationAmount: DailyForecastData.days(i).precipitationAmount(),
            precipitationAmountByType: [],
            precipitationChance: DailyForecastData.days(i).precipitationChance(),
            precipitationType: ht.PrecipitationType[DailyForecastData.days(i).precipitationType()],
            snowfallAmount: DailyForecastData.days(i).snowfallAmount(),
            solarMidnight: DailyForecastData.days(i).solarMidnight(),
            solarNoon: DailyForecastData.days(i).solarNoon(),
            sunrise: DailyForecastData.days(i).sunrise(),
            sunriseCivil: DailyForecastData.days(i).sunriseCivil(),
            sunriseNautical: DailyForecastData.days(i).sunriseNautical(),
            sunriseAstronomical: DailyForecastData.days(i).sunriseAstronomical(),
            sunset: DailyForecastData.days(i).sunset(),
            sunsetCivil: DailyForecastData.days(i).sunsetCivil(),
            sunsetNautical: DailyForecastData.days(i).sunsetNautical(),
            sunsetAstronomical: DailyForecastData.days(i).sunsetAstronomical(),
            temperatureMax: DailyForecastData.days(i).temperatureMax(),
            temperatureMaxTime: DailyForecastData.days(i).temperatureMaxTime(),
            temperatureMin: DailyForecastData.days(i).temperatureMin(),
            temperatureMinTime: DailyForecastData.days(i).temperatureMinTime(),
            visibilityMax: DailyForecastData.days(i).visibilityMax(),
            visibilityMin: DailyForecastData.days(i).visibilityMin(),
            windGustSpeedMax: DailyForecastData.days(i).windGustSpeedMax(),
            windSpeedAvg: DailyForecastData.days(i).windSpeedAvg(),
            windSpeedMax: DailyForecastData.days(i).windSpeedMax(),
        };
        for (let j = 0; j < DailyForecastData.days(i).precipitationAmountByTypeLength(); j++)
            day.precipitationAmountByType.push({
                expected: DailyForecastData.days(i).precipitationAmountByType(j).expected(),
                expectedSnow: DailyForecastData.days(i).precipitationAmountByType(j).expectedSnow(),
                maximumSnow: DailyForecastData.days(i).precipitationAmountByType(j).maximumSnow(),
                minimumSnow: DailyForecastData.days(i).precipitationAmountByType(j).minimumSnow(),
                precipitationType: ht.PrecipitationType[DailyForecastData.days(i).precipitationAmountByType(j).precipitationType()],
            });
        if (DailyForecastData.days(i).daytimeForecast()) {
            day.daytimeForecast = {
                cloudCover: DailyForecastData.days(i).daytimeForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverMidAltPct(),
                conditionCode: ht.WeatherCondition[DailyForecastData.days(i).daytimeForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).daytimeForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).daytimeForecast().forecastStart(),
                humidity: DailyForecastData.days(i).daytimeForecast().humidity(),
                humidityMax: DailyForecastData.days(i).daytimeForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).daytimeForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).daytimeForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).daytimeForecast().precipitationChance(),
                precipitationType: ht.PrecipitationType[DailyForecastData.days(i).daytimeForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).daytimeForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).daytimeForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).daytimeForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).daytimeForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).daytimeForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).daytimeForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).daytimeForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).daytimeForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).daytimeForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).daytimeForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).daytimeForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).daytimeForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).daytimeForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).daytimeForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).daytimeForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).daytimeForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).daytimeForecast().precipitationAmountByTypeLength(); j++)
                day.daytimeForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: ht.PrecipitationType[DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        if (DailyForecastData.days(i).overnightForecast()) {
            day.overnightForecast = {
                cloudCover: DailyForecastData.days(i).overnightForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverMidAltPct(),
                conditionCode: ht.WeatherCondition[DailyForecastData.days(i).overnightForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).overnightForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).overnightForecast().forecastStart(),
                humidity: DailyForecastData.days(i).overnightForecast().humidity(),
                humidityMax: DailyForecastData.days(i).overnightForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).overnightForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).overnightForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).overnightForecast().precipitationChance(),
                precipitationType: ht.PrecipitationType[DailyForecastData.days(i).overnightForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).overnightForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).overnightForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).overnightForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).overnightForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).overnightForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).overnightForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).overnightForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).overnightForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).overnightForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).overnightForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).overnightForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).overnightForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).overnightForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).overnightForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).overnightForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).overnightForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).overnightForecast().precipitationAmountByTypeLength(); j++)
                day.overnightForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: ht.PrecipitationType[DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        if (DailyForecastData.days(i).restOfDayForecast()) {
            day.restOfDayForecast = {
                cloudCover: DailyForecastData.days(i).restOfDayForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverMidAltPct(),
                conditionCode: ht.WeatherCondition[DailyForecastData.days(i).restOfDayForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).restOfDayForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).restOfDayForecast().forecastStart(),
                humidity: DailyForecastData.days(i).restOfDayForecast().humidity(),
                humidityMax: DailyForecastData.days(i).restOfDayForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).restOfDayForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).restOfDayForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).restOfDayForecast().precipitationChance(),
                precipitationType: ht.PrecipitationType[DailyForecastData.days(i).restOfDayForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).restOfDayForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).restOfDayForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).restOfDayForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).restOfDayForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).restOfDayForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).restOfDayForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).restOfDayForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).restOfDayForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).restOfDayForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).restOfDayForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).restOfDayForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).restOfDayForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).restOfDayForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).restOfDayForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).restOfDayForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).restOfDayForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).restOfDayForecast().precipitationAmountByTypeLength(); j++)
                day.restOfDayForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: ht.PrecipitationType[DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        data.days.push(day);
    }
    return data;
}

/**
 * 解码 hourly forecast 产品表。 / Decode the hourly forecast product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeForecastHourly(data) {
    const HourlyForecastData = data;
    data = {
        metadata: decodeMetadata$1(HourlyForecastData.metadata()),
        hours: [],
    };
    for (let i = 0; i < HourlyForecastData.hoursLength(); i++)
        data.hours.push({
            cloudCover: HourlyForecastData.hours(i).cloudCover(),
            cloudCoverHighAltPct: HourlyForecastData.hours(i).cloudCoverHighAltPct(),
            cloudCoverLowAltPct: HourlyForecastData.hours(i).cloudCoverLowAltPct(),
            cloudCoverMidAltPct: HourlyForecastData.hours(i).cloudCoverMidAltPct(),
            conditionCode: ht.WeatherCondition[HourlyForecastData.hours(i).conditionCode()],
            daylight: HourlyForecastData.hours(i).daylight(),
            forecastStart: HourlyForecastData.hours(i).forecastStart(),
            humidity: HourlyForecastData.hours(i).humidity(),
            perceivedPrecipitationIntensity: HourlyForecastData.hours(i).perceivedPrecipitationIntensity(),
            precipitationAmount: HourlyForecastData.hours(i).precipitationAmount(),
            precipitationChance: HourlyForecastData.hours(i).precipitationChance(),
            precipitationIntensity: HourlyForecastData.hours(i).precipitationIntensity(),
            precipitationType: ht.PrecipitationType[HourlyForecastData.hours(i).precipitationType()],
            pressure: HourlyForecastData.hours(i).pressure(),
            pressureTrend: ht.PressureTrend[HourlyForecastData.hours(i).pressureTrend()],
            snowfallAmount: HourlyForecastData.hours(i).snowfallAmount(),
            snowfallIntensity: HourlyForecastData.hours(i).snowfallIntensity(),
            temperature: HourlyForecastData.hours(i).temperature(),
            temperatureApparent: HourlyForecastData.hours(i).temperatureApparent(),
            unknown20: HourlyForecastData.hours(i).unknown20(),
            temperatureDewPoint: HourlyForecastData.hours(i).temperatureDewPoint(),
            uvIndex: HourlyForecastData.hours(i).uvIndex(),
            visibility: HourlyForecastData.hours(i).visibility(),
            windDirection: HourlyForecastData.hours(i).windDirection(),
            windGust: HourlyForecastData.hours(i).windGust(),
            windSpeed: HourlyForecastData.hours(i).windSpeed(),
        });
    return data;
}

/**
 * 解码 next-hour precipitation 产品表。 / Decode the next-hour precipitation product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeForecastNextHour(data) {
    const NextHourForecastData = data;
    data = {
        metadata: decodeMetadata$1(NextHourForecastData.metadata()),
        condition: [],
        forecastEnd: NextHourForecastData.forecastEnd(),
        forecastStart: NextHourForecastData.forecastStart(),
        minutes: [],
        summary: [],
    };
    for (let i = 0; i < NextHourForecastData.conditionLength(); i++) {
        const condition = {
            beginCondition: ht.ConditionType[NextHourForecastData.condition(i).beginCondition()],
            endCondition: ht.ConditionType[NextHourForecastData.condition(i).endCondition()],
            endTime: NextHourForecastData.condition(i).endTime(),
            forecastToken: ht.ForecastToken[NextHourForecastData.condition(i).forecastToken()],
            parameters: [],
            startTime: NextHourForecastData.condition(i).startTime(),
        };
        for (let j = 0; j < NextHourForecastData.condition(i).parametersLength(); j++)
            condition.parameters.push({
                date: NextHourForecastData.condition(i).parameters(j).date(),
                type: ht.ParameterType[NextHourForecastData.condition(i).parameters(j).type()],
            });
        data.condition.push(condition);
    }
    for (let i = 0; i < NextHourForecastData.minutesLength(); i++)
        data.minutes.push({
            perceivedPrecipitationIntensity: NextHourForecastData.minutes(i).perceivedPrecipitationIntensity(),
            precipitationChance: NextHourForecastData.minutes(i).precipitationChance(),
            precipitationIntensity: NextHourForecastData.minutes(i).precipitationIntensity(),
            startTime: NextHourForecastData.minutes(i).startTime(),
        });
    for (let i = 0; i < NextHourForecastData.summaryLength(); i++)
        data.summary.push({
            condition: ht.PrecipitationType[NextHourForecastData.summary(i).condition()],
            endTime: NextHourForecastData.summary(i).endTime(),
            precipitationChance: NextHourForecastData.summary(i).precipitationChance(),
            precipitationIntensity: NextHourForecastData.summary(i).precipitationIntensity(),
            startTime: NextHourForecastData.summary(i).startTime(),
        });
    return data;
}

/**
 * 解码 news 产品表。 / Decode the news product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeNews(data) {
    const NewsData = data;
    data = {
        metadata: decodeMetadata$1(NewsData.metadata()),
        placements: [],
    };
    for (let i = 0; i < NewsData.placementsLength(); i++) {
        const placement = {
            articles: [],
            placement: ht.PlacementType[NewsData.placements(i).placement()],
            priority: NewsData.placements(i).priority(),
        };
        for (let j = 0; j < NewsData.placements(i).articlesLength(); j++) {
            const article = {
                alertIds: [],
                headlineOverride: NewsData.placements(i).articles(j).headlineOverride(),
                id: NewsData.placements(i).articles(j).id(),
                locale: NewsData.placements(i).articles(j).locale(),
                phenomena: [],
                supportedStorefronts: [],
            };
            for (let k = 0; k < NewsData.placements(i).articles(j).alertIdsLength(); k++) article.alertIds.push(decodeUuid(NewsData.placements(i).articles(j).alertIds(k)));
            for (let k = 0; k < NewsData.placements(i).articles(j).phenomenaLength(); k++) article.phenomena.push(NewsData.placements(i).articles(j).phenomena(k));
            for (let k = 0; k < NewsData.placements(i).articles(j).supportedStorefrontsLength(); k++) article.supportedStorefronts.push(NewsData.placements(i).articles(j).supportedStorefronts(k));
            placement.articles.push(article);
        }
        data.placements.push(placement);
    }
    return data;
}

/**
 * 解码 weather alerts 产品表。 / Decode the weather alerts product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeWeatherAlerts(data) {
    const WeatherAlertCollectionData = data;
    data = {
        metadata: decodeMetadata$1(WeatherAlertCollectionData.metadata()),
        alerts: [],
        detailsUrl: WeatherAlertCollectionData.detailsUrl(),
    };
    for (let i = 0; i < WeatherAlertCollectionData.alertsLength(); i++) {
        const alert = {
            areaId: WeatherAlertCollectionData.alerts(i).areaId(),
            areaName: WeatherAlertCollectionData.alerts(i).areaName(),
            attributionUrl: WeatherAlertCollectionData.alerts(i).attributionUrl(),
            certainty: ht.Certainty[WeatherAlertCollectionData.alerts(i).certainty()],
            countryCode: WeatherAlertCollectionData.alerts(i).countryCode(),
            description: WeatherAlertCollectionData.alerts(i).description(),
            detailsUrl: WeatherAlertCollectionData.alerts(i).detailsUrl(),
            effectiveTime: WeatherAlertCollectionData.alerts(i).effectiveTime(),
            eventEndTime: WeatherAlertCollectionData.alerts(i).eventEndTime(),
            eventOnsetTime: WeatherAlertCollectionData.alerts(i).eventOnsetTime(),
            eventSource: WeatherAlertCollectionData.alerts(i).eventSource(),
            expireTime: WeatherAlertCollectionData.alerts(i).expireTime(),
            id: decodeUuid(WeatherAlertCollectionData.alerts(i).id()),
            importance: ht.ImportanceType[WeatherAlertCollectionData.alerts(i).importance()],
            issuedTime: WeatherAlertCollectionData.alerts(i).issuedTime(),
            phenomenon: WeatherAlertCollectionData.alerts(i).phenomenon(),
            responses: [],
            severity: ht.Severity[WeatherAlertCollectionData.alerts(i).severity()],
            significance: ht.SignificanceType[WeatherAlertCollectionData.alerts(i).significance()],
            source: WeatherAlertCollectionData.alerts(i).source(),
            token: WeatherAlertCollectionData.alerts(i).token(),
            urgency: ht.Urgency[WeatherAlertCollectionData.alerts(i).urgency()],
            unknown23: WeatherAlertCollectionData.alerts(i).unknown23(),
            unknown24: WeatherAlertCollectionData.alerts(i).unknown24(),
            unknown25: WeatherAlertCollectionData.alerts(i).unknown25(),
            unknown26: WeatherAlertCollectionData.alerts(i).unknown26(),
        };
        //for (let j = 0; j < WeatherAlertCollectionData.alerts(i).idLength(); j++) alert.id.push(WeatherAlertCollectionData.alerts(i).id(j));
        //for (let j = 0; j < WeatherAlertCollectionData.alerts(i).idLength(); j++) alert.id.push({ "lowBytes": WeatherAlertCollectionData.alerts(i).id(j).lowBytes(), "highBytes": WeatherAlertCollectionData.alerts(i).id(j).highBytes() });
        for (let j = 0; j < WeatherAlertCollectionData.alerts(i).responsesLength(); j++) alert.responses.push(ht.ResponseType[WeatherAlertCollectionData.alerts(i).responses(j)]);
        data.alerts.push(alert);
    }
    return data;
}

/**
 * 解码 weather changes 产品表。 / Decode the weather changes product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeWeatherChanges(data) {
    const WeatherChangesData = data;
    data = {
        metadata: decodeMetadata$1(WeatherChangesData.metadata()),
        changes: [],
        forecastEnd: WeatherChangesData.forecastEnd(),
        forecastStart: WeatherChangesData.forecastStart(),
    };
    for (let i = 0; i < WeatherChangesData.changesLength(); i++) {
        const change = {
            dayPrecipitationChange: ht.Direction[WeatherChangesData.changes(i).dayPrecipitationChange()],
            forecastEnd: WeatherChangesData.changes(i).forecastEnd(),
            forecastStart: WeatherChangesData.changes(i).forecastStart(),
            maxTemperatureChange: ht.Direction[WeatherChangesData.changes(i).maxTemperatureChange()],
            minTemperatureChange: ht.Direction[WeatherChangesData.changes(i).minTemperatureChange()],
            nightPrecipitationChange: ht.Direction[WeatherChangesData.changes(i).nightPrecipitationChange()],
        };
        data.changes.push(change);
    }
    return data;
}

/**
 * 解码 historical comparisons 产品表。 / Decode the historical comparisons product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeHistoricalComparisons(data) {
    const HistoricalComparisonsData = data;
    data = {
        metadata: decodeMetadata$1(HistoricalComparisonsData.metadata()),
        comparisons: [],
    };
    for (let i = 0; i < HistoricalComparisonsData.comparisonsLength(); i++) {
        const comparison = {
            baselineStartDate: HistoricalComparisonsData.comparisons(i).baselineStartDate(),
            baselineType: HistoricalComparisonsData.comparisons(i).baselineType(),
            baselineValue: HistoricalComparisonsData.comparisons(i).baselineValue(),
            condition: ht.ComparisonType[HistoricalComparisonsData.comparisons(i).condition()],
            currentValue: HistoricalComparisonsData.comparisons(i).currentValue(),
            deviation: ht.Deviation[HistoricalComparisonsData.comparisons(i).deviation()],
        };
        data.comparisons.push(comparison);
    }
    return data;
}

/**
 * 解码 location info 产品表。 / Decode the location info product table.
 * @param {object} data - 生成的表实例 / Generated table instance.
 * @returns {object} 业务对象 / Payload.
 */
function decodeLocationInfo(data) {
    const LocationInfoData = data;
    data = {
        metadata: decodeMetadata$1(LocationInfoData.metadata()),
        countryCode: LocationInfoData.countryCode(),
        preciseName: LocationInfoData.preciseName(),
        primaryName: LocationInfoData.primaryName(),
        timeZone: LocationInfoData.timeZone(),
    };
    return data;
}

/**
 * 编码产品元数据子表；缺失时返回 0（不写入）。 / Encode the metadata child table; returns 0 when absent.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} [metadata] - 元数据对象 / Metadata payload.
 * @returns {number} 子表偏移 / Table offset.
 */
function encodeMetadata$1(builder, metadata) {
    if (!metadata) return 0;
    return ht.Metadata.createMetadata(
        builder,
        builder.createString(metadata.attributionUrl),
        metadata.expireTime,
        builder.createString(metadata.language),
        metadata.latitude,
        metadata.longitude,
        builder.createString(metadata.providerLogo),
        builder.createString(metadata.providerName),
        metadata.readTime,
        metadata.reportedTime,
        metadata.temporarilyUnavailable,
        ht.SourceType[metadata.sourceType],
        metadata.unknown11,
        metadata.unknown12,
        metadata.unknown13,
        metadata.unknown14,
        metadata.unknown15,
    );
}

/**
 * 解码产品元数据子表；缺失时返回 undefined。 / Decode the metadata child table; returns undefined when absent.
 * @param {object} [data] - 生成的元数据表实例 / Generated metadata table instance.
 * @returns {object|undefined} 元数据对象 / Metadata payload.
 */
function decodeMetadata$1(data) {
    if (!data) return undefined;
    data = {
        attributionUrl: data.attributionUrl(),
        expireTime: data.expireTime(),
        language: data.language(),
        latitude: data.latitude(),
        longitude: data.longitude(),
        providerLogo: data.providerLogo(),
        providerName: data.providerName(),
        readTime: data.readTime(),
        reportedTime: data.reportedTime(),
        temporarilyUnavailable: data.temporarilyUnavailable(),
        sourceType: ht.SourceType[data.sourceType()],
    };
    return data;
}

/**
 * 将 UUID 的多种表示（字符串、字节数组、字节对象）归一化为 16 字节数组。 / Normalize UUID representations (string, byte array, bytes object) to a 16-byte array.
 * @param {string|Uint8Array|Array|object} uuid - UUID 输入 / UUID input.
 * @returns {Uint8Array|Array|null} 16 字节数组 / 16-byte array.
 */
function toUuidBytes(uuid) {
    if (uuid === null || uuid === undefined) return null;
    if (uuid instanceof Uint8Array || Array.isArray(uuid)) return uuid;
    if (typeof uuid === "string") {
        const bytesObject = uuidStringToBytesObject(uuid);
        return bytesObject ? bytesObject.bytes : null;
    }
    if (typeof uuid === "object") {
        if (uuid.bytes instanceof Uint8Array || Array.isArray(uuid.bytes)) return uuid.bytes;
        if (typeof uuid.bytesArray === "function") return uuid.bytesArray();
    }
    return null;
}

/**
 * 将带连字符的 UUID 字符串解析为字节对象。 / Parse a hyphenated UUID string into a bytes object.
 * @param {string} uuidString - UUID 输入 / UUID input.
 * @returns {object|null} 字节对象 / Bytes object.
 */
function uuidStringToBytesObject(uuidString) {
    if (typeof uuidString !== "string") return null;
    const hex = uuidString.replace(/-/g, "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(hex)) return null;
    const bytes = [];
    for (let index = 0; index < hex.length; index += 2) bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
    return { bytes };
}

/**
 * 将 16 字节 UUID 格式化为带连字符的字符串。 / Format a 16-byte UUID as a hyphenated string.
 * @param {Uint8Array|Array|object} uuid - UUID 输入 / UUID input.
 * @returns {string|null} UUID 字符串 / UUID string.
 */
function uuidBytesObjectToString(uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length !== 16) return null;
    const hex = Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 构建 Common.UUID 子表偏移；无有效字节时返回 0。 / Build the Common.UUID child table offset; returns 0 without valid bytes.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {*} uuid - UUID 输入 / UUID input.
 * @returns {number} 子表偏移 / Table offset.
 */
function createUuidOffset(builder, uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length === 0) return 0;
    const idBytesOffset = ht.Common.UUID.createBytesVector(builder, bytes);
    return ht.Common.UUID.createUUID(builder, idBytesOffset);
}

/**
 * 解码 UUID 子表为带连字符的字符串。 / Decode a UUID child table into a hyphenated string.
 * @param {object} uuid - UUID 输入 / UUID input.
 * @returns {string|null} UUID 字符串 / UUID string.
 */
function decodeUuid(uuid) {
    return uuidBytesObjectToString(uuid);
}

/**
 * 在通用处理器之外补充 WK3 AQ 失败边界：请求的 AQ 产品读取或解码失败时返回 null，
 * 由主脚本保留原包；AQ 物理缺失不算失败，返回不含 AQ 的对象，允许补齐。
 * Decode boundary for WK3 AQ: return null when a requested AQ product fails to read
 * or decode so the caller keeps the original package; a physically missing AQ is not
 * a failure and yields an object without airQuality so the caller may backfill it.
 */
class WeatherKit3Processor extends FlatBufferRootProcessor {
    decode(byteBuffer, rootNames = []) {
        const { json, failures } = this.decodeWithReport(byteBuffer, rootNames);
        if (failures.some(failure => failure.name === "airQuality")) return null;
        return json;
    }
}

/**
 * 使用 Weather 根模型和产品 codec 配置通用根表处理器。
 * 首轮只注册根槽 0；其余 WK3 产品保持原始 arena，不按访问器顺序推断稀疏槽位。
 * Configure the generic root-table processor with the Weather model and product codecs.
 * Register root slot 0 only; preserve other products without inferring sparse slot IDs from accessor order.
 */
const WeatherKit3 = new WeatherKit3Processor({
    codecs: {
        airQuality: { decode: decodeAirQuality, encode: encodeAirQuality, tableClass: mt.AirQuality },
    },
    configurableRootNames: ["airQuality"],
    name: "WeatherKit3",
    rootClass: mt.Weather,
});

/**
 * 编码空气质量产品表。标量超宽或非有限浓度抛 RangeError，由处理器隔离为单 slot 失败。
 * Encode the air quality product table. Out-of-range scalars or non-finite amounts throw.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务空气质量对象 / Air quality payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeAirQuality(builder, data) {
    if (!Number.isInteger(data.index) || data.index < 0 || data.index > 32767 || !Number.isInteger(data.categoryIndex) || data.categoryIndex < 0 || data.categoryIndex > 127) {
        throw new RangeError("WK3 AQ scalar out of range");
    }
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const pollutantsOffset = mt.AirQuality.createPollutantsVector(
        builder,
        data.pollutants.map(pollutant => {
            if (!Number.isFinite(Math.fround(pollutant.amount))) throw new RangeError("WK3 pollutant amount must be finite");
            return mt.Pollutant.createPollutant(builder, enumValue(mt.PollutantType, pollutant.pollutantType), pollutant.amount, enumValue(mt.UnitType, pollutant.units));
        }),
    );
    const scaleOffset = builder.createString(data.scale);
    return mt.AirQuality.createAirQuality(builder, metadataOffset, data.categoryIndex, data.index, data.isSignificant, pollutantsOffset, enumValue(mt.ComparisonTrend, data.previousDayComparison), enumValue(mt.PollutantType, data.primaryPollutant), scaleOffset);
}

/**
 * 解码空气质量产品表；未验证字段或未知枚举值抛 RangeError。
 * Decode the air quality product table; unverified fields or unknown enums throw.
 * @param {WK3.AirQuality} data - 生成的 AQ 表实例 / Generated AQ table instance.
 * @returns {object} 业务空气质量对象 / Air quality payload.
 */
function decodeAirQuality(data) {
    checkFields(data, 8);
    const pollutants = [];
    for (let i = 0; i < data.pollutantsLength(); i++) {
        const pollutant = data.pollutants(i);
        checkFields(pollutant, 3);
        pollutants.push({
            pollutantType: enumName(mt.PollutantType, pollutant.pollutantType()),
            amount: pollutant.amount(),
            units: enumName(mt.UnitType, pollutant.units()),
        });
    }
    return {
        metadata: decodeMetadata(data.metadata()),
        categoryIndex: data.categoryIndex(),
        index: data.index(),
        isSignificant: data.isSignificant(),
        pollutants,
        previousDayComparison: enumName(mt.ComparisonTrend, data.previousDayComparison()),
        primaryPollutant: enumName(mt.PollutantType, data.primaryPollutant()),
        scale: data.scale(),
    };
}

/**
 * 编码产品元数据子表；缺失时返回 0（不写入）。
 * Encode the metadata child table; returns 0 when absent.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} [data] - 元数据对象 / Metadata payload.
 * @returns {number} 子表偏移 / Table offset.
 */
function encodeMetadata(builder, data) {
    if (!data) return 0;
    return mt.Metadata.createMetadata(
        builder,
        builder.createString(data.attributionUrl),
        data.expireTime,
        builder.createString(data.language),
        data.latitude,
        data.longitude,
        builder.createString(data.providerLogo),
        builder.createString(data.providerName),
        data.readTime,
        data.reportedTime,
        data.temporarilyUnavailable,
        enumValue(mt.SourceType, data.sourceType),
    );
}

/**
 * 解码产品元数据子表；缺失时返回 undefined。
 * Decode the metadata child table; returns undefined when absent.
 * @param {WK3.Metadata} [data] - 生成的元数据表实例 / Generated metadata table instance.
 * @returns {object|undefined} 元数据对象 / Metadata payload.
 */
function decodeMetadata(data) {
    if (!data) return undefined;
    checkFields(data, 11);
    return {
        attributionUrl: data.attributionUrl(),
        expireTime: data.expireTime(),
        language: data.language(),
        latitude: data.latitude(),
        longitude: data.longitude(),
        providerLogo: data.providerLogo(),
        providerName: data.providerName(),
        readTime: data.readTime(),
        reportedTime: data.reportedTime(),
        temporarilyUnavailable: data.temporarilyUnavailable(),
        sourceType: enumName(mt.SourceType, data.sourceType()),
    };
}

/**
 * 校验表的字段数不超过已验证范围；超出时抛 RangeError，由处理器隔离为单 slot 失败。
 * Validate that a table declares no more than the verified field count; excess throws.
 * @param {WK3.AirQuality|WK3.Metadata|WK3.Pollutant} table - 生成的表实例 / Generated table instance.
 * @param {number} count - 已验证的字段数 / Verified field count.
 * @returns {void}
 */
function checkFields(table, count) {
    // 超出已验证字段数的表结构抛 RangeError，由处理器隔离为单 slot 失败。
    // Tables declaring more than the verified field count throw, isolated as per-slot failures.
    inspectTable(table.bb, table.bb_pos, count);
}

/**
 * 将 wire 枚举值映射为名称；未知或占位值抛 RangeError。
 * Map a wire enum value to its name; unknown or placeholder values throw.
 * @param {object} values - 版本枚举表 / Versioned enum table.
 * @param {number} value - wire 枚举值 / Wire enum value.
 * @returns {string} 枚举名称 / Enum name.
 */
function enumName(values, value) {
    const name = values[value];
    if (typeof name !== "string" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 AQ enum: ${value}`);
    return name;
}

/**
 * 将枚举名称映射为 wire 枚举值；未知或占位名抛 RangeError。
 * Map an enum name to its wire value; unknown or placeholder names throw.
 * @param {object} values - 版本枚举表 / Versioned enum table.
 * @param {string} name - 枚举名称 / Enum name.
 * @returns {number} wire 枚举值 / Wire enum value.
 */
function enumValue(values, name) {
    const value = values[name];
    if (typeof value !== "number" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 AQ enum: ${name}`);
    return value;
}

function mergeWeatherKitAvailability(appleCapabilities, pluginCapabilities = []) {
    if (!Array.isArray(appleCapabilities)) return appleCapabilities;

    // 在 Apple 返回值上补齐插件能力，避免系统新增 capability 被固定列表吞掉。
    return [...new Set([...appleCapabilities, ...pluginCapabilities])];
}

const HONG_KONG_BOUNDS = {
    minLatitude: 22.10,
    maxLatitude: 22.45,
    minLongitude: 113.80,
    maxLongitude: 114.45,
};

const MACAU_BOUNDS = {
    minLatitude: 22.05,
    maxLatitude: 22.25,
    minLongitude: 113.45,
    maxLongitude: 113.65,
};

const TAIWAN_BOUNDS = {
    minLatitude: 21.75,
    maxLatitude: 25.50,
    minLongitude: 119.20,
    maxLongitude: 122.10,
};

// Conservative outline of mainland China; border cells outside this polygon pass through.
const MAINLAND_CHINA = [
    [53.55, 123.25], [52.75, 119.90], [49.0, 117.3], [47.9, 116.2], [49.0, 114.5],
    [45.0, 111.0], [42.0, 110.0], [42.0, 104.0], [42.5, 96.0], [45.0, 91.0],
    [49.0, 87.0], [49.2, 84.0], [46.0, 80.0], [42.0, 80.0], [40.0, 77.0],
    [38.0, 75.0], [35.0, 78.0], [32.5, 78.5], [31.5, 79.0], [30.5, 81.0],
    [29.0, 83.0], [28.0, 85.0], [27.5, 88.0], [28.0, 90.0], [28.0, 92.0],
    [27.0, 94.0], [28.0, 96.0], [29.0, 98.0], [28.0, 98.5], [25.0, 98.0],
    [23.0, 97.5], [21.5, 99.0], [21.0, 101.0], [22.5, 101.8], [22.0, 102.8],
    [23.0, 104.0], [23.5, 106.0], [22.5, 108.0], [21.5, 108.0], [21.5, 109.7],
    [20.0, 110.2], [20.8, 110.8], [21.3, 111.8], [21.5, 113.0], [22.0, 113.7],
    [22.3, 114.2], [22.1, 114.6], [22.6, 115.5], [23.5, 117.0], [24.5, 118.0],
    [25.5, 119.8], [26.5, 120.2], [27.4, 120.5], [28.0, 121.0], [29.0, 121.8],
    [30.7, 122.2], [31.5, 121.7], [32.5, 121.5], [33.0, 121.0], [34.5, 120.5],
    [36.5, 121.8], [38.0, 121.8], [39.5, 121.8], [40.0, 122.5], [40.5, 124.5],
    [41.5, 124.5], [42.0, 126.0], [43.0, 131.0], [45.0, 133.0], [48.0, 135.0],
];

const HAINAN = [
    [18.1, 108.6], [18.1, 111.0], [20.2, 111.2], [20.2, 108.6],
];

function inBounds(latitude, longitude, bounds) {
    return latitude >= bounds.minLatitude
        && latitude <= bounds.maxLatitude
        && longitude >= bounds.minLongitude
        && longitude <= bounds.maxLongitude;
}

function inPolygon(latitude, longitude, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [latI, lonI] = polygon[i], [latJ, lonJ] = polygon[j];
        if ((latI > latitude) !== (latJ > latitude)
            && longitude < ((lonJ - lonI) * (latitude - latI)) / (latJ - latI) + lonI) inside = !inside;
    }
    return inside;
}

function isChinaMainland(parameters = {}) {
    const latitude = Number(parameters.latitude);
    const longitude = Number(parameters.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

    if (latitude < 18 || latitude > 54 || longitude < 73 || longitude > 135) return false;
    if (inBounds(latitude, longitude, HONG_KONG_BOUNDS)) return false;
    if (inBounds(latitude, longitude, MACAU_BOUNDS)) return false;
    if (inBounds(latitude, longitude, TAIWAN_BOUNDS)) return false;

    return inPolygon(latitude, longitude, MAINLAND_CHINA) || inPolygon(latitude, longitude, HAINAN);
}

function isHongKong(parameters = {}) {
    if (!["HK", "CN"].includes(parameters.country)) return false;
    const latitude = Number(parameters.latitude), longitude = Number(parameters.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && inBounds(latitude, longitude, HONG_KONG_BOUNDS);
}

function shouldReplaceWeatherKit(parameters = {}, Settings = {}) {
    if (parameters.countrySource === "query" && parameters.country && parameters.country !== "CN") return false;
    return Settings?.Weather?.Replace?.includes("CN") === true && isChinaMainland(parameters);
}

function parseWeatherKitURL(url = new URL($request.url)) {
    Console.info("☑️ parseWeatherKitURL");
    const result = {
        version: undefined,
        language: undefined,
        scale: undefined,
        latitude: undefined,
        longitude: undefined,
        country: undefined,
        countrySource: undefined,
        dataSets: [],
    };
    switch (url.pathname) {
        case "/api/v1/weatherAlerts": {
            const coordinates = url.searchParams
                .get("ids")
                ?.trim()
                .match(/^(?<latitude>-?(?:\d+(?:\.\d+)?|\.\d+)),(?<longitude>-?(?:\d+(?:\.\d+)?|\.\d+))$/)?.groups;
            result.version = "v1";
            result.language = url.searchParams.get("lang")?.trim() || "zh-CN";
            result.country = url.searchParams.get("country")?.toUpperCase() || "CN";
            if (coordinates) {
                const latitude = Number(coordinates.latitude);
                const longitude = Number(coordinates.longitude);
                if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
                    result.latitude = coordinates.latitude;
                    result.longitude = coordinates.longitude;
                }
            }
            break;
        }
        default: {
            const scaleParameters = url.pathname.match(/^\/api\/(?<version>v1)\/airQualityScale\/(?<language>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<scale>[^/]+)$/i)?.groups;
            if (scaleParameters) {
                result.version = scaleParameters.version;
                result.language = scaleParameters.language;
                result.scale = scaleParameters.scale;
                break;
            }
            const parameters = url.pathname.match(/^\/api\/(?<version>v1|v2|v3)\/(availability|weather)\/(?<locale>[A-Z0-9]+(?:-[A-Z0-9]+)*)\/(?<latitude>-?\d+\.?\d*)\/(?<longitude>-?\d+\.?\d*)$/i)?.groups;
            const localeParts = parameters?.locale?.split("-") || [];
            let localeCountry;
            // BCP 47 locale 的末段只有两位字母时才视作地区，保留 zh-Hans 这类 script。
            // Treat the final BCP 47 subtag as a region only when it contains two letters, preserving scripts such as zh-Hans.
            if (localeParts.length > 1 && /^[A-Z]{2}$/i.test(localeParts.at(-1))) localeCountry = localeParts.pop().toUpperCase();
            result.version = parameters?.version;
            result.language = localeParts.join("-") || undefined;
            result.latitude = parameters?.latitude;
            result.longitude = parameters?.longitude;
            const queryCountry = url.searchParams.get("country")?.toUpperCase();
            result.country = queryCountry || localeCountry;
            result.countrySource = queryCountry ? "query" : localeCountry ? "locale" : undefined;
            result.dataSets = url.searchParams.get("dataSets")?.split(",") || [];
            break;
        }
    }
    Console.info("✅ parseWeatherKitURL", `🟧version: ${result.version} 🟧language: ${result.language} 🟧country: ${result.country}`, `🟧latitude: ${result.latitude} 🟧longitude: ${result.longitude}`);
    return result;
}

/**
 * 存储配置读取与合并结果。
 * Merged storage result object.
 *
 * @typedef {object} StorageProfile
 * @property {Record<string, any>} Settings 运行设置 / Runtime settings.
 * @property {Record<string, any>} Configs 静态配置 / Static configs.
 * @property {Record<string, any>} Caches 缓存数据 / Runtime caches.
 */

/**
 * 读取并合并默认配置、持久化配置与 `$argument`。
 * Read and merge default config, persisted config and `$argument`.
 *
 * 注意：`Configs` 与 `Caches` 始终按每个 profile（`names`）合并；`Settings` 的合并顺序由 `$argument.Storage` 控制（支持别名）。
 * Note: `Configs` and `Caches` are always merged per-profile (`names`); the merge order for `Settings` is controlled by `$argument.Storage` (aliases supported).
 *
 * 合并来源与顺序由 `$argument.Storage` 控制（支持以下值 / 别名）：
 * Merge source order is controlled by `$argument.Storage` (accepted values / aliases):
 * - `Argument` / `$argument`: `database[name]` -> `PersistentStore[name]` -> `$argument`
 * - `PersistentStore` / `BoxJs` / `boxjs` / `$persistentStore` / `undefined`（默认）：`database[name]` -> `$argument` -> `PersistentStore[name]`
 * - `database`: 仅 `database[name]`
 *
 * 注意：字符串比较为精确匹配（区分大小写）。
 *
 * @since 2.1.3
 * @link https://github.com/NanoCat-Me/utils/blob/main/getStorage.mjs
 * @author VirgilClyne
 * @param {string} key 持久化主键 / Persistent store key.
 * @param {string|string[]|Array<string|string[]>} names 目标配置名 / Target profile names.
 * @param {Record<string, any>} database 默认数据库 / Default database object.
 * @returns {StorageProfile}
 *
 * @module getStorage
 * @default
 */
function getStorage(key, names, database) {
	if (database?.Default?.Settings?.LogLevel) Console.logLevel = database.Default.Settings.LogLevel;
	Console.debug("☑️ getStorage");
	names = [names].flat(Number.POSITIVE_INFINITY);
	/***************** Default *****************/
	const Root = { Settings: database?.Default?.Settings || {}, Configs: database?.Default?.Configs || {}, Caches: {} };
	Console.debug("Default", `Root.Settings类型: ${typeof Root.Settings}`, `Root.Settings: ${JSON.stringify(Root.Settings)}`);
	/***************** PersistentStore *****************/
	// 包装为局部变量，用完释放内存
	// BoxJs 的清空操作返回假值空字符串, 逻辑或操作符会在左侧操作数为假值时返回右侧操作数。
	const PersistentStore = Storage.getItem(key, {});
	if (PersistentStore) {
		Console.debug("☑️ PersistentStore", `PersistentStore类型: ${typeof PersistentStore}`, `PersistentStore内容: ${JSON.stringify(PersistentStore || {})}`);
		names.forEach(name => {
			if (typeof PersistentStore?.[name]?.Settings === "string") {
				PersistentStore[name].Settings = JSON.parse(PersistentStore[name].Settings || "{}");
			}
			if (typeof PersistentStore?.[name]?.Caches === "string") {
				PersistentStore[name].Caches = JSON.parse(PersistentStore[name].Caches || "{}");
			}
		});
		if (PersistentStore.LogLevel) Console.logLevel = PersistentStore.LogLevel;
		Console.debug("✅ PersistentStore", `Root.Settings类型: ${typeof Root.Settings}`, `Root.Settings: ${JSON.stringify(Root.Settings)}`);
	}
	/***************** Merge *****************/
	names.forEach(name => {
		Lodash.merge(Root.Configs, database?.[name]?.Configs);
		Lodash.merge(Root.Caches, PersistentStore?.[name]?.Caches);
	});
	switch ($argument.Storage) {
		case "Argument":
		case "$argument":
			names.forEach(name => {
				Lodash.merge(Root.Settings, database?.[name]?.Settings, PersistentStore?.[name]?.Settings);
			});
			Lodash.merge(Root.Settings, $argument);
			break;
		case "BoxJs":
		case "boxjs":
		case "PersistentStore":
		case "$persistentStore":
		case undefined:
		default:
			names.forEach(name => {
				Lodash.merge(Root.Settings, database?.[name]?.Settings);
			});
			Lodash.merge(Root.Settings, $argument);
			names.forEach(name => {
				Lodash.merge(Root.Settings, PersistentStore?.[name]?.Settings);
			});
			break;
		case "database":
			names.forEach(name => {
				Lodash.merge(Root.Settings, database?.[name]?.Settings);
			});
			break;
	}
	if (Root.Settings.LogLevel) Console.logLevel = Root.Settings.LogLevel;
	Console.debug("✅ Merge", `Root.Settings类型: ${typeof Root.Settings}`, `Root.Settings: ${JSON.stringify(Root.Settings)}`);
	/***************** traverseObject *****************/
	traverseObject(Root.Settings, (key, value) => {
		Console.debug("☑️ traverseObject", `${key}: ${typeof value}`, `${key}: ${JSON.stringify(value)}`);
		switch (typeof value) {
			case "string":
				switch (value) {
					case "true":
					case "false":
					case "[]":
						value = JSON.parse(value); // 字符串转Boolean/空数组
						break;
					default:
						if (value.includes(","))
							value = value2array(value).map(item => string2number(item)); // 字符串转数组转数字
						else value = string2number(value); // 字符串转数字
				}
				break;
		}
		return value;
	});
	Console.debug("✅ traverseObject", `Root.Settings类型: ${typeof Root.Settings}`, `Root.Settings: ${JSON.stringify(Root.Settings)}`);
	Console.debug("✅ getStorage");
	return Root;
}

/**
 * 深度遍历对象并用回调替换叶子值。
 * Deep-walk an object and replace leaf values using callback.
 *
 * @param {Record<string, any>} o 目标对象 / Target object.
 * @param {(key: string, value: any) => any} c 处理回调 / Transformer callback.
 * @returns {Record<string, any>}
 */
function traverseObject(o, c) {
	for (const t in o) {
		const n = o[t];
		o[t] = "object" === typeof n && null !== n ? traverseObject(n, c) : c(t, n);
	}
	return o;
}

/**
 * 将纯数字字符串转换为数字。
 * Convert integer-like string into number.
 *
 * @param {string} string 输入字符串 / Input string.
 * @returns {string|number}
 */
function string2number(string) {
	if (/^\d+$/.test(string)) string = Number.parseInt(string, 10);
	return string;
}

/**
 * 将值包装为数组。
 * Split value into array.
 *
 * @param {string|number|boolean|string[]|null|undefined} value 输入值 / Input value.
 * @returns {(string|number|boolean)[]}
 */
function value2array(value) {
	switch (typeof value) {
		case "string":
			return value.split(",");
		case "number":
		case "boolean":
			return [value];
		default:
			return value || [];
	}
}

/**
 * Set Environment Variables
 * @author VirgilClyne
 * @param {String} name - Persistent Store Key
 * @param {Array} platforms - Platform Names
 * @param {Object} database - Default DataBase
 * @return {Object} { Settings, Caches, Configs }
 */
function setENV(name, platforms, database) {
    Console.info("☑️ Set Environment Variables");
    const { Settings, Caches, Configs } = getStorage(name, platforms, database);
    /***************** Settings *****************/
    Console.info(`typeof Settings: ${typeof Settings}`, `Settings: ${JSON.stringify(Settings, null, 2)}`);
    string2array("DataSets");
    string2array("Weather.Replace");
    string2array("AirQuality.Current.Index.Replace");
    string2array("AirQuality.Current.Pollutants.Units.Replace");
    /***************** Caches *****************/
    //Console.debug(`typeof Caches: ${typeof Caches}`, `Caches: ${JSON.stringify(Caches)}`);
    /***************** Configs *****************/
    //Configs.Storefront = new Map(Configs.Storefront);
    if (Configs.Locale) Configs.Locale = new Map(Configs.Locale);
    if (Configs.i18n) for (const type in Configs.i18n) Configs.i18n[type] = new Map(Configs.i18n[type]);
    Console.info("✅ Set Environment Variables");
    return { Settings, Caches, Configs };

    function string2array(path) {
        const setting = Lodash.get(Settings, path);
        if (!Array.isArray(setting)) Lodash.set(Settings, path, setting ? [setting] : []);
    }
}

/***************** Processing *****************/

/* WK3 b66 forecastNextHour codec, reused from upstream v3.3.6 (Apache-2.0). */
const __patchWK3NextHour = (() => {
const Metadata = mt.Metadata;

/** Apple WK3 b66, paired original JSON/FlatBuffer responses (2026-11-04).
 * Root 5; nextHour[0..5] = metadata, condition[], summary[], start, end, minutes[].
 * Unlike WK2, summary.condition is an enum vector. Only singleton vectors are
 * verified: u8 vs u16 element width cannot be distinguished from those samples;
 * both have identical singleton bytes. Multi-element vectors fail closed.
 * Miami / Manchester / Atlanta confirmed nonzero minutes and summaries, tokens
 * START/STOP/START_STOP/CONSTANT, FIRST_AT/SECOND_AT parameters. No WK2 enum reuse.
 * Raw codec preserves numeric enums; symbolic provider conversion fails closed.
 * Unknown fields require arena preservation by the caller, NOT decode/reencode.
 */
const WK3_NEXT_HOUR_ROOT_SLOT = 5;
const WK3_NEXT_HOUR_ENUMS = {
    condition: { CLEAR: 1, RAIN: 7, DRIZZLE: 8 },
    precipitation: { CLEAR: 1, RAIN: 2 },
    forecastToken: { CLEAR: 1, START: 2, STOP: 3, START_STOP: 4, CONSTANT: 6 },
    parameterType: { FIRST_AT: 1, SECOND_AT: 2 },
    sourceType: { MODELED: 2, STATION: 3 },
};
const uint = (n = 0, max = 0xffffffff) => {
    if (!Number.isInteger(n) || n < 0 || n > max) throw new RangeError("WK3 unsigned integer out of range");
    return n;
};
const byte = n => uint(n, 255);
const float = (n = 0) => {
    if (typeof n !== "number" || !Number.isFinite(Math.fround(n)) || n < 0) throw new TypeError("WK3 nonnegative finite float32 required");
    return n;
};
const chance = n => uint(n, 100);
function range(bb, p, length) {
    if (!Number.isSafeInteger(p) || p < 0 || !Number.isSafeInteger(length) || length < 0 || p + length > bb.capacity()) throw new RangeError("Truncated WK3 nextHour");
}
class Table {
    __init(p, bb) { this.bb_pos = p; this.bb = bb; return this; }
    check(slots) {
        range(this.bb, this.bb_pos, 4);
        const v = this.bb_pos - this.bb.readInt32(this.bb_pos);
        range(this.bb, v, 4);
        const length = this.bb.readUint16(v), size = this.bb.readUint16(v + 2);
        if (length < 4 || length % 2 || (length - 4) / 2 > slots || size < 4) throw new TypeError("Unsupported WK3 nextHour table layout");
        range(this.bb, v, length); range(this.bb, this.bb_pos, size);
        for (let i = 4; i < length; i += 2) {
            const o = this.bb.readUint16(v + i);
            if (o && (o < 4 || o >= size)) throw new RangeError("Invalid WK3 field offset");
        }
        return this;
    }
    field(i, width = 4) {
        const o = this.bb.__offset(this.bb_pos, 4 + 2 * i);
        if (!o) return 0;
        const v = this.bb_pos - this.bb.readInt32(this.bb_pos);
        if (o + width > this.bb.readUint16(v + 2)) throw new RangeError("Invalid WK3 scalar width");
        range(this.bb, this.bb_pos + o, width); return this.bb_pos + o;
    }
    scalar(i, kind = "readUint32") {
        const p = this.field(i, kind === "readUint8" ? 1 : 4);
        return p ? this.bb[kind](p) : 0;
    }
    child(i) {
        const p = this.field(i); if (!p) return null;
        const relative = this.bb.readUint32(p); if (!relative) return null;
        const target = p + relative; range(this.bb, target, 4);
        return new Table().__init(target, this.bb);
    }
    vector(i, bytes = false) {
        const f = this.field(i); if (!f) return [];
        const relative = this.bb.readUint32(f); if (!relative) return [];
        const p = f + relative; range(this.bb, p, 4);
        const n = this.bb.readUint32(p);
        if (bytes && n !== 1) throw new TypeError("Unverified WK3 multi-condition summary vector");
        range(this.bb, p + 4, n * (bytes ? 1 : 4));
        return Array.from({ length: n }, (_, k) => {
            if (bytes) return this.bb.readUint8(p + 4 + k);
            const f = p + 4 + k * 4, target = f + this.bb.readUint32(f); range(this.bb, target, 4);
            return new Table().__init(target, this.bb);
        });
    }
}
class WK3NextHourTable extends Table {}
function metadataDecode(t) {
    if (!t) return null;
    t.check(11);
    const m = new Metadata().__init(t.bb_pos, t.bb);
    return { attributionUrl: m.attributionUrl(), expireTime: m.expireTime(), language: m.language(), latitude: m.latitude(), longitude: m.longitude(), providerLogo: m.providerLogo(), providerName: m.providerName(), readTime: m.readTime(), reportedTime: m.reportedTime(), temporarilyUnavailable: m.temporarilyUnavailable(), sourceType: m.sourceType() & 255 };
}
function parameterDecode(t) { t.check(2); return { type: t.scalar(0, "readUint8"), date: t.scalar(1) }; }
function conditionDecode(t) {
    t.check(6);
    return { startTime: t.scalar(0), endTime: t.scalar(1), forecastToken: t.scalar(2, "readUint8"), beginCondition: t.scalar(3, "readUint8"), endCondition: t.scalar(4, "readUint8"), parameters: t.vector(5).map(parameterDecode) };
}
function summaryDecode(t) {
    t.check(5);
    return { startTime: t.scalar(0), endTime: t.scalar(1), condition: t.vector(2, true), precipitationChance: t.scalar(3, "readUint8"), precipitationIntensity: t.scalar(4, "readFloat32") };
}
function minuteDecode(t) {
    t.check(4);
    return { startTime: t.scalar(0), precipitationChance: t.scalar(1, "readUint8"), precipitationIntensity: t.scalar(2, "readFloat32"), perceivedPrecipitationIntensity: t.scalar(3, "readFloat32") };
}
function decodeNextHour(table) {
    const t = new WK3NextHourTable().__init(table.bb_pos, table.bb).check(6);
    return { metadata: metadataDecode(t.child(0)), condition: t.vector(1).map(conditionDecode), summary: t.vector(2).map(summaryDecode), forecastStart: t.scalar(3), forecastEnd: t.scalar(4), minutes: t.vector(5).map(minuteDecode) };
}
function decodeWK3NextHour(bytes) {
    const bb = bytes instanceof ByteBuffer ? bytes : new ByteBuffer(bytes), start = bb.position();
    range(bb, start, 4);
    const root = new Table().__init(start + bb.readUint32(start), bb);
    // Root may have arbitrary future slots; only inspect root 5.
    root.check(32765);
    const t = root.child(WK3_NEXT_HOUR_ROOT_SLOT);
    return t ? decodeNextHour(t) : null;
}
function vector(b, entries, bytes = false) {
    if (bytes && entries.length !== 1) throw new TypeError("Unverified WK3 multi-condition summary vector");
    b.startVector(bytes ? 1 : 4, entries.length, bytes ? 1 : 4);
    for (let i = entries.length - 1; i >= 0; i--) bytes ? b.addInt8(byte(entries[i])) : b.addOffset(entries[i]);
    return b.endVector();
}
function string(b, value) {
    if (value == null) return 0;
    if (typeof value !== "string") throw new TypeError("WK3 metadata string required");
    return b.createString(value);
}
function metadataEncode(b, m) {
    if (!m) return 0;
    const signedFloat = n => { if (typeof n !== "number" || !Number.isFinite(Math.fround(n))) throw new TypeError("WK3 metadata finite float required"); return n; };
    return Metadata.createMetadata(b, string(b, m.attributionUrl), uint(m.expireTime), string(b, m.language), signedFloat(m.latitude ?? 0), signedFloat(m.longitude ?? 0), string(b, m.providerLogo), string(b, m.providerName), uint(m.readTime), uint(m.reportedTime), m.temporarilyUnavailable ?? false, byte(m.sourceType));
}
function parameterEncode(b, p) {
    const type = byte(p.type), date = uint(p.date);
    b.startObject(2); b.addFieldInt8(0, type, 0); b.addFieldInt32(1, date, 0); return b.endObject();
}
function conditionEncode(b, c) {
    const start = uint(c.startTime), end = uint(c.endTime), token = byte(c.forecastToken), begin = byte(c.beginCondition), finish = byte(c.endCondition);
    const parameters = vector(b, (c.parameters ?? []).map(p => parameterEncode(b, p)));
    b.startObject(6); b.addFieldInt32(0, start, 0); b.addFieldInt32(1, end, 0); b.addFieldInt8(2, token, 0); b.addFieldInt8(3, begin, 0); b.addFieldInt8(4, finish, 0); b.addFieldOffset(5, parameters, 0); return b.endObject();
}
function summaryEncode(b, s) {
    if (!Array.isArray(s.condition)) throw new TypeError("WK3 summary.condition must be an enum array, not a WK2 scalar");
    const start = uint(s.startTime), end = uint(s.endTime), probability = chance(s.precipitationChance), intensity = float(s.precipitationIntensity), conditions = vector(b, s.condition, true);
    b.startObject(5); b.addFieldInt32(0, start, 0); b.addFieldInt32(1, end, 0); b.addFieldOffset(2, conditions, 0); b.addFieldInt8(3, probability, 0); b.addFieldFloat32(4, intensity, 0); return b.endObject();
}
function minuteEncode(b, m) {
    const start = uint(m.startTime), probability = chance(m.precipitationChance), intensity = float(m.precipitationIntensity), perceived = float(m.perceivedPrecipitationIntensity);
    b.startObject(4); b.addFieldInt32(0, start, 0); b.addFieldInt8(1, probability, 0); b.addFieldFloat32(2, intensity, 0); b.addFieldFloat32(3, perceived, 0); return b.endObject();
}
/** Return a CHILD offset. Caller finishes/appends/merges root 5 atomically. */
function encodeNextHour(b, data) {
    const start = uint(data.forecastStart), end = uint(data.forecastEnd), metadata = metadataEncode(b, data.metadata);
    const conditions = vector(b, (data.condition ?? []).map(c => conditionEncode(b, c)));
    const summaries = vector(b, (data.summary ?? []).map(s => summaryEncode(b, s)));
    const minutes = vector(b, (data.minutes ?? []).map(m => minuteEncode(b, m)));
    b.startObject(6); b.addFieldOffset(0, metadata, 0); b.addFieldOffset(1, conditions, 0); b.addFieldOffset(2, summaries, 0); b.addFieldInt32(3, start, 0); b.addFieldInt32(4, end, 0); b.addFieldOffset(5, minutes, 0); return b.endObject();
}
const nextHourCodec = { tableClass: WK3NextHourTable, decode: decodeNextHour, encode: encodeNextHour };

function mapEnum(group, name) {
    const dictionary = WK3_NEXT_HOUR_ENUMS[group];
    if (typeof name !== "string" || !Object.hasOwn(dictionary, name)) throw new TypeError(`Unsupported WK3 nextHour ${group}: ${name}`);
    return dictionary[name];
}
function requiredNumber(n, validate) {
    if (typeof n !== "number") throw new TypeError("Missing provider nextHour number");
    return validate(n);
}
/** Convert ColorfulClouds.Minutely()/QWeather.Minutely() normalized output.
 * Their precipitationIntensity is mm/h and precipitationChance is percent.
 * Caller MUST explicitly attest units; no conversion of raw five-minute totals,
 * probability fractions, radar dBZ, or guessing conditions from text here.
 * Existing provider perceived intensity/condition/summary logic is not rederived.
 * Unsupported symbolic enums, missing data, or inconsistent timelines throw;
 * caller catches and keeps the ORIGINAL child arena (including unknown fields).
 */
function providerToWK3NextHour(data, { intensityUnit, chanceUnit } = {}) {
    if (intensityUnit !== "mm/h" || chanceUnit !== "percent") throw new TypeError("Explicit mm/h and percent units required");
    if (!data?.metadata?.providerName || data.metadata.temporarilyUnavailable) throw new TypeError("Missing available nextHour provider metadata");
    if (!Array.isArray(data.minutes) || !data.minutes.length || !Array.isArray(data.condition) || !data.condition.length || !Array.isArray(data.summary) || !data.summary.length) throw new TypeError("Missing nextHour minutes/condition/summary");
    const forecastStart = requiredNumber(data.forecastStart, uint), forecastEnd = requiredNumber(data.forecastEnd, uint);
    const minutes = data.minutes.map((m, i) => {
        const startTime = requiredNumber(m.startTime, uint);
        if (startTime !== forecastStart + i * 60) throw new TypeError("Noncontiguous nextHour minutes");
        return { startTime, precipitationChance: requiredNumber(m.precipitationChance, chance), precipitationIntensity: requiredNumber(m.precipitationIntensity, float), perceivedPrecipitationIntensity: requiredNumber(m.perceivedPrecipitationIntensity, float) };
    });
    if (forecastEnd !== forecastStart + minutes.length * 60) throw new TypeError("Inconsistent nextHour forecastEnd");
    const segment = s => ({ startTime: requiredNumber(s.startTime, uint), endTime: s.endTime == null ? 0 : requiredNumber(s.endTime, uint) });
    const summary = data.summary.map(s => ({ ...segment(s), condition: (Array.isArray(s.condition) ? s.condition : [s.condition]).map(c => mapEnum("precipitation", c)), precipitationChance: requiredNumber(s.precipitationChance, chance), precipitationIntensity: requiredNumber(s.precipitationIntensity, float) }));
    if (summary.some(s => s.condition.length !== 1)) throw new TypeError("Unverified WK3 multi-condition summary vector");
    const condition = data.condition.map(c => {
        if (!Array.isArray(c.parameters)) throw new TypeError("Missing condition parameters");
        return { ...segment(c), forecastToken: mapEnum("forecastToken", c.forecastToken), beginCondition: mapEnum("condition", c.beginCondition), endCondition: mapEnum("condition", c.endCondition), parameters: c.parameters.map(p => ({ type: mapEnum("parameterType", p.type), date: requiredNumber(p.date, uint) })) };
    });
    for (const segments of [summary, condition]) {
        for (let i = 0; i < segments.length; i++) {
            const s = segments[i], next = segments[i + 1];
            if (s.startTime !== (i === 0 ? forecastStart : segments[i - 1].endTime) || (next ? s.endTime !== next.startTime || s.endTime <= s.startTime || s.endTime >= forecastEnd : s.endTime !== 0)) throw new TypeError("Inconsistent nextHour segment timeline");
        }
    }
    return { metadata: { ...data.metadata, sourceType: mapEnum("sourceType", data.metadata.sourceType) }, forecastStart, forecastEnd, minutes, summary, condition };
}


const SLOT = 5;
const TABLE_FIELDS = [0, 1, 2, 3, 4, 5];
const VECTOR_FIELDS = [0, 1, 2, 5];

function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function readUint32(bytes, offset) { return view(bytes).getUint32(offset, true); }
function readInt32(bytes, offset) { return view(bytes).getInt32(offset, true); }
function writeUint32(bytes, offset, value) { view(bytes).setUint32(offset, value, true); }

function fieldOffset(bytes, table, index) {
    const vtable = table - readInt32(bytes, table);
    if (vtable < 0 || vtable + 4 > bytes.length) return 0;
    const vtableLength = view(bytes).getUint16(vtable, true);
    const objectLength = view(bytes).getUint16(vtable + 2, true);
    if (vtableLength < 4 || vtableLength % 2 || vtable + vtableLength > bytes.length || table + objectLength > bytes.length) return 0;
    const entry = vtable + 4 + index * 2;
    if (entry + 2 > vtable + vtableLength) return 0;
    const offset = view(bytes).getUint16(entry, true);
    return offset && offset < objectLength ? offset : 0;
}

function rootSlotAddress(bytes) {
    if (bytes.length < 8) return 0;
    const root = readUint32(bytes, 0);
    if (root < 4 || root + 4 > bytes.length) return 0;
    const vtable = root - readInt32(bytes, root);
    if (vtable < 0 || vtable + 4 > bytes.length) return 0;
    const vtableLength = view(bytes).getUint16(vtable, true);
    const objectLength = view(bytes).getUint16(vtable + 2, true);
    const entry = vtable + 4 + SLOT * 2;
    if (vtableLength < 4 + (SLOT + 1) * 2 || entry + 2 > vtable + vtableLength) return 0;
    if (objectLength < 4 || root + objectLength > bytes.length) return 0;
    const offset = view(bytes).getUint16(entry, true);
    if (!offset || offset + 4 > objectLength) return 0;
    return root + offset;
}

function appendAtRootSlot(bytes, encoded) {
    const rootFieldAddress = rootSlotAddress(bytes);
    if (!rootFieldAddress || readUint32(bytes, rootFieldAddress) !== 0) return bytes;
    const appendAt = Math.ceil(bytes.length / 4) * 4;
    const output = new Uint8Array(appendAt + encoded.length);
    output.set(bytes);
    output.set(encoded, appendAt);
    const tableRoot = readUint32(encoded, 0);
    const target = appendAt + tableRoot;
    if (target <= rootFieldAddress || target - rootFieldAddress > 0xffffffff) return bytes;
    writeUint32(output, rootFieldAddress, target - rootFieldAddress);
    return output;
}

function patchVectors(bytes, encoded) {
    const root = readUint32(bytes, 0), rootField = fieldOffset(bytes, root, SLOT);
    if (!rootField) return bytes;
    const table = root + rootField + readUint32(bytes, root + rootField);
    const oldFields = TABLE_FIELDS.map(index => fieldOffset(bytes, table, index));
    if (oldFields.some(offset => !offset)) return bytes;

    const encodedRoot = readUint32(encoded, 0);
    const newFields = TABLE_FIELDS.map(index => fieldOffset(encoded, encodedRoot, index));
    if (newFields.some(offset => !offset)) return bytes;

    const appendAt = Math.ceil(bytes.length / 4) * 4;
    const output = new Uint8Array(appendAt + encoded.length);
    output.set(bytes);
    output.set(encoded, appendAt);
    for (const index of VECTOR_FIELDS) {
        const oldAddress = table + oldFields[index];
        const newAddress = encodedRoot + newFields[index];
        const target = appendAt + newAddress + readUint32(encoded, newAddress);
        if (target <= oldAddress || target - oldAddress > 0xffffffff) return bytes;
        writeUint32(output, oldAddress, target - oldAddress);
    }
    for (const index of [3, 4]) {
        const oldAddress = table + oldFields[index];
        const newAddress = encodedRoot + newFields[index];
        view(output).setUint32(oldAddress, readUint32(encoded, newAddress), true);
    }
    return output;
}

/** Update only a validated WK3 next-hour child; every failure returns Apple bytes. */
async function patchWK3NextHour(bytes, getProviderForecast) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 8) return bytes;
    try {
        const slotAddress = rootSlotAddress(bytes);
        if (!slotAddress) return bytes;
        const missingNativeChild = readUint32(bytes, slotAddress) === 0;
        const original = decodeWK3NextHour(bytes);
        if (!original && !missingNativeChild) return bytes;
        const providerForecast = await getProviderForecast();
        const data = providerToWK3NextHour(providerForecast, { intensityUnit: "mm/h", chanceUnit: "percent" });
        const builder = new Builder();
        builder.finish(encodeNextHour(builder, data));
        const encoded = builder.asUint8Array();
        return missingNativeChild ? appendAtRootSlot(bytes, encoded) : patchVectors(bytes, encoded);
    } catch {
        return bytes;
    }
}

return patchWK3NextHour;
})();

async function Response($request, $response) {
    // 解构URL
    const url = new URL($request.url);
    Console.info(`url: ${url.toJSON()}`);
    // 获取连接参数
    const PATHs = url.pathname.split("/").filter(Boolean);
    Console.info(`PATHs: ${PATHs}`);
    // 解析格式
    const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
    Console.info(`FORMAT: ${FORMAT}`);
    /**
     * 设置
     * @type {{Settings: import('./types').Settings}}
     */
    const { Settings, Caches, Configs } = setENV("iRingo", "WeatherKit", database);
    Console.logLevel = Settings.LogLevel;
    // 创建空数据
    let body = {};
    // 格式判断
    switch (FORMAT) {
        case undefined: // 视为无body
            break;
        case "application/x-www-form-urlencoded":
        case "text/plain":
        default:
            //Console.debug(`body: ${body}`);
            break;
        case "application/x-mpegURL":
        case "application/x-mpegurl":
        case "application/vnd.apple.mpegurl":
        case "audio/mpegurl":
            //body = M3U8.parse($response.body);
            //Console.debug(`body: ${JSON.stringify(body)}`);
            //$response.body = M3U8.stringify(body);
            break;
        case "text/xml":
        case "text/html":
        case "text/plist":
        case "application/xml":
        case "application/plist":
        case "application/x-plist":
            //body = XML.parse($response.body);
            //Console.debug(`body: ${JSON.stringify(body)}`);
            //$response.body = XML.stringify(body);
            break;
        case "text/vtt":
        case "application/vtt":
            //body = VTT.parse($response.body);
            //Console.debug(`body: ${JSON.stringify(body)}`);
            //$response.body = VTT.stringify(body);
            break;
        case "text/json":
        case "application/json":
            body = JSON.parse($response.body);
            switch (url.hostname) {
                case "weatherkit.apple.com":
                    // 路径判断
                    switch (url.pathname) {
                        default:
                            if (url.pathname.startsWith("/api/v1/availability/")) {
                                Console.debug(`body: ${JSON.stringify(body)}`);
                                body = mergeWeatherKitAvailability(body, Configs?.Availability?.v2);
                            }
                            break;
                    }
                    break;
            }
            $response.body = JSON.stringify(body);
            break;
        case "application/vnd.apple.flatbuffer":
        case "application/protobuf":
        case "application/x-protobuf":
        case "application/vnd.google.protobuf":
        case "application/grpc":
        case "application/grpc+proto":
        case "application/octet-stream": {
            //Console.debug(`$response: ${JSON.stringify($response, null, 2)}`);
            let rawBody = $response.bodyBytes ? new Uint8Array($response.bodyBytes) : ($response.body ?? new Uint8Array());
            //Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`);
            switch (FORMAT) {
                case "application/vnd.apple.flatbuffer": {
                    // 解析FlatBuffer
                    let ByteBuffer$1 = new ByteBuffer(rawBody);
                    // 主机判断
                    switch (url.hostname) {
                        case "weatherkit.apple.com":
                            // 路径判断
                            if (/^\/api\/v[23]\/weather\//.test(url.pathname)) {
                                const parameters = parseWeatherKitURL(url);
                                let WeatherKit;
                                switch (parameters.version) {
                                    case "v2":
                                        WeatherKit = WeatherKit2;
                                        break;
                                    case "v3":
                                        WeatherKit = WeatherKit3;
                                        break;
                                }
                                const patchNextHour = parameters.version === "v3" && parameters.dataSets.includes("forecastNextHour") && Settings.DataSets.includes("forecastNextHour") && Settings.NextHour?.Provider === "ColorfulClouds" && shouldReplaceWeatherKit(parameters, Settings);
                                let dataSets = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet) && (parameters.version !== "v3" || dataSet === "airQuality") && (dataSet !== "airQuality" || shouldReplaceWeatherKit(parameters, Settings)));
                                if (dataSets.length === 0 && !patchNextHour) break;
                                const rootNames = dataSets.map(dataSet => Configs.DataSets[dataSet] ?? dataSet);
                                body = dataSets.length ? WeatherKit.decode(ByteBuffer$1, rootNames) : {};
                                // 解码失败不等于 Apple 缺少 AQ，不能用注入结果覆盖未知字段或枚举。
                                // A rejected AQ child is not a missing product; retain its original fields and enums.
                                if (body === null) { if (!patchNextHour) break; dataSets = []; body = {}; }
                                const providerParameters = { ...parameters, weatherKitLanguage: body.weatherAlerts?.metadata?.language };
                                const colorfulCloudsParameters = isChinaMainland(parameters) ? { ...providerParameters, country: "CN" } : providerParameters;
                                const matchEnum = new MatchEnum(body, parameters.version);
                                if (dataSets.length && (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL")) {
                                    await matchEnum.init();
                                }
                                const enviroments = {
                                    colorfulClouds: new ColorfulClouds(colorfulCloudsParameters, Settings?.API?.ColorfulClouds?.Token || "Y2FpeXVuX25vdGlmeQ=="),
                                    qWeather: new QWeather(providerParameters, Settings?.API?.QWeather?.Token || "bdd98ec1d87747f3a2e8b1741a5af796", Settings?.API?.QWeather?.Host),
                                    waqi: new WAQI(parameters, Settings?.API?.WAQI?.Token),
                                    country: isChinaMainland(parameters) ? "CN" : parameters.country,
                                };

                                await Promise.all(
                                    dataSets.map(async dataSet => {
                                        switch (dataSet) {
                                            case "airQuality": {
                                                if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
                                                    matchEnum.airQuality();
                                                }
                                                body.airQuality = await InjectAirQuality(body.airQuality, Settings, Caches, enviroments);
                                                break;
                                            }
                                            case "currentWeather": {
                                                if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
                                                    matchEnum.weatherCondition();
                                                    matchEnum.pressureTrend();
                                                }
                                                body.currentWeather = await InjectCurrentWeather(body.currentWeather, Settings, enviroments);
                                                break;
                                            }
                                            case "forecastDaily": {
                                                body.forecastDaily = await InjectForecastDaily(body.forecastDaily, Settings, enviroments);
                                                break;
                                            }
                                            case "forecastHourly": {
                                                body.forecastHourly = await InjectForecastHourly(body.forecastHourly, Settings, enviroments);
                                                break;
                                            }
                                            case "forecastNextHour": {
                                                Console.debug(`body.forecastNextHour: ${JSON.stringify(body?.forecastNextHour, null, 2)}`);
                                                if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
                                                    matchEnum.conditionType();
                                                    matchEnum.forecastToken();
                                                }
                                                body.forecastNextHour = await InjectForecastNextHour(body.forecastNextHour, Settings, enviroments);
                                                break;
                                            }
                                            case "news": {
                                                if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
                                                    matchEnum.placementType();
                                                }
                                                Console.debug(`body.news: ${JSON.stringify(body?.news, null, 2)}`);
                                                break;
                                            }
                                            case "weatherAlerts": {
                                                if (Settings?.LogLevel === "DEBUG" || Settings?.LogLevel === "ALL") {
                                                    matchEnum.severity();
                                                    matchEnum.significanceType();
                                                    matchEnum.urgency();
                                                    matchEnum.certainty();
                                                    matchEnum.importanceType();
                                                    matchEnum.responseType();
                                                }
                                                body.weatherAlerts = await InjectWeatherAlerts(body.weatherAlerts, Settings, enviroments);
                                                Console.debug(`body.weatherAlerts: ${JSON.stringify(body?.weatherAlerts, null, 2)}`);
                                                break;
                                            }
                                            case "locationInfo": {
                                                Console.debug(`body.locationInfo: ${JSON.stringify(body?.locationInfo, null, 2)}`);
                                                break;
                                            }
                                        }
                                    }),
                                );
                                if (patchNextHour) {
                                    const before = rawBody;
                                    rawBody = await __patchWK3NextHour(rawBody, () => enviroments.colorfulClouds.Minutely());
                                    ByteBuffer$1 = new ByteBuffer(rawBody);
                                    Console.info("[WK3] nextHour", rawBody === before ? "unchanged; native data kept" : "updated from ColorfulClouds");
                                }
                                if (dataSets.length) rawBody = WeatherKit.encode(ByteBuffer$1, body);
                                break;
                            }
                            break;
                    }
                    break;
                }
            }
            // 写入二进制数据
            $response.body = rawBody;
            break;
        }
    }
    return $response;
}

/**
 * 注入当前天气数据
 * @param {any} currentWeather - 当前天气数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的当前天气数据
 */
async function InjectCurrentWeather(currentWeather, Settings, enviroments) {
    Console.info("☑️ InjectCurrentWeather");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectCurrentWeather", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectCurrentWeather");
        return currentWeather;
    }
    let newCurrentWeather;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newCurrentWeather = await enviroments.qWeather.WeatherNow();
            break;
        }
        case "ColorfulClouds": {
            newCurrentWeather = await enviroments.colorfulClouds.CurrentWeather();
            break;
        }
    }
    if (newCurrentWeather?.metadata) {
        newCurrentWeather.metadata = { ...currentWeather?.metadata, ...newCurrentWeather.metadata };
        currentWeather = { ...currentWeather, ...newCurrentWeather };
        currentWeather.metadata.providerLogo ||= providerNameToLogo(currentWeather.metadata.providerName);
        //Console.debug(`currentWeather: ${JSON.stringify(currentWeather, null, 2)}`);
    }
    Console.info("✅ InjectCurrentWeather");
    return currentWeather;
}

/**
 * 注入每日天气预报数据
 * @param {any} forecastDaily - 每日预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的每日预报数据
 */
async function InjectForecastDaily(forecastDaily, Settings, enviroments) {
    Console.info("☑️ InjectForecastDaily");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectForecastDaily", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectForecastDaily");
        return forecastDaily;
    }
    let newForecastDaily;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newForecastDaily = await enviroments.qWeather.Daily();
            break;
        }
        case "ColorfulClouds": {
            const dailysteps = forecastDaily?.days?.length || 11;
            const begin = forecastDaily?.days?.[0]?.forecastStart;
            //Console.debug(`dailysteps: ${dailysteps}, begin: ${begin}`);
            newForecastDaily = await enviroments.colorfulClouds.Daily(dailysteps, begin);
            break;
        }
    }
    if (newForecastDaily?.metadata) {
        forecastDaily.metadata = { ...forecastDaily?.metadata, ...newForecastDaily.metadata };
        Weather.mergeForecast(forecastDaily?.days, newForecastDaily?.days);
        forecastDaily.metadata.providerLogo ||= providerNameToLogo(forecastDaily.metadata.providerName);
        //Console.debug(`forecastDaily: ${JSON.stringify(forecastDaily, null, 2)}`);
    }
    Console.info("✅ InjectForecastDaily");
    return forecastDaily;
}

/**
 * 注入小时天气预报数据
 * @param {any} forecastHourly - 小时预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的小时预报数据
 */
async function InjectForecastHourly(forecastHourly, Settings, enviroments) {
    Console.info("☑️ InjectForecastHourly");
    if (!Settings?.Weather?.Replace?.includes(enviroments.country)) {
        Console.warn("InjectForecastHourly", `Unreplaced country: ${enviroments.country}`);
        Console.info("✅ InjectForecastHourly");
        return forecastHourly;
    }
    let newForecastHourly;
    switch (Settings?.Weather?.Provider) {
        case "WeatherKit":
        default:
            break;
        case "QWeather": {
            newForecastHourly = await enviroments.qWeather.Hourly();
            break;
        }
        case "ColorfulClouds": {
            const hourlysteps = forecastHourly?.hours?.length || 273;
            const begin = forecastHourly?.hours?.[0]?.forecastStart;
            //Console.debug(`hourlysteps: ${hourlysteps}, begin: ${begin}`);
            newForecastHourly = await enviroments.colorfulClouds.ForecastHourly(hourlysteps, begin);
            break;
        }
    }
    if (newForecastHourly?.metadata) {
        forecastHourly.metadata = { ...forecastHourly?.metadata, ...newForecastHourly.metadata };
        forecastHourly.hours = Weather.mergeForecast(forecastHourly?.hours, newForecastHourly?.hours);
        forecastHourly.metadata.providerLogo ||= providerNameToLogo(forecastHourly.metadata.providerName);
        //Console.debug(`forecastHourly: ${JSON.stringify(forecastHourly, null, 2)}`);
    }
    Console.info("✅ InjectForecastHourly");
    return forecastHourly;
}

/**
 * 注入下一小时天气预报数据
 * @param {any} forecastNextHour - 下一小时预报数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的下一小时预报数据
 */
async function InjectForecastNextHour(forecastNextHour, Settings, enviroments) {
    Console.info("☑️ InjectForecastNextHour");

    if (forecastNextHour) {
        Console.info("✅ InjectForecastNextHour");
        return forecastNextHour;
    }

    let newForecastNextHour;
    switch (Settings?.NextHour?.Provider) {
        case "WeatherKit":
            break;
        case "QWeather": {
            newForecastNextHour = await enviroments.qWeather.Minutely();
            break;
        }
        case "ColorfulClouds":
        default: {
            newForecastNextHour = await enviroments.colorfulClouds.Minutely();
            break;
        }
    }
    if (newForecastNextHour?.metadata) {
        newForecastNextHour.metadata = { ...forecastNextHour?.metadata, ...newForecastNextHour.metadata };
        forecastNextHour = { ...forecastNextHour, ...newForecastNextHour };
        forecastNextHour.metadata.providerLogo ||= providerNameToLogo(forecastNextHour.metadata.providerName);
        Console.debug(`forecastNextHour: ${JSON.stringify(forecastNextHour, null, 2)}`);
    }
    Console.info("✅ InjectForecastNextHour");
    return forecastNextHour;
}

/**
 * 补全预警数据
 * @param {any} weatherAlerts - 预警集合数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 补全后的预警集合数据
 */
async function InjectWeatherAlerts(weatherAlerts, Settings, enviroments) {
    Console.info("☑️ InjectWeatherAlerts");
    const isNationalWarningCenter = ["国家预警信息发布中心", "國家預警信息發布中心", "National Early Warning Center"].includes(weatherAlerts?.metadata?.providerName);
    let newWeatherAlerts;
    switch (Settings?.WeatherAlerts?.Provider) {
        case "WeatherKit": {
            break;
        }
        case "ColorfulClouds": {
            if (isNationalWarningCenter) newWeatherAlerts = await enviroments.colorfulClouds.WeatherAlert();
            break;
        }
        case "QWeather": {
            if (isNationalWarningCenter) newWeatherAlerts = await enviroments.qWeather.WeatherAlert();
            break;
        }
        case "QWeatherWeb":
        default: {
            newWeatherAlerts = await enviroments.qWeather.WeatherAlertWeb(weatherAlerts?.detailsUrl);
            break;
        }
    }
    if (newWeatherAlerts?.metadata) {
        weatherAlerts.metadata = { ...weatherAlerts?.metadata, ...newWeatherAlerts.metadata };
        weatherAlerts.detailsUrl = newWeatherAlerts.detailsUrl ?? weatherAlerts.detailsUrl;
        weatherAlerts.alerts = WeatherAlerts.mergeAlerts(weatherAlerts?.alerts, newWeatherAlerts?.alerts);
        weatherAlerts.metadata.providerLogo ||= providerNameToLogo(weatherAlerts.metadata.providerName);
    }
    Console.info("✅ InjectWeatherAlerts");
    return weatherAlerts;
}

/**
 * 注入并合并空气质量数据（污染物、指数、昨日对比）
 * @param {any} airQuality - WeatherKit 原始空气质量对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} Caches - 缓存对象
 * @param {any} enviroments - 各数据源实例与定位信息
 * @returns {Promise<any>} 合并后的空气质量对象
 */
async function InjectAirQuality(airQuality, Settings, Caches, enviroments) {
    // Step1. 修复污染物单位（Apple 原始产品入口，CO 误标场景按 PR #107 幂等处理）
    // Step 1. Fix pollutant units.
    airQuality = AirQuality.FixPollutantsUnits(airQuality, { appleProduct: true });

    // Step2. 判断原始污染物是否为空，并在需要时注入污染物数据
    const isPollutantEmpty = !Array.isArray(airQuality?.pollutants) || airQuality.pollutants.length === 0;
    const injectedPollutants = isPollutantEmpty ? await InjectPollutants(Settings, enviroments) : airQuality;
    const needPollutants = isPollutantEmpty && !!(injectedPollutants?.metadata && !injectedPollutants.metadata.temporarilyUnavailable);

    // Step3. 根据污染物补齐情况与替换配置，决定是否注入 AQI 指数
    const needInjectIndex = needPollutants || Settings?.AirQuality?.Current?.Index?.Replace?.some(scaleName => AirQuality.ScaleMatches(airQuality?.scale, scaleName));
    const injectedIndex = needInjectIndex ? await InjectIndex(injectedPollutants, Settings, enviroments) : injectedPollutants;

    // Step4. 计算昨日对比是否需要重算；若未知则注入昨日对比结果
    const weatherKitComparison = airQuality?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const previousDayComparison = needInjectIndex && Settings?.AirQuality?.Comparison?.ReplaceWhenCurrentChange ? AirQuality.Config.CompareCategoryIndexes.UNKNOWN : weatherKitComparison;
    const needInjectComparison = previousDayComparison === AirQuality.Config.CompareCategoryIndexes.UNKNOWN;
    const currentIndexProvider = needInjectIndex ? Settings?.AirQuality?.Current?.Index?.Provider : "WeatherKit";
    const injectedComparison = needInjectComparison ? await InjectComparison(injectedIndex, currentIndexProvider, Settings, Caches, enviroments) : { ...injectedIndex, previousDayComparison: weatherKitComparison };

    // Step5. 收集各阶段元数据，拼接最终 providerName 展示文案
    const weatherKitMetadata = airQuality?.metadata;
    const pollutantMetadata = injectedPollutants?.metadata;
    const indexMetadata = injectedIndex?.metadata;
    const comparisonMetadata = injectedComparison?.metadata;
    const providers = [
        ...(weatherKitMetadata?.providerName && !weatherKitMetadata.temporarilyUnavailable ? [weatherKitMetadata.providerName] : []),
        ...(needPollutants && pollutantMetadata?.providerName && !pollutantMetadata.temporarilyUnavailable ? [`污染物：${pollutantMetadata.providerName}`] : []),
        ...(needInjectIndex && indexMetadata?.providerName && !indexMetadata.temporarilyUnavailable ? [`指数：${AirQuality.appendScaleToProviderName(injectedIndex, Settings)}`] : []),
        ...(needInjectComparison && comparisonMetadata?.providerName && !comparisonMetadata.temporarilyUnavailable ? [`对比昨日：\n${comparisonMetadata.providerName}`] : []),
    ];

    // Step6. 选取首个有效 provider，生成统一 logo
    const providerLogo = providerNameToLogo(weatherKitMetadata?.providerName || pollutantMetadata?.providerName || indexMetadata?.providerName || comparisonMetadata?.providerName);

    // Step7. 合并输出：优先使用可用注入结果，并统一 metadata / pollutants / previousDayComparison
    airQuality = {
        ...airQuality,
        ...(injectedIndex?.metadata && !injectedIndex.metadata.temporarilyUnavailable ? injectedIndex : {}),
        metadata: {
            ...(airQuality?.metadata ? airQuality.metadata : injectedPollutants?.metadata),
            providerName: providers.join("\n"),
            ...(providerLogo ? { providerLogo } : {}),
        },
        pollutants: AirQuality.ConvertPollutants(airQuality, injectedPollutants, needInjectIndex, injectedIndex, Settings) ?? [],
        previousDayComparison: injectedComparison?.previousDayComparison ?? AirQuality.Config.CompareCategoryIndexes.UNKNOWN,
    };
    Console.debug(`airQuality: ${JSON.stringify(airQuality, null, 2)}`);
    return airQuality;
}

async function InjectPollutants(Settings, enviroments) {
    Console.info("☑️ InjectPollutants");

    switch (Settings?.AirQuality?.Current?.Pollutants?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality();
            Console.info("✅ InjectPollutants");
            return currentAirQuality;
        }
        case "ColorfulClouds":
        default: {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality();
            Console.info("✅ InjectPollutants");
            return currentAirQuality;
        }
    }
}

/**
 * 注入空气质量数据
 * @param {any} airQuality - 空气质量数据对象
 * @param {import('./types').Settings} Settings - 设置对象
 * @param {any} enviroments - 环境变量
 * @returns {Promise<any>} 注入后的空气质量数据
 */
async function InjectIndex(airQuality, Settings, enviroments) {
    Console.info("☑️ InjectIndex");

    switch (Settings?.AirQuality?.Current?.Index?.Provider) {
        case "QWeather": {
            const currentAirQuality = await enviroments.qWeather.CurrentAirQuality(Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        case "ColorfulCloudsUS":
        case "ColorfulCloudsCN": {
            const currentAirQuality = await enviroments.colorfulClouds.CurrentAirQuality(Settings.AirQuality.Current.Index.Provider === "ColorfulCloudsUS", Settings.AirQuality.Current.Index.ForceCNPrimaryPollutants);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        case "Calculate":
        default: {
            const currentAirQuality = AirQuality.Pollutants2AQI(airQuality, Settings);
            Console.info("✅ InjectIndex");
            return currentAirQuality;
        }
        // TODO
        case "WAQI": {
            if (Settings?.API?.WAQI?.Token) {
                return await enviroments.waqi.AQI2();
            } else {
                const Nearest = await enviroments.waqi.Nearest();
                const Token = await enviroments.waqi.Token(Nearest?.metadata?.stationId);
                //Caches.WAQI.set(stationId, Token);
                const aqi = await enviroments.waqi.AQI(Nearest?.metadata?.stationId, Token);

                return {
                    metadata: { ...Nearest?.metadata, ...aqi?.metadata },
                    ...Nearest,
                    ...aqi,
                };
            }
        }
    }
}

async function InjectComparison(airQuality, currentIndexProvider, Settings, Caches, enviroments) {
    Console.info("☑️ InjectComparison");

    const { UNKNOWN } = AirQuality.Config.CompareCategoryIndexes;

    /**
     * HJ 633—2012
     * [环境空气质量指数（AQI）技术规定（试行）_中华人民共和国生态环境部]{@link https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/t20120302_224166.shtml}
     */
    const isHJ6332012 = (currentIndexProvider, currentScale, Settings) => {
        Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

        switch (currentIndexProvider) {
            case "Calculate": {
                Console.debug(`Settings?.AirQuality?.Calculate?.Algorithm: ${Settings?.AirQuality?.Calculate?.Algorithm}`);
                const result = Settings?.AirQuality?.Calculate?.Algorithm === "WAQI_InstantCast_CN";
                Console.info("✅ isHJ6332012", result);
                return result;
            }
            case "QWeather":
            case "ColorfulCloudsCN": {
                Console.info("✅ isHJ6332012", true);
                return true;
            }
            case "WeatherKit": {
                const result = AirQuality.ScaleMatches(currentScale, AirQuality.Config.Scales.HJ6332012.weatherKitScale.name);
                Console.info("✅ isHJ6332012", result);
                return result;
            }
            default: {
                Console.info("✅ isHJ6332012", false);
                return false;
            }
        }
    };
    /**
     * EPA 454/B-18-007
     * [Technical Assistance Document for the Reporting of Daily Air Quality – the Air Quality Index (AQI)]{@link https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf}
     */
    const isEPA454_B18007 = currentIndexProvider => {
        Console.info("☑️ isHJ6332012", `currentIndexProvider: ${currentIndexProvider}`);

        switch (currentIndexProvider) {
            case "WAQI":
            case "ColorfulCloudsUS": {
                Console.info("✅ isHJ6332012", true);
                return true;
            }
            default: {
                Console.info("✅ isHJ6332012", false);
                return false;
            }
        }
    };

    const colorfulCloudsComparison = async (useUsa, currentCategoryIndex) => {
        Console.info("☑️ colorfulCloudsComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const yesterdayAirQuality = await enviroments.colorfulClouds.YesterdayAirQuality(useUsa);

        const getMetadata = (temporarilyUnavailable = false) => ({
            ...yesterdayAirQuality.metadata,
            providerName: `指数：${AirQuality.appendScaleToProviderName(yesterdayAirQuality)}`,
            temporarilyUnavailable,
        });

        if (!yesterdayAirQuality.metadata.temporarilyUnavailable) {
            if (currentCategoryIndex) {
                const comparisonAirQuality = {
                    ...yesterdayAirQuality,
                    metadata: getMetadata(false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.info("✅ colorfulCloudsComparison");
                return comparisonAirQuality;
            } else {
                const colorfulCloudsCurrent = await enviroments.colorfulClouds.CurrentAirQuality(useUsa);
                if (!colorfulCloudsCurrent.metadata.temporarilyUnavailable) {
                    Console.debug(`colorfulCloudsCurrent?.index: ${colorfulCloudsCurrent?.index}`);
                    const comparisonAirQuality = {
                        ...yesterdayAirQuality,
                        metadata: getMetadata(false),
                        previousDayComparison: AirQuality.CompareCategoryIndexes(colorfulCloudsCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
                    };
                    Console.info("✅ colorfulCloudsComparison");
                    return comparisonAirQuality;
                }
            }
        }

        Console.error("colorfulCloudsComparison", `无法从彩云天气获取${yesterdayAirQuality.metadata.temporarilyUnavailable ? "昨日" : "今日"}的空气质量数据`);
        return {
            ...yesterdayAirQuality,
            metadata: getMetadata(true),
            previousDayComparison: UNKNOWN,
        };
    };
    const qweatherComparison = async (currentCategoryIndex, pollutantsToAirQuality) => {
        Console.info("☑️ qweatherComparison", `currentCategoryIndex: ${currentCategoryIndex}`);
        const setQWeatherCache = qweatherCache => {
            Caches.qweather = qweatherCache;
            Storage.setItem("@iRingo.WeatherKit.Caches", { ...Caches, qweather: qweatherCache });
        };

        const locationsGrid = await QWeather.GetLocationsGrid(Caches?.qweather, setQWeatherCache);
        const { latitude, longitude } = enviroments.qWeather;
        const locationInfo = QWeather.GetLocationInfo(locationsGrid, latitude, longitude);

        const yesterdayQWeather = await enviroments.qWeather.YesterdayAirQuality(locationInfo);

        const getMetadata = (indexProvider, temporarilyUnavailable = false) => ({
            ...yesterdayQWeather.metadata,
            providerName: `污染物：和风天气，指数：${indexProvider}`,
            temporarilyUnavailable,
        });

        if (!yesterdayQWeather.metadata.temporarilyUnavailable) {
            const airQualityFromPollutants = pollutantsToAirQuality(yesterdayQWeather);
            const yesterdayAirQuality = pollutantsToAirQuality
                ? {
                      ...airQualityFromPollutants,
                      metadata: {
                          ...airQualityFromPollutants.metadata,
                          providerName: AirQuality.appendScaleToProviderName(airQualityFromPollutants, Settings),
                      },
                  }
                : {
                      ...yesterdayQWeather,
                      metadata: {
                          ...yesterdayQWeather.metadata,
                          providerName: AirQuality.appendScaleToProviderName(yesterdayQWeather),
                      },
                  };

            if (currentCategoryIndex) {
                const comparisonAirQuality = {
                    ...yesterdayQWeather,
                    metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                    previousDayComparison: AirQuality.CompareCategoryIndexes(currentCategoryIndex, yesterdayAirQuality.categoryIndex),
                };
                Console.info("✅ qweatherComparison");
                return comparisonAirQuality;
            } else {
                const qweatherCurrent = await enviroments.qWeather.CurrentAirQuality(locationInfo);
                if (!qweatherCurrent.metadata.temporarilyUnavailable) {
                    Console.debug(`qweatherCurrent?.index: ${qweatherCurrent?.index}`);

                    const comparisonAirQuality = {
                        ...yesterdayQWeather,
                        metadata: getMetadata(yesterdayAirQuality.metadata.providerName, false),
                        previousDayComparison: AirQuality.CompareCategoryIndexes(qweatherCurrent.categoryIndex, yesterdayAirQuality.categoryIndex),
                    };
                    Console.info("✅ qweatherComparison");
                    return comparisonAirQuality;
                }
            }
        }

        Console.error("qweatherComparison", `无法从和风天气获取${yesterdayQWeather.metadata.temporarilyUnavailable ? "昨日" : "今日"}空气质量数据`);
        return {
            ...yesterdayQWeather,
            metadata: getMetadata(yesterdayQWeather.metadata.providerName, true),
            previousDayComparison: UNKNOWN,
        };
    };

    switch (Settings?.AirQuality?.Comparison?.Yesterday?.IndexProvider) {
        case "Calculate": {
            const algorithm = AirQuality.chooseAlogrithm(airQuality, Settings);
            const PollutantsProvider = Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider;
            Console.debug(`Settings?.AirQuality?.Comparison?.Yesterday?.PollutantsProvider: ${PollutantsProvider}`);

            if (algorithm !== "") {
                switch (PollutantsProvider) {
                    case "QWeather":
                    default: {
                        const pollutantsToAirQuality = airQuality => AirQuality.Pollutants2AQI(airQuality, Settings, { algorithm });
                        const comparisonAirQuality = await qweatherComparison(airQuality?.categoryIndex, pollutantsToAirQuality);
                        Console.info("✅ InjectComparison");
                        return comparisonAirQuality;
                    }
                }
            }

            Console.error("InjectComparison", "不支持今日空气质量的标准");
            return { metadata: { providerName: "iRingo", temporarilyUnavailable: true }, previousDayComparison: UNKNOWN };
        }
        case "QWeather": {
            const comparisonAirQuality = await qweatherComparison(isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsCN": {
            // Use injected AQI or ColorfulClouds AQI depends on data source
            const comparisonAirQuality = colorfulCloudsComparison(false, isHJ6332012(currentIndexProvider, airQuality?.scale, Settings) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
        case "ColorfulCloudsUS":
        default: {
            const comparisonAirQuality = colorfulCloudsComparison(true, isEPA454_B18007(currentIndexProvider) ? airQuality?.categoryIndex : undefined);
            Console.info("✅ InjectComparison");
            return comparisonAirQuality;
        }
    }
}

/***************** Processing *****************/
!(async () => {
    $response = await Response($request, $response);
})()
    .catch(e => Console.error(e))
    .finally(() => done($response));
