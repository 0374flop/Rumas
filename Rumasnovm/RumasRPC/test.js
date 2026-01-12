const { ClientRPC, ServerRPC } = require('./RPC');

const EventEmitter = require('events');

class MyObject extends EventEmitter {
    constructor() {
        super();
        this.data = {};
    }
    
    setData(key, value) {
        this.data[key] = value;
        this.emit('dataChanged', { key, value });
        return { success: true };
    }
    
    getData(key) {
        return this.data[key];
    }
}

// Буферы для связи
let bufferStoC = [];
let bufferCtoS = [];

// Создаём тестовый объект (вместо ddbot)
const testBot = {
    name: 'TestBot',
    connect: async (host, port) => {
        console.log(`[BOT] Connecting to ${host}:${port}`);
        return true;
    },
    say: async (text) => {
        console.log(`[BOT] Saying: ${text}`);
        return 'Message sent!';
    },

    class: new MyObject()
};

// CLIENT
const client = new ClientRPC(
    (data) => bufferCtoS.push(data),
    (callback) => setInterval(() => {
        while (bufferStoC.length) callback(bufferStoC.shift());
    }, 10)
);
client.register('bot', testBot);
client.bind();

// SERVER
const server = new ServerRPC(
    (data) => bufferStoC.push(data),
    (callback) => setInterval(() => {
        while (bufferCtoS.length) callback(bufferCtoS.shift());
    }, 10)
);

// Ждём подключения и тестируем
setTimeout(async () => {
    console.log('=== Testing RPC ===');
    
    const result1 = await server.call('bot', 'connect', ['ger.ddnet.org', 8303]);
    console.log('Result 1:', result1);
    
    const result2 = await server.call('bot', 'say', ['Hello world!']);
    console.log('Result 2:', result2);

    const result3 = await server.get('bot', 'name')
    console.log('Result 3:', result3)

    server.on('bot.class', "dataChanged", (data) => {
        console.log('hui.', data)
    });

    const result4 = await server.call('bot', 'class.setData', ['key1', 'value1']);
    console.log('Result 4:', result4);
}, 500);