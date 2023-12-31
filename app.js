// Server side code. To launch server locally:
// 1) install node.js
// 2) run "node app.js" inside whatever directory you save this file. Server will then be up and running, and and logs will go to that terminal window.
// 3) Open two clients on different localhost:8080 chrome tabs. Client logs will go to dev tools console

var express = require('express')
var path = require('path')
var app = express()
var http = require('http').createServer(app)
var io = require('socket.io')(http)

var startingStateGeneration = require('./server/startingStateGeneration')
// var MoveProcessor = require('./server/moveProcessor')

const Unit = require('./server/unit');
const Structure = require('./server/structure');

var PLAYER_IDS = []
var DEAD_UNITS = []

var SUBMITTED_MOVES = {}

const starting_state = startingStateGeneration.generateBoard()
var GAME_STATE = {
  'board': starting_state.board,
  'p1_resources': 30,
  'p2_resources': 30
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
      'is_player_1': true,
      'unit_map': Unit.statsMapping,
      'structure_map': Structure.statsMapping,
      'dead_units': DEAD_UNITS
    })
  } else {
    socket.emit('starting_info', {
      'game_state': GAME_STATE,
      'socket_id': socket.id,
      'is_player_1': false,
      'unit_map': Unit.statsMapping,
      'structure_map': Structure.statsMapping,
      'dead_units': DEAD_UNITS
    })
  }

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
    console.log("Moves" + SUBMITTED_MOVES)

    if (SUBMITTED_MOVES['p1'] && SUBMITTED_MOVES['p2']) {
      computeIncome()

      DEAD_UNITS.push(...processUnitAttacks())
      processUnitMovements()
      processPurchases()
      DEAD_UNITS.push(...processMelees())

      // Medic healing, etc.
      processPostMeleeActions()

      setOwnership()

      emitMovesToPlayers()
      SUBMITTED_MOVES = {}
      DEAD_UNITS = []
    }
  })

  // When a client disconnects, clean that connection up
  socket.on('disconnect', function() {
    handleDisconnect(socket.id)
  })

  socket.on('input_message', function(data) {
    io.sockets.emit('output_message', { message: data, player_1: socket.id == PLAYER_IDS[0].socket_id });
  })

  socket.on('reset', function(is_player_1) {
    if (is_player_1) {
      SUBMITTED_MOVES['p1'] = undefined;
    } else {
      SUBMITTED_MOVES['p2'] = undefined;
    }

    socket.emit('server_response', {
      'game_state': GAME_STATE,
      'unit_map': Unit.statsMapping,
      'structure_map': Structure.statsMapping,
    })
  })

  socket.on('resign', function() {
    io.sockets.emit('game_end', {
      'game_state': GAME_STATE,
      'unit_map': Unit.statsMapping,
      'structure_map': Structure.statsMapping,
      'dead_units': DEAD_UNITS
    })
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
    'game_state': GAME_STATE,
    'unit_map': Unit.statsMapping,
    'structure_map': Structure.statsMapping,
    'dead_units': DEAD_UNITS,
  })
}


// Move Processing Code

function processUnitMovements() {
  for (const move of SUBMITTED_MOVES.p1.movements.sort((a, b) => {
    if (a.start == b.end) return -1;
    return 1;
  })) {
    moveUnits(move.start_cell_id, move.end_cell_id, 'p1_units')
  }

  for (const move of SUBMITTED_MOVES.p2.movements.sort((a, b) => {
    if (a.start == b.end) return -1;
    return 1;
  })) {
    moveUnits(move.start_cell_id, move.end_cell_id, 'p2_units')
  }
}

function processUnitAttacks() {
  for (const attack of SUBMITTED_MOVES.p1.attacks) {
    attackUnits(attack.start_cell_id, attack.end_cell_id, 'p1_units')
  }
  for (const attack of SUBMITTED_MOVES.p2.attacks) {
    attackUnits(attack.start_cell_id, attack.end_cell_id, 'p2_units')
  }
  return cleanupDeadUnits()
}

