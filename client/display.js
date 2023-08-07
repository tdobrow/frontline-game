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

  hideUnitDisplayTable() {
    document.getElementById("unit-list").style.display = "none"

    const tableList = document.getElementById("table-list");
    const rows = tableList.querySelectorAll("tr:not(:first-child)");
    rows.forEach((row) => {
      row.remove();
    });
  }

  handleClick(cell) {
    if (this.purchase_selection_mode) {
      return this.handlePurchasePlacement(cell);
    }

    if (this.selected_start_cell === undefined) {
      return this.handleSelectClick(cell)
    }
    if (this.selected_start_cell === cell) {
      return this.deselectStartCell()
    }

    this.handleDestinationClick(cell)
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
  }

  handleDestinationClick(cell) {
    if (this.selected_end_cell === cell) {
      this.deselectEndCell(cell)
    } else {
      // this.deselectAllEndCells()
      this.selectEndCell(cell)

      // if enemies on this cell
      if (this.unitExistsOnTile(cell, !this.is_player_1)) {
        this.handleAttackDestinationClick(cell);
      } else {
        this.handleMovementDestinationClick(cell);
      }

      this.selected_start_cell = undefined;
      this.selected_end_cell = undefined;
    }
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

  unitExistsOnTile(cell, player_1) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return (player_1 && this.board[row][col].p1_units.length > 0) || (!player_1 && this.board[row][col].p2_units.length > 0)
  }

  handleUnitSelect(cell) {
    this.selectStartCell(cell);

    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    if (this.is_player_1) {
      this.buildUnitDisplayTable(this.board[row][col].p1_units, this.board[row][col].p1_structures)
    } else {
      this.buildUnitDisplayTable(this.board[row][col].p2_units, this.board[row][col].p2_structures)
    }
  }

  selectStartCell(cell) {
    this.selected_start_cell = cell
    cell.classList.add('start-selected')
  }

  deselectStartCell() {
    this.selected_start_cell = undefined
    this.deselectAllEndCells()
    this.hideUnitDisplayTable()
    document.getElementById('board').childNodes.forEach(function(cell) {
      cell.classList.remove('start-selected');
    });
  }

  selectEndCell(cell) {
    this.selected_end_cell = cell
    cell.classList.add('end-selected')
  }

  deselectEndCell(cell) {
    this.selected_end_cell = undefined
    cell.classList.remove('end-selected')
  }

  deselectAllEndCells() {
    this.selected_end_cell = undefined;
    document.getElementById('board').childNodes.forEach(function(cell) {
      cell.classList.remove('end-selected');
    });
  }

  layerFog() {
    const childNodes = document.getElementById("board").childNodes;

    for (const node of childNodes) {
      const row = node.id.split("_")[0]
      const col = node.id.split("_")[1]
      if (this.is_player_1 && this.board[row][col].p1_units.length == 0 && this.board[row][col].ownership !== 1) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).innerText = "";
      }
      if (!this.is_player_1 && this.board[row][col].p2_units.length == 0 && this.board[row][col].ownership !== 2) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).innerText = "";
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
      if (this.is_player_1 && this.board[row][col].p1_units.length > 0) {
        document.getElementById(row + "_" + col).innerText = this.board[row][col].p1_units[0].name
      } else if (!this.is_player_1 && this.board[row][col].p2_units.length > 0) {
        document.getElementById(row + "_" + col).innerText = this.board[row][col].p2_units[0].name
      } else if (this.is_player_1 && this.board[row][col].p1_structures.length > 0) {
        document.getElementById(row + "_" + col).innerText = this.board[row][col].p1_structures[0].name
      } else if (!this.is_player_1 && this.board[row][col].p2_structures.length > 0) {
        document.getElementById(row + "_" + col).innerText = this.board[row][col].p2_structures[0].name
      } else {
        document.getElementById(row + "_" + col).innerText = ""
      }
    }
  }

  buildUnitDisplayTable(units, structures) {
    this.hideUnitDisplayTable()
    document.getElementById("unit-list").style.display = "block"

    const tableList = document.getElementById("table-list");
    for (const unit of [...units, ...structures]) {
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
    arrowLine.setAttribute('id', `arrow-line-${this.svg_line_count}`);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('id', `dot-${this.svg_line_count}`);

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
}

export default Display;
