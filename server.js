var errcodes = {
    PLAYER : 1,
    WHITECARD : 2,
    BLACKCARD : 3,
}

var black = require("./db_maker/black").b
console.log(black[0])

var white = require("./db_maker/white").w

var black_index = 0;
var current_black;

var express = require('express'); //framework de base
var http = require('http'); //normalement pas nécessaire car les app express couvrent déjà les fonctionnalités du http.Server, on doit cependant le passer à socket.io
var path = require('path');
var socketIO = require('socket.io'); //gère la connection avec le joueur
var cl = require("@twilcynder/commandline") //jsavais bien qu'il finirait par m'être utile

class Player {
    constructor(name) {
      this.score = 0;
      this.name = name;
    }
}  

function intRand(max){
    return Math.floor(Math.random() * max);
}

function setBlackCard(id){
    gameNsp.emit('black-card', black[id]);
    current_black = black[id];
}

function selectBlackCard(){
    setBlackCard(intRand(black.length));
}

function sendBlackCard(socket){
    socket.emit('black-card', current_black);
}

function addWhiteCard(socket, cardId){
    let card = white[cardId];
    if (!card) return errcodes.WHITECARD;

    socket.emit('add-white-card', card);
}

function distributeWhiteCards(){
    for (id in players){
        if (id == czar_order[czar_index]) continue;
        addWhiteCard(gameNsp.connected[id], intRand(white.length))
    }
}

function distributeWhiteCardsInit(playerSocket){
    for (let i = 0; i < 7; i++){
        addWhiteCard(playerSocket, intRand(white.length))
    }
}

function checkAllAswers(){
    if (!players) return null;
    for (id in players){
        if (!answers[id] && id != czar_order[czar_index]) return false;
    }
    return true;
}

function makeAnswerArray(){
    let arr = []
    for (id in players){
        if (id != czar_order[czar_index]){
            arr.push({card: answers[id], playerID: id});
        }
    }
    return arr
}
function startAnswerReview(){
    reviewing = true;
    console.log("All answers received")
    gameNsp.emit('start-review', makeAnswerArray());
}

function addPlayer(socket, player){
    socket.emit('new-player', player);
}

function newPlayer(player){
    gameNsp.emit('new-player', player);
}

function getPlayerIndex(playerID){
    for (let i = 0; i < czar_order.length; i++){
        if (czar_order[i] == playerID) return i;
    }
    return null;
}

function startGame(){
    players = {};
    let socket
    for (id in lobbyPlayers){
        socket = lobbyNsp.connected[id]
        if (!socket) continue;
        socket.emit('start-game', lobbyPlayers[id]);
    }
    selectBlackCard();
    czar_order = [];
    czar_index = -1;
}

function selectCzar(i){
    players[czar_order[i]].socket.emit('czar');
}

function newTurn(index){
    gameNsp.emit('new-turn');
    index = (typeof index == "number") ? index : ++czar_index;
    if (index >= czar_order.length) index = 0;
    selectCzar(index);
    answers = {};
    reviewing = false;
    czar_index = index;
}

function nextTurn(index){ //same as newTurn but with card distribution
    distributeWhiteCards();
    selectBlackCard()
    newTurn(index);
}

cl.commands = {
    blackCard:(n)=>{
        n = parseInt(n) || ((black_index++) % black.length);
        console.log(n)
        setBlackCard(n);
    },
    whiteCards:()=>{
        distributeWhiteCards()
    },
    getConnectedLobby:()=>{
        for (id in lobbyNsp.connected){
            console.log(id);
        }
    },
    getConnectedGame:()=>{
        for (id in gameNsp.connected){
            console.log(id);
        }
    },
    getPlayers:()=>{
        for (id in players){
            console.log(id + " : " + players[id].player.name);
        }
    },
    getCzarOrder:()=>{
        for (let i = 0; i < czar_order.length; i++){
            if (i == czar_index){
                console.log(i + " : " + czar_order[i] + " ( current czar)");
            } else {
                console.log(i + " : " + czar_order[i]);
            }
        }
    },
    startGame:()=>{
        startGame();
    }
}

