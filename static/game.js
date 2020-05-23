function setBlackCard(card){
  let elem = document.getElementById("black-card");
  elem.textContent = card
}

function sendAnswer(answer){
  socket.emit('answer', answer);
  console.log('sent')
}

function addWhiteCard(card){
  let elem = document.createElement("p")
  let button = elem.appendChild(document.createElement("button"))
  button.textContent = card;
  button.className = "white-card";
  button.addEventListener('click', function(ev){
    sendAnswer(button.innerText)
  })
  document.getElementById("white-cards").appendChild(elem);
}

var socket = io();
socket.on('black-card', function(data) {
  console.log("Black card : " + data)
  setBlackCard(data);
});

socket.on('add-white-card', function(data){
  console.log("White card added : " + data)
  addWhiteCard(data)
});