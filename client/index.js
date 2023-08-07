import Display from './display.js'

// var SOCKET_ID = undefined
var PURCHASE_SELECTION_MODE = false

var socket = io();

var MY_MOVE = {
  'movements': [],
  'attacks': [],
  'placements': [],
}
// movements[0] = {
//   'start_cell_id': '1_9',
//   'end_cell_id': '2_9',
// }
// attacks[0] = {
//   'start_cell_id': '3_4',
//   'end_cell_id': '2_3',
// }
// placements[0] = {
//   'start_cell_id': '4_5',
//   'type': 'Infantry',
// }

var IS_PLAYER_1 = false
var MY_RESOURCES = 0

var display = undefined;

function ingestServerResponse(server_response) {
  console.log("Server Response");
  console.log(server_response)

  if (IS_PLAYER_1) {
    MY_RESOURCES = server_response.game_state.p1_resources
  } else {
    MY_RESOURCES = server_response.game_state.p2_resources
  }
  document.getElementById("my_money").innerHTML = "$" + MY_RESOURCES

  display = new Display(
    server_response.game_state.board,
    IS_PLAYER_1,
    server_response.game_state.p1_units,
    server_response.game_state.p2_units,
    server_response.game_state.p1_structures,
    server_response.game_state.p2_structures,
    PURCHASE_SELECTION_MODE,
    MY_MOVE,
    MY_RESOURCES
  );

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
  	// SOCKET_ID = server_response.socket_id

  	ingestServerResponse(server_response)
  });

  Display.setupShop()
};

// handle submit button click
document.getElementById("submit_btn").onclick = () => {
  document.title = "Waiting on opponent"

  const move_for_server = {
    is_player_1: IS_PLAYER_1,
    movements: MY_MOVE.movements,
    attacks: MY_MOVE.attacks,
    placements: MY_MOVE.placements,
  }

  console.log("Submitting move")
  console.log(move_for_server)
  socket.emit('submit_move', move_for_server);
  document.getElementById("submit_btn").disabled = true;
  MY_MOVE = {
    'movements': [],
    'attacks': [],
    'placements': [],
  }
}

document.getElementById("purchase_submit_btn").onclick = () => {
  if (PURCHASE_SELECTION_MODE) {
    disablePurchaseMode();
  } else {
    enablePurchaseMode();
  }
}

function disablePurchaseMode() {
  Display.hideShop()
  display.disablePurchaseSelectionMode()

  PURCHASE_SELECTION_MODE = false
  document.getElementById("purchase_submit_btn").classList.remove('button_selected');
  document.getElementById("submit_btn").disabled = false;
}

function enablePurchaseMode() {
  Display.showShop()
  display.deselectStartCell()
  display.enablePurchaseSelectionMode()

  PURCHASE_SELECTION_MODE = true
  document.getElementById("purchase_submit_btn").classList.add('button_selected');
  document.getElementById("submit_btn").disabled = true;
}
