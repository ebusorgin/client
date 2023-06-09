const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const neataptic = require('./neataptic/src/neataptic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const fieldSize = 200;
const numpoints = 1
POPULATION = []

function getRandomNumber(min, max) {
  // Проверяем, что min и max являются числами
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('Аргументы min и max должны быть числами.');
  }

  // Проверяем, что min меньше или равно max
  if (min > max) {
    throw new Error('min должно быть меньше или равно max.');
  }

  // Генерируем случайное число в диапазоне min и max
  return Math.floor(Math.random() * (max - min + 1)) + min;
}



class Point {
  constructor(size) {
    this.x = getRandomNumber(10,fieldSize-10);
    // this.x = 10;
    this.y = getRandomNumber(10,fieldSize-10);
    // this.y = 15;
    // this.size = this.generateNumberWithProportionalProbability(size);
    this.size = 4;
    this.distance = 0;
  }
  generateNumberWithProportionalProbability(max) {
    const randomNumber = Math.random();
    const probability = randomNumber * max;
    return Math.floor(probability) + 5;
  }
}

class Bot {
  constructor(genome) {
    this.genome = genome;
    this.x = fieldSize/2;
    this.y = fieldSize/2;
    this.level = 0;
    this.size = 20;
    this.crossover = 0;
    this.mutate = 0;
    this.speed = 5;
    this.napr = 1;///0-left  1-for 2- right
    this.fitness = 0;
    this.color = generateRandomColor()
    this.POINTS = []
    for (let i = 0; i < numpoints; i++) {
      this.POINTS.push(new Point(9));
    }

  }
  addReward(val) {
    this.fitness+=val
  }
  move([up,right,down,left]){

    if (up>down){
      this.y+=this.speed;
    }
    if (down>up){
      this.y-=this.speed;
    }
    if (left>right){
      this.x-=this.speed;
    }
    if (right>left){
      this.x+=this.speed;
    }
let crach = false

    if (this.y<=0) {this.y=0;}
    else if (this.y>=fieldSize) {this.y=fieldSize;}
    if (this.x>=fieldSize) {this.x=fieldSize;}
    else if (this.x<=0) {this.x=0;}
    return crach
  }
}

class Game {
  constructor(io, popSize) {

    this.io = io;



    for (let i = 0; i < popSize; i++) {
      const genome = new neataptic.architect.Random(6, 10, 5,{
        connections: 100,
        activation: 'sigmoid'
      });

      POPULATION.push(new Bot(genome));
    }
  }


  crossover() {
let top = 0
    const minF = -50
    let  bestGenome
    const sortedPopulation = POPULATION.sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < sortedPopulation.length/2; i++) {
      // if (sortedPopulation[i+1]&&sortedPopulation[i].fitness>1&&sortedPopulation[i+1].fitness>1){
        let crossover = sortedPopulation[i].crossover+sortedPopulation[i+1].crossover
        let mutate = sortedPopulation[i].mutate+sortedPopulation[i+1].mutate
        top++
        sortedPopulation[i] = new Bot(neataptic.Network.crossOver(sortedPopulation[i].genome, sortedPopulation[i+1].genome,Math.random() > .5));
        sortedPopulation[i].x = fieldSize/2
        sortedPopulation[i].y = fieldSize/2
        sortedPopulation[i].fitness = 0
        sortedPopulation[i].crossover = crossover+1;
        sortedPopulation[i].mutate = mutate+1;
        // sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
        if (!bestGenome){
          bestGenome = sortedPopulation[i]

        }
      // }
    }

    // sortedPopulation[0] = new Bot(neataptic.Network.crossOver(sortedPopulation[0].genome, sortedPopulation[1].genome));
    // sortedPopulation[1]= new Bot(neataptic.Network.crossOver(sortedPopulation[2].genome, sortedPopulation[3].genome));
    // sortedPopulation[2] = new Bot(neataptic.Network.crossOver(sortedPopulation[4].genome, sortedPopulation[5].genome));
    // sortedPopulation.reverse()



    // childBot1.genome.mutate(neataptic.methods.mutation.ALL)
    // childBot2.genome.mutate(neataptic.methods.mutation.ALL)
let dow = 0
let upd = 0
    for (let i = top; i < sortedPopulation.length; i++) {


      if (upd>4){
        dow++
        const genome = new neataptic.architect.Random(6, 10, 5,{
          connections: 100,
          activation: 'sigmoid'
        });

        sortedPopulation[i] = (new Bot(genome));
      }else{
        upd++
        for (let j = 0; j < i; j++) {

          // sortedPopulation[i] = new Bot(neataptic.Network.crossOver(sortedPopulation[i].genome, bestGenome.genome,Math.random() > .5));
          sortedPopulation[i].mutate+=sortedPopulation[i].mutate+1;
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
          sortedPopulation[i].genome.mutate(neataptic.methods.mutation.ALL)
        }

        sortedPopulation[i].x = fieldSize/2
        sortedPopulation[i].y = fieldSize/2
        sortedPopulation[i].fitness = 0
      }

    }


