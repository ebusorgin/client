const Binance_candlesticks = require('node-binance-api');
const db = require('./db');
const SMA = require('technicalindicators').SMA;
const RSI = require('technicalindicators').RSI;

class BinanceDataFetcher {
    constructor(interval = '1h',popularSymbols) {
        this.interval = interval;
        this.DB = new db();
        this.binance = new Binance_candlesticks();
        this.popularSymbols = popularSymbols||[
            'BTCUSDT',
            'ETHUSDT',
            'BNBUSDT',
            'ADAUSDT',
            'DOGEUSDT',
            // 'XRPUSDT',
            'SOLUSDT',
            'DOTUSDT',
            'MATICUSDT'
        ];

    }
    async getAllRecords(symbol) {
        const selectQuery = `SELECT * FROM binance.pair_${symbol.toLowerCase()} ORDER BY time ASC`;
        const result = await this.DB.query(selectQuery);
        return result;
    }
    async updateAllRecords() {
        for (const symbol of this.popularSymbols) {
            try {
                const selectQuery = `SELECT * FROM binance.pair_${symbol.toLowerCase()} ORDER BY time ASC`;
                const result = await this.DB.query(selectQuery);

                const closePrices = result.map(row => parseFloat(row.close));

                const sma20 = SMA.calculate({period : 20, values : closePrices});
                const rsi14 = RSI.calculate({values : closePrices, period: 14});
                if (sma20){
                    console.log('sma20',sma20)

                }

                const updateQuery = `
                    UPDATE binance.pair_${symbol.toLowerCase()}
                    SET
                        sma = $1,
                        rsi = $2
                    WHERE time = $3
                `;

                for (let i = 0; i < result.length; i++) {
                    const params = [
                        sma20[i] || null,
                        rsi14[i] || null,
                        result[i].time
                    ];
                    console.log(updateQuery, params);
                    await this.DB.query(updateQuery, params);
                }

                console.log(`UPDATED ${symbol}`);
            } catch(err) {
                console.log(`Error updating ${symbol}: ${err}`);
            }
        }
    }
    async getLastRecordDate(symbol) {
        const selectQuery = `SELECT time FROM binance.pair_${symbol.toLowerCase()} ORDER BY time DESC LIMIT 1`;
        const result = await this.DB.query(selectQuery);
        if (result.length > 0 && result[0].time) {
            return result[0].time;
        } else {
            // Возвращаем стандартную дату, если нет записей
            return new Date('2023-05-01T00:00:00Z');
        }
    }

    async insertCandlestickData(symbol, data) {
        const insertQuery = `
            INSERT INTO binance.pair_${symbol} (
                time,
                open,
                high,
                low,
                close,
                volume,
                close_time,
                quote_asset_volume,
                number_of_trades,
                taker_buy_base_asset_volume,
                taker_buy_quote_asset_volume,
                sma,
                rsi
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13
            )  ON CONFLICT DO NOTHING
        `;
        const closePrices = data.map(candlestick => candlestick.close);

        const sma20 = SMA.calculate({period : 20, values : closePrices});
        const rsi14 = RSI.calculate({values : closePrices, period: 14});
        for (let i = 0; i < data.length; i++) {
            let params = [
                data[i].time,
                data[i].open,
                data[i].high,
                data[i].low,
                data[i].close,
                data[i].volume,
                data[i].closeTime,
                data[i].quoteAssetVolume,
                data[i].numberOfTrades,
                data[i].takerBuyBaseAssetVolume,
                data[i].takerBuyQuoteAssetVolume,
                sma20[i] || null, // null for the first 19 records
                rsi14[i] || null // null for the first 13 records

            ];
            console.log(insertQuery, params);
            await this.DB.query(insertQuery, params);
        }

        console.log('SAVED');
    }

    async parsePairData() {
        for (const symbol of this.popularSymbols) {
            try {
                const startDate = await this.getLastRecordDate(symbol);
                const endDate = new Date();
                endDate.setHours(endDate.getHours());
                console.log('startDate',startDate)
                console.log('endDate',endDate)
                console.log('symbol',symbol)
                const y = await new Promise((resolve, reject) => {
                    this.binance.candlesticks(symbol, this.interval, (error, data, symbol) => {
                        if (error) {
                            console.log(`Произошла ошибка при обработке ${symbol}:`, JSON.stringify(error, null, 2));
                        } else {
                            resolve(data);
                        }
                    }, {startTime: startDate.getTime(), endTime: endDate.getTime()});
                });


                if (!y){
                    console.log('НЕТ БОЛЬШЕ ДАННЫХ ',symbol)
                    continue; // продолжаем с следующим символом
                }
                const candlestickData = y.map((candlestick) => ({
                    time: new Date(candlestick[0]),
                    open: parseFloat(candlestick[1]),
                    high: parseFloat(candlestick[2]),
                    low: parseFloat(candlestick[3]),
                    close: parseFloat(candlestick[4]),
                    volume: parseFloat(candlestick[5]),
                    closeTime: new Date(candlestick[6]),
                    quoteAssetVolume: parseFloat(candlestick[7]),
                    numberOfTrades: parseInt(candlestick[8]),
                    takerBuyBaseAssetVolume: parseFloat(candlestick[9]),
                    takerBuyQuoteAssetVolume: parseFloat(candlestick[10])
                }));
                await this.insertCandlestickData(symbol.toLowerCase(), candlestickData);
            } catch(err) {
                console.log(`Произошла ошибка при обработке ${symbol}: ${err}`);
            }
        }
    }

}
// const fetcher = new BinanceDataFetcher();
// // fetcher.parsePairData().catch(err => console.log(err));
// fetcher.updateAllRecords().catch(err => console.log(err));
module.exports = BinanceDataFetcher;
