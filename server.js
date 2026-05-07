const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

// ルーム情報を保存する変数
let roomData = {
  code: null,
  winner: null
};

io.on('connection', (socket) => {
  // 接続時に現在の状況を送信
  socket.emit('init', roomData);

  // 主催者がコードを生成
  socket.on('create-code', () => {
    roomData.code = Math.floor(1000 + Math.random() * 9000).toString(); // 4桁のランダム数字
    roomData.winner = null;
    io.emit('new-room', roomData.code);
  });

  // 参加者がボタンを押した
  socket.on('push', (data) => {
    if (roomData.code && data.code === roomData.code && roomData.winner === null) {
      roomData.winner = data.name;
      io.emit('winner', roomData.winner);
    }
  });

  // リセット
  socket.on('reset', () => {
    roomData.winner = null;
    io.emit('reset');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
