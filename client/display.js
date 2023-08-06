class Display {
  constructor(board, is_player_1, p1_units, p2_units, p1_structures, p2_structures, purchase_selection_mode, my_move) {
    this.board = board;
    this.is_player_1 = is_player_1;
    this.p1_units = p1_units;
    this.p2_units = p2_units;
    this.p1_structures = p1_structures;
    this.p2_structures = p2_structures;

    this.purchase_selection_mode = purchase_selection_mode;
    this.my_move = my_move;
  }

  static setupShop() {
    // Add event listeners to each row to handle selection
    const unitRows = document.querySelectorAll('.unit-row');
    const structureRows = document.querySelectorAll('.structure-row');

    function handleRowClick(event) {
      // Remove the 'selected' class from all rows
      unitRows.forEach(row => row.classList.remove('selected'));
      structureRows.forEach(row => row.classList.remove('selected'));

      // Add the 'selected' class to the clicked row
      event.currentTarget.classList.add('selected');
    }

    unitRows.forEach(row => row.addEventListener('click', handleRowClick));
    structureRows.forEach(row => row.addEventListener('click', handleRowClick));
  }

  static hideShop() {
    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('selected'));
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
            console.log("DERP");
            this.handleClick(currentCell);
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

  // Private methods

  handleClick(cell) {
    if (this.purchase_selection_mode) {
      return this.handlePurchasePlacement(cell);
    }

    if (this.my_move.start_cell === undefined) {
      return this.handleSelectClick(cell)
    }
    if (this.my_move.start_cell === cell) {
      return this.deselectStartCell(cell)
    }

    this.handleDestinationClick(cell)
  }

  handlePurchasePlacement(cell) {
    console.log("Handle purchase placement")
  }

  handleSelectClick(cell) {
    if (this.unitExistsOnTile(cell)) {
      this.handleUnitSelect(cell);
    }
    if (this.structureExistsOnTile(cell)) {
      this.handleStructureSelect(cell);
    }
  }

  handleDestinationClick(cell) {
    if (this.my_move.end_cell === cell) {
      this.deselectEndCell(cell)
    } else {
      this.deselectAllEndCells()
      this.selectEndCell(cell)
    }
  }

  unitExistsOnTile(cell) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return (this.is_player_1 && this.board[row][col].p1_units.length > 0) || (!this.is_player_1 && this.board[row][col].p2_units.length > 0)
  }

  structureExistsOnTile(cell) {
    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    return (this.is_player_1 && this.board[row][col].p1_structures.length > 0) || (!this.is_player_1 && this.board[row][col].p2_structures.length > 0)
  }

  handleUnitSelect(cell) {
    this.selectStartCell(cell);

    const row = cell.id.split("_")[0]
    const col = cell.id.split("_")[1]

    if (this.is_player_1) {
      this.buildUnitDisplayTable(this.board[row][col].p1_units)
    } else {
      this.buildUnitDisplayTable(this.board[row][col].p2_units)
    }
  }

  handleStructureSelect(cell) {
    console.log("Structure selected");
  }

  selectStartCell(cell) {
    this.my_move.start_cell = cell
    cell.classList.add('start-selected')
  }

  deselectStartCell(cell) {
    this.my_move.start_cell = undefined
    this.deselectAllEndCells()
    this.hideUnitDisplayTable()
    cell.classList.remove('start-selected')
  }

  selectEndCell(cell) {
    this.my_move.end_cell = cell
    cell.classList.add('end-selected')
  }

  deselectEndCell(cell) {
    this.my_move.end_cell = undefined
    cell.classList.remove('end-selected')
  }

  deselectAllEndCells() {
    this.my_move.end_cell = undefined;
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
      for (const unit of this.p1_units) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const row = unit.row + i;
            const col = unit.col + j;
            document.getElementById(row + "_" + col)?.classList?.remove("fog");
          }
        }
      }
    } else {
      for (const unit of this.p2_units) {
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

  buildUnitDisplayTable(units) {
    this.hideUnitDisplayTable()
    document.getElementById("unit-list").style.display = "block"

    const tableList = document.getElementById("table-list");
    for (const unit of units) {
      const newRow = document.createElement("tr");
      const newData = document.createElement("td");
      console.log(unit)
      newData.textContent = unit.type;
      const newData2 = document.createElement("td");
      newData2.textContent = unit.stats.hp;
      newRow.appendChild(newData);
      newRow.appendChild(newData2);
      tableList.appendChild(newRow);
    }
  }
}

export default Display;
