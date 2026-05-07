<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>THE QUIZ SHOW FLAT</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        :root { --pop-yellow: #FFEB3B; --pop-pink: #FF4081; --pop-blue: #00BCD4; --dark-grey: #333; }
        
        body { 
            margin: 0; font-family: 'Helvetica Neue', Arial, "Hiragino Sans", sans-serif; 
            background: var(--pop-yellow); color: var(--dark-grey); 
            overflow: hidden; touch-action: manipulation;
        }

        .screen { display: none; height: 100vh; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .active { display: flex; }

        /* ランキング：フラット化 */
        #ranking-box { 
            position: fixed; top: 10px; left: 10px; background: white; 
            border: 4px solid var(--dark-grey); padding: 10px; border-radius: 0; 
            text-align: left; min-width: 180px; z-index: 100;
        }
        .rank-item { font-size: 1.2rem; font-weight: 900; border-bottom: 2px solid var(--dark-grey); padding: 2px 0; }

        /* 判定マーク：画面いっぱいのフラット表示 */
        #result-overlay { 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            display: none; align-items: center; justify-content: center; 
            font-size: 60rem; font-weight: bold; z-index: 1000; pointer-events: none;
            background: rgba(255,255,255,0.4);
        }

        /* 中央のタイマー＆ボタンエリア */
        .main-container { position: relative; width: 90vw; height: 90vw; max-width: 500px; max-height: 500px; display: flex; align-items: center; justify-content: center; }
        
        #timer-svg { position: absolute; width: 100%; height: 100%; transform: rotate(-90deg); }
        #timer-circle { fill: none; stroke: var(--pop-blue); stroke-width: 20; stroke-dasharray: 1000; stroke-dashoffset: 0; }

        /* ボタン：3D効果なしのフラットデザイン */
        #btn { 
            width: 80%; height: 80%; border-radius: 50%; 
            background: var(--pop-pink); border: 12px solid var(--dark-grey);
            cursor: pointer; font-size: 4rem; color: white; font-weight: bold; 
            z-index: 10; outline: none; transition: background 0.1s;
            box-shadow: none; /* 影を完全削除 */
        }
        #btn:active:not(:disabled) { background: #e91e63; transform: scale(0.98); }
        #btn:disabled { background: #ccc; border-color: #888; color: #666; cursor: default; }

        /* 文字装飾 */
        .big-text { font-size: 6rem; font-weight: 900; margin: 0; }
        .winner-tag { 
            background: #fff; padding: 10px 30px; border: 6px solid var(--dark-grey); 
            font-size: 3rem; font-weight: 900; z-index: 500;
        }

        /* 入力エリア */
        input { 
            padding: 20px; font-size: 1.5rem; border: 4px solid var(--dark-grey); 
            width: 80%; max-width: 400px; margin-bottom: 20px; border-radius: 0;
        }
        .mode-btn { 
            padding: 20px 40px; font-size: 2rem; border: 4px solid var(--dark-grey); 
            background: #fff; font-weight: bold; cursor: pointer; border-radius: 0;
        }
    </style>
