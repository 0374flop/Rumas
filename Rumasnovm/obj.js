const Bot = require('../../ddbot.js/src/bot/index');

const bot = new Bot.Bot();

const obj = {
    bot: bot,
    chat: new Bot.StandardModules.Chat(bot),
    reconnect: new Bot.StandardModules.Reconnect(bot),
    playerlist: new Bot.StandardModules.PlayerList(bot)
}

module.exports = obj;