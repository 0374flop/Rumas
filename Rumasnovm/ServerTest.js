const { RServer, createRPCProxy } = require('./server');

const server = new RServer(3000, true);

server.on('connect', async (clientId, rpcServer) => {
    console.log('Новый клиент, тестируем RPC...');

    const result = await rpcServer.call('bot', 'connect', ['ger.ddnet.org', 8303]);
    console.log('Result:', result);
    
    // Вариант 2: Через удобные методы
    const result2 = await server.callBot(clientId, 'say', ['Hello!']);
    console.log('Result2:', result2);

    const bot = createRPCProxy(rpcServer, 'bot');

    bot.say('Hello from proxy!').then(res => {
        console.log('Proxy call result:', res);
    }).catch(err => {
        console.error('Proxy call error:', err);
    });
});
