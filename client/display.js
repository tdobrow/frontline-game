import Unit from './unit.js'
import Structure from './structure.js'

class Display {
  constructor(board, is_player_1, purchase_selection_mode, my_moves, my_money) {
    this.board = board;
    this.is_player_1 = is_player_1;
    this.my_money = my_money;

    this.purchase_selection_mode = purchase_selection_mode;
    this.my_moves = my_moves;

    this.selected_start_cell = undefined;
    this.selected_end_cell = undefined;

    this.svg_line_count = 0;

    this.greyOutUnaffordableItems();
    this.clearSvgLayer();
  }

  enablePurchaseSelectionMode() {
    this.purchase_selection_mode = true;
  }

  disablePurchaseSelectionMode() {
    this.purchase_selection_mode = false;
  }

  greyOutUnaffordableItems() {
    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('greyed-out'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('greyed-out'));

    const tooExpensiveUnits = Object.entries(Unit.statsMapping)
      .filter(([_, value]) => value.cost > this.my_money)
      .map(([key, _]) => key);
    for (const unit of tooExpensiveUnits) {
      document.getElementById(unit).classList.add('greyed-out');
    }

    const tooExpensiveStructures = Object.entries(Structure.statsMapping)
      .filter(([_, value]) => value.cost > this.my_money)
      .map(([key, _]) => key);
    console.log(tooExpensiveStructures)
    for (const structure of tooExpensiveStructures) {
      document.getElementById(structure).classList.add('greyed-out');
    }
  }

  static setupShop() {
    const unitRows = document.querySelectorAll('.unit-row');
    const structureRows = document.querySelectorAll('.structure-row');

    function handleRowClick(event) {
      unitRows.forEach(row => row.classList.remove('shop_selected'));
      structureRows.forEach(row => row.classList.remove('shop_selected'));

      event.currentTarget.classList.add('shop_selected');
    }

    unitRows.forEach(row => row.addEventListener('click', handleRowClick));
    structureRows.forEach(row => row.addEventListener('click', handleRowClick));
  }

  static hideShop() {
    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('shop_selected'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('shop_selected'));
    document.getElementById("shop").style.display = "none"
  }

  static showShop() {
    document.getElementById("shop").style.display = "block"
  }

  displayBoard() {
    const container = document.getElementById("board")
    while (document.getElementById('board').childNodes.length > 0) {
      document.getElementById('board').childNodes[0].remove()
    }
    for (var row = 0; row < this.board.length; row++) {
      for (var col = 0; col < this.board[row].length; col++) {
        var cell = document.createElement("div")
        cell.id = row + "_" + col
        cell.classList.add('tile');

        if (this.board[row][col].ownership > 0) {
          if ((this.is_player_1 && this.board[row][col].ownership == 1) || (!this.is_player_1 && this.board[row][col].ownership == 2)) {
            cell.classList.add('friendly_controlled');
          }
          if ((this.is_player_1 && this.board[row][col].ownership == 2) || (!this.is_player_1 && this.board[row][col].ownership == 1)) {
            cell.classList.add('enemy_controlled');
          }
        }

        function createContextMenuHandler(cell) {
          return function(event) {
            event.preventDefault();
            const row = cell.id.split("_")[0];
            const col = cell.id.split("_")[1];
            const board_cell = this.board[row][col]
            if (board_cell.p1_units.length > 0 || board_cell.p2_units.length > 0 || board_cell.p1_structures.length > 0 || board_cell.p2_structures.length > 0) {
              this.buildPieceDisplayTable(cell, this.board[row][col]);
            }
          };
        }

        cell.addEventListener('contextmenu', createContextMenuHandler(cell, row, col).bind(this));

        cell.onclick = ((currentCell) => {
          return () => {
            this.handleClick(currentCell);
            console.log("MOVES")
            console.log(this.my_moves)

          };
        })(cell);

        container.appendChild(cell)
      }
    }
    this.layerUnitsAndStructures()
    this.layerFog()
  }

  hidePieceDisplayTable() {
    document.getElementById("unit-list").style.display = "none"

    const tableList = document.getElementById("table-list");
    const rows = tableList.querySelectorAll("tr:not(:first-child)");
    rows.forEach((row) => {
      row.remove();
    });
  }

