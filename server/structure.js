class Structure {
  static statsMapping = {
    Barracks:    { hp: 3,  cost: 50 },
    // Watch_tower: { hp: 3,  cost: 30 },
    // Wall:        { hp: 10, cost: 30 },
  };

  getDead() {
    this.isDead = true;
  }

  constructor(type, player) {
    if (!Structure.statsMapping[type]) {
      throw new Error(`Invalid structure type: ${type}`);
    }

    this.isDead = false;

    this.type = type;
    this.player = player;

    this.stats = JSON.parse(JSON.stringify(Structure.statsMapping[type]));
  }
}

module.exports = Structure;