    // childBot1.genome.nodes.length
    //
    // for (let i = 3; i < sortedPopulation.length; i++) {
    //   const genome = new neataptic.architect.Random(3+numpoints, childBot1.genome.nodes.length, 5,{
    //     connections: childBot1.genome.connections.length,
    //     activation: 'sigmoid'
    //   });
    //   genome.mutate(neataptic.methods.mutation.ALL)
    //   sortedPopulation.push(new Bot(genome));
    // }
    POPULATION = sortedPopulation
    console.log('crossover',top,upd,dow)
    // POPULATION.sort((a, b) => b.fitness - a.fitness)
  }
  start() {

    setInterval(() => this.update(), 5);
    setInterval(() => this.crossover(), 10000); // Call crossover every 20 seconds

  }

  // stop() {
  //   clearInterval(this.intervalId);
  // }

  update() {
    POPULATION.forEach(bot => {
      this.updateBot(bot)
      this.io.sockets.emit('update', { bots: POPULATION});
    });


  }
  updateBot(bot) {
    const learningRate = 0.1;
    const momentum = 0.6;
    let dis1 = calculateDistances(bot).sort()
    let result = [].concat(...bot.POINTS.map(p=>{return [p.x/fieldSize,p.y/fieldSize]}));
    let input = [bot.x/fieldSize, bot.y/fieldSize, bot.speed/10].concat(...dis1,...result);
    input[3] = input[3]/fieldSize
    let c = bot.genome.activate(input);
    // console.log(input)
    let output = [c[0],c[1],c[2],c[3]]
    bot.move(output);
    if (bot.x==0||bot.x==fieldSize){
      if (bot.x==0){
        // bot.genome.propagate(learningRate, momentum, true, [...[0,1,0,0],bot.speed/10]);
      }
      if (bot.x==fieldSize){
        // bot.genome.propagate(learningRate, momentum, true, [...[0,0,0,1],bot.speed/10]);
      }
      bot.addReward(-1);
    }
    if (bot.y==0||bot.y==fieldSize){
      if (bot.y==0){
        // bot.genome.propagate(learningRate, momentum, true, [...[1,0,0,0],bot.speed/10]);
      }
      if (bot.y==fieldSize){
        // bot.genome.propagate(learningRate, momentum, true, [...[0,0,1,0],bot.speed/10]);
      }
      bot.addReward(-1);
    }
    if (c[0]==c[2]){
      bot.addReward(-1);
    }
    if (c[1]==c[3]){
      bot.addReward(-1);
    }
    // bot.addReward(-0.1);
    bot.speed = c[4]*10;
    let dis2 = calculateDistances(bot).sort()
    // let sum1 = dis1.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    // let sum2 = dis2.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    // let sumPr = output.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    let r = dis2[0]-dis1[0]
    if (r<0){
      bot.addReward(r*-1);
    }else{
      bot.addReward(r*-1);
    }
    // if (output[0]==output[2]){
    //   const target = calculateTarget([bot.x,bot.y,bot.POINTS[0].x,bot.POINTS[0].y])
    //   bot.genome.propagate(learningRate, momentum, true, [...target,bot.speed]);
    //
    // }else if(output[1]==output[3]){
    //   const target = calculateTarget([bot.x,bot.y,bot.POINTS[0].x,bot.POINTS[0].y])
    //   bot.genome.propagate(learningRate, momentum, true, [...target,bot.speed]);
    //
    // }
    // Loop through each point
    bot.POINTS.forEach((point, index) => {
      const dx = bot.x - point.x;
      const dy = bot.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      point.distance = Math.floor(distance)
      if (distance <= (bot.size + point.size)) {
        const target = calculateTarget([bot.x,bot.y,point.x,point.y])
        // console.log('sssssssssssssssssssssssss')
        bot.genome.propagate(learningRate, momentum, true, [...target,bot.speed/10]);

        bot.addReward(50);
      console.log('ПОПАЛ')
        bot.POINTS.splice(index, 1);
        bot.POINTS.push(new Point(9));
      }else{

      }
    });
  }
  updateBot2(bot) {
// console.log(bot)
//     console.log(POINTS[0])
    let result = [].concat(...POINTS.map(p=>{return [p.x,p.y]}));
    const target = calculateTarget([bot.x,bot.y,POINTS[0].x,POINTS[0].y])







    let input = [bot.x, bot.y, bot.speed].concat(...result);

    let output = bot.genome.activate(input);

      let crash = bot.move(output)
    const errors = [];

    for (let j = 0; j < output.length; j++) {
      const error = target[j] - output[j];
      errors.push(error);
    }
    const score = errors.map((error) => 1-Math.abs(error));
       console.log('output',input,output,target,score)
    const learningRate = 0.1;
    const momentum = 0.6;
    bot.genome.propagate(learningRate, false, true, target);

  }


}

let game = new Game(io,18);
game.start();

server.listen(3000, function () {
  console.log('listening on *:3000');
});

app.use(express.static('public'));
io.on('connection', (socket) => {
  socket.emit('setting', { fieldSize });
});

function calculateTarget(coordinates) {
  const target = [0, 0, 0, 0]; // Инициализируем целевые значения
  const x1 = coordinates[0];
  const y1 = coordinates[1];
  const x2 = coordinates[2];
  const y2 = coordinates[3];

  if (x1 > x2) {
    target[3] = 1;
  } else if (x2 > x1) {
    target[1] = 1;
  }

  if (y1 > y2) {
    target[2] = 1;
  } else if (y2 > y1) {
    target[0] = 1;
  }

  return target;
}
function calculateDistances(bot) {
  return bot.POINTS.map(point => {
    const dx = point.x - bot.x;
    const dy = point.y - bot.y;
    return Math.sqrt(dx * dx + dy * dy);
  });
}

function generateRandomColor() {
  const h = Math.random(); // Random hue value
  const s = Math.random() * 0.5 + 0.5; // Random saturation between 0.5 and 1
  const v = Math.random() * 0.5 + 0.5; // Random brightness between 0.5 and 1

  const rgb = hsvToRgb(h, s, v);
  const color = rgbToHex(rgb[0], rgb[1], rgb[2]);

  return color;
}

function hsvToRgb(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

