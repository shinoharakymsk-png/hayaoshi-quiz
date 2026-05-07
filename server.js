const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

// クイズの状態管理
let roomData = { 
    code: null,      // 4桁の参加コード
    winner: null,    // 回答権を獲得した人
    isStarted: false, // ゲームが開始されているか
    scores: {}       // 参加者のスコアデータ
};

io.on('connection', (socket) => {
    // 接続時に最新の状態を共有
    socket.emit('status-update', roomData);

    // 【主催者】コード発行 & スコアリセット
    socket.on('create-code', () => {
        roomData.code = Math.floor(1000 + Math.random() * 9000).toString();
        roomData.winner = null;
        roomData.isStarted = false;
        roomData.scores = {}; 
        io.emit('status-update', roomData);
    });

    // 【主催者】クイズ本番開始
    socket.on('start-game', () => {
        roomData.isStarted = true;
        roomData.winner = null;
        // 全員に状態更新とタイマー開始（10秒）を通知
        io.emit('status-update', roomData);
        io.emit('start-timer', 10);
    });

    // 【参加者】ボタン押下
    socket.on('push', (data) => {
        // 開始済み、コード一致、かつまだ誰も押していない場合のみ受理
        if (roomData.isStarted && data.code === roomData.code && roomData.winner === null) {
            roomData.winner = data.name;
            // 誰かが押した瞬間にタイマーを止めるため、winnerイベントを即座に送る
            io.emit('winner', roomData.winner);
        }
    });

    // 【主催者】マル・バツ判定
    socket.on('judge', (res) => {
        if (res === 'maru' && roomData.winner) {
            roomData.scores[roomData.winner] = (roomData.scores[roomData.winner] || 0) + 1;
        }
        // 判定結果と最新ランキングを送信
        io.emit('judgement', { res, scores: roomData.scores });
    });

    // 【主催者】次の問題へ（スペースキー）
    socket.on('reset', () => {
        roomData.winner = null;
        roomData.isStarted = true; 
        // 状態を一度リセットしてから、新しいタイマーを走らせる
        io.emit('status-update', roomData);
        io.emit('start-timer', 10);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running: OK`));
