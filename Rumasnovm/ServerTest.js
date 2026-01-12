const RServer = require('./server');

const server = new RServer(3000);

server.on('connect', async (clientId, rpcServer) => {
    console.log('Новый клиент, тестируем RPC...');

    const interval = setInterval(async () => {
        const result = await rpcServer.call('bot', 'connect', ['ger.ddnet.org', 8303]);
        console.log('Result:', result);
        
        // Вариант 2: Через удобные методы
        const result2 = await server.callBot(clientId, 'say', ['Hello!']);
        console.log('Result2:', result2);
    }, 5000)
});