const tf = require('@tensorflow/tfjs-node');

const db = require('./db');
const DB = new db();
const technicalindicators = require('technicalindicators');
const EMA = technicalindicators.EMA;
const RSI = technicalindicators.RSI;
const MACD = technicalindicators.MACD;
const ADX = technicalindicators.ADX;
// const trainingData = tf.tensor3d([
//   [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
//   [[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]]
// ]);
//
// const labels = tf.tensor2d([
//   [1,0,0,1],
//   [1,0,0,1]
// ]);
let currencies = []; // replace this with your actual list of currencies
const NORMALIZ_WINDOW = 12*24
const CLOSET_ARR = 12*24
const DB_ARR_LENGTH_DAY = 1200
const LSTM_LAYER_UNITS = 12*24
const EPOCHS =30
const BATCHSIZE = 12*2
const HIDDEN_LAYERS = [

    tf.layers.dense({units: 800}),
  tf.layers.dropout({rate:0.1}),
    tf.layers.dense({units: 400}),
    tf.layers.dense({units: 200}),


  tf.layers.dense({units: 200,kernelRegularizer: tf.regularizers.l2({ l2:0.01 })}),
    tf.layers.dense({units: 200}),
    tf.layers.dense({units: 200}),
    tf.layers.dense({units: 200}),
    tf.layers.dense({units: 100,kernelRegularizer: tf.regularizers.l2({ l2:0.01 })}),

    // tf.layers.dropout({rate:0.5}),
    tf.layers.dense({units: 100,kernelRegularizer: tf.regularizers.l2({ l2:0.01 })}),
    tf.layers.batchNormalization(),
    tf.layers.leakyReLU(),
    tf.layers.dense({units: 50}),


]


async function getData(daylength=3,startData='2019-01-01') {

  // Определение даты окончания для запроса
  let endDate = new Date(startData);
  endDate.setDate(endDate.getDate() + daylength);
  let endDateString = endDate.toISOString().split('T')[0];
  const sql = `SELECT
   *
  FROM binance.candlestic AS t
  INNER JOIN binance.currency_pairs AS p
  ON t.currency = p.name
  WHERE p.enabled = true and time>='${startData}' and time<'${endDateString}'
  order by time,currency`
  const res = await DB.query(sql);
  return res;
}
async function zScoreNormalization(tensor) {
  const {mean, variance} = tf.moments(tensor);
  const stdDev = tf.sqrt(variance);

  const meanVal = await mean.array();
  const stdDevVal = await stdDev.array();

  return tensor.sub(meanVal).div(stdDevVal);
}
function calculatePriceChange(todayPrice, yesterdayPrice) {
  let priceChange = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
  return priceChange;
}
async function main(){
  const arr = await getData(DB_ARR_LENGTH_DAY)

  // let values = [5, 5, 5, 5, 2, 3];
  // let rsi = RSI.calculate({ period: 5, values: values });
  // console.log(rsi); // Вернет: []
  // let arr = [
  //
  // ]
  // for (let i = 0; i < 110; i++) {
  //   arr.push({close:1,open:Math.random(),volume:Math.random(),time:i,currency:'BTCUSDT'})
  //   arr.push({close:2,open:Math.random(),volume:Math.random(),time:i,currency:'DOGEUSDT'})
  //   arr.push({close:3,open:Math.random(),volume:Math.random(),time:i,currency:'ETHUSDT'})
  //   arr.push({close:4,open:Math.random(),volume:Math.random(),time:i,currency:'LTCUSDT'})
  // }
  // console.log(arr)
  // return
  let closet_arr_last = {}
  let open_arr_last = {}
  let high_arr_last = {}
  let low_arr_last = {}
  let ORDERS = {}
  let grouped = arr.reduce((acc, cur) => {
    if (!acc[cur.time]) {
      acc[cur.time] = [];
    }
    if (!ORDERS[cur.currency]){
      ORDERS[cur.currency] = []
    }
    if (!closet_arr_last[cur.currency]){
      closet_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
      currencies.push(cur.currency)
    }
    if (!open_arr_last[cur.currency]){
      open_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
    }
    if (!high_arr_last[cur.currency]){
      high_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
    }
    if (!low_arr_last[cur.currency]){
      low_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
    }


    acc[cur.time].push([
      (cur.currency),
      parseFloat(cur.close),
      parseFloat(cur.open),
      parseFloat(cur.high),
      parseFloat(cur.low),
      parseFloat(cur.volume),
    ]);
    return acc;
  }, {});

  let tRawOutput = []
  let tRawInput = Object.entries(grouped).map(([time, values]) => {
    for (let i = 0; i < values.length; i++) {
      closet_arr_last[values[i][0]].push(values[i][1])
      open_arr_last[values[i][0]].push(values[i][2])
      high_arr_last[values[i][0]].push(values[i][3])
      low_arr_last[values[i][0]].push(values[i][4])
    }
const outputRes = []
    for (let i = 0; i < values.length; i++) {
      const rsi = RSI.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] })
      const ema = EMA.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] });
      const macdValues = MACD.calculate({
        fastPeriod: Math.floor(CLOSET_ARR*0.47/2),
        slowPeriod: CLOSET_ARR/2,
        signalPeriod: Math.floor(CLOSET_ARR*0.3/2),
        values: closet_arr_last[values[i][0]]
    });
      let adx = new ADX({
        high: high_arr_last[values[i][0]],
        low:  low_arr_last[values[i][0]],
        close: closet_arr_last[values[i][0]],
        period: 9,
        smoothingPeriod: 14
      });
      const adxData = adx.getResult().at(-1)
      // console.log('adx',adxData)
      const closeToday = closet_arr_last[values[i][0]].at(-1)
      const closeYesTodaday_1 = closet_arr_last[values[i][0]].at(-2)
      closet_arr_last[values[i][0]].shift()
      open_arr_last[values[i][0]].shift()
      high_arr_last[values[i][0]].shift()
      low_arr_last[values[i][0]].shift()
      values[i].push(rsi.at(-1))
      values[i].push(ema.at(-1))
      values[i].push(Object.values(macdValues.at(-1))[0]||0)
      values[i].push(Object.values(macdValues.at(-1))[1]||0)
      values[i].push(Object.values(macdValues.at(-1))[2]||0)
      values[i].push(Object.values(adxData)[0]||0)
      values[i].push(Object.values(adxData)[1]||0)
      values[i].push(Object.values(adxData)[2]||0)
