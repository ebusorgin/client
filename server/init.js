const Binance = require('binance-api-node').default;
var stackTrace = require('callsite');

console.log = function() {
  var stack = stackTrace();
  var file = stack[1].getFileName();
  var line = stack[1].getLineNumber();

  var args = Array.prototype.slice.call(arguments);
  args.unshift('[' + file + ':' + line + ']');

  console.info.apply(console, args);
};

const BALANCES = {
  btc:0.00036742,
  eth:0.00533924,
  usdt:10.43,
  dot:1.88331359
}

const client = Binance({
  apiKey: 'uAZfNvppgt1HvDtstQLLfFVLqcbbBbZhjv3khtxllBVpuyFKZFk4q774SRxHsCL3',
  apiSecret: '2c05KciBkkUec7NKdYd7p0H1MuKHVxL6SG9NCTvWXQDpAn5GHnvUiOtkonPii666',
})
function trackPrices(symbols) {
  symbols.forEach(symbol => {
    const ws = client.ws.candles(symbol, '1m', candle => {
      console.log(candle)
      if (candle.isFinal) {
        console.log(`${symbol}`,candle);
      }
    });
  });
}

// Используйте этот метод для отслеживания цен на несколько валют:
trackPrices(['btcusdt', 'ethusdt', 'bnbusdt']);
