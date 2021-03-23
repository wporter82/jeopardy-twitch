# Jeopardy for Twitch

Play Jeopardy with actual questions used on the show on [Twitch.tv](https://twitch.tv/). You are the host and your twitch chat are the contestants. You stream the game screen and whoever types the answer first gets the points for that question. 


Using [jservice.io](http://jservice.io/) to supply questions. This includes categories, dollar value, and airdate of the question in order to provide some context.

Also using the [simon-white-similarity](https://www.npmjs.com/package/simon-white-similarity) string matching algorithm to determine correct answers.

## Setup
```
$ npm install
$ cp .env.example .env
```

Add your twitch channel to the `.env` file

```
CHANNEL_NAME=<channel>
```

## Start Server
```
$ npm start
```
The running server will log incoming messages for debugging as well as display the answer for you to see as the host. What you choose to do with this answer is up to you.

Once the server is running, open a browser to [http://localhost:8086](http://localhost:8086). This is the game screen that you want displayed on stream to the viewers.

When you are ready to play type `!jeopardy` in the chat and it will start a game with 5 questions. You can specify any number from 1 to 50 for a game with as many questions as you want, ie: `!jeopardy 25`

## Known Issues:
* Currently no way to start a new game without restarting the server and refreshing the client
* Question number is not displayed so there is no way to know how many questions there are in total and how many are left to go
* Game server isn't able to provide any feedback in chat without adding an OAuth Token so it is currently not being done
* Game screen needs to be cleaned up and made to look better