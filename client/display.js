import ActionHandler from './actionHandler.js';

class Display {
  constructor(unit_map, structure_map, board, dead_units, is_player_1, my_moves, my_money) {
    this.board = board;
    this.dead_units = dead_units;
    this.is_player_1 = is_player_1;
    this.my_money = my_money;

    this.unit_map = unit_map;
    this.structure_map = structure_map;

    Display.greyOutUnaffordableItems(unit_map, structure_map, this.my_money);
    this.clearSvgLayer();

    this.action_handler = new ActionHandler(unit_map, structure_map, board, is_player_1, my_moves, my_money);
  }

  // PUBLIC

  buildShop() {
    Object.entries(this.unit_map).forEach(([unit_name, unit_stats]) => {
      const element = document.getElementById(unit_name);

      const name = document.createElement("td");
      name.textContent = unit_name;
      const cost = document.createElement("td");
      cost.textContent = unit_stats.cost;
      const hp = document.createElement("td");
      hp.textContent = unit_stats.hp;
      const speed = document.createElement("td");
      speed.textContent = unit_stats.speed;
      const range = document.createElement("td");
      range.textContent = unit_stats.range;
      const damage = document.createElement("td");
      damage.textContent = unit_stats.damage;

      element.appendChild(name);
      element.appendChild(cost);
      element.appendChild(hp);
      element.appendChild(speed);
      element.appendChild(range);
      element.appendChild(damage);
    });

    Object.entries(this.structure_map).forEach(([structure_name, structure_stats]) => {
      const element = document.getElementById(structure_name);

      const name = document.createElement("td");
      name.textContent = structure_name;
      const cost = document.createElement("td");
      cost.textContent = structure_stats.cost;
      const hp = document.createElement("td");
      hp.textContent = structure_stats.hp;

      element.appendChild(name);
      element.appendChild(cost);
      element.appendChild(hp);
    });
  }

  displayBoard() {
    Display.hidePieceDisplayTable()

    const container = document.getElementById("board")
    while (document.getElementById('board').childNodes.length > 0) {
      document.getElementById('board').childNodes[0].remove()
    }

    let my_territory = 0;
    for (var row = 0; row < this.board.length; row++) {
      for (var col = 0; col < this.board[row].length; col++) {
        var cell = document.createElement("div")
        cell.id = row + "_" + col
        cell.classList.add('tile');

        if (this.board[row][col].ownership > 0) {
          if ((this.is_player_1 && this.board[row][col].ownership == 1) || (!this.is_player_1 && this.board[row][col].ownership == 2)) {
            cell.classList.add('friendly_controlled');
            my_territory += 1;
          }
          if ((this.is_player_1 && this.board[row][col].ownership == 2) || (!this.is_player_1 && this.board[row][col].ownership == 1)) {
            cell.classList.add('enemy_controlled');
          }
        }

        if (this.board[row][col].terrain == 'water') {
          cell.classList.add('water');
        }

        // Right click handler
        function createContextMenuHandler(cell) {
          return function(event) {
            event.preventDefault();
            const row = cell.id.split("_")[0];
            const col = cell.id.split("_")[1];
            const board_cell = this.board[row][col]
            if (board_cell.p1_units.length > 0 || board_cell.p2_units.length > 0 || board_cell.p1_structures.length > 0 || board_cell.p2_structures.length > 0) {
              if (!document.getElementById(`${row}_${col}`).classList.contains('fog')) {
                this.buildPieceDisplayTable(cell, this.board[row][col]);
              }
            }
          };
        }
        cell.addEventListener('contextmenu', createContextMenuHandler(cell, row, col).bind(this));

        // Left click handler
        cell.onclick = ((currentCell) => {
          return () => {
            this.action_handler.handleClick(currentCell);
          };
        })(cell);

        container.appendChild(cell)
      }
    }

    document.getElementById('current_area').innerText = `Territory: ${my_territory}`;

    this.layerUnitsAndStructures()
    this.layerFog()
    this.layerBlood()
  }

  // STATIC

  static setupShop() {
    const unitRows = document.querySelectorAll('.unit-row');
    const structureRows = document.querySelectorAll('.structure-row');

    function handleRowClick(event) {
      const selected = event.currentTarget.classList.contains('shop_selected');

      unitRows.forEach(row => row.classList.remove('shop_selected'));
      structureRows.forEach(row => row.classList.remove('shop_selected'));

      if (!selected) {
        event.currentTarget.classList.add('shop_selected');
      }
    }

    unitRows.forEach(row => row.addEventListener('click', handleRowClick));
    structureRows.forEach(row => row.addEventListener('click', handleRowClick));
  }

  static hidePieceDisplayTable() {
    document.getElementById("unit-list").style.display = "none"

    const tableList = document.getElementById("table-list");
    const rows = tableList.querySelectorAll("tr:not(:first-child)");
    rows.forEach((row) => {
      row.remove();
    });
  }

  static unitShopRowSelected() {
    const unitRows = document.querySelectorAll('.unit-row');

    let selected = false;
    unitRows.forEach((row) => {
      if (row.classList.contains('shop_selected')) {
        selected = true;
      }
    });

    return selected;
  }

  static structureShopRowSelected() {
    const structureRows = document.querySelectorAll('.structure-row');

    let selected = false;
    structureRows.forEach((row) => {
      if (row.classList.contains('shop_selected')) {
        selected = true;
      }
    });

    return selected;
  }

