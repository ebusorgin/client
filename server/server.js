const db = require('./db');
const binanceClass = require('./binance_update');
class Server {
  constructor() {
    this.DB = new db();
    this.BINANCE = new binanceClass();

  }
  async getHistory({currency,skip = 0,limit = 1}){
    return await this.DB.query(`SELECT * FROM binance.pair_${currency} ORDER BY time DESC LIMIT ${limit} OFFSET ${skip}`)
  }
}
module.exports = Server;
