const tf = require('@tensorflow/tfjs-node');
const db = require('./db');
const DB = new db();
const technicalindicators = require('technicalindicators');
const EMA = technicalindicators.EMA;
const RSI = technicalindicators.RSI;
// const trainingData = tf.tensor3d([
//   [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
//   [[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]]
// ]);
//
// const labels = tf.tensor2d([
//   [1,0,0,1],
//   [1,0,0,1]
// ]);

const CLOSET_ARR = 12*24
const DB_ARR_LENGTH_DAY = 150
const LSTM_LAYER_UNITS = 12*24*2
const EPOCHS =5
const BATCHSIZE = 12*12
const HIDDEN_LAYERS = [
  {
    units: 400,
    activation: 'sigmoid'
  },
  {
    units: 100,
    activation: 'sigmoid'
  },
  {
    units: 60,
    activation: 'sigmoid'
  }
]


async function getData(daylength=3,startData='2023-01-02') {

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
function calculatePriceChange(todayPrice, yesterdayPrice) {
  let priceChange = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
  return priceChange;
}
async function main(){
  const arr = await getData(DB_ARR_LENGTH_DAY)

  let values = [5, 5, 5, 5, 2, 3];
  let rsi = RSI.calculate({ period: 5, values: values });
  console.log(rsi); // Вернет: []
  let arr2 = [
    {close:1,open:2,volume:3,time:100,currency:'BTCUSDT'},
    {close:2,open:5,volume:6,time:100,currency:'DOGEUSDT'},
    {close:3,open:8,volume:9,time:100,currency:'ETHUSDT'},
    {close:4,open:9,volume:6,time:100,currency:'LTCUSDT'},

    {close:2,open:2,volume:3,time:101,currency:'BTCUSDT'},
    {close:2.9,open:5,volume:6,time:101,currency:'DOGEUSDT'},
    {close:3,open:8,volume:9,time:101,currency:'ETHUSDT'},
    {close:4,open:5,volume:2,time:101,currency:'LTCUSDT'},

    {close:5,open:2,volume:3,time:102,currency:'BTCUSDT'},
    {close:5,open:5,volume:6,time:102,currency:'DOGEUSDT'},
    {close:5,open:8,volume:9,time:102,currency:'ETHUSDT'},
    {close:5,open:11,volume:12,time:102,currency:'LTCUSDT'},

    {close:5,open:14,volume:1,time:103,currency:'BTCUSDT'},
    {close:3,open:17,volume:18,time:103,currency:'DOGEUSDT'},
    {close:3,open:20,volume:21,time:103,currency:'ETHUSDT'},
    {close:3,open:23,volume:24,time:103,currency:'LTCUSDT'},

    {close:2,open:14,volume:1,time:104,currency:'BTCUSDT'},
    {close:4,open:17,volume:18,time:104,currency:'DOGEUSDT'},
    {close:4,open:20,volume:21,time:104,currency:'ETHUSDT'},
    {close:3,open:23,volume:24,time:104,currency:'LTCUSDT'},

  ]

  let closet_arr_last = {}
  let grouped = arr.reduce((acc, cur) => {
    if (!acc[cur.time]) {
      acc[cur.time] = [];
    }
    if (!closet_arr_last[cur.currency]){
      closet_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
    }

    // rsi_01.push(cur.close)
    // const rsi_01_c = RSI.calculate({ period:3, values: rsi_01 })
    // console.log(cur.currency)

    acc[cur.time].push([
      (cur.currency),
      parseFloat(cur.close),
      // parseFloat(cur.open),
      parseFloat(cur.volume),
      // parseFloat(cur.high),
      // parseFloat(cur.low)
    ]);
    // rsi_01.shift();
    return acc;
  }, {});
  function getRSI(){

  }
  let tRawOutput = []
  let tRawInput = Object.entries(grouped).map(([time, values]) => {
    // console.log(time,values)
    for (let i = 0; i < values.length; i++) {
      // console.log('values[0]',values[i][0])
      closet_arr_last[values[i][0]].push(values[i][1])
    }
const outputRes = []
    for (let i = 0; i < values.length; i++) {
      const rsi = RSI.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] })
      const ema = EMA.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] });
      const closeToday = closet_arr_last[values[i][0]].at(-1)
      const closeYesTodaday_1 = closet_arr_last[values[i][0]].at(-2)
      const closeYesTodaday_2 = closet_arr_last[values[i][0]].at(-3)
      closet_arr_last[values[i][0]].shift()
      values[i].push(rsi.at(-1))
      values[i].push(ema.at(-1))
      // const direction_of_growth = ((((closeToday-closeYesTodaday)/closeYesTodaday*100)+100)/200);///направление роста
      outputRes.push(closeToday>closeYesTodaday_1?1:0)
    }

    tRawOutput.push(outputRes)

    for (let i = 0; i < values.length; i++) {
      values[i].shift()
    }


    // return [values.concat(...[])];
    return [values.flat().concat(...[])];
  });
