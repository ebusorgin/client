const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const db = require('./db');
const DB = new db();
const technicalindicators = require('technicalindicators');
const EMA = technicalindicators.EMA;
const RSI = technicalindicators.RSI;

const FEATURES = ['close', 'volume','quote_asset_volume','ema_12','ema_24','ema_36','ema_72','ema_288','rsi_12','rsi_24','rsi_36','rsi_72','rsi_288'];
let SYMBOLS_PAIRS = []
const LOOK_BACK = [12*1,12*2,12*3,12*6,12*24];

// Создаем клиент для подключения к Postgres


// Функция для получения данных из БД
async function getData(datalength) {


  const res = await DB.query(`WITH ranked_rows AS (
  SELECT
    t.*,
    ROW_NUMBER() OVER (
      PARTITION BY t.currency
      ORDER BY t.time DESC
    ) AS rn
  FROM binance.candlestic AS t
  INNER JOIN binance.currency_pairs AS p
  ON t.currency = p.name
  WHERE p.enabled = true
)
SELECT * FROM ranked_rows
WHERE rn <= ${datalength}`);
//   const res = await client.query(`SELECT * FROM  binance.candlestic`);
  console.log('res.rows',res.length)
  res.reverse()


  return res;
}
function calculateIndicatorsEMA(arr){
  let clPrArr = arr.map(({close}) => parseFloat(close));
  let ema = {};

  LOOK_BACK.forEach(period => {
    ema[`ema_${period}`] = EMA.calculate({ period, values: clPrArr });
  });

  arr.forEach((item, i) => {
    LOOK_BACK.forEach(period => {
      let _ema = `ema_${period}`;
      item[_ema] = i > arr.length - ema[_ema].length ? ema[_ema][i - (arr.length - ema[_ema].length + 1)] : item.close;
    });
  });

  return arr;
}
function calculateIndicatorsRSI(arr) {
  let clPrArr = arr.map(({close}) => parseFloat(close));
  let ema = {};

  LOOK_BACK.forEach(period => {
    ema[`rsi_${period}`] = RSI.calculate({ period, values: clPrArr });
  });

  arr.forEach((item, i) => {
    LOOK_BACK.forEach(period => {
      let _ema = `rsi_${period}`;
      item[_ema] = i > arr.length - ema[_ema].length ? ema[_ema][i - (arr.length - ema[_ema].length + 1)] : item.close;
    });
  });

  return arr;
}
const calculateMinMaxRSI = (pairs, pair, lookbackPeriod) => {
  let rsiArr = pairs[pair].map(d => d[`rsi_${lookbackPeriod}`]);

  let minRSI = Math.min(...rsiArr.filter(Boolean));
  let maxRSI = Math.max(...rsiArr.filter(Boolean));

  let minRSITime = pairs[pair][rsiArr.indexOf(minRSI)].time;
  let maxRSITime = pairs[pair][rsiArr.indexOf(maxRSI)].time;

  return (`For pair ${pair}, min RSI: ${minRSI} at time: ${minRSITime}, max RSI: ${maxRSI} at time: ${maxRSITime}`);
}
async function createDataset(arr,windowSize,predict = false) {
  let data = {}

  arr.map(d=>{data[d.currency] = []})
  for (let i = 0; i < arr.length; i++) {
    arr[i].close = parseFloat(arr[i].close)
    if (!data[arr[i].currency]){
      data[arr[i].currency] = []
    }
    data[arr[i].currency].push(arr[i])
  }
  SYMBOLS_PAIRS = Object.keys(data)
  Object.keys(data).map(pair=>{

    data[pair] = calculateIndicatorsEMA(data[pair])
    data[pair] = calculateIndicatorsRSI(data[pair])


    // calculateMinMaxRSI(pairs, pair, 12*24);
    // console.log(pair,pairs[pair][pairs[pair].length-1][`rsi_${12*24}`],pairs[pair][pairs[pair].length-1].close)
    // console.log(pair,pairs[pair][pairs[pair].length-20][`rsi_${12*24}`],pairs[pair][pairs[pair].length-20].close)
    // console.log(pair,pairs[pair][pairs[pair].length-30][`rsi_${12*24}`],pairs[pair][pairs[pair].length-30].close)
    // console.log(pair,pairs[pair][pairs[pair].length-40][`rsi_${12*24}`],pairs[pair][pairs[pair].length-40].close)
// console.log(pairs[pair])
  })

  const inputTensors = [];
  const outputTensors = [];
  let numInput = 0;
  let numOutput = 0;
  for (const symbol in data) {
    const symbolData = data[symbol];
    const oneHotSymbol = Object.keys(data).map(s => (s === symbol ? 1 : 0));
    for (let i = windowSize - 1; i < symbolData.length - windowSize - 1; i++) {
      const inputWindow = symbolData.slice(i - windowSize + 1, i + 1).map((candle, idx) => {
        const features = [
          ...oneHotSymbol,
          ...FEATURES.map(feat => parseFloat(candle[feat])),
        ];
        numInput = features.length

        return features;
      });



        const outputWindow = [
          ...oneHotSymbol,
          // Относительные изменения
          (symbolData[i + 1].close - symbolData[i].close) / symbolData[i].close,
          // Направление движения
          symbolData[i + 1].close > symbolData[i].close ? 1 : 0,
          symbolData[i + 2].close > symbolData[i].close ? 1 : 0,
          symbolData[i + 3].close > symbolData[i].close ? 1 : 0,
        ];
        numOutput = outputWindow.length
        outputTensors.push(outputWindow);



      inputTensors.push(inputWindow);

    }

  }
  // Группируем outputTensors по валютным парам
  const numSymbols = Object.keys(data).length;
  const numWindowsPerSymbol = outputTensors.length / numSymbols;
  const groupedOutputTensors = [];
  for (let i = 0; i < numSymbols; i++) {
    groupedOutputTensors.push(outputTensors.slice(i * numWindowsPerSymbol, (i + 1) * numWindowsPerSymbol));
  }

  const outputTensor = tf.concat(groupedOutputTensors.map(tensors => tf.tensor2d(tensors)), 0);

  const tensors = {
    inputTensors: tf.tensor3d(inputTensors),
    outputTensors: outputTensor,
    numInput,
    numOutput,
  }

  const splitIndex = Math.floor(tensors.inputTensors.shape[0] * 0.8);
  // const splitIndex = 1;
  const [trainInputs, testInputs] = tf.split(tensors.inputTensors, [splitIndex, tensors.inputTensors.shape[0] - splitIndex], 0);
  const [trainOutputs, testOutputs] = tf.split(tensors.outputTensors, [splitIndex, tensors.outputTensors.shape[0] - splitIndex], 0);

  return {
    trainData: {
      xs: trainInputs,
      ys: trainOutputs,
    },
    testData: {
      xs: testInputs,
      ys: testOutputs,
    },
    validData: {
      xs: testInputs,
      ys: testOutputs,
    },
    inputShape: tensors.numInput,
    outputUnits: tensors.numOutput,
  };


}


