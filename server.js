const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let roomData = {
  code: null,
  winner: null,
  isStarted: false,
  result: null // 'maru' or 'batsu'
};

io.on('connection', (socket) => {
  socket.emit('status-update', roomData);

  socket.on('create-code', () => {
    roomData.code = Math.floor(1000 + Math.random() * 9000).toString();
    roomData.winner = null;
    roomData.isStarted = false;
    roomData.result = null;
    io.emit('status-update', roomData);
  });

  socket.on('start-game', () => {
    roomData.isStarted = true;
    io.emit('status-update', roomData);
  });

  socket.on('push', (data) => {
    if (roomData.isStarted && data.code === roomData.code && roomData.winner === null) {
      roomData.winner = data.name;
      io.emit('winner', roomData.winner);
    }
  });

  // 主催者からの判定（まる・ばつ）
  socket.on('judge', (res) => {
    roomData.result = res;
    io.emit('judgement', res);
  });

  socket.on('reset', () => {
    roomData.winner = null;
    roomData.result = null;
    io.emit('status-update', roomData);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
