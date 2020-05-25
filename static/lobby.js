var socket = io('/lobby');

function addPlayer(name){
    let elem = document.createElement("p")
    elem.textContent = name;
    elem.className = "player";
    elem.id = name;
    document.getElementById("players").appendChild(elem);
  }

function buttonCallback(){
    console.log("Sending")
    let name = document.getElementById('name-input').value
    console.log("Name : " + name)
    if (name == "") return false;
    socket.emit('new-player', name);
}

socket.on('start-game', function(data){
    console.log("Starting the game under the name " + data)
    open("http://localhost:5000/game?name=" + data, "_self");
})

socket.on('new-player', function(data){
    addPlayer(data);
})

socket.on('rename-player', function(oldName, newName){
    document.getElementById(oldName).textContent = newName;
})