// Функция для создания модели
function createModel(params,outputUnits) {
  const model = tf.sequential();

  model.add(tf.layers.lstm(params));
  model.add(tf.layers.gru({ units: 40 }));
  model.add(tf.layers.dense({ units: 10 }));
  model.add(tf.layers.dense({ units: outputUnits }));

  model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });

  return model;
}
async function trainModel(model, data, params) {
  const history = await model.fit(data.xs, data.ys, {
    epochs: params.epochs,
    batchSize: params.batchSize,
    verbose: true,
    // callbacks: {
    //   onEpochEnd: async (epoch, logs) => {
    //     // server.sendMessageLogs('onEpochEnd',params.uid,{epoch, logs})
    //     console.log(`Epoch ${epoch + 1}: loss = ${logs.loss}`);
    //   },
    //   onBatchEnd: async (batch, logs) => {
    //     // server.sendMessageLogs('onBatchEnd',params.uid,{batch, logs})
    //     console.log(`Batch ${batch + 1}: loss = ${logs.loss}`);
    //   },
    // },


  });
  const performance = history.history.loss[history.history.loss.length - 1];
  return { model, performance,history };
}

async function main(predict = false,datalength = 12*24*7,WINDOWS_SIZE = 12*1) {
  let model
  const data = await getData(datalength);
  const { trainData, testData, inputShape,outputUnits } = await createDataset(data,WINDOWS_SIZE);
  if (!predict){
    const m = await createModel({
      inputShape: [WINDOWS_SIZE, inputShape],
      units: inputShape,
      returnSequences: true,
    },outputUnits);

    const modPer = await trainModel(m,trainData,{epochs: 2, batchSize: WINDOWS_SIZE})
    model = modPer.model
    performance = modPer.performance
    await saveModel(model)
  }else{
    model = await tf.loadLayersModel('file://my-model-1/model.json');
  }


  const predictions = model.predict(testData.xs)
  // console.log(predictions)
  // predictions.array().then(result => {
  //
  //
  //   console.log('result',result[result.length-1]);
  //   console.log(SYMBOLS_PAIRS)
  // });
  // let symbols = ['TRXUSDT', 'NEOUSDT', 'ETHUSDT', 'ETCUSDT', 'BTCUSDT'];

  return await interpretPredictions(predictions, SYMBOLS_PAIRS);
}
async function interpretPredictions(predictions, symbols) {
  const result = await predictions.arraySync();


  return {result,symbols}
}
async function saveModel(model) {
  const saveResults = await model.save('file://my-model-1');
  console.log('save');
}
// main().catch(console.error);
module.exports.createDataset = createDataset;
module.exports.calculateIndicatorsEMA = calculateIndicatorsEMA;
module.exports.calculateIndicatorsRSI = calculateIndicatorsRSI;
module.exports.getData = getData;
module.exports.main = main;
