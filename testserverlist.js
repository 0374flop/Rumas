async function getDDNetServers() {
  try {
      const response = await fetch('https://master1.ddnet.org/ddnet/15/servers.json');
      if (!response.ok) {
          throw new Error(`Ошибка при запросе: ${response.status}`);
      }
      const data = await response.json();

      const targetNick = 'tee'; 
      let found = false;
      data.servers.forEach(server => {
          server.info.clients.forEach(player => {
              if (player.name.includes(targetNick)) {
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

async function getAllDDNetServersIPv4WithPorts() {
  try {
    const response = await fetch('https://master1.ddnet.org/ddnet/15/servers.json');
    if (!response.ok) throw new Error(`Ошибка при запросе: ${response.status}`);

    const { servers } = await response.json();
    const ipv4WithPorts = [];

    for (const server of servers) {
      server.addresses.forEach(addr => {
        // ищем только IPv4 с портом
        const match = addr.match(/(\d{1,3}(\.\d{1,3}){3}:\d+)/);
        if (match) ipv4WithPorts.push(match[1]);
      });
    }

    // убираем дубли
    return [...new Set(ipv4WithPorts)];
  } catch (err) {
    console.error('Ошибка:', err.message);
    return [];
  }
}

// Использование:
const fs = require('fs');

getAllDDNetServersIPv4WithPorts().then(addresses => {
  fs.writeFileSync('servers.json', JSON.stringify(addresses, null, 2), 'utf-8');
  console.log('Список серверов сохранён в servers.txt');
});