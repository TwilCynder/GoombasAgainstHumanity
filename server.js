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

var express = require('express'); //framework de base
var http = require('http'); //normalement pas nécessaire car les app express couvrent déjà les fonctionnalités du http.Server, on doit cependant le passer à socket.io
var path = require('path');
var socketIO = require('socket.io'); //gère la connection avec le joueur
var cl = require("@twilcynder/commandline") //jsavais bien qu'il finirait par m'être utile

var app = express(); //le serveur
var server = http.Server(app); //on crée un object http.Server avec le serveur déjà existant
var io = socketIO(server); //serveur socketIO, qu'on bind au server express/HTTP

function intRand(max){
    return Math.floor(Math.random() * max);
}

function setBlackCard(id){
    io.sockets.emit('black-card', black[id]);
}

function distributeWhiteCards(){
    for (id in io.sockets.connected){
        addWhiteCard(id, intRand(white.length))
    }
}

function addWhiteCard(playerId, cardId){
    let socket = io.sockets.connected[playerId];
    if (!socket) return errcodes.PLAYER;
    let card = white[cardId];
    if (!card) return errcodes.WHITECARD;

    socket.emit("add-white-card", card);
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
    getConnected:()=>{
        for (id in io.sockets.connected){
            console.log(id);
        }
    }
}

var answers = {};

app.use('/static', express.static(__dirname + '/static')); //pas compris

// Routing
app.get('/', function(request, response) { //on serve la page d'accueil
    response.sendFile(path.join(__dirname, 'index.html'));
});

app.set('port', 5000); //on ne va pas utiliser app.listen mais server.listen, il faut donc indiquer à l'app quel port elle utilise

io.on('connection', function(socket) { //callback lancé à la connection d'un client
    console.log("New connection !")

    socket.on('answer', function(data){
        console.log('Received answer from ' + socket.id + " : " + data);
        answers[socket.id] = data;
        cl.stopLogging()
    })

    cl.stopLogging();
});



server.listen(5000, function() {
    console.log('Starting server on port 5000');
    cl.stopLogging()
});
cl.start()