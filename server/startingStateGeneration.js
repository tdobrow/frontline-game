const Unit = require('./unit');
const Structure = require('./structure');


(function() {
  module.exports.generateBoard = function(board_size) {
    const board = []
    const p1_units = []
    const p2_units = []
    const p1_structures = []
    const p2_structures = []

    for (row=0; row<board_size; row+=1) {
      const new_row = []
      for (col=0; col<board_size; col+=1) {
        if (col + row < 5 && row < 4 && col < 4) {
          new_row.push({
            'p1_units': [],
            'p2_units': [],
            'p1_structures': [],
            'p2_structures': [],
            'ownership': 1, // 0 = neutral, 1 = player 1, 2 = player 2
          })
        } else if (col + row > 13 && row > 5 && col > 5) {
          new_row.push({
            'p1_units': [],
            'p2_units': [],
            'p1_structures': [],
            'p2_structures': [],
            'ownership': 2, // 0 = neutral, 1 = player 1, 2 = player 2
          })
        } else {
          new_row.push({
            'p1_units': [],
            'p2_units': [],
            'p1_structures': [],
            'p2_structures': [],
            'ownership': 0, // 0 = neutral, 1 = player 1, 2 = player 2
          })
        }
      }
      board.push(new_row)
    }
    let unit = new Unit('Infantry', 1, 1, 3)
    board[1][3].p1_units.push(unit)
    p1_units.push(unit)

    unit = new Unit('Infantry', 1, 3, 1)
    board[3][1].p1_units.push(unit)
    p1_units.push(unit)

    unit = new Unit('Infantry', 2, 8, 6)
    board[8][6].p2_units.push(unit)
    p2_units.push(unit)

    unit = new Unit('Infantry', 2, 6, 8)
    board[6][8].p2_units.push(unit)
    p2_units.push(unit)

    let barracks = new Structure('Barracks', 1, 1, 1)
    board[1][1].p1_structures.push(barracks)
    p1_structures.push(barracks)

    barracks = new Structure('Barracks', 2, 8, 8)
    board[8][8].p2_structures.push(barracks)
    p2_structures.push(barracks)

    return {
      'board': board,
      'p1_units': p1_units,
      'p2_units': p2_units,
      'p1_structures': p1_structures,
      'p2_structures': p2_structures,
    }
  }
}())
