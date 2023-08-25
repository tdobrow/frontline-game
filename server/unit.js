class Unit {
  static statsMapping = {
    Infantry:  { hp: 1, speed: 2, cost: 15, range: 2, damage: 1 },
    Tank:      { hp: 3, speed: 2, cost: 45, range: 2, damage: 2 },
    Artillery: { hp: 2, speed: 1, cost: 80, range: 5, damage: 5 },
    Scout:     { hp: 2, speed: 4, cost: 45, range: 2, damage: 1 },
    Medic:     { hp: 2, speed: 2, cost: 55, range: 5, damage: 0 }, // give max range as a hack
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
