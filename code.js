const { bot } = require('ddbot.js-0374')









async function main() {
    console.log('Main started');

    const identitybot = {
        name: "Towa",
        clan: "Towa Team",
        skin: "Astolfofinho",
        use_custom_color: 1,
        color_body: 16711680,
        color_feet: 16711680,
        country: -1
    };

    const botName = await bot.createAndConnectBot('57.128.201.180:8316', 'Towa', {
        identity: identitybot,
        reconnect: true
    });

    const botClient = bot.getBotClient(botName);

    bot.on(`${botName}:connect`, () => {
        console.log(botName+'%exit');
        function startemote(botClient, Emotenumber) {
            const intervalemote = setInterval(() => {
                botClient.game.Emote(Emotenumber);
            }, 5000);
            return intervalemote;
        }

        function startnameset(botClient, bot, identitybot) {
            const intervalnameset = setInterval(() => {
                const myclientid = botClient.SnapshotUnpacker.OwnID;
                const me = bot.getPlayerList(botName).find(p => p.client_id === myclientid);

                if (!me) return;

                 if (me.name !== identitybot.name) {
                    botClient.game.ChangePlayerInfo({ ...identitybot, name: identitybot.name });
                }
            }, 10000);
            return intervalnameset;
        }
        
        let sync = false;
        let intervalemote = startemote(botClient, 2);
        let intervalnameset = startnameset(botClient, bot, identitybot);

        async function startchatlistener(bot, botName) {
            const lastMessages = new Map();
            bot.on(`${botName}:message`, (msg) => {
                if (!msg || typeof msg.message !== 'string') {
                    return;
                }

                const text = msg.message.trim();
                const clientId = msg.client_id;
                const team = msg.team;
                const key = `${clientId}:${team}:${text}`;
                const now = Date.now();

                const utilisateur = msg.utilisateur?.InformationDuBot;
                let autormsg = utilisateur?.name;
                const lastMessage = lastMessages.get(key);
                if (lastMessage && now - lastMessage.timestamp < 100) {
                    return;
                }

                lastMessages.set(key, { timestamp: now });

                setTimeout(() => {
                    for (const [k, v] of lastMessages) {
                        if (now - v.timestamp > 1000) {
                            lastMessages.delete(k);
                        }
                    }
                }, 10000);

                let client_id = msg.client_id;
                if (client_id === -1) {
                    autormsg = "system";
                }
                console.log(`'${autormsg}' : ${text}`);

                if (text.includes(identitybot.name)) {
                    if (text.includes('%syncE')) {
                        sync = true;
                        if (intervalemote) clearInterval(intervalemote);
                        intervalemote = startemote(botClient, 2);
                    } if (text.includes('%exit')) {
                        exit();
                    }
                }
            });
        }

        startchatlistener(bot, botName);

        bot.on(`${botName}:disconnect`, () => {
            clearInterval(intervalemote);
            clearInterval(intervalMove);
            clearInterval(intervalnameset);
        });

        function findbot2(botName, identitybot) {
            const players = bot.getPlayerList(botName);

            return players.some(player =>
                player.clan === identitybot.clan &&
                player.skin === identitybot.skin &&
                player.name.includes(identitybot.name) &&
                player.name !== identitybot.name
            );
        }
        
        setInterval(() => {
            console.log(sync)
            if (findbot2(botName, identitybot) && !sync) {
                botClient.game.Say(botName+'%syncE');
            } if (!findbot2(botName, identitybot)) {
                sync = false;
            }
        }, 20000);
    });

    let x = 100;
    let direction = -1;
    const intervalMove = setInterval(() => {
        x += direction * 10;
        if (x <= -100) {
            direction = 1;
        } else if (x >= 100) {
            direction = -1;
        }
        if (bot.isBotConnected(botName) && bot.isFreezeBot(botName)) {
            if (botClient && botClient.movement) {
                botClient.movement.FlagHookline(true);
                setTimeout(() => {
                    botClient.movement.FlagHookline(false);
                }, Math.random() * 50);
                botClient.movement.SetAim(x, -100);
            }
        }
    }, Math.random() * 100);

    async function SayChat(message) {
        botClient.game.Say(message);
    }
}

main();