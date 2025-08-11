const vm = require('vm');
const bot = require('./src/bot/index');
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
    try {
        const sandbox = createSandbox(ws);
        const context = vm.createContext(sandbox)
        const script = new vm.Script(`(async () => { ${code} })()`);
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