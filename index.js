const got = require('got');
const tmi = require('tmi.js');
const express = require('express');
const sws = require('simon-white-similarity');
const ws = require('ws');
require('dotenv').config();


const wsServer = new ws.Server({port: 8085});

const SCORE_THRESHOLD = 61;
const TIME_BETWEEN_ROUNDS = 30 * 1000;

let wsConnection;
let gameRunning = false;
let questions = [];
let currentQuestion = 0;
let leaderboard = {};

// Message handler for the web client
wsServer.on('connection',(connection) => {
    console.log('*WebSocket connected on port 8085');
    wsConnection = connection;

    connection.on('message', (message) => {
        console.log(message);

        if (message === 'timesUp') {
            sendNextQuestion();
        }
    });
    
    connection.on('end', () => {
        console.log('*WebSocket connection closed');
    });
});

const app = express();
const port = 8086;

app.use('/', express.static('public'));

app.listen(port, () => {
    console.log(`*Web server running and listening at http://localhost:${port}`);
});

const client = new tmi.Client({
    options: { debug: true, messageLogLevel: "info" },
    connection: {
        reconnect: true
    },
    channels: [ process.env.CHANNEL_NAME ]
});

client.connect().catch(console.error);

// Message handler for the twitch chat client
client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message.startsWith("!jeopardy") && !gameRunning) {
        if (tags.username !== process.env.CHANNEL_NAME) return;

        console.log(message);
        if (!wsConnection) return console.error("*Website client not connected");

        var numQuestions = message.split(/ (.+)/)[1];
        
        getQuestions(numQuestions).then((res) => {
            console.log(`*Starting Jeopardy with ${numQuestions} questions`);
            wsConnection.send("loadingQs");

            // reset leaderboard
            leaderboard = {};
        
            // reset then save questions in global variable
            questions = [];
            currentQuestion = 0;
            questions = res;

            // send first question to game client
            wsConnection.send(JSON.stringify(questions[currentQuestion]));
            console.log("Answer: ", questions[currentQuestion].answer);
            gameRunning = true;
        }).catch((error) => {
            console.error(error);
        });
        
        return;
    }

    // while the game is running, process messages and check for correct answers
    if (gameRunning) {
        // check how close of a match the user's text is
        let score = getSimilarityScore(questions[currentQuestion].answer, message);
        if (score > SCORE_THRESHOLD) {
            gameRunning = false;
            
            let username = (tags['display-name'] === '')? tags.username : tags['display-name'];
            
            if (!leaderboard[username]) {
                leaderboard[username] = questions[currentQuestion].value;
            } else {
                leaderboard[username] += questions[currentQuestion].value;
            }
            
            wsConnection.send(`answered|${username}|${JSON.stringify(leaderboard)}`);

            sendNextQuestion();
        }
    }
    
});

function getSimilarityScore(answer, guess) {
    answer = answer.replace(/<[^>]*>/g, '')
                    .replace(/[^\w\s]/g, '')
                    .replace(/^(the|a|an) /i, '')
                    .trim()
                    .toLowerCase();
    
    guess = guess.replace(/\s+(&nbsp;|&)\s+/i, ' and ')
                    .replace(/[^\w\s]/i, '')
                    .replace(/^(what|whats|where|wheres|who|whos) /i, '')
                    .replace(/^(is|are|was|were) /i, '')
                    .replace(/^(the|a|an) /i, '')
                    .replace(/\?+$/, '')
                    .trim()
                    .toLowerCase();
    
    const score = sws(answer, guess) * 100;
    console.log(`* Similarity: ${score} - Answer: "${answer}" - Guess: "${guess}"`);
    return score;
}

async function getQuestions(numQs = 5) {
    if (isNaN(numQs)) throw(`Invalid numQs "${numQs}"`);
    if (numQs < 1) throw(`Invalid numQs "${numQs}"`);
    if (numQs > 50) throw(`Invalid numQs "${numQs}"`);
    try {
        const popCats = [306,136,42,780,21,105,25,103,7,442,67,227,109,114,31,176,582,1114,508,49,561,223,
                        770,622,313,253,420,83,184,211,51,539,267,357,530,369,672,793,78,574,777,680,50,99,
                        309,41,26,249,1420,218,1145,1079,139,89,17,197,37,2537,705,1800,897,1195,128];

        // get 5 random categoires from the list of popular categories
        let randCats = [];
        for (let x = 0; x < 5; x++) {
            randCats.push(popCats[Math.floor(Math.random() * popCats.length)]);
        }

        // get the number of questions per category to evenly spread them out
        let questionsPerCat = 0;
        if (numQs < 5) {
            questionsPerCat = 1;
            randCats.length = numQs;
        } else {
            questionsPerCat = Math.floor(numQs / randCats.length);
        }

        let questions = [];
        for (let i = 0; i < randCats.length; i++) {
            
            const resoponse = await got(`http://jservice.io/api/category?id=${randCats[i]}`);
            const parsedData = JSON.parse(resoponse.body);
            
            for (let j = 0; j < questionsPerCat; j++) {
                let temp;
                do {
                    temp = parsedData.clues[Math.floor(Math.random() * parsedData.clues.length)];
                } while (temp.invalid_count !== null && temp.question !== "");

                temp.category_name = parsedData.title;
                if (!temp.value) temp.value = 200;
                questions.push(temp);
            }
        }
        
        console.log(`*Gathered ${questions.length} questions`);
        return questions;
        
    } catch (error) {
        console.log(error.response.body);
    }
}

function sendNextQuestion() {
    // wait and then send the next question
    gameRunning = false;
    setTimeout(() => {
        if (currentQuestion < questions.length -1 ) {
            currentQuestion++;
            wsConnection.send(JSON.stringify(questions[currentQuestion]));
            console.log("Answer: ", questions[currentQuestion].answer);
            gameRunning = true;
        } else {
            wsConnection.send(`gameover|${getWinner()}`);
            console.log('*sending gameover message');
        }
        
    },TIME_BETWEEN_ROUNDS);
}

function getWinner() {
    if (Object.keys(leaderboard).length === 0) {
        return `Nobody!`;
    }

    let index, max = 0;

    for(const [key, value] of Object.entries(leaderboard)) {
        if(value > max) {
            max = value;
            index = key;
        }
    }

    return `${index} with ${max} points!`;
    
}