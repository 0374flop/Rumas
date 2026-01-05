const vm = require('vm');
const { bot, teeworlds } = require('./bot');

function createSecureSandbox() {
    // Создаем полностью пустой объект без прототипа
    const sandbox = Object.create(null);
    
    // Добавляем только минимально необходимое
    sandbox.console = {
        log: (...args) => console.log('[SANDBOX]', ...args),
        error: (...args) => console.error('[SANDBOX]', ...args),
        warn: (...args) => console.warn('[SANDBOX]', ...args),
    };

    sandbox.teeworlds = teeworlds;
    sandbox.bot = bot;
    
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

async function evalinsandbox(code, timeout = 5000) {
    console.log('Код выполняется в безопасной среде...');
    
    try {
        const sandbox = createSecureSandbox();
        
        // Создаем контекст с отключенной генерацией кода
        const context = vm.createContext(sandbox, {
            name: 'SecureSandbox',
            codeGeneration: {
                strings: false,  // Блокируем eval()
                wasm: false      // Блокируем WebAssembly
            }
        });

        const script = new vm.Script(`
            'use strict';
            (() => {
                ${code}
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

module.exports = { evalinsandbox };