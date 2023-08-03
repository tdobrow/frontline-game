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
var PURCHASE_SELECTION_MODE = false

var MY_MOVE = {
  'start_cell': undefined,
  'end_cell': undefined,
}

var IS_PLAYER_1 = false
var MY_RESOURCES = 0
var ENEMY_RESOURCES = 0

function handleClick(cell) {
  if (PURCHASE_SELECTION_MODE) {
    return handlePurchasePlacement(cell);
  }

  if (MY_MOVE.start_cell === undefined) {
    return handleSelectClick(cell)
  }
  if (MY_MOVE.start_cell === cell) {
    return deselectStartCell(cell)
  }

  handleDestinationClick(cell)
}

function handlePurchasePlacement(cell) {
  console.log("Handle purchase placement")
}

function handleSelectClick(cell) {
  if (unitExistsOnTile(cell)) {
    handleUnitSelect(cell);
  }
  if (structureExistsOnTile(cell)) {
    handleStructureSelect(cell);
  }
}

function handleDestinationClick(cell) {
  if (MY_MOVE.end_cell === cell) {
    deselectEndCell(cell)
  } else {
    deselectAllEndCells()
    selectEndCell(cell)
  }
}

function unitExistsOnTile(cell) {
  const row = cell.id.split("_")[0]
  const col = cell.id.split("_")[1]

  return (IS_PLAYER_1 && BOARD[row][col].p1_units.length > 0) || (!IS_PLAYER_1 && BOARD[row][col].p2_units.length > 0)
}

function structureExistsOnTile(cell) {
  const row = cell.id.split("_")[0]
  const col = cell.id.split("_")[1]

  return (IS_PLAYER_1 && BOARD[row][col].p1_structures.length > 0) || (!IS_PLAYER_1 && BOARD[row][col].p2_structures.length > 0)
}

function handleUnitSelect(cell) {
  selectStartCell(cell);

  const row = cell.id.split("_")[0]
  const col = cell.id.split("_")[1]

  if (IS_PLAYER_1) {
    buildUnitDisplayTable(BOARD[row][col].p1_units)
  } else {
    buildUnitDisplayTable(BOARD[row][col].p2_units)
  }
}

function handleStructureSelect(cell) {
  console.log("Structure selected");
}

function selectStartCell(cell) {
  MY_MOVE.start_cell = cell
  cell.classList.add('start-selected')
}
function deselectStartCell(cell) {
  MY_MOVE.start_cell = undefined
  deselectAllEndCells()
  hideUnitDisplayTable()
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
          handleClick(cell)
        }
      }(cell) // immediatlly invoke this function to tie it to correct cell
      container.appendChild(cell)
    }
  }
  layerUnitsAndStructures()
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

function layerUnitsAndStructures() {
  const childNodes = document.getElementById("board").childNodes;

  for (const node of childNodes) {
    const row = node.id.split("_")[0]
    const col = node.id.split("_")[1]
    if (IS_PLAYER_1 && BOARD[row][col].p1_units.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p1_units[0].name
    } else if (!IS_PLAYER_1 && BOARD[row][col].p2_units.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p2_units[0].name
    } else if (IS_PLAYER_1 && BOARD[row][col].p1_structures.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p1_structures[0].name
    } else if (!IS_PLAYER_1 && BOARD[row][col].p2_structures.length > 0) {
      document.getElementById(row + "_" + col).innerText = BOARD[row][col].p2_structures[0].name
    } else {
      document.getElementById(row + "_" + col).innerText = ""
    }
  }
}

function hideUnitDisplayTable() {
  document.getElementById("unit-list-wrapper").style.display = "none"

  const tableList = document.getElementById("table-list");
  const rows = tableList.querySelectorAll("tr:not(:first-child)");
  rows.forEach((row) => {
    row.remove();
  });
}

function buildUnitDisplayTable(units) {
  hideUnitDisplayTable()
  document.getElementById("unit-list-wrapper").style.display = "block"

  const tableList = document.getElementById("table-list");
  for (const unit of units) {
    const newRow = document.createElement("tr");
    const newData = document.createElement("td");
    newData.textContent = unit.name;
    newRow.appendChild(newData);
    tableList.appendChild(newRow);
  }
}

// Reconcile global variables to server's values. Display elements.
function ingestServerResponse(server_response) {
  console.log("Server Response");
  console.log(server_response)

  hideUnitDisplayTable()

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
      PURCHASE_SELECTION_MODE = false
      document.getElementById("purchase_submit_btn").classList.remove('button_selected');
      document.getElementById("submit_btn").disabled = false;
    } else {
      PURCHASE_SELECTION_MODE = true
      document.getElementById("purchase_submit_btn").classList.add('button_selected');
      document.getElementById("submit_btn").disabled = true;
    }
  }
}
