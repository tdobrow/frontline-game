class Unit {
  static statsMapping = {
    Infantry:  { hp: 1, speed: 2, cost: 15, range: 2, damage: 1 },
    Tank:      { hp: 4, speed: 2, cost: 50, range: 2, damage: 2 },
    Artillery: { hp: 2, speed: 1, cost: 80, range: 5, damage: 5 },
    Scout:     { hp: 2, speed: 4, cost: 45, range: 2, damage: 1 },
  };

  constructor(type, player) {
    if (!Unit.statsMapping[type]) {
      throw new Error(`Invalid unit type: ${type}`);
    }

    this.type = type;
    this.player = player;

    this.isDead = false;

    this.stats = JSON.parse(JSON.stringify(Unit.statsMapping[type]));
  }

  getDead() {
    this.isDead = true;
  }
}

module.exports = Unit;
