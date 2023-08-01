class Unit {
  static statsMapping = {
    infantry:  { hp: 1, speed: 2, cost: 20, range: 2, damage: 2 },
    tank:      { hp: 4, speed: 1, cost: 50, range: 2, damage: 2 },
    artillary: { hp: 1, speed: 1, cost: 80, range: 5, damage: 4 },
    scout:     { hp: 1, speed: 3, cost: 40, range: 1, damage: 1 },
  };

  constructor(type, player, row, col) {
    if (!Unit.statsMapping[type]) {
      throw new Error(`Invalid unit type: ${type}`);
    }

    this.type = type;
    this.player = player;
    this.row = row;
    this.col = col;

    this.name = `P${player}-${type}`;
    this.stats = Unit.statsMapping[type];
  }
}

module.exports = Unit;
