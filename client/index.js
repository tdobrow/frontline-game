/* MAIN CLIENT SIDE CODE */

/*

  TILE object:
  {
    marker: , // unoccupied or which player has a marker on this tile
    building: ,
    type: , // w, bm, c, l, other?
  }

  BOARD object:  Matrix of Tiles.
*/

// // individual functions to validate building placement in separate local file
// import BuildingValidation from './buildingValidation.js'
// import ShapeUtils from './util.js'
// import Unit from '../server/unit.js';

// Matrix of Tile objects. Details of board should come from server on game start
var BOARD = undefined
var P1_UNITS = undefined
var P2_UNITS = undefined

var SOCKET_ID = undefined

var MY_TURN = false
var MY_MOVE = {
  'start_cell': undefined,
  'end_cell': undefined,
}

var IS_PLAYER_1 = false
var MY_RESOURCES = 0
var ENEMY_RESOURCES = 0

function handleSelectClick(cell) {
  if (MY_MOVE.start_cell === undefined) {
    selectStartCell(cell)
  } else if (MY_MOVE.start_cell === cell) {
    deselectStartCell(cell)
  } else if (MY_MOVE.end_cell === cell) {
    deselectEndCell(cell)
  } else {
    deselectAllEndCells()
    selectEndCell(cell)
  }
  console.log(MY_MOVE)
}

function selectStartCell(cell) {
  MY_MOVE.start_cell = cell
  cell.classList.add('start-selected')
}
function deselectStartCell(cell) {
  MY_MOVE.start_cell = undefined
  cell.classList.remove('start-selected')
}
function selectEndCell(cell) {
  MY_MOVE.end_cell = cell
  cell.classList.add('end-selected')
}
function deselectEndCell(cell) {
  MY_MOVE.end_cell = undefined
  cell.classList.remove('end-selected')
}
function deselectAllEndCells() {
  MY_MOVE.end_cell = undefined;
  document.getElementById('board').childNodes.forEach(function(cell) {
    cell.classList.remove('end-selected');
  });
}

function handleHexClickForMarkerPlacement(cell, row, col) {
  // Clicking on an already selected hex will de-select it.
  if (cell.innerText == '*') {
  	clearPendingPlacements()
  	MY_MOVE = {}
  }
  // else {
  //   if (tileAdjacencies.adjacentToFriendly || tileAdjacencies.adjacentViaLighthouse || tileAdjacencies.adjacentViaLock) {
  //     clearPendingPlacements()
  //     cell.innerText = '*'

  //     var resource_type = BOARD[row][col].type
  //     handleBonusResources(row, col, resource_type, true)

  //     MY_MOVE['marker_placement'] = {'row': row, 'col': col}
  //   }
  // }
}

function displayBoard() {
  console.log(BOARD)
  console.log("Am player 1: " + IS_PLAYER_1)
  const container = document.getElementById("board")
  while (document.getElementById('board').childNodes.length > 0) {
    document.getElementById('board').childNodes[0].remove()
  }
  for (var row = 0; row < BOARD.length; row++) {
    for (var col = 0; col < BOARD[row].length; col++) {
	    var cell = document.createElement("div")
      cell.id = row + "_" + col
      cell.classList.add('tile');

      if (BOARD[row][col].ownership > 0) {
        if ((IS_PLAYER_1 && BOARD[row][col].ownership == 1) || (!IS_PLAYER_1 && BOARD[row][col].ownership == 2)) {
          cell.classList.add('friendly_controlled');
        }
        if ((IS_PLAYER_1 && BOARD[row][col].ownership == 2) || (!IS_PLAYER_1 && BOARD[row][col].ownership == 1)) {
          cell.classList.add('enemy_controlled');
        }
	    }

      cell.onclick = function(cell) {
        return function() {
          handleSelectClick(cell)
        }
      }(cell) // immediatlly invoke this function to tie it to correct cell
      container.appendChild(cell)
    }
  }
  layerUnits()
  layerFog()
}

