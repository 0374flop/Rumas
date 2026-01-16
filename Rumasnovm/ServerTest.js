const { RServer, createRPCProxy } = require('./server');

const server = new RServer(3000, true);

server.on('connect', async (clientId, rpcServer) => {
    console.log('Новый клиент, тестируем RPC...');

    try {
        const response = await server.getBotProperty(clientId, 'identity', []);
        console.log(`Ответ от клиента ${clientId}:`, response);

        const chatProxy = createRPCProxy(rpcServer, 'chat');
        const botProxy = createRPCProxy(rpcServer, 'bot');
        const identity = await botProxy.identity.get();
        console.log(`Ответ от клиента ${clientId} через Proxy:`, identity);

        await botProxy.connect.call('26.230.124.233', 8303).catch(err => {
            console.error(`Ошибка при вызове connect у клиента ${clientId}:`, err.message);
            return;
        });
        await chatProxy.send.call('1234');
        console.log('connect');

        rpcServer.on('obj.chat', 'chat', (msg) => {
            const [ msgraw, author, text ] = msg;
            console.log(author, text);
        });
        rpcServer.on('obj.chat', 'systemchat', (msg) => {
            const [ msgraw, text ] = msg;
            console.log("***", text);
        });
        chatProxy.start.call();

        process.stdin.on('data', async (data) => {
            const command = data.toString().trim();
            if (command === 'exit') {
                console.log('exit');
                await botProxy.disconnect.call().catch(err => {
                    console.error(`Ошибка при вызове disconnect у клиента ${clientId}:`, err);
                });
                return;
            }
            chatProxy.send.call(command).catch(err => {
                console.error(`Ошибка при вызове RPC у клиента ${clientId}:`, err);
                return;
            });
        });

    } catch (err) {
        console.error(`Ошибка при вызове RPC у клиента ${clientId}:`, err.message);
    }
});
