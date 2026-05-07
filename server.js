const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // 150人の接続を安定させるための設定（おまじない）
    pingTimeout: 60000,
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 各部屋の勝者を管理するリスト
let roomWinners = {};

io.on('connection', (socket) => {
    
    // 部屋に入る
    socket.on('join_room', (data) => {
        socket.join(data.room);
        console.log(`[ENTRY] ${data.name} joined Room ${data.room}`);
    });

    // ボタンが押された
    socket.on('push_buzzer', (data) => {
        const room = data.room;
        // その部屋でまだ勝者が決まっていない場合
        if (!roomWinners[room]) {
            roomWinners[room] = data.name;
            console.log(`[BUZZ] ${data.name} is FIRST in Room ${room}`);
            // その部屋の人全員に通知（名前を強調して送る）
            io.to(room).emit('winner_announced', data.name.toUpperCase());
        }
    });

    // 管理者がリセット（重要：後で管理画面を作る時に使います）
    socket.on('reset_buzzer', (room) => {
        roomWinners[room] = null;
        console.log(`[RESET] Room ${room} is ready for next question`);
        io.to(room).emit('reset_all');
    });

    // 切断したときの処理（一応入れておく）
    socket.on('disconnect', () => {
        // 必要なら人数を減らす処理などをここに書く
    });
});

// 150人接続に対応するため、ポート番号を環境変数から取れるようにしておく（ネット公開用）
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('====================================');
    console.log(`📡 ARENA READY: http://localhost:${PORT}`);
    console.log('====================================');
});