var answers = {};
var lobbyPlayers = {};
var lobbyKing = null;
var players = null;
var czar_order = null;
var czar_index;
var reviewing = false;

var app = express(); //le serveur
var server = http.Server(app); //on crée un object http.Server avec le serveur déjà existant
var io = socketIO(server); //serveur socketIO, qu'on bind au server express/HTTP
var gameNsp = io.of('/game');
var lobbyNsp = io.of('/lobby')

app.use('/static', express.static(__dirname + '/static')); //pas compris

app.use(function(req, res, next){
    console.log("Request : " + req.method + " " + req.url);
    cl.stopLogging();
    next();
})

// Routing
app.get('/', function(request, response) { //on serve la page d'accueil
    response.sendFile(path.join(__dirname, 'lobby.html'));
});

app.get('/game', function(request, response){
    if (!players){
        response.redirect('/')
    } else {
        response.sendFile(path.join(__dirname, 'game.html'));
    }
})

app.set('port', 5000); //on ne va pas utiliser app.listen mais server.listen, il faut donc indiquer à l'app quel port elle utilise

lobbyNsp.on('connection', function(socket) { //callback lancé à la connection d'un client
    console.log("New connection on the lobby namespace with ID " + socket.id)

    socket.on('new-player', function(data){
        if (players) {
            console.log("Player " + data + " tried to join the lobby while the game was running.");
            socket.emit('start-game', data);
            return;
        }

        if (!lobbyKing){
            lobbyKing = socket.id;
            socket.emit('lobby-king')
        }

        console.log("New player : " + data);

        if (lobbyPlayers[socket.id]){
            lobbyNsp.emit('rename-player', lobbyPlayers[socket.id], data);            
        } else {
            lobbyNsp.emit('new-player', data);
        }
        lobbyPlayers[socket.id] = data;
        cl.stopLogging();
    })

    socket.on('start-game', function(){
        startGame();
    })

    socket.on('disconnect', function(){
        lobbyNsp.emit('delete-player', lobbyPlayers[socket.id])
        delete lobbyPlayers[socket.id]
        if (lobbyKing == socket.id) lobbyKing = null;
        console.log("User " + socket.id + " disconnected")
        cl.stopLogging();
    })

    for (id in lobbyPlayers){
        socket.emit('new-player', lobbyPlayers[id]);
    }



    cl.stopLogging();
});

gameNsp.on('connection', function(socket){
    console.log("New connection on the game namespace with ID " + socket.id)

    if (!players) socket.emit('no-game-running');

    socket.on('answer', function(data){
        if (reviewing) return;
        console.log('Received answer from ' + socket.id + " : " + data);
        answers[socket.id] = data;

        if (checkAllAswers()){
            startAnswerReview();
        }

        cl.stopLogging();
    })

    socket.on('winner-choosed', function(id){
        if (!players) return;
        if (players[id]){
            players[id].player.score++;
            gameNsp.emit('update-score', players[id].player);
        }
        nextTurn();
    })

    socket.on('init-game', function(data){
        if (!players) {
            socket.emit('no-game-running');
            return;
        }
        players[socket.id] = {socket: socket, player: new Player(data, socket)};

        distributeWhiteCardsInit(socket);
        sendBlackCard(socket);

        newPlayer(players[socket.id].player)
 
        for (playerID in players){
            if (playerID != socket.id){
                addPlayer(socket, players[playerID].player);
            }
        }
        czar_order.push(socket.id);
        if (czar_index < 0){
            newTurn();
        }

    })

    socket.on('disconnect', function(){
        if (!players || !players[socket.id]) return;
        gameNsp.emit('delete-player', players[socket.id].player.name);
        delete players[socket.id];

        let index = getPlayerIndex(socket.id);
        czar_order.splice(index, 1);
        console.log(index, czar_index);

        if (czar_index == index){
            newTurn(czar_index);
        }
        if (czar_index > index) czar_index--;

        console.log("User " + socket.id + " disconnected")
        cl.stopLogging();
    })

    cl.stopLogging();  
})

server.listen(5000, function() {
    console.log('Starting server on port 5000');
    cl.stopLogging()
});
cl.start()
