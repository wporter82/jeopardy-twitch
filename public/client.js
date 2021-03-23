let connection = new WebSocket('ws://localhost:8085');

let timerDiv = document.getElementById('timer');
let messagesDiv = document.getElementById('messages');
let title = document.getElementById('title');
let questionBlock = document.getElementById('questionBlock');
let answerDiv = document.getElementById('answer');
let gameOverDiv = document.getElementById('gameover');
let lbDiv = document.getElementById('leaderboard');

const TIME_LIMIT = 2 * 60;

let question;
let timerHandle;

connection.onopen = function (evt) {
    console.log("*Connected to WebSocket on port 8085");
                    
    connection.onmessage = function (msg) {

        if (msg.data === 'loadingQs') {
            messagesDiv.innerHTML = 'Loading questions...';
        }

        // If data coming server is JSON, parse and process it
        if (msg.data.startsWith('{')) {
            question = JSON.parse(msg.data);
            console.log(question);

            startGame(question);
        }

        if (msg.data.startsWith('answered')) {
            let username = msg.data.split('|')[1];
            clearInterval(timerHandle);

            hideTimer();

            showAnswer();
            answerDiv.innerHTML += `by User: ${username}`

            updateLeaderboard(JSON.parse(msg.data.split('|')[2]));
        }

        if(msg.data.startsWith('gameover')) {
            let username = msg.data.split('|')[1];
            console.log("Ending Game");
            
            // Hide game screen
            title.style.display = 'none';
            messagesDiv.style.display = 'none';
            questionBlock.style.display = 'none';
            hideTimer();
            hideAnswer();

            // Show game over screen
            gameOverDiv.innerHTML = '<h1>Game Over</h1><br><br>';
            gameOverDiv.innerHTML += `<div id="winner">Winner: ${username}</div>`;
            gameOverDiv.style.display = 'block';
        }
    }

    connection.onclose = function (evt) {
        console.log(`*Connection to ${evt.target.url} was closed`);
        
        // Hide game screens
        ['questionBlock','timer','answer','gameover'].forEach(block => {
            let blockDiv = document.getElementById(block);
            blockDiv.style.display = 'block';
        });
        

        // Show title screen with message about disconnection
        title.style.display = 'block';

        messagesDiv.innerHTML = 'Connection to server was lost';
        messagesDiv.style.display = 'block';

        // reset game elements
        ['questionBlock','timer','answer'].forEach(block => {
            let blockDiv = document.getElementById(block);
            blockDiv.innerHTML = '';
            blockDiv.style.display = 'none';
        });
    }
}

connection.onerror = function (error) {
    console.log(error);
}

function startGame(question) {
    console.log("Starting game loop");

    // Hide title and  and game over screens
    ['title','messages','answer','gameover'].forEach(block => {
        let blockDiv = document.getElementById(block);
        blockDiv.style.display = 'none';
    });

    // reset leaderboard
    updateLeaderboard([]);

    // Display question
    questionBlock.innerHTML = `<div class="category">${String(question.category_name).toUpperCase()}</div>`;
    questionBlock.innerHTML += `<div class="airdate">Airdate: ${formatAirdate(question.airdate)}</div>`;
    questionBlock.innerHTML += `<div class="value">Points: ${question.value}</div>`;
    questionBlock.innerHTML += `<div class="question-number">Question ${question.question_number}</div><br>`;
    questionBlock.innerHTML += `<div class="question">${question.question}</div>`;
    questionBlock.style.display = 'block';

    // Display timer and start counting down
    startTimer(TIME_LIMIT);
}

function showAnswer() {
    answerDiv.style.transform = 'scale(0)';
    answerDiv.style.display = 'block';
    answerDiv.innerHTML = `Correct Answer:<br><br>${question.answer}<br><br>`;

    let scale = 0;
    let interval = 0.05;

    let animAnswer = setInterval(function () {
        scale += interval;

        answerDiv.style.transform = `scale(${scale})`;

        if (scale >= 1) {
            clearInterval(animAnswer);
        }
    }, 4);
}

function hideAnswer() {
    answerDiv.style.transform = 'scale(1)';
    
    let scale = 1;
    let interval = 0.05;

    let animAnswer = setInterval(function () {
        scale -= interval;

        answerDiv.style.transform = `scale(${scale})`;

        if (scale <= 0) {
            answerDiv.style.display = 'none';
            clearInterval(animAnswer);
        }
    }, 4);
}

function updateLeaderboard(leaderboard) {
    console.log(leaderboard);

    let lbArray = Object.keys(leaderboard).map(function (key) {
        console.log(key);
        return [key, leaderboard[key]];
    });

    console.log(lbArray);

    lbArray.sort(function (first, second) {
        return second[1] - first[1];
    });


    lbDiv.innerHTML = "Leaderboard:<br><br>";

    lbArray.forEach(user => {
        lbDiv.innerHTML += `${user[0]}: ${user[1]}`;
    });
}

function startTimer(startTime) {
    timerDiv.style.transform = 'scale(0)';
    timerDiv.style.display = 'block';
    timerDiv.textContent = '00:00';
    
    let scale = 0;
    let interval = 0.05;

    let animTimer = setInterval(function () {
        scale += interval;

        timerDiv.style.transform = `scale(${scale})`;

        if (scale >= 1) {
            clearInterval(animTimer);
        }
    }, 4);

    let timer = startTime, minutes, seconds;
    
    timerHandle = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        timerDiv.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            connection.send("timesUp");
            hideTimer();
            showAnswer();
            clearInterval(timerHandle);

        }
    },1000);
}

function hideTimer() {
    timerDiv.style.transform = 'scale(1)';
    
    let scale = 1;
    let interval = 0.05;

    let animTimer = setInterval(function () {
        scale -= interval;

        timerDiv.style.transform = `scale(${scale})`;

        if (scale <= 0) {
            timerDiv.style.display = 'none';
            clearInterval(animTimer);
        }
    }, 4);
}

function formatAirdate(dateTime) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
    ];
    const newDate = new Date(dateTime);

    return `${monthNames[newDate.getMonth()]} ${newDate.getDate()} ${newDate.getFullYear()}`;
}