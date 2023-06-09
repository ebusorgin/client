let fieldSize = 400;
let socket = io();
let p5Instances = [];

class Bot {
  constructor(p5, data) {
    this.p5 = p5;
    this.x = data.x;
    this.y = data.y;
    this.size = data.size;
    this.color = data.color;
    this.POINTS = data.POINTS;
  }

  show() {
    this.p5.fill(this.color);
    this.p5.ellipse(this.x, fieldSize - this.y, this.size, this.size);
  }
}

class Environment {
  constructor() {
    this.bots = [];
  }

  p5Setup(index, botData) {
    return function(p) {
      p.setup = function() {
        let canvas = p.createCanvas(fieldSize, fieldSize);
        canvas.parent(`canvas-${index}`);
        p.frameRate(50);
      }

      p.draw = function() {
        if (this.bots[index]) {
          p.background(0);
          this.bots[index].show();
          this.bots[index].POINTS.forEach(point => {
            p.fill(this.bots[index].color);
            p.ellipse(point.x, fieldSize - point.y, point.size, point.size);
          });
        }
      }.bind(this);
    }.bind(this);
  }

  update(data) {
    data.bots.forEach((botData, index) => {
      let bot = new Bot(p5Instances[index], botData);
      this.bots[index] = bot;
    });
  }

  setting(data) {
    fieldSize = data.fieldSize;
    p5Instances.forEach((p5Instance) => {
      p5Instance.resizeCanvas(fieldSize, fieldSize);
    });
  }
}

const env = new Environment();

socket.on('update', data => {
  let newBotsCount = data.bots.length - env.bots.length;
  for (let i = 0; i < newBotsCount; i++) {
    let div = document.createElement('div');
    div.classList.add('canvas-block');
    div.setAttribute('id', `canvas-block-${env.bots.length + i}`);

    let canvasDiv = document.createElement('div');
    canvasDiv.setAttribute('id', `canvas-${env.bots.length + i}`);
    div.appendChild(canvasDiv);

    let descDiv = document.createElement('div');
    div.appendChild(descDiv);

    document.getElementById('canvas-container').appendChild(div);

    let p5Instance = new p5(env.p5Setup(env.bots.length + i));
    p5Instances.push(p5Instance);
  }
  env.update(data);
  data.bots.forEach((bot, index) => {
    let sumPr = bot.genome.connections.reduce((accumulator, currentValue) => accumulator + currentValue.weight, 0);
    let descDiv = document.querySelector(`#canvas-block-${index} > div:last-child`);
    descDiv.innerHTML = `<span >${index} <span style="background-color: ${bot.color}">BOT</span>
    <br>fitness (${Math.floor(bot.fitness)})
    <br>cros/mut ${bot.crossover} ${bot.mutate}
    <br>nodes/conn ${bot.genome.nodes.length} ${bot.genome.connections.length}
    <br>distance ${bot.POINTS[0].distance} </span>`;
  });
});

socket.on('setting', data => env.setting(data));
