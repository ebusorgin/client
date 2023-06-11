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

const CLOSET_ARR = 12*24
const DB_ARR_LENGTH_DAY = 10
const LSTM_LAYER_UNITS = 12*10
const EPOCHS =5
const BATCHSIZE = 12*5
const HIDDEN_LAYERS = [
  // {
  //   units: 200,
  //   activation: 'sigmoid'
  // },
  // {
  //   units: 100,
  //   activation: 'sigmoid'
  // },
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
      const maxPriceInNextHour = Math.min(...closet_arr_last[values[i][0]].slice(-6));
if (values[i][0]=='BTCUSDT'){
  let pr = closeToday > maxPriceInNextHour ? 1 : 0
  // console.log(maxPriceInNextHour,closeToday,pr,closeToday-maxPriceInNextHour,(closeToday-maxPriceInNextHour)/maxPriceInNextHour*100)
}

      outputRes.push(closeToday > maxPriceInNextHour ? 1 : 0);

    }

    tRawOutput.push(outputRes)

    for (let i = 0; i < values.length; i++) {

      values[i].shift()
    }


    // return [values.concat(...[])];
    return [values.flat().concat(...[])];
  });
// return
// console.log(rsi_01)
//   console.log(tRawInput[3],tRawInput.length);
//   console.log(tRawInput[4],tRawInput.length);
//   console.log(tRawOutput);


  const trainingData = tf.tensor3d(tRawInput);
  const labels = tf.tensor2d(tRawOutput);


  const splitIndex = Math.floor(trainingData.shape[0] * 0.70);
// const splitIndex = trainingData.shape[0]-2
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
    // const prediction = model.predict(testInputs);
    // prediction.print(); // Печатаем предсказание в консоль


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

      const maxPers = 0.5
      const minPers = 0.5

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


