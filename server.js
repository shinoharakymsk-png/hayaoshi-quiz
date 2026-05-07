const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

// サーバー側で管理するデータ
let roomData = { 
    code: null,      // 参加用4桁コード
    winner: null,    // 最初に押した人の名前
    isStarted: false, // クイズが進行中か
    scores: {}       // { "名前": スコア }
};

io.on('connection', (socket) => {
    // 接続時に現在の状態を送信
    socket.emit('status-update', roomData);

    // 【主催者】コード生成（リセットも兼ねる）
    socket.on('create-code', () => {
        roomData.code = Math.floor(1000 + Math.random() * 9000).toString();
        roomData.winner = null;
        roomData.isStarted = false;
        roomData.scores = {}; 
        io.emit('status-update', roomData);
    });

    // 【主催者】クイズ開始（STARTボタン）
    socket.on('start-game', () => {
        roomData.isStarted = true;
        roomData.winner = null;
        io.emit('status-update', roomData);
        io.emit('start-timer', 10); // 10秒タイマー開始
    });

    // 【参加者】ボタン押下
    socket.on('push', (data) => {
        // 「開始済み」かつ「コード一致」かつ「まだ勝者がいない」場合のみ受理
        if (roomData.isStarted && data.code === roomData.code && roomData.winner === null) {
            roomData.winner = data.name;
            io.emit('winner', roomData.winner);
        }
    });

    // 【主催者】正誤判定（Enter = maru, Delete = batsu）
    socket.on('judge', (res) => {
        if (res === 'maru' && roomData.winner) {
            roomData.scores[roomData.winner] = (roomData.scores[roomData.winner] || 0) + 1;
        }
        // 判定結果と最新スコアを全員に即時送信
        io.emit('judgement', { res, scores: roomData.scores });
    });

    // 【主催者】次の問題へ（スペースキー）
    socket.on('reset', () => {
        roomData.winner = null;
        roomData.isStarted = true; // 参加画面（QUIZ QUIZ!）を維持
        io.emit('status-update', roomData);
        io.emit('start-timer', 10); // タイマーを「0」から再スタート
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