  handleClick(cell) {
    this.hidePieceDisplayTable()

    if (this.purchase_selection_mode) {
      return this.handlePurchasePlacement(cell);
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
        this.my_moves.attack.splice(i, 1);
      }
    }
    return svg_clear;
  }

  handlePurchasePlacement(cell) {
    if (!document.querySelector('.shop_selected')) {
      return;
    }

    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    if (['Barracks', 'Watch_tower', 'Wall'].includes(document.querySelector('.shop_selected').id)) {
      if (this.is_player_1 && (this.board[row][col].p1_structures.length > 0 || this.board[row][col].ownership !== 1)) {
        return;
      }
      if (!this.is_player_1 && (this.board[row][col].p2_structures.length > 0 || this.board[row][col].ownership !== 2)) {
        return;
      }
    } else {
      if (this.is_player_1 && (this.board[row][col].p1_structures.length == 0 || this.board[row][col].p1_structures[0].type !== 'Barracks')) {
        return;
      }
      if (!this.is_player_1 && (this.board[row][col].p2_structures.length == 0 || this.board[row][col].p2_structures[0].type !== 'Barracks')) {
        return;
      }
    }

    this.my_moves.placements.push({
      start_cell_id: cell.id,
      type: document.querySelector('.shop_selected').id
    })
    cell.classList.add('purchase-selected')

    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('shop_selected'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('shop_selected'));
  }

  handleSelectClick(cell) {
    if (this.unitExistsOnTile(cell, this.is_player_1)) {
      this.handleUnitSelect(cell);
    }
    // TODO: implement sane purchase selection
    // else if (this.structureExistsOnTile(cell, this.is_player_1)) {
    //   this.handleStructureSelect(cell);
    // }
  }

  handleDestinationClick(cell) {
    this.selected_end_cell = cell

    // if enemies on this cell
    if (this.unitExistsOnTile(cell, !this.is_player_1)) {
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
    this.drawArrowBetweenCells(
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
    this.drawArrowBetweenCells(
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

    // TODO: check for Artillery? Check for towers that give range?
    return distance <= 2
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

    return (player_1 && this.board[row][col].p1_units.length > 0) || (!player_1 && this.board[row][col].p2_units.length > 0)
  }

  structureExistsOnTile(cell, player_1) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return (player_1 && this.board[row][col].p1_structures.length > 0) || (!player_1 && this.board[row][col].p2_structures.length > 0)
  }

  // handleStructureSelect(cell) {
  //   this.selectStartCell(cell);

  //   const row = cell.id.split("_")[0]
  //   const col = cell.id.split("_")[1]

  //   if (this.is_player_1) {
  //     this.buildPieceDisplayTable(cell, this.board[row][col].p1_structures, [])
  //   } else {
  //     this.buildPieceDisplayTable(cell, this.board[row][col].p2_structures, [])
  //   }
  // }

  handleUnitSelect(cell) {
    this.selectStartCell(cell);

    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

  }

  selectStartCell(cell) {
    this.selected_start_cell = cell
    cell.classList.add('start-selected')
  }

  deselectStartCell() {
    this.selected_start_cell = undefined
    this.hidePieceDisplayTable()
    document.getElementById('board').childNodes.forEach(function(cell) {
      cell.classList.remove('start-selected');
    });
  }

  layerFog() {
    const childNodes = document.getElementById("board").childNodes;

    for (const node of childNodes) {
      const row = node.id.split("_")[0]
      const col = node.id.split("_")[1]
      if (this.is_player_1 && this.board[row][col].p1_units.length == 0 && this.board[row][col].ownership !== 1 && !this.isAdjacent(+row, +col, 'p1_units')) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).style.backgroundImage = "";
      }
      if (!this.is_player_1 && this.board[row][col].p2_units.length == 0 && this.board[row][col].ownership !== 2 && !this.isAdjacent(+row, +col, 'p2_units')) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).style.backgroundImage = "";
      }
    }
    if (this.is_player_1) {
      for (let x=0; x < 10; x++) {
        for (let y=0; y < 10; y++) {
          for (const unit of this.board[x][y].p1_units) {
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
    } else {
      for (let x=0; x < 10; x++) {
        for (let y=0; y < 10; y++) {
          for (const unit of this.board[x][y].p2_units) {
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
    }
  }

  layerUnitsAndStructures() {
    const childNodes = document.getElementById("board").childNodes;

    for (const node of childNodes) {
      const row = node.id.split("_")[0]
      const col = node.id.split("_")[1]
      const cell = this.board[row][col];
      if (cell.p1_units.length + cell.p2_units.length + cell.p1_structures.length + cell.p2_structures.length > 1) {
        document.getElementById(row + "_" + col).style.backgroundImage = `url('/pictures/multiple.png')`;
      } else if (cell.p1_units.length > 0) {
        document.getElementById(row + "_" + col).style.backgroundImage = `url('/pictures/${cell.p1_units[0].type}.png')`;
      } else if (cell.p2_units.length > 0) {
        document.getElementById(row + "_" + col).style.backgroundImage = `url('/pictures/${cell.p2_units[0].type}.png')`;
      } else if (cell.p1_structures.length > 0) {
        document.getElementById(row + "_" + col).style.backgroundImage = `url('/pictures/${cell.p1_structures[0].type}.png')`;
      } else if (cell.p2_structures.length > 0) {
        document.getElementById(row + "_" + col).style.backgroundImage = `url('/pictures/${cell.p2_structures[0].type}.png')`;
      } else {
        document.getElementById(row + "_" + col).style.backgroundImage = "";
      }
    }
  }

  buildPieceDisplayTable(cell, board_cell) {
    this.hidePieceDisplayTable()
    document.getElementById("unit-list").style.display = "block"
    const top = cell.id.split("_")[0] * 70 + 80;
    const left = cell.id.split("_")[1] * 70 + 50;

    document.getElementById("unit-list").style.top = top + "px";
    document.getElementById("unit-list").style.left = left + "px";

    const tableList = document.getElementById("table-list");
    for (const unit of [...board_cell.p1_units, ...board_cell.p2_units, ...board_cell.p1_structures, ...board_cell.p2_structures]) {
      const newRow = document.createElement("tr");
      const newData = document.createElement("td");
      newData.textContent = unit.type;
      const newData2 = document.createElement("td");
      newData2.textContent = unit.stats.hp;
      newRow.appendChild(newData);
      newRow.appendChild(newData2);
      tableList.appendChild(newRow);
    }
  }

  clearSvgLayer() {
    while (document.getElementById('arrow-svg').childNodes.length > 0) {
      document.getElementById('arrow-svg').childNodes[0].remove()
    }
    this.svg_line_count = 0;
  }

  drawArrowBetweenCells(ay, ax, by, bx, action) {
    const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrowLine.setAttribute('id', `arrow-line-${ay}_${ax}`);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('id', `dot-${ay}_${ax}`);

    // values are percentages
    const cellXCenterX = (ax * 10 + 5);
    const cellXCenterY = (ay * 10 + 5);
    const cellYCenterX = (bx * 10 + 5);
    const cellYCenterY = (by * 10 + 5);

    arrowLine.setAttribute('x1', cellXCenterX);
    arrowLine.setAttribute('y1', cellXCenterY);
    arrowLine.setAttribute('x2', cellYCenterX);
    arrowLine.setAttribute('y2', cellYCenterY);

    dot.setAttribute('cx', cellYCenterX);
    dot.setAttribute('cy', cellYCenterY);
    dot.setAttribute('r', 1);

    if (action == 'movement') {
      arrowLine.setAttribute('stroke', 'green');
      dot.setAttribute('stroke', 'green');
    }
    if (action == 'attack') {
      arrowLine.setAttribute('stroke', 'red');
      dot.setAttribute('stroke', 'red');
    }
    this.svg_line_count += 1;

    document.getElementById('arrow-svg').appendChild(arrowLine);
    document.getElementById('arrow-svg').appendChild(dot);
  }

  isAdjacent(i, j, units_key) {
    if (i > 0 && this.board[i-1][j][units_key].length > 0) {
      return true
    }
    if (i > 0 && j > 0 && this.board[i-1][j-1][units_key].length > 0) {
      return true
    }
    if (i > 0 && j < 9 && this.board[i-1][j+1][units_key].length > 0) {
      return true
    }
    if (i < 9 && j > 0 && this.board[i+1][j-1][units_key].length > 0) {
      return true
    }
    if (i < 9 && this.board[i+1][j][units_key].length > 0) {
      return true
    }
    if (i < 9 && j < 9 && this.board[i+1][j+1][units_key].length > 0) {
      return true
    }
    if (j > 0 && this.board[i][j-1][units_key].length > 0) {
      return true
    }
    if (j < 9 && this.board[i][j+1][units_key].length > 0) {
      return true
    }
    return false
  }
}

export default Display;
