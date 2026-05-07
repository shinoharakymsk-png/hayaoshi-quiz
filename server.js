const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

let roomData = {
  code: null,
  winner: null,
  isStarted: false
};

io.on('connection', (socket) => {
  socket.emit('init', roomData);

  // 主催者：コード発行
  socket.on('create-code', () => {
    roomData.code = Math.floor(1000 + Math.random() * 9000).toString();
    roomData.winner = null;
    roomData.isStarted = false;
    io.emit('status-update', roomData);
  });

  // 主催者：スタート！
  socket.on('start-game', () => {
    roomData.isStarted = true;
    roomData.winner = null;
    io.emit('status-update', roomData);
  });

  // 参加者：ボタン押下
  socket.on('push', (data) => {
    if (roomData.isStarted && data.code === roomData.code && roomData.winner === null) {
      roomData.winner = data.name;
      io.emit('winner', roomData.winner);
    }
  });

  // 主催者：リセット（次の問題へ）
  socket.on('reset', () => {
    roomData.winner = null;
    io.emit('status-update', roomData);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