  static drawArrowBetweenCells(ay, ax, by, bx, action) {
    const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrowLine.setAttribute('id', `arrow-line-${ay}_${ax}`);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('id', `dot-${ay}_${ax}`);

    // values are percentages
    const cellXCenterX = (ax * 9 + 5);
    const cellXCenterY = (ay * 9 + 5);
    const cellYCenterX = (bx * 9 + 5);
    const cellYCenterY = (by * 9 + 5);

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

    document.getElementById('arrow-svg').appendChild(arrowLine);
    document.getElementById('arrow-svg').appendChild(dot);
  }

  static greyOutUnaffordableItems(unit_map, structure_map, my_money) {
    document.querySelectorAll('.unit-row').forEach(row => row.classList.remove('greyed-out'));
    document.querySelectorAll('.structure-row').forEach(row => row.classList.remove('greyed-out'));

    const tooExpensiveUnits = Object.entries(unit_map)
      .filter(([_, value]) => value.cost > my_money)
      .map(([key, _]) => key);
    for (const unit of tooExpensiveUnits) {
      document.getElementById(unit).classList.add('greyed-out');
    }

    const tooExpensiveStructures = Object.entries(structure_map)
      .filter(([_, value]) => value.cost > my_money)
      .map(([key, _]) => key);
    for (const structure of tooExpensiveStructures) {
      document.getElementById(structure).classList.add('greyed-out');
    }
  }

  static clearFog() {
    for (let x=0; x < 11; x++) {
      for (let y=0; y < 11; y++) {
        document.getElementById(x + "_" + y)?.classList?.remove("fog");
      }
    }
  }

  // PRIVATE

  layerFog() {
    const childNodes = document.getElementById("board").childNodes;

    for (const node of childNodes) {
      const row = node.id.split("_")[0]
      const col = node.id.split("_")[1]
      if (this.is_player_1 && this.board[row][col].p1_units.length == 0 && this.board[row][col].ownership !== 1 && !this.is2Adjacent(+row, +col, 'p1_units')) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).style.backgroundImage = "";
      }
      if (!this.is_player_1 && this.board[row][col].p2_units.length == 0 && this.board[row][col].ownership !== 2 && !this.is2Adjacent(+row, +col, 'p2_units')) {
        node.classList.add("fog");
        document.getElementById(row + "_" + col).style.backgroundImage = "";
      }
    }
  }

  layerBlood() {
    for (var row = 0; row < this.board.length; row++) {
      for (var col = 0; col < this.board[row].length; col++) {
        if (this.dead_units.includes(`${row}_${col}`)) {
          document.getElementById(`${row}_${col}`).innerText = 'X';
        } else {
          document.getElementById(`${row}_${col}`).innerText = '';
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
    Display.hidePieceDisplayTable()

    document.getElementById("unit-list").style.display = "block"
    const top = cell.id.split("_")[0] * 64;
    const left = cell.id.split("_")[1] * 64 + 50;

    document.getElementById("unit-list").style.top = top + "px";
    document.getElementById("unit-list").style.left = left + "px";

    const tableList = document.getElementById("table-list");
    for (const unit of [...board_cell.p1_units, ...board_cell.p2_units, ...board_cell.p1_structures, ...board_cell.p2_structures]) {

      const newRow = document.createElement("tr");
      const newData = document.createElement("td");
      newData.textContent = unit.type;
      const newData2 = document.createElement("td");
      newData2.textContent = unit.stats.hp;
      const newData3 = document.createElement("td");
      newData3.textContent = unit.stats.speed;
      const newData4 = document.createElement("td");
      newData4.textContent = unit.stats.range;
      const newData5 = document.createElement("td");
      newData5.textContent = unit.stats.damage;

      newRow.appendChild(newData);
      newRow.appendChild(newData2);
      newRow.appendChild(newData3);
      newRow.appendChild(newData4);
      newRow.appendChild(newData5);
      tableList.appendChild(newRow);
    }
  }

  clearSvgLayer() {
    while (document.getElementById('arrow-svg').childNodes.length > 0) {
      document.getElementById('arrow-svg').childNodes[0].remove()
    }
  }

  isAdjacent(i, j, units_key) {
    if (i > 0 && this.board[i-1][j][units_key].length > 0) {
      return true
    }
    if (i > 0 && j > 0 && this.board[i-1][j-1][units_key].length > 0) {
      return true
    }
    if (i > 0 && j < 10 && this.board[i-1][j+1][units_key].length > 0) {
      return true
    }
    if (i < 10 && j > 0 && this.board[i+1][j-1][units_key].length > 0) {
      return true
    }
    if (i < 10 && this.board[i+1][j][units_key].length > 0) {
      return true
    }
    if (i < 10 && j < 10 && this.board[i+1][j+1][units_key].length > 0) {
      return true
    }
    if (j > 0 && this.board[i][j-1][units_key].length > 0) {
      return true
    }
    if (j < 10 && this.board[i][j+1][units_key].length > 0) {
      return true
    }
    return false
  }

  is2Adjacent(i, j, units_key) {
    // Positions within 2 squares in each direction, including diagonals
    const offsets = [
      [-2, 0],
      [-1, -1], [-1, 0], [-1, 1],
      [0, -2], [0, -1], [0, 1], [0, 2],
      [1, -1], [1, 0], [1, 1],
      [2, 0],
    ];

    for (const [xOffset, yOffset] of offsets) {
        const newX = i + xOffset;
        const newY = j + yOffset;

        if (newX >= 0 && newX <= 10 && newY >= 0 && newY <= 10 && this.board[newX][newY][units_key].length > 0) {
            return true;
        }
    }

    return false;
  }
}

export default Display;
