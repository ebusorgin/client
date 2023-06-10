const Binance_candlesticks = require('node-binance-api');
const axios = require('axios')
const db = require('./db');
const createDataset = require('./predictbinance').createDataset;
const getData = require('./predictbinance').getData;
const calculateIndicatorsEMA = require('./predictbinance').calculateIndicatorsEMA;
const calculateIndicatorsRSI = require('./predictbinance').calculateIndicatorsRSI;
require('./predictbinance')
const main = require('./predictbinance').main;
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const Binance = require('binance-api-node').default
// Аутентификация
const client = Binance({
  apiKey: 'uAZfNvppgt1HvDtstQLLfFVLqcbbBbZhjv3khtxllBVpuyFKZFk4q774SRxHsCL3',
  apiSecret: '2c05KciBkkUec7NKdYd7p0H1MuKHVxL6SG9NCTvWXQDpAn5GHnvUiOtkonPii666',
})
const FEATURES = ['close', 'volume','quote_asset_volume','ema_12','ema_24','ema_36','ema_72','ema_288','rsi_12','rsi_24','rsi_36','rsi_72','rsi_288'];

class BinanceDB {
  PAIRS = []
  model
    constructor() {
        this.DB = new db();
        this.binance = new Binance_candlesticks();
        this.create().then(r => {})
    }
  async create() {
    await this.parsePairData()
    await this.loadModel()
    await this.trackPrices()
    await this.loadDataPredict()
  }
  async loadModel(){
    this.model = await tf.loadLayersModel('file://my-model-1/model.json');

  }
  async loadDataPredict(){
    console.log('loadDataPredict')
    const {result,symbols} = await main(true,12*3,12);
// Берем только последние пять предсказаний
    const lastFivePredictions = result.slice(-5);
    io.emit('message', {method:'lastFivePredictions',data:{lastFivePredictions,symbols}});
    lastFivePredictions.forEach((prediction, predictionIdx) => {
      console.log(`Предсказание ${predictionIdx + 1} из 5:`);

      prediction.forEach((value, index) => {
        if (index < symbols.length) {
          console.log(`  Валюта1: ${symbols[index]}, Вероятность: ${value}`);
        } else {
          console.log(`  Относительное изменение цены: ${value}`);
        }
      });

      console.log();  // Добавляем пустую строку между предсказаниями
    });

   // let data = {}
    //
    // arr.map(d=>{data[d.currency] = []})
    // for (let i = 0; i < arr.length; i++) {
    //   arr[i].close = parseFloat(arr[i].close)
    //   if (!data[arr[i].currency]){
    //     data[arr[i].currency] = []
    //   }
    //   data[arr[i].currency].push(arr[i])
    // }
    // Object.keys(data).map(pair=>{
    //
    //   data[pair] = calculateIndicatorsEMA(data[pair])
    //   data[pair] = calculateIndicatorsRSI(data[pair])
    // const inputWindow = res.map(data=>{
    //   const symbol = data.currency
    //   const symbolData = data[symbol];
    //   const oneHotSymbol = Object.keys(res).map(s => (s === symbol ? 1 : 0));
    //   console.log(symbolData)
    //   const features = [
    //     ...oneHotSymbol,
    //     ...FEATURES.map(feat => parseFloat(symbolData[feat])),
    //   ];
    //   return features
    // })
    // console.log(inputWindow)

  }
  async trackPrices() {
    this.PAIRS.forEach(symbol => {

      const ws = client.ws.candles(symbol, '5m', async candle => {
        io.emit('message', {method:'streamKlineCourse',data:{candle}});
        // console.log(`${symbol}`,candle);

        if (candle.isFinal) {
          // console.log(`${symbol}`,candle);
          let arr = [candle.startTime,candle.open, candle.high,candle.low,candle.close,candle.volume,
            candle.closeTime,
            candle.quoteVolume,candle.trades,candle.buyVolume,
            candle.quoteBuyVolume]
          // await this.saveCandlestickToDB([arr],symbol)
          await this.parsePairData()
          await this.loadDataPredict()
          // await this.loadDataPredict()
        }
      });
    });
  }

