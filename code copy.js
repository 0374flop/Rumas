const bot = require('./src/bot/index');









const identitybot = {
    name: "Towa",
    clan: "Towa Team",
    skin: "Astolfofinho",
    use_custom_color: 1,
    color_body: 16711680,
    color_feet: 16711680,
    country: -1
};

async function connectToServer(serverIp) {
    const botName = await bot.createAndConnectBot(serverIp, identitybot.name, {
        identity: identitybot,
        reconnect: true
    });
    const botClient = bot.getBotClient(botName);

    bot.on(`${botName}:connect`, () => {
        console.log(`${botName} connected to ${serverIp}`);

        let sync = false;

        // Эмоты
        function startemote() {
            return setInterval(() => botClient.game.Emote(2), 5000);
        }
        let intervalemote = startemote();

        // Смена имени
        function startnameset() {
            return setInterval(() => {
                const myclientid = botClient.SnapshotUnpacker.OwnID;
                const me = bot.getPlayerList(botName).find(p => p.client_id === myclientid);
                if (!me) return;
                if (me.name !== identitybot.name) {
                    botClient.game.ChangePlayerInfo({ ...identitybot, name: identitybot.name });
                }
            }, 10000);
        }
        let intervalnameset = startnameset();

        // Чат
        bot.on(`${botName}:message`, (msg) => {
            if (!msg || typeof msg.message !== 'string') return;
            const text = msg.message.trim();
            const client_id = msg.client_id;
            let autormsg = msg.utilisateur?.InformationDuBot?.name || "system";

            console.log(`'${autormsg}' : ${text}`);

            if (text.includes(identitybot.name)) {
                if (text.includes('%syncE')) {
                    sync = true;
                    clearInterval(intervalemote);
                    intervalemote = startemote();
                }
                if (text.includes('%exit')) process.exit();
            }
        });

        // Поиск второго бота
        function findbot2() {
            const players = bot.getPlayerList(botName);
            return players.some(player =>
                player.clan === identitybot.clan &&
                player.skin === identitybot.skin &&
                player.name.includes(identitybot.name) &&
                player.name !== identitybot.name
            );
        }

        setInterval(() => {
            if (findbot2() && !sync) botClient.game.Say(botName + '%syncE');
            if (!findbot2()) sync = false;
        }, 20000);

        // Движение
        let x = 100;
        let direction = -1;
        const intervalMove = setInterval(() => {
            x += direction * 10;
            if (x <= -100) direction = 1;
            if (x >= 100) direction = -1;
            if (bot.isBotConnected(botName) && bot.isFreezeBot(botName)) {
                if (botClient && botClient.movement) {
                    botClient.movement.FlagHookline(true);
                    setTimeout(() => botClient.movement.FlagHookline(false), Math.random() * 50);
                    botClient.movement.SetAim(x, -100);
                }
            }
        }, Math.random() * 100);

        bot.on(`${botName}:disconnect`, () => {
            clearInterval(intervalemote);
            clearInterval(intervalnameset);
            clearInterval(intervalMove);
        });
    });
}

// **Автоматическое подключение ко всем серверам**
async function main() {
    console.log('Main started');
    servers.forEach(server => connectToServer(server));
}

main();