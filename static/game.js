var playerName = new URL(window.location.href).searchParams.get("name");
if (playerName == "") open("http://localhost:5000/", "_self")

var game = null;
var reviewing = false;
var czar = false;

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

var selected_card;
function addWhiteCard(card){
  let elem = document.createElement("span");
  elem.classList = "card white-card card-clickable";
  elem.textContent = card;
  elem.addEventListener('click', function(ev){
    if (reviewing) return;
    if (selected_card) selected_card.style.backgroundColor = "white";
    sendAnswer(elem.innerText)
    elem.style.backgroundColor = "cornflowerblue";
    selected_card = elem;
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

socket.on('new-turn', function(){
  czar = false;
  reviewing = false;
  document.getElementById("czar-overlay-container").hidden = true;
  let collection = document.getElementsByClassName("answer-cards");
  for (let i = 0; i < collection.length; i++){
    collection[i].remove();
    i--;
  }
  if (selected_card) selected_card.remove();
})

socket.on('start-review', function(arr){
  reviewing = true;
  console.log("Starting Review")
  console.log(arr)
  for (let i = 0; i < arr.length; i++){
    let elem = document.createElement("span");
    elem.classList = "card white-card answer-cards";
    elem.textContent = arr[i].card;
    elem.playerID = arr[i].playerID;
    if (czar) {
      elem.classList.add("card-clickable")

      elem.addEventListener('click', function(ev){
        socket.emit('winner-choosed', elem.playerID);
      });
    } 
    document.getElementById("upper-card-container").appendChild(elem);
  }
})

socket.on('update-score', function(data){
  document.getElementById(data.name).innerHTML = data.name + " : <b>" + data.score + "</b>";
})

socket.on('czar', function(){
  document.getElementById("czar-overlay-container").hidden = false;
  czar = true;
})


window.onload = function(){
  console.log("Tab loaded");
  init();
}