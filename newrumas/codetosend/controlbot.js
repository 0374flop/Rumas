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

    const botName = await Obj.bot.bot.createBot(CData.address, 'Towa', {
        identity: identitybot,
        reconnect: true,
        reconnectAttempts: -1,
        randreconnect: true
    });

    Obj.bot.bot.connectBot(botName); // подкюлчаем

    const botClient = Obj.bot.bot.getBotClient(botName); // получаем оригинальный клиент teeworlds

    async function exit() {
        await Obj.bot.bot.disconnectAllBots(); // отключаем всех ботов
        Obj.bot.bot.removeAllListeners();
        console.log('БОТА ОТКЛЮЧИЛО')
        exitforvm();
    }

    on((message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'exitbot') exit();
            if (msg.input) botClient.movement.input = msg.input;
        } catch {
            console.log('aaaAAaaAa');
        }
    })
}

main()