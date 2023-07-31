(function() {
  module.exports.generateBoard = function(board_size) {
    board = []

    for (row=0; row<board_size; row+=1) {
      new_row = []
      for (col=0; col<board_size; col+=1) {
        new_row.push({
          'p1_units': [],
          'p2_units': [],
          'ownership': 0, // 0 = neutral, 1 = player 1, 2 = player 2
        })
      }
      board.push(new_row)
    }
    return board
  }
}())
