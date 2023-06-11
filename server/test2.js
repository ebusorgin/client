const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const technicalindicators = require('technicalindicators');
const EMA = technicalindicators.EMA;
const RSI = technicalindicators.RSI;
const MACD = technicalindicators.MACD;
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
const DB_ARR_LENGTH_DAY = 100
const LSTM_LAYER_UNITS = 12*10
const EPOCHS =20
const BATCHSIZE = 12*24
let arr = [

]
for (let i = 0; i < 11000; i++) {
  arr.push({close:1,open:Math.random(),volume:Math.random(),time:i,currency:'BTCUSDT'})
  arr.push({close:2,open:Math.random(),volume:Math.random(),time:i,currency:'DOGEUSDT'})
  arr.push({close:3,open:Math.random(),volume:Math.random(),time:i,currency:'ETHUSDT'})
  arr.push({close:4,open:Math.random(),volume:Math.random(),time:i,currency:'LTCUSDT'})
}
// console.log(arr)
// return
let closet_arr_last = {}
let grouped = arr.reduce((acc, cur) => {
  if (!acc[cur.time]) {
    acc[cur.time] = [];
  }
  if (!closet_arr_last[cur.currency]){
    closet_arr_last[cur.currency] = new Array(CLOSET_ARR).fill(0)
  }


  acc[cur.time].push([
    (cur.currency),
    parseFloat(cur.close),
    parseFloat(cur.volume),
  ]);
  return acc;
}, {});

let tRawOutput = []
let tRawInput = Object.entries(grouped).map(([time, values]) => {
  for (let i = 0; i < values.length; i++) {
    closet_arr_last[values[i][0]].push(values[i][1])
  }
  const outputRes = []
  for (let i = 0; i < values.length; i++) {
    const rsi = RSI.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] })
    const ema = EMA.calculate({ period:CLOSET_ARR, values: closet_arr_last[values[i][0]] });
    const macdValues = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closet_arr_last[values[i][0]]
    });
    const closeToday = closet_arr_last[values[i][0]].at(-1)
    const closeYesTodaday_1 = closet_arr_last[values[i][0]].at(-2)
    const closeYesTodaday_2 = closet_arr_last[values[i][0]].at(-3)
    closet_arr_last[values[i][0]].shift()
    values[i].push(rsi.at(-1))
    values[i].push(ema.at(-1))
    outputRes.push(closeToday>closeYesTodaday_1?1:0)
  }

  tRawOutput.push(outputRes)

  for (let i = 0; i < values.length; i++) {
    values[i].shift()
  }
  return [values.flat().concat(...[])];
});
const trainingData = tf.tensor3d(tRawInput);
const labels = tf.tensor2d(tRawOutput);

const splitIndex = Math.floor(trainingData.shape[0] * 0.99);
const [trainInputs, testInputs] = tf.split(trainingData, [splitIndex, trainingData.shape[0] - splitIndex], 0);
const [trainOutputs, testOutputs] = tf.split(labels, [splitIndex, labels.shape[0] - splitIndex], 0);



// Define the LSTM model
const model = tf.sequential();
model.add(tf.layers.lstm({ units: LSTM_LAYER_UNITS, inputShape: [null, trainingData.shape[2]] })); // Изменил число юнитов LSTM
model.add(tf.layers.dense({ units: labels.shape[1], activation: 'sigmoid' }));

// Compile the model
model.compile({ loss: 'binaryCrossentropy', optimizer: 'adam' }); // Изменил функцию потерь на binaryCrossentropy

// Train the model
async function trainModel() {
  await model.fit(trainInputs, trainOutputs, { epochs: EPOCHS, batchSize: BATCHSIZE }); // Добавил размер пакета

  // Predict new values
  const predictions = model.predict(testInputs);
  predictions.print();
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

  // console.log('правильных к неправильным:', isRight,isLose,predictionData.length);

  let totalAnswers = isRight + isLose;

  let correctPercentage = (isRight / totalAnswers) * 100;
  let incorrectPercentage = (isLose / totalAnswers) * 100;

  console.log("Процент верных ответов:", correctPercentage);
  console.log("Процент неверных ответов:", incorrectPercentage);
}

trainModel();