function processMelees() {
  const dead_units = []

  for (var i=0; i<GAME_STATE.board.length; i++) {
    for( var j=0; j<GAME_STATE.board.length; j++) {
      while (
        (GAME_STATE.board[i][j].p1_units.length > 0 || GAME_STATE.board[i][j].p1_structures.length > 0) &&
        (GAME_STATE.board[i][j].p2_units.length > 0 || GAME_STATE.board[i][j].p2_structures.length > 0)
      ) {
        attackUnits(i + "_" + j, i + "_" + j, 'p1_units')
        attackUnits(i + "_" + j, i + "_" + j, 'p2_units')

        dead_units.push(...cleanupDeadUnits())
      }
    }
  }
  return dead_units
}

function processPostMeleeActions() {
  for (var i=0; i<GAME_STATE.board.length; i++) {
    for(var j=0; j<GAME_STATE.board.length; j++) {
      processMedicHeals(i, j)
    }
  }
}

function processMedicHeals(i, j) {
  if (GAME_STATE.board[i][j].p1_units.length > 0 && GAME_STATE.board[i][j].p1_units.map((unit) => unit.type).includes('Medic')) {
    for (let unit of GAME_STATE.board[i][j].p1_units) {
      if (unit.stats.hp < Unit.statsMapping[unit.type].hp) {
        unit.stats.hp += 1
      }
    }
  }
  if (GAME_STATE.board[i][j].p2_units.length > 0 && GAME_STATE.board[i][j].p2_units.map((unit) => unit.type).includes('Medic')) {
    for (let unit of GAME_STATE.board[i][j].p2_units) {
      if (unit.stats.hp < Unit.statsMapping[unit.type].hp) {
        unit.stats.hp += 1
      }
    }
  }
}


function setOwnership() {
  // Start with what previously is
  // If there is a unit on it, that's the owner.
  // If it is owner, AND there is an enemy adjacent, AND there is not friendly adjacent, then it becomes neutral
  for (var i=0; i<GAME_STATE.board.length; i++) {
    for(var j=0; j<GAME_STATE.board.length; j++) {
      if (GAME_STATE.board[i][j].p1_units.length > 0 || GAME_STATE.board[i][j].p1_structures.length > 0) {
        GAME_STATE.board[i][j].ownership = 1
      } else if (GAME_STATE.board[i][j].p2_units.length > 0 || GAME_STATE.board[i][j].p2_structures.length > 0) {
        GAME_STATE.board[i][j].ownership = 2
      } else { // No units
        const p1_adjascent = isAdjacent(i, j, 'p1_units')
        const p2_adjascent = isAdjacent(i, j, 'p2_units')
        if (p1_adjascent && !p2_adjascent) {
          GAME_STATE.board[i][j].ownership = 1
        } else if (!p1_adjascent && p2_adjascent) {
          GAME_STATE.board[i][j].ownership = 2
        } else if (p1_adjascent && p2_adjascent) {
          GAME_STATE.board[i][j].ownership = 0
        }
      }
    }
  }
}

function isAdjacent(i, j, units_key) {
  if (i > 0 && GAME_STATE.board[i-1][j][units_key].length > 0) {
    return true
  }
  if (i > 0 && j > 0 && GAME_STATE.board[i-1][j-1][units_key].length > 0) {
    return true
  }
  if (i > 0 && j < 10 && GAME_STATE.board[i-1][j+1][units_key].length > 0) {
    return true
  }
  if (i < 10 && j > 0 && GAME_STATE.board[i+1][j-1][units_key].length > 0) {
    return true
  }
  if (i < 10 && GAME_STATE.board[i+1][j][units_key].length > 0) {
    return true
  }
  if (i < 10 && j < 10 && GAME_STATE.board[i+1][j+1][units_key].length > 0) {
    return true
  }
  if (j > 0 && GAME_STATE.board[i][j-1][units_key].length > 0) {
    return true
  }
  if (j < GAME_STATE.board.length - 1 && GAME_STATE.board[i][j+1][units_key].length > 0) {
    return true
  }
  return false
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

  const unit = new Unit(move.type, player_number)
  if (player_number == 1) {
    GAME_STATE.board[row][col].p1_units.push(unit)
    GAME_STATE.p1_resources -= unit.stats.cost
  } else {
    GAME_STATE.board[row][col].p2_units.push(unit)
    GAME_STATE.p2_resources -= unit.stats.cost
  }
}

