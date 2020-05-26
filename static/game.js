var playerName = new URL(window.location.href).searchParams.get("name");
if (playerName == "") open("http://localhost:5000/", "_self")

var game = null;

function init(){
  socket.emit('init-game', playerName);
}

function setBlackCard(card){
  let elem = document.getElementById("black-card");
  elem.textContent = card
}

function sendAnswer(answer){
  socket.emit('answer', answer);
  console.log('sent')
}

function addWhiteCard(card){
  let elem = document.createElement("span");
  elem.classList = "card white-card";
  elem.textContent = card;
  elem.addEventListener('click', function(ev){
    sendAnswer(elem.innerText)
  })
  document.getElementById("white-cards").appendChild(elem);
}

var socket = io('/game');
socket.on('black-card', function(data) {
  console.log("Black card : " + data)
  setBlackCard(data);
});


socket.on('add-white-card', function(data){
  console.log("White card added : " + data)
  addWhiteCard(data)
});

socket.on('no-game-running', function(){
  open("http://localhost:5000/", "_self")
})

socket.on('new-player', function(data){
  if (document.getElementById(data.name)) return;
  let elem = document.createElement("div");
  elem.className = "player";
  elem.innerHTML = data.name + " : <b>" + data.score + "</b>";
  elem.id = data.name;
  document.getElementById("players-list").appendChild(elem);
})

socket.on('delete-player', function(data){
  document.getElementById(data).remove();
})

window.onload = function(){
  console.log("Tab loaded");
  init();
}