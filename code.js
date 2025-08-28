const bot = require('./src/bot/index')









bot.createAndConnectBot('45.141.57.31:8308', 'Towa', {
    identity: {
        name: "Towa",
        clan: "Towa Team",
        skin: "Astolfofinho",
        use_custom_color: 1,
        color_body: 16711680,
        color_feet: 16711680,
        country: -1
    },
    reconnect: true
});
const botName = "Towa1"

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

    const lastMessage = lastMessages.get(key);
    if (lastMessage && now - lastMessage.timestamp < 100) {
        return;
    }

    lastMessages.set(key, { timestamp: now });

    const utilisateur = msg.utilisateur?.InformationDuBot;
    let autormsg = utilisateur?.name || "system";
    const trueMessage = `'${autormsg}' : ${text}`; 
    const jsonMessage = JSON.stringify({
        type: 'ingamemessage',
        msg: msg,
        message: trueMessage
    })
    console.log(trueMessage);
    sendMessage(jsonMessage);

    setTimeout(() => {
        for (const [k, v] of lastMessages) {
            if (now - v.timestamp > 1000) {
                lastMessages.delete(k);
            }
        }
    }, 10000);
});

bot.on(`${botName}:connect`, () => {
    sendMessage(JSON.stringify({
        type: 'ingameconnection'
    }));
});