const WebSocket = require('ws');

const ws = new WebSocket('wss://streaming.forexpros.com/echo/431/9bm0u8b2/websocket'); // Замените на ваш WebSocket URL

ws.on('open', function open() {
  const message = JSON.stringify({
    type: 'myMessageType',
    data: 'myMessageData'
  });
  // ws.send('["{\\"_event\\":\\"bulk-subscribe\\",\\"tzID\\":8,\\"message\\":\\"pid-0:%%pid-1:%%isOpenExch-1002:%%pid-2186:%%isOpenExch-40:%%pid-1691:%%isOpenExch-1001:%%pid-2:%%pid-18:%%pid-3:%%pid-5:%%pid-252:%%isOpenExch-2:%%pid-6408:%%pid-6369:%%pid-7888:%%isOpenExch-1:%%pid-284:%%isOpenExch-3:%%pid-9251:%%isOpenExch-4:%%pid-396:%%isOpenExch-9:%%pid-8830:%%isOpenExch-1004:%%pid-8836:%%pid-8833:%%pid-8849:%%pid-8883:%%pid-8831:%%pid-8910:%%pid-13665:%%pid-13666:%%pid-172:%%pid-27:%%pid-166:%%pid-169:%%pid-178:%%isOpenExch-20:%%pid-1175153:%%isOpenExch-152:%%pid-8827:%%pid-13711:%%pid-13684:%%pid-13683:%%pid-13689:%%pid-102063:%%pid-13994:%%pid-8862:%%pid-9:%%pid-7805:%%pid-7802:%%pid-7800:%%pid-7806:%%pid-7808:%%pid-7801:%%pid-7803:%%pid-7810:%%pid-7804:%%isOpenExch-7:%%pid-7809:%%isOpenExch-11:%%pid-7812:%%isOpenExch-6:%%pid-7811:%%isOpenExch-5:%%pid-7813:%%pid-7807:%%isOpenExch-18:%%pid-7814:%%isOpenExch-21:\\"}"]');
  ws.send('["{\\"_event\\":\\"bulk-subscribe\\",\\"tzID\\":18,\\"message\\":\\"pid-eu-1057391:%%pidExt-eu-1057391:\\"}"]');
});

ws.on('message', function incoming(message) {
  message = message.toString()
  if (message=='o'){
    return
  }
  // Убираем 'a[' с начала и ']' с конца
  message = message.slice(2, -1);

  while (true) {
    try {
      message = JSON.parse(message);
    } catch (e) {
      break;
    }
  }
  let innerMessage = JSON.parse(message.message.split('::')[1]);

  console.log(innerMessage);
});
