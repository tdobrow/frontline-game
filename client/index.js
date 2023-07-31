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

// Matrix of Tile objects. Details of board should come from server on game start
var BOARD = undefined
var BUILDINGS = undefined


var SOCKET_ID = undefined

var MY_TURN = false
var MY_MOVE = {}

var STARTING_PLAYER = false
var MY_RESOURCES = 0
var ENEMY_RESOURCES = 0

// handle hex click
// force marker placement selection first
// then allow building selection, with shape restrictions
function handleHexClick(cell) {
  var coor = cell.id.split("_")
  var row = +coor[0]
  var col = +coor[1]

  // force marker selection first
  if (MY_MOVE['building'] === undefined) {
	 handleHexClickForMarkerPlacement(cell, row, col)
  }
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
  const container = document.getElementById("board")
  while (document.getElementById('board').childNodes.length > 0) {
    document.getElementById('board').childNodes[0].remove()
  }
  for (var row = 0; row < BOARD.length; row++) {
    for (var col = 0; col < BOARD[row].length; col++) {
	    var cell = document.createElement("div")
      cell.id = row + "_" + col
      cell.className = 'tile'
      if ((row + col) % 2 == 0) {
        cell.className += ' grey_color'
      }

      if (BOARD[row][col].ownership > 0) {
        if ((STARTING_PLAYER && BOARD[row][col].ownership == 1) || (!STARTING_PLAYER && BOARD[row][col].ownership == 2)) {
          cell.className += ' Mine'
        }
        if ((STARTING_PLAYER && BOARD[row][col].ownership == 2) || (!STARTING_PLAYER && BOARD[row][col].ownership == 1)) {
          cell.className += ' Enemy'
        }
	    }
      cell.onclick = function(cell) {
        return function() {
          handleHexClick(cell)
        }
      }(cell) // immediatlly invoke this function to tie it to correct cell
      container.appendChild(cell)
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
  BUILDINGS = server_response.game_state.buildings

  if (STARTING_PLAYER) {
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

  	if ((STARTING_PLAYER && server_response.game_state.p1_immediately_passes) || (!STARTING_PLAYER && server_response.game_state.p2_immediately_passes)) {
  	    socket.emit('pass')
  	}
  });

  socket.on('starting_info', (server_response) => {
  	STARTING_PLAYER = server_response.starting_player
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
