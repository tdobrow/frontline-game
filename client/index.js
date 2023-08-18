import Display from './display.js'

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
var SHOP_BUILT = false
var MY_RESOURCES = 0

var display = undefined;

function ingestServerResponse(server_response) {
  console.log("Server Response");
  console.log(server_response)

  document.title = "Your Turn"
  document.getElementById("submit_btn").style.backgroundColor = '#4681f4';
  document.getElementById("submit_btn").style.color = 'white';


  if (IS_PLAYER_1) {
    MY_RESOURCES = server_response.game_state.p1_resources
  } else {
    MY_RESOURCES = server_response.game_state.p2_resources
  }
  document.getElementById("my_money").innerHTML = "Money: $" + MY_RESOURCES

  display = new Display(
    server_response.unit_map,
    server_response.structure_map,
    server_response.game_state.board,
    IS_PLAYER_1,
    MY_MOVE,
    MY_RESOURCES
  );

  if (!SHOP_BUILT) {
    display.buildShop();
    SHOP_BUILT = true;
  }

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
  });

  socket.on('output_message', (data) => {
    const chatMessagesDiv = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    const you = (data.player_1 && IS_PLAYER_1) || (!data.player_1 && !IS_PLAYER_1);
    messageElement.textContent = you ? `you: ${data.message}` : `opponent: ${data.message}`;
    chatMessagesDiv.appendChild(messageElement);
  });

  socket.on('starting_info', (server_response) => {
  	IS_PLAYER_1 = server_response.is_player_1

  	ingestServerResponse(server_response)
  });

  socket.on('game_end', (server_response) => {
    document.title = "Game Ended"
    document.getElementById("submit_btn").style.backgroundColor = '#96bbe1db';
    document.getElementById("submit_btn").style.color = 'grey';

    display = new Display(
      server_response.unit_map,
      server_response.structure_map,
      server_response.game_state.board,
      IS_PLAYER_1,
      MY_MOVE,
      MY_RESOURCES
    );

    display.displayBoard();
    Display.clearFog();
    display.layerUnitsAndStructures();
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

  console.log("Submitting move to server")
  console.log(move_for_server)
  socket.emit('submit_move', move_for_server);
  document.getElementById("submit_btn").style.backgroundColor = '#96bbe1db';
  document.getElementById("submit_btn").style.color = 'grey';

  MY_MOVE = {
    'movements': [],
    'attacks': [],
    'placements': [],
  }
}

// handle submit button click
document.getElementById("reset_btn").onclick = () => {
  MY_MOVE = {
    'movements': [],
    'attacks': [],
    'placements': [],
  }

  socket.emit('reset', IS_PLAYER_1)
}

  // handle submit button click
document.getElementById("resign_btn").onclick = () => {
  socket.emit('resign');
}

// click anyone on the page to close piece popup
document.addEventListener('click', function(_event) {
  Display.hidePieceDisplayTable();
});

const input = document.getElementById('message-input');
input.addEventListener('keydown', function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();

    if (input.value === '') {
      return;
    }
    const message = input.value;
    socket.emit('input_message', message)
    input.value = '';
  }
});
