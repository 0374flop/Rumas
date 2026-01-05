const vm = require('vm');
const Obj = require('./Obj');

function init(send, on, exit) {
    // Создаем полностью пустой объект без прототипа
    const sandbox = Object.create(null);
    
    // Добавляем только минимально необходимое
    sandbox.console = {
        log: (...args) => console.log('[SANDBOX]', ...args),
        error: (...args) => console.error('[SANDBOX]', ...args),
        warn: (...args) => console.warn('[SANDBOX]', ...args),
    };

    sandbox.send = send;

    sandbox.on = on;

    sandbox.exitforvm = exit;

    sandbox.Obj = Obj;
    
    // Базовые конструкторы (без доступа к их прототипам)
    sandbox.Array = Array;
    sandbox.Object = Object;
    sandbox.String = String;
    sandbox.Number = Number;
    sandbox.Boolean = Boolean;
    sandbox.Math = Math;
    sandbox.Date = Date;
    sandbox.JSON = JSON;
    sandbox.isNaN = isNaN;
    sandbox.isFinite = isFinite;
    sandbox.parseInt = parseInt;
    sandbox.parseFloat = parseFloat;
    
    // Базовые ошибки
    sandbox.Error = Error;
    sandbox.RangeError = RangeError;
    sandbox.ReferenceError = ReferenceError;
    sandbox.SyntaxError = SyntaxError;
    sandbox.TypeError = TypeError;
    sandbox.URIError = URIError;
    
    return sandbox;
}

let sandbox1;

function offvm() {
    sandbox1.exitforvm('Вышел принудительно');
}

async function evalinsandbox(code, timeout = 5000, send, on, data) {
    
    try {
        sandbox1 = init(send, on, (message) => {
            throw new Error(`__EXIT MSG: ${message}__`)
        });
        
        // Создаем контекст с отключенной генерацией кода
        const context = vm.createContext(sandbox1, {
            name: 'SecureSandbox',
            codeGeneration: {
                strings: false,  // Блокируем eval()
                wasm: false      // Блокируем WebAssembly
            }
        });

        const script = new vm.Script(`
            'use strict';
            (async () => {
                try {
                    const CData = ${data}
                    ${code}
                } catch(e) {
                    if(e.message.startsWith('__EXIT MSG:')) {
                        try {exit();} catch {}
                        return;
                    }
                    throw e;
                }
            })();
        `, {
            filename: 'sandbox.js',
            displayErrors: true
        });

        const result = script.runInContext(context, {
            timeout: timeout,
            breakOnSigint: true,
            displayErrors: true
        });

        console.log('Скрипт выполнен успешно');
        return result;

    } catch (error) {
        if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
            console.error('Ошибка: Превышено время выполнения');
        } else {
            console.error('Ошибка выполнения кода:\n', error.message);
        }
        throw error;
    }
}

module.exports = { evalinsandbox, offvm };