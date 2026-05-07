const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let roomData = { 
    code: null, 
    winner: null, 
    isStarted: false, 
    scores: {} // { "名前": 点数 }
};

io.on('connection', (socket) => {
    socket.emit('status-update', roomData);

    socket.on('create-code', () => {
        roomData.code = Math.floor(1000 + Math.random() * 9000).toString();
        roomData.winner = null;
        roomData.isStarted = false;
        roomData.scores = {}; 
        io.emit('status-update', roomData);
    });

    socket.on('start-game', () => {
        roomData.isStarted = true;
        roomData.winner = null;
        io.emit('status-update', roomData);
        io.emit('start-timer', 10); // 10秒タイマー開始
    });

    socket.on('push', (data) => {
        if (roomData.isStarted && data.code === roomData.code && roomData.winner === null) {
            roomData.winner = data.name;
            roomData.isStarted = false; // 誰かが押したらタイマー停止
            io.emit('winner', roomData.winner);
        }
    });

    socket.on('judge', (res) => {
        if (res === 'maru' && roomData.winner) {
            roomData.scores[roomData.winner] = (roomData.scores[roomData.winner] || 0) + 1;
        }
        io.emit('judgement', { res, scores: roomData.scores });
    });

    socket.on('reset', () => {
        roomData.winner = null;
        roomData.isStarted = false;
        io.emit('status-update', roomData);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('OK'));
