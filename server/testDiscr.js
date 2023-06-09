const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const arr = [
  { open: 123, close: 89895, vol: 7879, time: 12556, currency:'BTC' },
  { open: 12323, close: 734, vol: 2345, time: 12556, currency:'ETH' },
  { open: 12335, close: 724, vol: 46567, time: 12557, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12557, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
  { open: 12335, close: 724, vol: 46567, time: 12558, currency:'ETH' },
  { open: 135, close: 723, vol: 746, time: 12558, currency:'BTC' },
]


// Предварительная обработка данных
const currencyMap = { BTC: 0, ETH: 1 };
const processedData = arr.map(item => ({
  open: item.open / 100000, // Нормализация данных
  close: item.close / 100000,
  vol: item.vol / 100000,
  time: item.time,
  currency: currencyMap[item.currency],
}));

// Создание обучающего набора
const inputFeatures = ['open', 'close', 'vol', 'time'];
const outputFeatures = ['BTC', 'ETH'];
const windowSize = 3;

const trainData = [];
for (let i = 0; i < processedData.length - windowSize; i++) {
  const input = [];
  for (let j = 0; j < windowSize; j++) {
    const inputData = [];
    for (const feature of inputFeatures) {
      inputData.push(processedData[i + j][feature]);
    }
    input.push(inputData);
  }

  const outputData = [];
  for (const feature of outputFeatures) {
    outputData.push(processedData[i + windowSize][feature]);
  }

  trainData.push({ input, output: outputData });
}

// Создание модели
const model = tf.sequential();
model.add(tf.layers.lstm({ units: 32, inputShape: [windowSize, inputFeatures.length] }));
model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));

// Компиляция модели
model.compile({ loss: 'categoricalCrossentropy', optimizer: 'adam' });

// Создание обучающих тензоров
const inputTensor = tf.tensor(trainData.map(item => item.input));
const outputTensor = tf.tensor(trainData.map(item => item.output));

// Обучение модели
model.fit(inputTensor, outputTensor, { epochs: 10 }).then(() => {
  // Прогнозирование
  const testData = [
    { open: 124, close: 89000, vol: 8000, time: 12559, currency: 'BTC' },
    { open: 12340, close: 735, vol: 2350, time: 12559, currency: 'ETH' },
  ];

  const processedTestData = testData.map(item => ({
    open: item.open / 100000,
    close: item.close / 100000,
    vol: item.vol / 100000,
    time: item.time,
    currency: currencyMap[item.currency],
  }));

  const inputTest = [];
  for (let i = 0; i <= processedTestData.length - windowSize; i++) {
    const inputData = [];
    for (let j = 0; j < windowSize; j++) {
      for (const feature of inputFeatures) {
        inputData.push(processedTestData[i + j][feature]);
      }
    }
    inputTest.push(inputData);
  }

  const inputTestTensor = tf.tensor(inputTest);
  const predictions = model.predict(inputTestTensor);

  predictions.array().then(result => {
    const btcProbability = result[0][0];
    const ethProbability = result[0][1];

    console.log('BTC Price Probability:', btcProbability);
    console.log('ETH Price Probability:', ethProbability);
  });
});
