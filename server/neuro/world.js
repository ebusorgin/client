const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { Neat, Methods, Architect } = require('neataptic');

app.use(express.static(__dirname + '/public'));

// Запускаем сервер
http.listen(3000, function () {
  console.log('listening on *:3000');
});

// Создаем новую среду
const neat = new Neat(4, 2, null, {
  mutation: Methods.Mutation.ALL,
  popsize: 10
});

neat.evolve().then(() => {
  console.log('Evolution done!');
});

// Отправляем обновленное состояние каждую секунду
setInterval(() => {
  io.emit('update', neat.population);
}, 1000);
