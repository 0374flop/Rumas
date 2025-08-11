async function main() {
    const botName = await bot.botCore.botManager.createAndConnectBot('45.141.57.31:8308', 'Towa', {
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
  
    await new Promise((resolve) => {
      if (typeof serverEvents !== 'undefined') {
        serverEvents.on('message', async (msg) => {
          try {
            const data = JSON.parse(msg);
            if (data.vm_send === 'exit') {
              await bot.botCore.botManager.disconnectAllBots();
              resolve();
            }
          } catch {
            // не JSON — игнорируем
          }
        });
      } else {
        console.log("serverEvents не доступен в песочнице!");
        resolve();
      }
    });
  
    return botName;
  }
  
main();  