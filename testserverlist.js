async function getDDNetServers() {
  try {
      const response = await fetch('https://master1.ddnet.org/ddnet/15/servers.json');
      if (!response.ok) {
          throw new Error(`Ошибка при запросе: ${response.status}`);
      }
      const data = await response.json();

      const targetNick = '0374_bober'; 
      let found = false;
      data.servers.forEach(server => {
          server.info.clients.forEach(player => {
              if (player.name === targetNick) {
                  console.log(`\nНашёл ${targetNick} на сервере ${server.info.name} (${server.addresses[0]}), карта: ${server.info.map.name}`);
                  found = true;
              }
          });
      });
      if (!found) {
          console.log(`\nИгрок ${targetNick} не найден.`);
      }
  } catch (error) {
      console.error('Ошибка:', error);
  }
}

// Запускаем
getDDNetServers();