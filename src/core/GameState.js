export class GameState {
  constructor(defaultPlayerStats) {
    this.defaultPlayerStats = { ...defaultPlayerStats };
    this.reset();
  }

  // Центральное состояние игры. Новые RPG-механики лучше сначала добавлять сюда.
  reset() {
    this.player = null;
    this.playerStats = { ...this.defaultPlayerStats };
    this.playerCharacter = "boy";
    this.currentUser = null;
    this.currentLocationId = "city";
    this.content = null;
    this.collisionMap = null;
    this.npcs = [];
    this.mobs = [];
    this.objects = [];
    this.mobRespawns = [];
    this.questLog = [];
    this.questStates = {};
    this.inventory = {};
    this.dialog = {
      isOpen: false,
      activeNpc: null,
      activeInteractable: null,
      lines: [],
      index: 0,
      action: null,
    };
    this.shop = {
      activeShop: null,
    };
    this.saveData = null;
  }

  setLocationRuntime({ locationId, content, collisionMap, player, npcs, mobs, objects }) {
    this.currentLocationId = locationId;
    this.content = content;
    this.collisionMap = collisionMap;
    this.player = player;
    this.npcs = npcs;
    this.mobs = mobs;
    this.objects = objects;
  }

  setProgress({ playerCharacter, currentLocationId, questStates, questLog, inventory, playerStats }) {
    this.playerCharacter = playerCharacter || "boy";
    this.currentLocationId = currentLocationId || "city";
    this.questStates = questStates || {};
    this.questLog = questLog || [];
    this.inventory = inventory || {};
    this.playerStats = playerStats || { ...this.defaultPlayerStats };
  }
}
