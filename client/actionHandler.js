import Unit from './unit.js'
import Structure from './structure.js'
import Display from './display.js'

class ActionHandler {
  constructor(board, is_player_1, my_moves, my_money) {
    this.board = board;
    this.is_player_1 = is_player_1;
    this.my_money = my_money;

    this.my_moves = my_moves;

    this.selected_start_cell = undefined;
    this.selected_end_cell = undefined;
  }

  // PUBLIC

  handleClick(cell) {
    Display.hidePieceDisplayTable()

    if (Display.unitShopRowSelected()) {
      const row = cell.id.split("_")[0];
      const col = cell.id.split("_")[1];
      const board_cell = this.board[row][col];
      if (
        (this.is_player_1 && (board_cell.p1_structures.length > 0 && board_cell.p1_structures[0].type == 'Barracks')) ||
        (!this.is_player_1 && (board_cell.p2_structures.length > 0 && board_cell.p2_structures[0].type == 'Barracks'))
      ) {
        this.my_money -= Unit.statsMapping[document.querySelector('.shop_selected').id].cost;
        this.placePiece(cell);

        Display.greyOutUnaffordableItems(this.my_money);

        return;
      } else {
        return;
      }
    }

    if (Display.structureShopRowSelected()) {
      const row = cell.id.split("_")[0];
      const col = cell.id.split("_")[1];
      const board_cell = this.board[row][col];

      if (
        (this.is_player_1 && board_cell.ownership == 1 && board_cell.p1_structures.length == 0) ||
        (!this.is_player_1 && board_cell.ownership == 2 && board_cell.p2_structures.length == 0)
      ) {
        this.my_money -= Structure.statsMapping[document.querySelector('.shop_selected').id].cost;
        this.placePiece(cell);

        Display.greyOutUnaffordableItems(this.my_money)

        return;
      } else {
        return;
      }
    }

    if (this.handleSvgClear(cell)) {
      return;
    }

    if (this.selected_start_cell === undefined) {
      return this.handleSelectClick(cell)
    }
    if (this.selected_start_cell === cell) {
      return this.deselectStartCell()
    }

    this.handleDestinationClick(cell)
  }

  deselectStartCell() {
    Display.hidePieceDisplayTable()

    this.selected_start_cell = undefined
    document.getElementById('board').childNodes.forEach(function(cell) {
      cell.classList.remove('start-selected');
    });
  }

  // PRIVATE

  placePiece(cell) {
    this.my_moves.placements.push({
      start_cell_id: cell.id,
      type: document.querySelector('.shop_selected').id
    })
    document.getElementById("my_money").innerHTML = "Money: $" + this.my_money

    cell.classList.add('purchase-selected');

    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('shop_selected'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('shop_selected'));
  }

  handleSelectClick(cell) {
    if (this.unitExistsOnTile(cell, this.is_player_1)) {
      this.selectStartCell(cell);
    }
  }

  handleDestinationClick(cell) {
    this.selected_end_cell = cell

    const destination_cell = document.getElementById(cell.id);
    if (!destination_cell.classList.contains('fog') && this.pieceExistsOnTile(cell, !this.is_player_1)) {
      if (this.validAttackDestination(this.selected_start_cell, cell, this.is_player_1)) {
        this.handleAttackDestinationClick(cell);
      }
    } else {
      if (this.validMoveDestination(this.selected_start_cell, cell, this.is_player_1)) {
        this.handleMovementDestinationClick(cell);
      }
    }

    this.deselectStartCell();
    this.selected_start_cell = undefined;
    this.selected_end_cell = undefined;
  }

  handleAttackDestinationClick(cell) {
    this.my_moves.attacks.push({
      start_cell_id: this.selected_start_cell.id,
      end_cell_id: cell.id
    })
    Display.drawArrowBetweenCells(
      this.selected_start_cell.id.split('_')[0],
      this.selected_start_cell.id.split('_')[1],
      this.selected_end_cell.id.split('_')[0],
      this.selected_end_cell.id.split('_')[1],
      'attack'
    );
  }

  handleMovementDestinationClick(cell) {
    this.my_moves.movements.push({
      start_cell_id: this.selected_start_cell.id,
      end_cell_id: cell.id
    })
    Display.drawArrowBetweenCells(
      this.selected_start_cell.id.split('_')[0],
      this.selected_start_cell.id.split('_')[1],
      this.selected_end_cell.id.split('_')[0],
      this.selected_end_cell.id.split('_')[1],
      'movement'
    );
  }

  validAttackDestination(start_cell, end_cell, player_1) {
    const start_row = start_cell.id.split("_")[0]
    const start_col = start_cell.id.split("_")[1]
    const end_row = end_cell.id.split("_")[0]
    const end_col = end_cell.id.split("_")[1]
    const distance = Math.abs(start_row - end_row) + Math.abs(start_col - end_col)

    const units = player_1 ? this.board[start_row][start_col].p1_units : this.board[start_row][start_col].p2_units

    units.sort((a, b) => a.stats.range - b.stats.range) // sort ascending by range

    return distance <= units[0].stats.range
  }

  validMoveDestination(start_cell, end_cell, player_1) {
    const start_row = start_cell.id.split("_")[0]
    const start_col = start_cell.id.split("_")[1]
    const end_row = end_cell.id.split("_")[0]
    const end_col = end_cell.id.split("_")[1]

    const units = player_1 ? this.board[start_row][start_col].p1_units : this.board[start_row][start_col].p2_units
    const distance = Math.abs(start_row - end_row) + Math.abs(start_col - end_col)

    for (let unit of units) {
      if (unit.stats.speed < distance) {
        return false
      }
    }
    return true;
  }

  unitExistsOnTile(cell, player_1) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return player_1 && this.board[row][col].p1_units.length > 0 || !player_1 && this.board[row][col].p2_units.length > 0
  }

  pieceExistsOnTile(cell, player_1) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return (
      player_1 && (this.board[row][col].p1_units.length > 0 || this.board[row][col].p1_structures.length > 0)
      || (!player_1 && (this.board[row][col].p2_units.length > 0 || this.board[row][col].p2_structures.length > 0))
    )
  }

  selectStartCell(cell) {
    this.selected_start_cell = cell
    cell.classList.add('start-selected')
  }

  handleSvgClear(cell) {
    let svg_clear = false;
    for (let i=0; i < this.my_moves.movements.length; i++) {
      let movement = this.my_moves.movements[i];
      if (movement.start_cell_id == cell.id) {
        this.deselectStartCell();
        svg_clear = true;

        var parentElement = document.getElementById('arrow-svg');

        var childElement1 = document.getElementById(`dot-${cell.id}`);
        var childElement2 = document.getElementById(`arrow-line-${cell.id}`);
        parentElement.removeChild(childElement1);
        parentElement.removeChild(childElement2);
        this.my_moves.movements.splice(i, 1);
      }
    }
    for (let i=0; i < this.my_moves.attacks.length; i++) {
      let attack = this.my_moves.attacks[i];
      if (attack.start_cell_id == cell.id) {
        this.deselectStartCell();
        svg_clear = true;

        var parentElement = document.getElementById('arrow-svg');

        var childElement1 = document.getElementById(`dot-${cell.id}`);
        var childElement2 = document.getElementById(`arrow-line-${cell.id}`);
        parentElement.removeChild(childElement1);
        parentElement.removeChild(childElement2);
        this.my_moves.attacks.splice(i, 1);
      }
    }
    return svg_clear;
  }
}

export default ActionHandler;
