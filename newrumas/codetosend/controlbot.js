// const { bot } = require("ddbot.js-0374");

async function main() {

    const identitybot = {
        name: "Towa",
        clan: "Towa Team",
        skin: "Astolfofinho",
        use_custom_color: 1,
        color_body: 16711680,
        color_feet: 16711680,
        country: 804
    };

    const botName = await Obj.bot.bot.createBot('26.230.124.233:8303', 'Towa', {
        identity: identitybot,
        reconnect: true,
        reconnectAttempts: -1,
        randreconnect: true
    });

    Obj.bot.bot.connectBot(botName); // подкюлчаем

    const botClient = Obj.bot.bot.getBotClient(botName); // получаем оригинальный клиент teeworlds

    // Подписка на событие подключения
    Obj.bot.bot.on(`${botName}:connect`, () => {
        let timemsg = 0; // время

        // подписка на чат
        Obj.bot.bot.on(`${botName}:ChatNoSystem`, (msgraw, autormsg, text, team, client_id) => {
            console.log(`${client_id} ${team} '${autormsg}' : ${text}`); // вывод чата в консоль
            if (text == 'exit') exit(); // выход

            // Эхо-логика
            if (Date.now() - timemsg > 6000) {
                timemsg = Date.now(); // устанавливаем текущее время
                if (text && autormsg) {
                    botClient.game.Say(`${autormsg}: ${text}`); // отправка сообения (teeworlds)
                }
            }
        });
    });

    // Выход через Ctrl+C
    async function exit() {
        await bot.bot.disconnectAllBots(); // отключаем всех ботов
        Obj.bot.bot.removeAllListeners();
    }

    on((message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'exitbot') exit()
        } catch {
            console.log('aaaAAaaAa');
        }
    })
}

main()