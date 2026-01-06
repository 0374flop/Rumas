const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

let currentWorker = null;

function offvm() {
    if (currentWorker) {
        currentWorker.terminate();
        currentWorker = null;
        console.log('Worker принудительно завершен');
    }
}

async function evalinsandbox(code, timeout = 5000, send, on, data) {
    return new Promise((resolve, reject) => {
        const workerCode = `
            const { parentPort, workerData } = require('worker_threads');
            const vm = require('vm');
            const Obj = require('./Obj');

            let onHandler = null;

            const sandbox = Object.create(null);
            
            sandbox.console = {
                log: (...args) => {
                    console.log('[SANDBOX]', ...args);
                    parentPort.postMessage({ type: 'log', args: args.map(a => String(a)) });
                },
                error: (...args) => {
                    console.error('[SANDBOX]', ...args);
                    parentPort.postMessage({ type: 'error', args: args.map(a => String(a)) });
                },
                warn: (...args) => {
                    console.warn('[SANDBOX]', ...args);
                    parentPort.postMessage({ type: 'warn', args: args.map(a => String(a)) });
                },
            };

            sandbox.send = (msg) => {
                parentPort.postMessage({ type: 'send', data: msg });
            };
            
            sandbox.on = (handler) => {
                console.log('[SANDBOX] on() вызван, регистрируем handler');
                onHandler = handler;
                // Сообщаем родителю, что handler зарегистрирован
                parentPort.postMessage({ type: 'handler_registered' });
            };
            
            sandbox.exitforvm = (message = 'пусто') => {
                console.log('[SANDBOX] exitforvm вызван:', message);
                parentPort.postMessage({ type: 'exitbot', message });
                process.exit(0);
            };
            
            sandbox.Obj = Obj;
            sandbox.Array = Array;
            sandbox.Object = Object;
            sandbox.String = String;
            sandbox.Number = Number;
            sandbox.Boolean = Boolean;
            sandbox.Math = Math;
            sandbox.Date = Date;
            sandbox.JSON = JSON;
            sandbox.Promise = Promise;
            sandbox.setTimeout = setTimeout;
            sandbox.setInterval = setInterval;
            sandbox.clearTimeout = clearTimeout;
            sandbox.clearInterval = clearInterval;
            sandbox.isNaN = isNaN;
            sandbox.isFinite = isFinite;
            sandbox.parseInt = parseInt;
            sandbox.parseFloat = parseFloat;
            sandbox.Error = Error;
            sandbox.RangeError = RangeError;
            sandbox.ReferenceError = ReferenceError;
            sandbox.SyntaxError = SyntaxError;
            sandbox.TypeError = TypeError;
            sandbox.URIError = URIError;

            // Обработка сообщений от родителя
            parentPort.on('message', (msg) => {
                console.log('[WORKER] Получено сообщение:', msg.type);
                if (msg.type === 'call_on' && onHandler) {
                    console.log('[WORKER] Вызываем onHandler с данными:', msg.data);
                    try {
                        onHandler(msg.data);
                    } catch(e) {
                        console.error('[WORKER] Error in on handler:', e);
                    }
                } else if (msg.type === 'call_on' && !onHandler) {
                    console.warn('[WORKER] onHandler не зарегистрирован!');
                }
            });
            
            const context = vm.createContext(sandbox, {
                name: 'SecureSandbox',
                codeGeneration: {
                    strings: false,
                    wasm: false
                }
            });

            (async () => {
                try {
                    const CData = workerData.data;
                    const userCode = workerData.code;
                    
                    const script = new vm.Script(\`
                        'use strict';
                        (async () => {
                            try {
                                const CData = \${JSON.stringify(CData)};
                                \${userCode}
                            } catch(e) {
                                if(e.message.startsWith('__EXIT MSG:')) {
                                    console.log('Exit caught:', e.message);
                                    exitforvm(e.message);
                                    return;
                                }
                                throw e;
                            }
                        })();
                    \`, {
                        filename: 'sandbox.js',
                        displayErrors: true
                    });

                    const result = await script.runInContext(context, {
                        displayErrors: true
                    });

                    await result;
                    
                    parentPort.postMessage({ type: 'success', result: 'completed' });
                } catch (error) {
                    console.error('Worker error:', error);
                    parentPort.postMessage({ 
                        type: 'error', 
                        error: error.message,
                        stack: error.stack 
                    });
                }
            })();
        `;

        const workerPath = path.join(__dirname, `worker-${Date.now()}.js`);
        fs.writeFileSync(workerPath, workerCode);

        currentWorker = new Worker(workerPath, {
            workerData: { code, data }
        });

        const timeoutId = setTimeout(() => {
            console.log('Timeout reached, terminating worker');
            if (currentWorker) {
                currentWorker.terminate();
                currentWorker = null;
            }
            try { fs.unlinkSync(workerPath); } catch(e) {}
            reject(new Error('ERR_SCRIPT_EXECUTION_TIMEOUT'));
        }, timeout);

        // Обработка сообщений от воркера
        currentWorker.on('message', (msg) => {
            console.log('Получено сообщение от воркера:', msg.type);
            
            switch(msg.type) {
                case 'log':
                    console.log('[SANDBOX]', ...msg.args);
                    break;
                case 'error':
                    console.error('[SANDBOX]', ...msg.args);
                    break;
                case 'warn':
                    console.warn('[SANDBOX]', ...msg.args);
                    break;
                case 'send':
                    send(msg.data);
                    break;
                case 'handler_registered':
                    console.log('Handler зарегистрирован в воркере');
                    break;
                case 'exitbot':
                    console.log('Exit запрошен:', msg.message);
                    clearTimeout(timeoutId);
                    if (currentWorker) {
                        currentWorker.terminate();
                        currentWorker = null;
                    }
                    try { fs.unlinkSync(workerPath); } catch(e) {}
                    resolve({ exited: true, message: msg.message });
                    break;
                case 'success':
                    console.log('Код выполнен успешно');
                    clearTimeout(timeoutId);
                    currentWorker = null;
                    try { fs.unlinkSync(workerPath); } catch(e) {}
                    resolve(msg.result);
                    break;
                case 'error':
                    console.error('Ошибка в воркере:', msg.error);
                    clearTimeout(timeoutId);
                    currentWorker = null;
                    try { fs.unlinkSync(workerPath); } catch(e) {}
                    reject(new Error(msg.error));
                    break;
            }
        });

        currentWorker.on('error', (error) => {
            console.error('Worker error event:', error);
            clearTimeout(timeoutId);
            currentWorker = null;
            try { fs.unlinkSync(workerPath); } catch(e) {}
            reject(error);
        });

        currentWorker.on('exit', (code) => {
            console.log('Worker завершен с кодом:', code);
            clearTimeout(timeoutId);
            if (code !== 0 && currentWorker) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
            currentWorker = null;
            try { fs.unlinkSync(workerPath); } catch(e) {}
        });

        // ВАЖНО: Подписываемся на внешний on и передаем данные В воркер
        const originalOnCallback = on;
        
        // Переопределяем поведение - теперь когда вызывается внешний on,
        // мы отправляем данные В воркер
        const onInterceptor = (callback) => {
            console.log('Внешний on() подписан, перехватываем вызовы');
            originalOnCallback((data) => {
                console.log('Получены данные через внешний on, отправляем в воркер:', data);
                if (currentWorker) {
                    currentWorker.postMessage({ type: 'call_on', data });
                }
                // Также вызываем оригинальный callback если нужно
                callback(data);
            });
        };
        
        // Если on - это функция подписки
        if (typeof on === 'function') {
            on((data) => {
                console.log('Внешний on получил данные, отправляем в воркер:', data);
                if (currentWorker) {
                    currentWorker.postMessage({ type: 'call_on', data });
                }
            });
        }
    });
}

module.exports = { evalinsandbox, offvm };

// етот мусор не работает