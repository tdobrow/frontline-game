class Unit {
  static p1_unit_number = 0;
  static p2_unit_number = 0;

  static statsMapping = {
    Infantry:  { hp: 1, speed: 2, cost: 20, range: 2, damage: 1 },
    Tank:      { hp: 4, speed: 1, cost: 50, range: 2, damage: 2 },
    Artillery: { hp: 1, speed: 1, cost: 80, range: 5, damage: 4 },
    Scout:     { hp: 1, speed: 3, cost: 40, range: 1, damage: 1 },
  };

  constructor(type, player, row, col) {
    if (!Unit.statsMapping[type]) {
      throw new Error(`Invalid unit type: ${type}`);
    }

    this.type = type;
    this.player = player;
    this.row = row;
    this.col = col;

    this.isDead = false;

    const unit_number = Unit.unitNumber(player)
    this.id = unit_number
    this.name = `P${player}-${type}-${unit_number}`;
    this.stats = JSON.parse(JSON.stringify(Unit.statsMapping[type]));
  }

  getDead() {
    this.isDead = true;
  }

  static unitNumber(player) {
    if (player == 1) {
      this.p1_unit_number += 1;
      return this.p1_unit_number;
    } else {
      this.p2_unit_number += 1;
    return this.p2_unit_number;
    }

  }
}

module.exports = Unit;
