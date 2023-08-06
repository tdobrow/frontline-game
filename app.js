// Server side code. To launch server locally:
// 1) install node.js
// 2) run "node app.js" inside whatever directory you save this file. Server will then be up and running, and and logs will go to that terminal window.
// 3) Open two clients on different localhost:8080 chrome tabs. Client logs will go to dev tools console

var express = require('express')
var path = require('path')
var app = express()

var http = require('http').createServer(app)
var io = require('socket.io')(http)

// Locally written server side code
var startingStateGeneration = require('./server/startingStateGeneration')
// var Unit = require('./server/unit')
var MoveProcessor = require('./server/moveProcessor')

const Unit = require('./server/unit');
const Structure = require('./server/structure');


var PLAYER_IDS = []

var SUBMITTED_MOVES = {}

const starting_state = startingStateGeneration.generateBoard(10)
var GAME_STATE = {
  'board': starting_state.board,
  'p1_units': starting_state.p1_units,
  'p2_units': starting_state.p2_units,
  'p1_structures': starting_state.p1_structures,
  'p2_structures': starting_state.p2_structures,
  'p1_resources': 0,
  'p2_resources': 0
}

// Express to serve correct client side code
app.use(express.static(path.join(__dirname, 'client')))

// Socket.io code to listen for client connection.
io.on('connection', function(socket) {
  handlePlayerConnect(socket)

  if (socket.id == PLAYER_IDS[0].socket_id) {
    socket.emit('starting_info', {
      'game_state': GAME_STATE,
      'socket_id': socket.id,
      'is_player_1': true
    })
  } else {
    socket.emit('starting_info', {
      'game_state': GAME_STATE,
      'socket_id': socket.id,
      'is_player_1': false
    })
  }

  console.log("Players: ")
  console.log(PLAYER_IDS)

  // Client Object:
  // {
  //   is_player_1: ,
  //   start_cell_id: ,
  //   end_cell_id: ,
  // }
  socket.on('submit_move', function(client_object) {
    if (client_object.is_player_1) {
      SUBMITTED_MOVES['p1'] = client_object;
    } else {
      SUBMITTED_MOVES['p2'] = client_object;
    }
    console.log(SUBMITTED_MOVES)

    if (SUBMITTED_MOVES['p1'] && SUBMITTED_MOVES['p2']) {

      processUnitMovements()
      // processUnitAttacks()
      processPurchases()

      computeIncome()

      emitMovesToPlayers()
      SUBMITTED_MOVES = {}
    }
    console.log(SUBMITTED_MOVES)
  })
  // When a client disconnects, clean that connection up
  socket.on('disconnect', function() {
    handleDisconnect(socket.id)
    console.log("Players: ")
    console.log(PLAYER_IDS)
  })
})

// Starta a client by going to localhost:8080 in a browser
http.listen(8080, function(){
  console.log('listening on *:8080')
})

function handlePlayerConnect(socket) {
  // replace first inactive socket with new connection
  for (var i=0; i<PLAYER_IDS.length; i++) {
    if (!PLAYER_IDS[i].active) {
      PLAYER_IDS[i].socket_id = socket.id
      PLAYER_IDS[i].active = true
      console.log('Player reconnected with Id: ' + socket.id)
      return
    }
  }
  if (PLAYER_IDS.length < 2) {
    console.log('New player joined. Id: ' + socket.id)
    PLAYER_IDS.push({
      'socket_id': socket.id,
      'active': true
    })
  } else if (PLAYER_IDS.length >= 2) {
    socket.emit('not_welcome')
  }
}

function handleDisconnect(socket_id) {
  console.log('Player disconnected with Id: ' + socket_id)
  for (var i=0; i<PLAYER_IDS.length; i++) {
    if (PLAYER_IDS[i].socket_id == socket_id) {
      PLAYER_IDS[i].active = false
      return
    }
  }
}

function emitMovesToPlayers() {
  io.sockets.emit('server_response', {
    'game_state': GAME_STATE
  })
}


// Move Processing Code

// TODO: validate move
function processUnitMovements() {
  for (const move of SUBMITTED_MOVES.p1.movements) {
    moveUnits(move.start_cell_id, move.end_cell_id, 'p1_units')
  }
  for (const move of SUBMITTED_MOVES.p2.movements) {
    moveUnits(move.start_cell_id, move.end_cell_id, 'p2_units')
  }
}

function computeIncome() {
  for (var i=0; i<GAME_STATE.board.length; i++) {
    for( var j=0; j<GAME_STATE.board.length; j++) {
      if (GAME_STATE.board[i][j].ownership == 1) {
        GAME_STATE.p1_resources += 1
      } else if (GAME_STATE.board[i][j].ownership == 2) {
        GAME_STATE.p2_resources += 1
      }
    }
  }
}

function processPurchases() {
  for (const move of SUBMITTED_MOVES.p1.placements) {
    if (['Barracks', 'Watch_tower', 'Wall'].includes(move.type)) {
      placeStructure(move, 1)
    } else {
      placeUnit(move, 1)
    }
  }
  for (const move of SUBMITTED_MOVES.p2.placements) {
    if (['Barracks', 'Watch_tower', 'Wall'].includes(move.type)) {
      placeStructure(move, 2)
    } else {
      placeUnit(move, 2)
    }
  }
}

function placeUnit(move, player_number) {
  const row = +move.start_cell_id.split('_')[0]
  const col = +move.start_cell_id.split('_')[1]

  const unit = new Unit(move.type, player_number, row, col)
  if (player_number == 1) {
    GAME_STATE.p1_units.push(unit)
    GAME_STATE.board[row][col].p1_units.push(unit)
    GAME_STATE.p1_resources -= unit.stats.cost
  } else {
    GAME_STATE.p2_units.push(unit)
    GAME_STATE.board[row][col].p2_units.push(unit)
    GAME_STATE.p2_resources -= unit.stats.cost
  }
}

function placeStructure(move, player_number) {
  const row = move.start_cell_id.split('_')[0]
  const col = move.start_cell_id.split('_')[1]

  const structure = new Structure(move.type, player_number, row, col)
  if (player_number == 1) {
    GAME_STATE.p1_structures.push(structure)
    GAME_STATE.board[row][col].p1_structures.push(structure)
    GAME_STATE.p1_resources -= structure.stats.cost
  } else {
    GAME_STATE.p2_structures.push(structure)
    GAME_STATE.board[row][col].p2_structures.push(structure)
    GAME_STATE.p2_resources -= structure.stats.cost
  }
}

function moveUnits(start_cell_id, end_cell_id, player_unit_key) {
  moved_units = []
  GAME_STATE[player_unit_key].forEach(function(unit) {
    if (unit.row == start_cell_id.split('_')[0] && unit.col == start_cell_id.split('_')[1]) {
      // Sets player unit list positions to new tile
      unit.row = +end_cell_id.split('_')[0]
      unit.col = +end_cell_id.split('_')[1]

      moved_units.push(unit);
    }
  })
  // Move Game board units onto tile
  GAME_STATE.board[start_cell_id.split('_')[0]][start_cell_id.split('_')[1]][player_unit_key] = []
  GAME_STATE.board[end_cell_id.split('_')[0]][end_cell_id.split('_')[1]][player_unit_key].push(...moved_units)

  // Change ownership of tile
  GAME_STATE.board[end_cell_id.split('_')[0]][end_cell_id.split('_')[1]].ownership = player_unit_key == 'p1_units' ? 1 : 2
}
