const WebSocket = require('ws');
const {desktopSnapshot} = require('../snapshot');

const { baseAPIUrl } = require('../config');

async function initWebSocketConnection (userName) {
    const ws = new WebSocket(`${baseAPIUrl}/ws`); // Замените localhost на ваш домен или IP-адрес сервера
  
  ws.on('error', console.error);
  
  ws.on('open', function open() {
    ws.send(`wsName:${userName}`);
  });

  ws.on('close', function close() {
    console.log('WebSocket connection closed');
    setTimeout(()=>{initWebSocketConnection(userName)}, 5000);
  });
  
  ws.on('message', function message(data) {
    const msg = data.toString()
    console.log('received:', msg);
    if (msg.includes('Action')) {
      const parts = msg.split(':');
       const Action = parts[1].trim();

       switch (Action) {
        case "Snapshot":
          (async ()=> {
            await desktopSnapshot()
          })()
          break;
       
        default:
          break;
       }
    
    }
  });
  }

  module.exports = {initWebSocketConnection}