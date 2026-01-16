const { DefaultIdentity } = require('../bot/core/ddutils');
const { RServer } = require('./server');
const ConroleBot = require('../../всякое/aiddbot/changesinput/controlebot');

const server = new RServer(3000, true);

let [address, port] = '45.141.57.22:8309'.split(':');
port = parseInt(port, 10);

server.on('connect', async (clientId) => {
    console.log(`Клиент подключен: ${clientId}`);
    server.createBot(clientId, [
        {
            name: "icewas",
            clan: "",
            skin: "cursemoji",
            use_custom_color: 0,
            color_body: 0,
            color_feet: 0,
            country: 804
        },
        {

        }
    ]);
    server.once("bot_created", (id, Id) => {
        let botId = Id;
        server.subscribeToAllBotEvents(clientId, botId);
        server.connectBot(id, botId, address, port);
        const send_input = (input) => {
            server.sendInputToBot(clientId, botId, input);
        };
        const controlebot = new ConroleBot(send_input);
        
        server.on("bot_" + botId + ":connect", () => {
            console.log(`Бот ${botId} для клиента ${clientId} подключился к игровому серверу.`);
            controlebot.StartServer(3001);
        });
        server.on("bot_" + botId + ":disconnect", () => {
            controlebot.StopServer();
            console.log(`Бот ${botId} для клиента ${clientId} отключился от игрового сервера.`);
        });
        setTimeout(() => {
            server.disconnectBot(clientId, botId);
        }, 60000);
        /*setInterval(() => {
            send_input({
                m_Fire: 1
            });
            send_input({
                m_Fire: 0
            });
        }, 1500);*/
        process.on('SIGINT', () => {
            server.disconnectBot(clientId, botId);
            controlebot.StopServer();
            process.exit();
        });
    });
});