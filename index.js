const vm = require('vm');
const { bot } = require('./src/bot/index');
const EventEmitter = require('events');

function createSandbox(ws) {
    const emitter = new EventEmitter();

    ws.on('message', (msg) => {
        if (isValidCode(msg)) return;
        emitter.emit('serverMessage', msg);
    });

    return {
        bot,
        sendMessage: (msg) => {
            ws.send(msg);
        },
        serverEvents: {
            on: (event, handler) => {
                if (event === 'message') {
                    emitter.on('serverMessage', handler);
                }
            },
            off: (event, handler) => {
                if (event === 'message') {
                    emitter.off('serverMessage', handler);
                }
            }
        },

        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Boolean,
        Number,
        String,
        Array,
        Object,
        Math,
        Date,
        Error,
        RangeError,
        ReferenceError,
        SyntaxError,
        TypeError,
        URIError,
        isNaN,
        isFinite,
        JSON,
    };
}

async function evalinsandbox(code, ws) {
    console.log('код выполняеться')
    try {
        const sandbox = createSandbox(ws);
        const context = vm.createContext(sandbox)
        const script = new vm.Script(`
            (async () => {
                ${code}  // Пользовательский код выполняется первым

                // Добавляем listener для удалённой остановки (ждёт бесконечно, пока не придёт команда)
                await new Promise((resolve) => {
                    if (typeof serverEvents !== 'undefined') {
                        serverEvents.on('message', async (msg) => {
                            try {
                                const data = JSON.parse(msg);
                                if (data.type === 'command' && data.vm_send === 'stop_script') {
                                    console.log('Получена команда на остановку скрипта. Отключаем ботов...');
                                    // Отключаем всех ботов graceful (если bot доступен и боты созданы)
                                    if (bot && bot.botCore && bot.botCore.botManager) {
                                        await bot.botCore.botManager.disconnectAllBots();
                                    }
                                    console.log('Боты отключены. Скрипт завершается.');
                                    resolve();  // Завершаем промис, чтобы скрипт вышел
                                }
                            } catch (e) {
                                // Игнорируем не-JSON или ошибки
                                console.log('Ошибка в обработке сообщения для остановки:', e);
                            }
                        });
                    } else {
                        console.log('serverEvents не доступен для остановки!');
                        resolve();  // Если нет serverEvents, просто продолжаем (fallback)
                    }
                });
            })();
        `);
        await script.runInContext(context);
    } catch (error) {
        console.log("ошибка выполнения кода : \n'\n" + error + "\n'")
    }
}

function isValidCode(str) {
    try {
        new vm.Script(str);
        return true;
    } catch {
        return false;
    }
}

function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

module.exports = { evalinsandbox, isValidCode, isJSON };