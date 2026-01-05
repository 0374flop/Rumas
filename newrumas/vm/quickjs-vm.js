const { getQuickJS, shouldInterruptAfterDeadline } = require('quickjs-emscripten');

const obj = require('./Obj.js');

let QuickJS;
let vm;
let objProxy;
let Prox = {
	send: '',
	on: ''
}

async function init(send, on) {
	if (!QuickJS) {
		QuickJS = await getQuickJS();

		vm = QuickJS.newContext({
			memoryLimitBytes: 50 * 1024 * 1024, // 50 МБ лимит памяти
		});

		function createProxy(obj) {
			if (typeof obj === 'function') {
				const isAsync = obj.constructor.name === 'AsyncFunction' || String(obj).includes('async');

				if (isAsync) {
					return vm.newAsyncFunction(obj.name || 'fn', async (...args) => {
						const hostArgs = args.map(vm.dump);
						const result = await obj(...hostArgs);
						return QuickJS.dumpToHandle(vm, result);
					});
				} else {
					return vm.newFunction(obj.name || 'fn', (...args) => {
						const hostArgs = args.map(vm.dump);
						const result = obj(...hostArgs);
						return QuickJS.dumpToHandle(vm, result);
					});
				}
			}

			if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
				const proxyObj = vm.newObject();
				for (const [key, value] of Object.entries(obj)) {
					const proxyValue = createProxy(value);
					vm.setProp(proxyObj, key, proxyValue);
					proxyValue.dispose();
				}
				return proxyObj;
			}

			return QuickJS.dumpToHandle(vm, obj);
		}

		objProxy = createProxy(obj);
		vm.setProp(vm.global, 'obj', objProxy);
		Prox.send = createProxy(send);
		vm.setProp(vm.global, 'send', Prox.send);
		Prox.on = createProxy(on);
		vm.setProp(vm.global, 'on', Prox.on);

		const consoleLog = vm.newFunction('log', (...args) => {
			const values = args.map(a => vm.dump(a));
			console.log('[Sandbox]:', ...values);
		});
		const consoleObj = vm.newObject();
		vm.setProp(consoleObj, 'log', consoleLog);
		vm.setProp(vm.global, 'console', consoleObj);

		consoleLog.dispose();
		consoleObj.dispose();
	}
}

/**
 * Выполняет код в безопасном sandbox.
 * @param {string} code - JavaScript-код для выполнения
 * @param {number} [timeoutMs=5000] - Таймаут выполнения в мс
 * @returns {Promise<{ result?: any, error?: string }>}
 */
async function evalinsandbox(code, timeoutMs = 5000, send, on) {
	await init(send, on);

	const deadline = Date.now() + timeoutMs;

	const result = vm.evalCode(code, undefined, {
		shouldInterrupt: shouldInterruptAfterDeadline(deadline),
	});

	if (result.error) {
		const errorDump = vm.dump(result.error);
		result.error.dispose();
		return { error: String(errorDump) };
	} else {
		const value = vm.dump(result.value);
		result.value.dispose();
		return { result: value };
	}
}

process.on('exit', () => {
	try {
		if (objProxy) objProxy.dispose();
		if (Prox.on) Prox.on.dispose()
		if (Prox.send) Prox.send.dispose()
		if (vm) vm.dispose();
	} catch (e) {
		console.error(e);
	}
});

module.exports = { evalinsandbox };