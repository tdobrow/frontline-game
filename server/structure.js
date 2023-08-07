class Structure {
  static statsMapping = {
    Barracks:    { hp: 3,  cost: 50 },
    Watch_tower: { hp: 3,  cost: 30 },
    Wall:        { hp: 10, cost: 30 },
  };

  constructor(type, player, row, col) {
    if (!Structure.statsMapping[type]) {
      throw new Error(`Invalid structure type: ${type}`);
    }

    this.type = type;
    this.player = player;
    this.row = row;
    this.col = col;

    this.name = `P${player}-${type}`;
    this.stats = JSON.parse(JSON.stringify(Structure.statsMapping[type]));
  }
}

module.exports = Structure;
