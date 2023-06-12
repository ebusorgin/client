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
let currencies = [];
const CLOSET_ARR = 12*24
const DB_ARR_LENGTH_DAY = 100
const LSTM_LAYER_UNITS = 12*10
const EPOCHS =20
const BATCHSIZE = 12*24
let arr = [

]
for (let i = 0; i < 11000; i++) {
  arr.push({close:Math.random(),open:Math.random(),volume:Math.random(),time:i,currency:'BTCUSDT'})
  arr.push({close:Math.random(),open:Math.random(),volume:Math.random(),time:i,currency:'DOGEUSDT'})
  arr.push({close:Math.random(),open:Math.random(),volume:Math.random(),time:i,currency:'ETHUSDT'})
  arr.push({close:Math.random(),open:Math.random(),volume:Math.random(),time:i,currency:'LTCUSDT'})
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
    currencies.push(cur.currency)
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
  const predictionDataArray = Array.from(predictions.dataSync());
  const numRows = predictionDataArray.length / labels.shape[1];
  const numCols = labels.shape[1];

  const formattedPredictionData = [];

  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (let j = 0; j < numCols; j++) {
      row.push(predictionDataArray[i * numCols + j]);
    }
    formattedPredictionData.push(row);
  }

  console.log('Tensor');
  console.log(formattedPredictionData);
}

trainModel();
