const Unit = require('./unit');
const Structure = require('./structure');

(function() {
  module.exports.generateBoard = function() {
    const board = []

    for (row=0; row<10; row+=1) {
      const new_row = []
      for (col=0; col<10; col+=1) {
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
    board[2][3].ownership = 1
    board[3][2].ownership = 1
    board[6][7].ownership = 2
    board[7][6].ownership = 2

    board[1][2].p1_units.push(new Unit('Infantry', 1, 1, 2))
    board[2][1].p1_units.push(new Unit('Infantry', 1, 2, 1))

    board[8][7].p2_units.push(new Unit('Infantry', 2, 8, 7))
    board[7][8].p2_units.push(new Unit('Infantry', 2, 7, 8))

    board[1][1].p1_structures.push(new Structure('Barracks', 1, 1, 1))

    board[8][8].p2_structures.push(new Structure('Barracks', 2, 8, 8))

    return {
      'board': board,
    }
  }
}())
