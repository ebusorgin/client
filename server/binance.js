const Binance_candlesticks = require('node-binance-api');
const axios = require('axios')
const db = require('./db');
;
const Binance = require('binance-api-node').default
// Аутентификация
const client = Binance({
  apiKey: 'uAZfNvppgt1HvDtstQLLfFVLqcbbBbZhjv3khtxllBVpuyFKZFk4q774SRxHsCL3',
  apiSecret: '2c05KciBkkUec7NKdYd7p0H1MuKHVxL6SG9NCTvWXQDpAn5GHnvUiOtkonPii666',
})
class BinanceDB {
    constructor() {
        this.DB = new db();
        this.binance = new Binance_candlesticks();
        this.parsePairData()

    }
  async parsePairData() {

    const selectQuery = `SELECT name FROM binance.currency_pairs WHERE name  LIKE '%USDT'`;
    const result = await this.DB.query(selectQuery);
    for (const pair of result) {
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
              resolve(data);
            }
          }, {startTime: startDate.getTime(), endTime: endDate.getTime()});
        });
        if (!y||y.length==0){
          console.log('NOT DATA ',startDate,pair.name)
          break;
        }
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
        y.map( (candlestick) => {
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
            pair.name
          ]

          this.DB.query(insertQuery, params);


        });

        console.log('save ',startDate,pair.name,y.length)



        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);

      }

      console.log("SAVE",pair.name)
    }

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
    return await this.DB.query(`SELECT currency as pair, MAX(time) as max,MIN(time) AS min
                        FROM binance.candlestic
                        GROUP BY currency;`)
  }
  async getHistory({pair,limit}){
    return await this.DB.query(`SELECT * FROM binance.candlestic where currency ='${pair}' ORDER BY time DESC LIMIT ${limit}`)
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