  async parsePairData(socket) {

    const selectQuery = `SELECT name FROM binance.currency_pairs WHERE name  LIKE '%USDT' AND enabled=true`;
    const result = await this.DB.query(selectQuery);
    this.PAIRS = []
    for (const pair of result) {
      this.PAIRS.push(pair.name)
      const cur = pair.name.replace('USDT','')
      const startDate = await this.getLastRecordDate(pair.name);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1); // 2 января 2023 года

      const today = new Date();

      while (startDate < today) {

      const y = await new Promise((resolve, reject) => {
          this.binance.candlesticks(pair.name, '5m', (error, data, symbol) => {
            if (error) {
              console.log(`Произошла ошибка при обработке ${symbol}:`, JSON.stringify(error, null, 2));
              resolve(null);
            } else {
              data.pop()
              resolve(data);
            }
          }, {startTime: startDate.getTime(), endTime: endDate.getTime()});
        });
        if (!y||y.length==0){
          console.log('NOT DATA ',startDate,pair.name)
          break;
        }
       await this.saveCandlestickToDB(y,pair.name)
        socket?socket.emit('message',{method:'updateCourse',data:{startDate,pair:pair.name,length:y.length}}):null
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);

      }
    }

  }
  async saveCandlestickToDB(data,pair){
    // console.log(data)
    const insertQuery = `
            INSERT INTO binance.candlestic (
                time,open, high,low,close,volume,close_time,quote_asset_volume,
                number_of_trades,taker_buy_base_asset_volume,
                taker_buy_quote_asset_volume,currency
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12
            )  ON CONFLICT DO NOTHING
        `;
    data.map( (candlestick) => {
      const params = [
        new Date(candlestick[0]),
        parseFloat(candlestick[1]),
        parseFloat(candlestick[2]),
        parseFloat(candlestick[3]),
        parseFloat(candlestick[4]),
        parseFloat(candlestick[5]),
        new Date(candlestick[6]),
        parseFloat(candlestick[7]),
        parseInt(candlestick[8]),
        parseFloat(candlestick[9]),
        parseFloat(candlestick[10]),
        pair
      ]
      this.DB.query(insertQuery, params).then(data=>{
      }).catch(err=>{
        console.log('err',err)
      });


    });
    console.log('save ',pair,data.length)
  }

  async getLastRecordDate(symbols) {
    const selectQuery = `SELECT MAX(time) AS time FROM binance.candlestic where currency ='${symbols}' ORDER BY time DESC LIMIT 1`;
    const result = await this.DB.query(selectQuery);
    if (result.length > 0 && result[0].time) {
      return result[0].time;
    } else {
      // Возвращаем стандартную дату, если нет записей
      return new Date('2023-01-01T00:00:00Z');
    }
  }
  async getBalance() {
    const result = [];

    try {
      const accountInfo = await client.accountInfo();
      const balances = accountInfo.balances.filter(balance => parseFloat(balance.free) > 0);

      for (const balance of balances) {
        if (balance.asset === 'USDT') {
          result.push({
            currency: balance.asset,
            free: balance.free,
            locked: balance.locked,
            balanceinusdt: balance.free,
          });
        } else {
          try {
            const symbol = `${balance.asset}USDT`;
            const price = await client.prices({ symbol });
            const balanceInUSDT = parseFloat(balance.free) * parseFloat(price[symbol]);

            result.push({
              currency: balance.asset,
              free: balance.free,
              locked: balance.locked,
              balanceinusdt: balanceInUSDT.toFixed(2),
            });
          } catch (error) {
            console.log(`Could not fetch price for ${balance.asset}, might not be traded directly against USDT.`);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }

    for (let i = 0; i < result.length; i++) {

    const selectQuery =   `UPDATE binance.balance SET
                          free = ${result[i].free},
                          locked = ${result[i].locked},
                          balanceinusdt = ${result[i].balanceinusdt},
                          updatedat = NOW()
                          WHERE currency = '${result[i].currency}';`;
    await this.DB.query(selectQuery);
    }
    return result;
  }
  async getCurrency(){
    return await this.DB.query(`SELECT can.currency as pair, MAX(can.time) as max,MIN(can.time) AS min
                        FROM binance.candlestic can
                        left join binance.currency_pairs cp  on cp.enabled =true
                        WHERE cp."name" =can.currency
                        GROUP BY can.currency;`)
  }
  async getHistory({pair,limit}){

    return await this.DB.query(`SELECT can.* FROM  binance.candlestic can
left join binance.currency_pairs cp on cp."name" =can.currency
where cp.enabled =true AND can.currency ='${pair}' ORDER BY time DESC LIMIT ${limit}`)
  }

}


// function trackPrices(symbols) {
//   symbols.forEach(symbol => {
//     const ws = client.ws.candles(symbol, '1m', candle => {
//       if (candle.isFinal) {
//         console.log(`${symbol}: ${candle.close}`);
//       }
//     });
//   });
// }
//
// // Используйте этот метод для отслеживания цен на несколько валют:
// trackPrices(['btcusdt', 'ethusdt', 'bnbusdt']);
module.exports = BinanceDB;
