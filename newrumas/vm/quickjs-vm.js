// vm-quickjs.js
const { getQuickJS } = require('quickjs-emscripten');

let QuickJS = null;

async function initQuickJS() {
    if (!QuickJS) {
        QuickJS = await getQuickJS();
    }
    return QuickJS;
}

async function evalinsandbox(code, timeout = 5000) {
    console.log('Код выполняется в QuickJS sandbox...');
    
    try {
        const QuickJS = await initQuickJS();
        const vm = QuickJS.newContext();
        
        // Добавляем console.log
        const logHandle = vm.newFunction("log", (...args) => {
            const nativeArgs = args.map(handle => vm.dump(handle));
            console.log('[SANDBOX]', ...nativeArgs);
        });
        
        const consoleHandle = vm.newObject();
        vm.setProp(consoleHandle, "log", logHandle);
        vm.setProp(vm.global, "console", consoleHandle);
        
        consoleHandle.dispose();
        logHandle.dispose();
        
        // Создаем timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
                vm.dispose();
                reject(new Error('Превышено время выполнения'));
            }, timeout)
        );
        
        // Выполняем код
        const execPromise = new Promise((resolve, reject) => {
            try {
                const result = vm.evalCode(code);
                
                if (result.error) {
                    const errorMsg = vm.dump(result.error);
                    result.error.dispose();
                    vm.dispose();
                    reject(new Error(errorMsg));
                } else {
                    const value = vm.dump(result.value);
                    result.value.dispose();
                    vm.dispose();
                    resolve(value);
                }
            } catch (err) {
                vm.dispose();
                reject(err);
            }
        });
        
        const result = await Promise.race([execPromise, timeoutPromise]);
        
        console.log('✓ Скрипт выполнен успешно');
        return result;
        
    } catch (error) {
        if (error.message.includes('Превышено время')) {
            console.error('✗ Ошибка: Превышено время выполнения');
        } else {
            console.error('✗ Ошибка выполнения:\n', error.message);
        }
        throw error;
    }
}

module.exports = { evalinsandbox };