</head>
<body>

    <div id="ranking-box" style="display:none;">
        <div style="font-size:0.8rem; font-weight:900; border-bottom:2px solid #333;">得点順位</div>
        <div id="ranking-list"></div>
    </div>

    <!-- 1. ホーム画面 -->
    <div id="home-screen" class="screen active">
        <h1 style="font-size: 4rem;">QUIZ QUIZ!</h1>
        <button class="mode-btn" onclick="showScreen('login-screen')">参加者</button>
        <button class="mode-btn" onclick="showScreen('admin-screen'); socket.emit('create-code');" style="margin-top:20px;">主催者</button>
    </div>

    <!-- 2. ログイン -->
    <div id="login-screen" class="screen">
        <input type="text" id="user-name" placeholder="氏名入力">
        <input type="text" id="room-code" placeholder="4桁コード">
        <button class="mode-btn" onclick="joinGame()">入場</button>
    </div>

    <!-- 3. 参加者メイン（ボタンをど真ん中に） -->
    <div id="player-screen" class="screen">
        <div id="player-msg" style="font-size:2rem; font-weight:900; position: absolute; top: 10%;">待機中</div>
        <div id="player-winner-name" class="winner-tag" style="display:none; position: absolute; top: 40%;"></div>
        <div class="main-container">
            <svg id="timer-svg"><circle id="timer-circle" cx="50%" cy="50%" r="45%"></circle></svg>
            <button id="btn" onclick="pushBtn()">PUSH</button>
        </div>
    </div>

    <!-- 4. 主催者メイン -->
    <div id="admin-screen" class="screen">
        <div id="admin-info" style="font-size:2rem; font-weight:bold;">参加コード</div>
        <div id="display-area" class="big-text">----</div>
        <div id="admin-winner-name" class="winner-tag" style="display:none;"></div>
        <div id="admin-btns" style="margin-top:40px;">
            <button class="mode-btn" onclick="socket.emit('start-game')" style="background:#4CAF50; color:#fff;">START</button>
        </div>
    </div>

    <!-- 判定：全画面 -->
    <div id="result-overlay"></div>

    <audio id="sound-push" src="https://maoudamashii.jokersounds.com/music/se/mp3/se_maoudamashii_system46.mp3"></audio>
    <audio id="sound-maru" src="https://maoudamashii.jokersounds.com/music/se/mp3/se_maoudamashii_onepoint23.mp3"></audio>
    <audio id="sound-batsu" src="https://maoudamashii.jokersounds.com/music/se/mp3/se_maoudamashii_onepoint33.mp3"></audio>
    <audio id="sound-timeout" src="https://maoudamashii.jokersounds.com/music/se/mp3/se_maoudamashii_onepoint26.mp3"></audio>

    <script>
        const socket = io();
        let myName = "", myCode = "", isAdmin = false;
        const circle = document.getElementById('timer-circle');
        let timerInterval;

        // タイマーの外周の長さを計算
        const r = window.innerWidth * 0.9 * 0.45; 
        const circumference = 2 * Math.PI * 150; // 固定値で調整

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            isAdmin = (id === 'admin-screen');
            document.getElementById('ranking-box').style.display = (id === 'player-screen' || id === 'admin-screen') ? 'block' : 'none';
        }

        function joinGame() {
            myName = document.getElementById('user-name').value;
            myCode = document.getElementById('room-code').value;
            if(!myName || !myCode) return;
            showScreen('player-screen');
        }

        function pushBtn() {
            document.getElementById('sound-push').play();
            socket.emit('push', { name: myName, code: myCode });
        }

        window.addEventListener('keydown', (e) => {
            if(!isAdmin) return;
            if(e.key === 'Enter') socket.emit('judge', 'maru');
            if(e.key === 'Backspace' || e.key === 'Delete') socket.emit('judge', 'batsu');
            if(e.key === ' ') {
                document.getElementById('result-overlay').style.display = 'none';
                socket.emit('reset');
            }
        });

        socket.on('start-timer', (seconds) => {
            clearInterval(timerInterval);
            const circle = document.getElementById('timer-circle');
            const totalDash = 942; // 固定値
            circle.style.strokeDasharray = totalDash;
            circle.style.strokeDashoffset = 0;
            
            let count = 0;
            timerInterval = setInterval(() => {
                count += 0.1;
                circle.style.strokeDashoffset = (count / seconds) * totalDash;
                if(count >= seconds) {
                    clearInterval(timerInterval);
                    if(!document.getElementById('btn').disabled) {
                        document.getElementById('sound-timeout').play();
                        document.getElementById('player-msg').innerText = "TIME UP";
                        document.getElementById('btn').disabled = true;
                    }
                }
            }, 100);
        });

        socket.on('status-update', (data) => {
            document.getElementById('result-overlay').style.display = "none";
            clearInterval(timerInterval);
            updateRanking(data.scores);
            
            if(isAdmin) {
                document.getElementById('admin-info').style.visibility = data.isStarted ? "hidden" : "visible";
                document.getElementById('display-area').innerText = data.isStarted ? "QUIZ QUIZ!" : data.code;
                document.getElementById('admin-btns').style.display = data.isStarted ? "none" : "block";
                document.getElementById('admin-winner-name').style.display = "none";
                document.getElementById('display-area').style.display = "block";
            } else {
                document.getElementById('btn').disabled = !data.isStarted;
                document.getElementById('player-msg').innerText = data.isStarted ? "PUSH!!" : "待機中";
                document.getElementById('player-winner-name').style.display = "none";
                document.getElementById('timer-circle').style.strokeDashoffset = 0;
            }
        });

        socket.on('winner', (name) => {
            clearInterval(timerInterval);
            if(isAdmin) {
                document.getElementById('admin-winner-name').innerText = name;
                document.getElementById('admin-winner-name').style.display = "block";
                document.getElementById('display-area').style.display = "none";
            } else {
                document.getElementById('player-winner-name').innerText = name;
                document.getElementById('player-winner-name').style.display = "block";
                document.getElementById('btn').disabled = true;
                document.getElementById('player-msg').innerText = "判定中...";
            }
        });

        socket.on('judgement', (data) => {
            const overlay = document.getElementById('result-overlay');
            overlay.innerText = data.res === 'maru' ? '○' : '×';
            overlay.style.color = data.res === 'maru' ? '#FF5252' : '#448AFF';
            overlay.style.display = "flex";
            document.getElementById(data.res === 'maru' ? 'sound-maru' : 'sound-batsu').play();
            updateRanking(data.scores);
        });

        function updateRanking(scores) {
            const list = document.getElementById('ranking-list');
            list.innerHTML = "";
            const sorted = Object.entries(scores || {}).sort((a,b) => b[1] - a[1]).slice(0, 5);
            sorted.forEach(([name, score], i) => {
                const div = document.createElement('div');
                div.className = 'rank-item';
                div.innerText = `${i+1}位 ${name}:${score}点`;
                list.appendChild(div);
            });
        }
    </script>
</body>
</html>