function placeStructure(move, player_number) {
  const row = move.start_cell_id.split('_')[0]
  const col = move.start_cell_id.split('_')[1]

  const structure = new Structure(move.type, player_number)
  if (player_number == 1) {
    GAME_STATE.board[row][col].p1_structures.push(structure)
    GAME_STATE.p1_resources -= structure.stats.cost
  } else {
    GAME_STATE.board[row][col].p2_structures.push(structure)
    GAME_STATE.p2_resources -= structure.stats.cost
  }
}

function moveUnits(start_cell_id, end_cell_id, player_unit_key) {
  const moved_units = []
  for (let row=0; row<11; row++) {
    for (let col=0; col<11; col++) {
      GAME_STATE.board[row][col][player_unit_key].forEach(function(unit) {
        if (row == start_cell_id.split('_')[0] && col == start_cell_id.split('_')[1]) {
          moved_units.push(unit);
        }
      })
    }
  }
  // Move Game board units onto tile
  GAME_STATE.board[start_cell_id.split('_')[0]][start_cell_id.split('_')[1]][player_unit_key] = []
  GAME_STATE.board[end_cell_id.split('_')[0]][end_cell_id.split('_')[1]][player_unit_key].push(...moved_units)
}

function attackUnits(start_cell_id, end_cell_id, player_unit_key) {
  attack_damage = 0
  enemy_unit_key = player_unit_key == 'p1_units' ? 'p2_units' : 'p1_units'
  enemy_structure_key = player_unit_key == 'p1_units' ? 'p2_structures' : 'p1_structures'

  updated_enemy_units = updated_enemy_units_mid_combat(end_cell_id, enemy_unit_key);
  updated_enemy_structures = updated_enemy_units_mid_combat(end_cell_id, enemy_structure_key);
  enemy_pieces = [...updated_enemy_units, ...updated_enemy_structures]

  GAME_STATE.board[start_cell_id.split('_')[0]][start_cell_id.split('_')[1]][player_unit_key].map(function(unit) {
    attack_damage += unit.stats.damage
  })

  while(attack_damage > 0 && enemy_pieces.length > 0 ) {
    enemy_pieces[0].stats.hp -= 1
    if (enemy_pieces[0].stats.hp <= 0) {
      console.log(enemy_pieces)
      console.log(enemy_pieces[0])
      enemy_pieces[0].getDead()
    }

    updated_enemy_units = updated_enemy_units_mid_combat(end_cell_id, enemy_unit_key);
    updated_enemy_structures = updated_enemy_units_mid_combat(end_cell_id, enemy_structure_key);
    enemy_pieces = [...updated_enemy_units, ...updated_enemy_structures];

    attack_damage -= 1
  }
}

function updated_enemy_units_mid_combat(end_cell_id, enemy_unit_key) {
  return GAME_STATE.board[end_cell_id.split('_')[0]][end_cell_id.split('_')[1]][enemy_unit_key]
                          .filter((unit) => !unit.isDead)
                          .sort((b, a) => {
                            if (a.stats.hp !== b.stats.hp) {
                              return a.stats.hp - b.stats.hp;
                            }

                            return b.stats.cost - a.stats.cost;
                          }); // descending order of hp, tiebreaker is cost ascending
}

function cleanupDeadUnits() {
  const dead_units = []
  for (let row=0; row<11; row++) {
    for (let col=0; col<11; col++) {
      if ([
        ...GAME_STATE.board[row][col].p1_units,
        ...GAME_STATE.board[row][col].p2_units,
        ...GAME_STATE.board[row][col].p1_structures,
        ...GAME_STATE.board[row][col].p2_structures
      ].filter((unit) => unit.isDead).length > 0) {
        dead_units.push(`${row}_${col}`)
      }

      GAME_STATE.board[row][col].p1_units = GAME_STATE.board[row][col].p1_units.filter((unit) => !unit.isDead)
      GAME_STATE.board[row][col].p2_units = GAME_STATE.board[row][col].p2_units.filter((unit) => !unit.isDead)
      GAME_STATE.board[row][col].p1_structures = GAME_STATE.board[row][col].p1_structures.filter((unit) => !unit.isDead)
      GAME_STATE.board[row][col].p2_structures = GAME_STATE.board[row][col].p2_structures.filter((unit) => !unit.isDead)
    }
  }
  return dead_units
}
