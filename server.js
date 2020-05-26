var errcodes = {
    PLAYER : 1,
    WHITECARD : 2,
    BLACKCARD : 3,
}

var black = [
    "test b 1",
    "test b 2",
]

var white = [
    "test w 1",
    "test w 2",
    "test w 3",
    "test w 4",
    "test w 5",
    "test w 6",
    "test w 7",
    "test w 8",
    "test w 9",
    "test w 10",
]

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

    socket.emit("add-white-card", card);
}

function distributeWhiteCards(){
    for (id in gameNsp.connected){
        addWhiteCard(id, intRand(white.length))
    }
}

function distributeWhiteCardsInit(playerSocket){
    for (let i = 0; i < 7; i++){
        addWhiteCard(playerSocket, intRand(white.length))
    }
}

function checkAllAswers(){
    if (!players) return;
    for (id in players){
        
    }
}

function addPlayer(socket, player){
    socket.emit('new-player', player);
}

function newPlayer(player){
    gameNsp.emit('new-player', player);
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
            console.log(id + " : " + players[id].name);
        }
    },
    startGame:()=>{
        startGame();
    }
}

var answers = {};
var lobbyPlayers = {};
var players = null;

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
        console.log("New player : " + data);

        if (lobbyPlayers[socket.id]){
            lobbyNsp.emit('rename-player', lobbyPlayers[socket.id], data);            
        } else {
            lobbyNsp.emit('new-player', data);
        }
        lobbyPlayers[socket.id] = data;
        cl.stopLogging();
    })

    socket.on('disconnect', function(){
        lobbyNsp.emit('delete-player', lobbyPlayers[socket.id])
        delete lobbyPlayers[socket.id]
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
        console.log('Received answer from ' + socket.id + " : " + data);
        answers[socket.id] = data;

        cl.stopLogging();
    })

    socket.on('init-game', function(data){
        if (!players) {
            socket.emit('no-game-running');
            return;
        }
        players[socket.id] = new Player(data);
        distributeWhiteCardsInit(socket);
        sendBlackCard(socket);
        newPlayer(players[socket.id])
        for (playerID in players){
            if (playerID != socket.id){
                addPlayer(socket, players[playerID]);
            }
        }
    })

    socket.on('disconnect', function(){
        if (!players || !players[socket.id]) return;
        gameNsp.emit('delete-player', players[socket.id].name);
        delete players[socket.id];
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