// console.log(rsi_01)
//   console.log(tRawInput[3],tRawInput.length);
//   console.log(tRawInput[4],tRawInput.length);
//   console.log(tRawOutput);


  const trainingData = tf.tensor3d(tRawInput);
  const labels = tf.tensor2d(tRawOutput);


  const splitIndex = Math.floor(trainingData.shape[0] * 0.8);
  const [trainInputs, testInputs] = tf.split(trainingData, [splitIndex, trainingData.shape[0] - splitIndex], 0);
  const [trainOutputs, testOutputs] = tf.split(labels, [splitIndex, labels.shape[0] - splitIndex], 0);




// Создание модели
  const model = tf.sequential();

// Добавление LSTM слоя
  model.add(tf.layers.lstm({
    units: LSTM_LAYER_UNITS,
    inputShape: [null, trainingData.shape[2]],
    returnSequences: false
  }));

  for (let i = 0; i < HIDDEN_LAYERS.length; i++) {
    model.add(tf.layers.dense(HIDDEN_LAYERS[i]));
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
    const prediction = model.predict(testInputs);
    prediction.print(); // Печатаем предсказание в консоль


    const predictions = model.predict(testInputs);
    const predictionData = predictions.dataSync();
    const testData = testOutputs.dataSync();
    let totalError = 0;
    let totalAbsoluteError = 0;
    let countTrue = 0;

// Мы предполагаем, что predictionData и testData имеют одинаковую длину

    let totalsumm = 0
    let uchtennie = 0
    let isRight = 0
    let isLose = 0
    let srednee = 0
    let MaxPr = 0
    let MinPr = 0
    for(let i = 0; i < predictionData.length; i++) {
      if (predictionData[i]>MaxPr){MaxPr = predictionData[i]}
      if (predictionData[i]<MinPr){MinPr = predictionData[i]}
      totalsumm+=predictionData[i]
    }
    srednee = totalsumm/predictionData.length
    for(let i = 0; i < predictionData.length; i++) {

      const maxPers = srednee*1.1
      const minPers = srednee*0.9

      console.log(`Среднее: ${(srednee).toFixed(5)} текущее: ${(predictionData[i]).toFixed(5)} maxPers: ${(maxPers).toFixed(5)} minPers: ${(minPers).toFixed(5)} реал:  ${testData[i]}`)
      if (predictionData[i]>maxPers && testData[i]===1){
        isRight++
      }else if (predictionData[i]>maxPers && testData[i]===0){
        isLose++
      }
      if (predictionData[i]<minPers && testData[i]===0){
        isRight++
      }else if (predictionData[i]<minPers && testData[i]===1){
        isLose++
      }

    }

    console.log('правильных к неправильным:', isRight,isLose,predictionData.length);

    let totalAnswers = isRight + isLose;

    let correctPercentage = (isRight / totalAnswers) * 100;
    let incorrectPercentage = (isLose / totalAnswers) * 100;

    console.log("Процент верных ответов:", correctPercentage);
    console.log("Процент неверных ответов:", incorrectPercentage);

  });
}

main().catch(console.error)