function layerFog() {
  const childNodes = document.getElementById("board").childNodes;

  for (const node of childNodes) {
    const row = node.id.split("_")[0]
    const col = node.id.split("_")[1]
    if (IS_PLAYER_1 && BOARD[row][col].p1_units.length == 0 && BOARD[row][col].ownership !== 1) {
      node.classList.add("fog");
      document.getElementById(row + "_" + col).innerText = "";
    }
    if (!IS_PLAYER_1 && BOARD[row][col].p2_units.length == 0 && BOARD[row][col].ownership !== 2) {
      node.classList.add("fog");
      document.getElementById(row + "_" + col).innerText = "";
    }
  }
  if (IS_PLAYER_1) {
    for (const unit of P1_UNITS) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = unit.row + i;
          const col = unit.col + j;
          document.getElementById(row + "_" + col)?.classList?.remove("fog");
        }
      }
    }
  } else {
    for (const unit of P2_UNITS) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = unit.row + i;
          const col = unit.col + j;
          document.getElementById(row + "_" + col)?.classList?.remove("fog");
        }
      }
    }
  }
}

function layerUnits() {
  const childNodes = document.getElementById("board").childNodes;

  for (const node of childNodes) {
    const row = node.id.split("_")[0]
    const col = node.id.split("_")[1]
    if (IS_PLAYER_1 && BOARD[row][col].p1_units.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p1_units[0].name
    } else if (!IS_PLAYER_1 && BOARD[row][col].p2_units.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p2_units[0].name
    } else {
      document.getElementById(row + "_" + col).innerText = ""
    }
  }
}

// remove * marker from selected tiles
function clearPendingPlacements() {
  for (var row = 0; row < BOARD.length; row++) {
    for (var col = 0; col < BOARD[row].length; col++) {
	    if (document.getElementById(row + "_" + col).innerText == "*") {
		    document.getElementById(row + "_" + col).innerText = ""
        handleBonusResources(row, col, BOARD[row][col].type, false)

	    }
	  }
  }
}

// Reconcile global variables to server's values. Display elements.
function ingestServerResponse(server_response) {
  BOARD = server_response.game_state.board
  P1_UNITS = server_response.game_state.p1_units
  P2_UNITS = server_response.game_state.p2_units

  if (IS_PLAYER_1) {
    MY_RESOURCES = server_response.game_state.p1_resources
  } else {
    MY_RESOURCES = server_response.game_state.p2_resources
  }
  displayBoard()
}

window.onload = () => {
  var socket = io();

  socket.on('not_welcome', () => {
    console.log("Not Welcome")
  });

  socket.on('game_ended', () => {
  	console.log("Game Ended")
  });

  // handle different messages from server
  socket.on('your_turn', () => {
    MY_TURN = true
    document.getElementById('turn_title').innerText = 'Your Turn'
    document.title = "Your Turn!"
  });

  socket.on('not_your_turn', () => {
    MY_TURN = false
    document.getElementById('turn_title').innerText = 'Opponent\'s Turn'
    document.title = "Waiting on opponent"
  });

  socket.on('server_response', (server_response) => {
    MY_TURN = true
  	document.getElementById('turn_title').innerText = 'Your Turn'
    document.title = "Your Turn!"

  	ingestServerResponse(server_response)
  });

  socket.on('starting_info', (server_response) => {
  	IS_PLAYER_1 = server_response.starting_player
  	SOCKET_ID = server_response.socket_id

  	ingestServerResponse(server_response)
  });


  document.getElementById("pass_btn").onclick = () => {
    if (MY_TURN) {
	    if (confirm("Are you sure you want to pass forever??")) {
		    socket.emit("pass_forever")
	    }
    }
  }

  // handle submit button click
  document.getElementById("submit_btn").onclick = () => {
  	if (MY_TURN) {
      if (MY_MOVE['marker_placement']) {
        socket.emit('submit_move', MY_MOVE);
        MY_MOVE = {}
      }
    }
  }
}
