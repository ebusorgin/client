const Binance_candlesticks = require('node-binance-api');
const axios = require('axios')
const db = require('./db');
const createDataset = require('./predictbinance').createDataset;
const getData = require('./predictbinance').getData;
const calculateIndicatorsEMA = require('./predictbinance').calculateIndicatorsEMA;
const calculateIndicatorsRSI = require('./predictbinance').calculateIndicatorsRSI;
const cron = require('node-cron');
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
  DB
  binance
  SYMBOLS = []
  MODEL
  CANDLES = {}
  maxLengthCANDLES = 12*24
  PRICE_NOW = {}

  lastFivePredictions
    constructor() {
        this.DB = new db();
        this.binance = new Binance_candlesticks();
        this.create().then(r => {})
    }
  async create() {
    await this.loadData()
    cron.schedule('1,6,11,16,21,26,31,36,41,46,51,56 * * * *', this.getCandles.bind(this));
    cron.schedule('*/5 * * * * *', this.getOnlenePrice.bind(this));


    // await this.loadDataPredict()
    // await this.getOnlenePrice()
  }
  async loadData(){
    this.MODEL = await tf.loadLayersModel('file://my-model-1/model.json');
    const selectQuery = `SELECT name FROM binance.currency_pairs WHERE enabled=true`;
    const result = await this.DB.query(selectQuery);
    for (const pair of result) {
      this.SYMBOLS.push(pair.name)
      this.CANDLES[pair.name] = []
      this.PRICE_NOW[pair.name] = 0
    }
    const d = await getData(this.maxLengthCANDLES)
    d.map(d=>this.CANDLES[d.currency].push(d))
  }
  async loadDataPredict(){
    console.log('loadDataPredict')
    const {result,symbols} = await main(true,12*24,12);
// Берем только последние пять предсказаний
    const lastFivePredictions = result.slice(-5);
    this.lastFivePredictions = lastFivePredictions
    this.symbols = symbols
    io.emit('message', {method:'lastFivePredictions',data:{lastFivePredictions,symbols}});

  }
  async getOrders(){
    return await this.DB.query(`SELECT * FROM binance.orders WHERE status!='close'`)
  }
  async createOrder(data){
    return await this.DB.query(`INSERT INTO binance.orders (type, currency, price, count) VALUES ('${data.type}', '${data.currency}', ${data.price},${data.count});`)
  }
  async getCandles() {
    let symbolsMinMaxCandles = await this.DB.query(
      `SELECT currency, MAX(time),MIN(time)
        FROM binance.candlestic c
        LEFT join binance.currency_pairs cp on cp.enabled =true
        where cp."name" =c.currency
        GROUP BY currency;`)

    for (const symbol of this.SYMBOLS) {
      let dateMinMax = symbolsMinMaxCandles.find(d=>d.currency===symbol)
      const startDate = dateMinMax.max
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      const today = new Date();
      while (dateMinMax.max < today) {
        const data = await client.candles({ symbol, interval :'5m',startTime: startDate.getTime(),endTime:endDate.getTime()})
        data.map(d=>{
          return {
            time: d.openTime,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
            close_time:d.closeTime,
          }
        })
        io.emit('message', {method:'updateCandles',data:{data,symbol}});

        this.CANDLES[symbol].concat(data).slice(-this.maxLengthCANDLES);
        await this.saveCandlestickToDB(data,symbol)
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
      }
    }
  }
  async getOnlenePrice() {
    this.SYMBOLS.map(async symbol=>{
      const ticker = await client.prices({ symbol });
      this.PRICE_NOW[symbol] = parseFloat(ticker[symbol])
      io.emit('message', {method:'streamKlineTicker',data:{symbol,price:this.PRICE_NOW[symbol]}});
    })
  }

  async saveCandlestickToDB(data,pair){
    data.map( (c) => {
      if (new Date(c.closeTime)>new Date()){
        return
      }
      const params = [
        new Date(c.openTime),
        parseFloat(c.open),
        parseFloat(c.high),
        parseFloat(c.low),
        parseFloat(c.close),
        parseFloat(c.volume),
        new Date(c.closeTime),
        pair
      ]
      this.DB.query(`
            INSERT INTO binance.candlestic
            (time,open, high,low,close,volume,close_time, currency)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)  ON CONFLICT DO NOTHING`, params)
    });
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
    return await this.DB.query(`SELECT * FROM binance.balance`);
    // return result;
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


module.exports = BinanceDB;
