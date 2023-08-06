import Display from './display.js'

var SOCKET_ID = undefined
var PURCHASE_SELECTION_MODE = false

var socket = io();

var MY_MOVE = {
  'start_cell': undefined,
  'end_cell': undefined,
}

var IS_PLAYER_1 = false
var MY_RESOURCES = 0

// Reconcile global variables to server's values. Display elements.
function ingestServerResponse(server_response) {
  console.log("Server Response");
  console.log(server_response)

  const display = new Display(
    server_response.game_state.board,
    IS_PLAYER_1,
    server_response.game_state.p1_units,
    server_response.game_state.p2_units,
    server_response.game_state.p1_structures,
    server_response.game_state.p2_structures,
    PURCHASE_SELECTION_MODE,
    MY_MOVE
  );

  if (IS_PLAYER_1) {
    MY_RESOURCES = server_response.game_state.p1_resources
  } else {
    MY_RESOURCES = server_response.game_state.p2_resources
  }
  document.getElementById("my_money").innerHTML = "$" + MY_RESOURCES


  display.hideUnitDisplayTable()
  display.displayBoard()
}

window.onload = () => {
  socket.on('not_welcome', () => {
    console.log("Not Welcome")
  });

  socket.on('game_ended', () => {
  	console.log("Game Ended")
  });

  socket.on('server_response', (server_response) => {
    ingestServerResponse(server_response);

    document.title = "Your Turn"
    document.getElementById("submit_btn").disabled = false;
  });

  socket.on('starting_info', (server_response) => {
  	IS_PLAYER_1 = server_response.is_player_1
  	SOCKET_ID = server_response.socket_id

  	ingestServerResponse(server_response)
  });

  Display.setupShop()
};

// handle submit button click
document.getElementById("submit_btn").onclick = () => {
  if (MY_MOVE['start_cell'] && MY_MOVE['end_cell']) {
    document.title = "Waiting on opponent"

    const move_for_server = {
      is_player_1: IS_PLAYER_1,
      start_cell_id: MY_MOVE.start_cell.id,
      end_cell_id: MY_MOVE.end_cell.id
    }

    console.log("Submitting move")
    console.log(move_for_server)
    socket.emit('submit_move', move_for_server);
    document.getElementById("submit_btn").disabled = true;
    MY_MOVE = {}
  }
}

document.getElementById("purchase_submit_btn").onclick = () => {
  if (PURCHASE_SELECTION_MODE) {
    Display.hideShop()
    PURCHASE_SELECTION_MODE = false
    document.getElementById("purchase_submit_btn").classList.remove('button_selected');
    document.getElementById("submit_btn").disabled = false;
  } else {
    Display.showShop()
    PURCHASE_SELECTION_MODE = true
    document.getElementById("purchase_submit_btn").classList.add('button_selected');
    document.getElementById("submit_btn").disabled = true;
  }
}