// if (closeToday > maxPriceInNextHour&&values[i][0]==='BTCUSDT'){
//   let pr = closeToday >= maxPriceInNextHour ? 1 : 0
//
//   console.log(values[i][0],maxPriceInNextHour,closeToday,pr,closeToday-maxPriceInNextHour,(closeToday-maxPriceInNextHour)/maxPriceInNextHour*100)
//
// }
// if (values[i][0]==='BTCUSDT'){
//
// }
      const minPriceInNextHour = Math.min(...low_arr_last[values[i][0]].slice(-12));
      const maxPriceInNextHour = Math.max(...high_arr_last[values[i][0]].slice(-12, -1));

      outputRes.push(closeToday > maxPriceInNextHour ? 1 : 0);
    }

    tRawOutput.push(outputRes)


    for (let i = 0; i < values.length; i++) {

      values[i].shift()
    }


    // return [values.concat(...[])];
    return [values.flat().concat(...[])];
  });
  console.log('END')

// console.log(rsi_01)
//   console.log(tRawInput[3],tRawInput.length);
//   console.log(tRawInput[4],tRawInput.length);
//   console.log(tRawOutput);


  let normalizedInput = [];
  for (let i = 0; i < tRawInput.length; i += NORMALIZ_WINDOW) {
    let window = tRawInput.slice(i, i + NORMALIZ_WINDOW);
    let tensorWindow = tf.tensor3d(window);
    let normalizedWindow = await zScoreNormalization(tensorWindow);
    normalizedInput.push(...normalizedWindow.arraySync());
  }

  const trainingData = tf.tensor3d(normalizedInput);
  const labels = tf.tensor2d(tRawOutput);


  const splitIndex = Math.floor(trainingData.shape[0] * 0.99);
