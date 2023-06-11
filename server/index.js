const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const binDB = require('./binance')
const BinanceDB = new binDB()
async function getAccountBalances() {
  try {
    const accountInfo = await client.accountInfo()

    const balances = accountInfo.balances.filter(balance => parseFloat(balance.free) > 0)
    return balances
  } catch (error) {
    console.error(error)
  }
}
async function getAccountBalancesInUSDT() {
  const result = [];

  try {
    const accountInfo = await client.accountInfo();
    const balances = accountInfo.balances.filter(balance => parseFloat(balance.free) > 0);

    for (const balance of balances) {
      if (balance.asset === 'USDT') {
        result.push({
          asset: balance.asset,
          free: balance.free,
          locked: balance.locked,
          balanceInUSDT: balance.free,
        });
      } else {
        try {
          const symbol = `${balance.asset}USDT`;
          const price = await client.prices({ symbol });
          const balanceInUSDT = parseFloat(balance.free) * parseFloat(price[symbol]);

          result.push({
            asset: balance.asset,
            free: balance.free,
            locked: balance.locked,
            balanceInUSDT: balanceInUSDT.toFixed(2),
          });
        } catch (error) {
          console.log(`Could not fetch price for ${balance.asset}, might not be traded directly against USDT.`);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }

  return result;
}
const app = express();
const s = require('./server');
const SERVER = new s()
const server = http.createServer(app);

global.io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

global.io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('message', {method:'lastFivePredictions',data:{lastFivePredictions:BinanceDB.lastFivePredictions,symbols:BinanceDB.symbols}});
  for (const symbol in BinanceDB.LAST_CANDL) {
    io.emit('message', {method:'streamKlineCourse',data:{candle:BinanceDB.LAST_CANDL[symbol]}});
  }


  socket.on('message', async (message) => {
    // console.log(message)
    switch (message.method){
      case 'updateCourse':
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{}});
        await BinanceDB.parsePairData(socket)
        break;
      case 'getBalanceBinance':
        let balance = await BinanceDB.getBalance()
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{balance}});
        break;
      case 'getCurrency':
        let pair = await BinanceDB.getCurrency()
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{pair}});
        break;
      case 'getHistory':
        let history = await BinanceDB.getHistory(message.data)
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{history}});
        break;
      case 'createOrder':
        let createOrder = await BinanceDB.createOrder(message.data)
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{createOrder}});
        break;
      case 'getOrders':
        let orders = await BinanceDB.getOrders(message.data)
        socket.emit('message', {method:message.method,requestId:message.requestId,data:{orders}});
        break;
    }
    // socket.broadcast.emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`Listening on port ${port}`));
