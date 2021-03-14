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

            timerDiv.style.display = 'none';

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
            timerDiv.style.display = 'none';
            answerDiv.style.display = 'none';

            // Show game over screen
            gameOverDiv.style.display = 'block';
            gameOverDiv.innerHTML = '<h1>Game Over</h1><br><br>';
            gameOverDiv.innerHTML += `<div id="winner">Winner: ${username}</div>`;
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

    // Hide title screen
    ['title','messages','answer'].forEach(block => {
        let blockDiv = document.getElementById(block);
        blockDiv.style.display = 'none';
    });

    // Display question
    questionBlock.innerHTML = `<div class="category">${String(question.category_name).toUpperCase()}</div>`;
    questionBlock.innerHTML += `<div class="value">${question.value}</div><br>`;
    questionBlock.innerHTML += `<div class="question">${question.question}</div>`;
    questionBlock.style.display = 'block';

    // Display timer and start counting down
    timerDiv.style.display = 'block';
    startTimer(TIME_LIMIT,timerDiv);
}

function showAnswer() {
    timerDiv.style.display = 'none';

    answerDiv.innerHTML = `Correct Answer:<br><br>${question.answer}<br><br>`;
    answerDiv.style.display = 'block';
}

function startTimer(startTime, divId) {
    let timer = startTime, minutes, seconds;
    
    timerHandle = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        divId.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            connection.send("timesUp");
            showAnswer();
            clearInterval(timerHandle);

        }
    },1000);
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