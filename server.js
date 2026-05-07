const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// フォルダを指定せず、このファイルと同じ場所にあるファイルを表示する設定
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 早押し判定の変数
let winner = null;

io.on('connection', (socket) => {
  console.log('ユーザーが接続しました');

  // 誰かがボタンを押した時
  socket.on('push', (name) => {
    if (winner === null) {
      winner = name;
      io.emit('winner', winner); // 全員に誰が押したか送る
    }
  });

  // リセットボタンが押された時
  socket.on('reset', () => {
    winner = null;
    io.emit('reset');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