// const splitIndex = trainingData.shape[0]-2
  const [trainInputs, testInputs] = tf.split(trainingData, [splitIndex, trainingData.shape[0] - splitIndex], 0);
  const [trainOutputs, testOutputs] = tf.split(labels, [splitIndex, labels.shape[0] - splitIndex], 0);




// Создание модели
  const model = tf.sequential();

// Добавление LSTM слоя
  model.add(tf.layers.gru({
    units: LSTM_LAYER_UNITS,
    inputShape: [null, trainingData.shape[2]],
    returnSequences: false
  }));

  // model.add(tf.layers.dropout({
  //   rate: 0.5
  // }));
  // model.add(tf.layers.batchNormalization());
  for (let i = 0; i < HIDDEN_LAYERS.length; i++) {

    model.add(HIDDEN_LAYERS[i]);
  }

// Добавление полносвязного слоя для классификации
  model.add(tf.layers.dense({
    units: labels.shape[1],
    activation: 'sigmoid'
  }));

// Компиляция модели
  model.compile({
    loss: 'meanSquaredError',
    optimizer: 'adam',
    metrics: ['accuracy']
  });

// Обучение модели
  model.fit(trainInputs, trainOutputs, {
    epochs: EPOCHS,
    batchSize:BATCHSIZE,
    verbose: 1
  }).then(() => {
    console.log('Модель обучена');

    // После обучения делаем предсказание
    // const prediction = model.predict(testInputs);
    // prediction.print(); // Печатаем предсказание в консоль


    const predictions = model.predict(testInputs);
    const predictionDataArray = Array.from(predictions.dataSync());
    const testDataArray = Array.from(testOutputs.dataSync());
    const numRows = predictionDataArray.length / labels.shape[1];
    const numCols = labels.shape[1];

    const formattedPredictionData = [];
    const formattedTestData = [];

    for (let i = 0; i < numRows; i++) {
      const predictionRow = [];
      const testRow = [];
      for (let j = 0; j < numCols; j++) {
        predictionRow.push(predictionDataArray[i * numCols + j]);
        testRow.push(testDataArray[i * numCols + j]);
      }
      formattedPredictionData.push(predictionRow);
      formattedTestData.push(testRow);
    }

    // console.log('Prediction Data:');
    // console.log(formattedPredictionData);
    //
    // console.log('Test Data:');
    // console.log(formattedTestData);
    const currencyPredictions = {};

    for (let i = 0; i < formattedPredictionData.length; i++) {
      for (let j = 0; j < currencies.length; j++) {
        const currency = currencies[j];

        // Create an array for this currency if it doesn't exist yet
        if (!currencyPredictions[currency]) {
          currencyPredictions[currency] = {
            currency,
            predictions: [],
            actual: [],
            isRight: 0,
            isLose: 0,
            countTrue: 0,
          };
        }

        // Add the prediction and actual value to the arrays
        currencyPredictions[currency].predictions.push(formattedPredictionData[i][j]);
        currencyPredictions[currency].actual.push(formattedTestData[i][j]);

        // Evaluate the predictions
        const maxPers = 0.5;
        const minPers = 0.5;

        if (formattedPredictionData[i][j] > maxPers && formattedTestData[i][j] === 1) {
          currencyPredictions[currency].isRight++;
          currencyPredictions[currency].countTrue++;
        } else if (formattedPredictionData[i][j] > maxPers && formattedTestData[i][j] === 0) {
          currencyPredictions[currency].isLose++;
        }
        if (formattedPredictionData[i][j] < minPers && formattedTestData[i][j] === 0) {
          currencyPredictions[currency].isRight++;
        } else if (formattedPredictionData[i][j] < minPers && formattedTestData[i][j] === 1) {
          currencyPredictions[currency].isLose++;
        }
      }
    }

    Object.values(currencyPredictions).forEach((value) => {
      console.log(`--- ${value.currency} ---`);
      console.log(`Total predictions: ${value.predictions.length}`);
      console.log(`Correct predictions: ${value.isRight}`);
      console.log(`Incorrect predictions: ${value.isLose}`);
      console.log(`True predictions: ${value.countTrue}`);
      console.log('===============================');
    });



    // console.log(currencyPredictions)
  });
}

main().catch(console.error)


