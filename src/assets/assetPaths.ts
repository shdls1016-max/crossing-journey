export const PUBLIC_ASSET_FILES = {
  character: {
    reference: "assets/characters/character-main-reference-v3.png",
    play: "assets/characters/character-main-play-v3.png",
    map: "assets/characters/character-main-map-v3.png",
    clear: "assets/characters/character-main-clear-v3.png",
    fail: "assets/characters/character-main-fail-v3.png",
    otter: {
      idle: "assets/characters/character-otter-idle-proposal-v1.png",
      walk: "assets/characters/character-otter-walk-proposal-v1.png",
      clear: "assets/characters/character-otter-clear-proposal-v1.png",
      fail: "assets/characters/character-otter-fail-proposal-v1.png",
    },
  },
  terrain: {
    grass: "assets/terrain/safe-grass-tile.png",
    road: "assets/terrain/road-tile.png",
    forest: "assets/terrain/forest-floor-tile.png",
    river: "assets/terrain/river-tile.png",
    city: "assets/terrain/city-floor-tile.png",
    railway: "assets/terrain/railway-tile.png",
    snow: "assets/terrain/snow-overlay.png",
  },
  vehicle: {
    compact: "assets/vehicles/car-compact.png",
    sedan: "assets/vehicles/car-sedan.png",
    truck: "assets/vehicles/truck.png",
    train: "assets/vehicles/train.png",
  },
  obstacle: {
    logSmall: "assets/obstacles/log-small.png",
    logLong: "assets/obstacles/log-long.png",
  },
  object: {
    coin: "assets/objects/coin.png",
    finishSign: "assets/objects/finish-sign.png",
  },
  node: {
    normal: "assets/world-map/node-normal.png",
    current: "assets/world-map/node-current.png",
    completed: "assets/world-map/node-completed.png",
    locked: "assets/world-map/node-locked.png",
  },
  ui: {
    settings: "assets/ui/icon-settings.png",
    characterMenu: "assets/ui/icon-character-menu.png",
    back: "assets/ui/icon-back.png",
    pause: "assets/ui/icon-pause.png",
    close: "assets/ui/icon-close.png",
    lock: "assets/ui/icon-lock.png",
    check: "assets/ui/icon-check.png",
    star: "assets/ui/icon-star.png",
    buttonLarge: "assets/ui/button-large.png",
    buttonSmall: "assets/ui/button-small.png",
    popup: "assets/ui/popup-panel.png",
  },
} as const;

export function assetUrl(publicPath: string): string {
  return `${import.meta.env?.BASE_URL ?? "/"}${publicPath}`;
}

export const DOM_ASSETS = {
  character: {
    reference: assetUrl(PUBLIC_ASSET_FILES.character.reference),
    play: assetUrl(PUBLIC_ASSET_FILES.character.play),
    map: assetUrl(PUBLIC_ASSET_FILES.character.map),
    clear: assetUrl(PUBLIC_ASSET_FILES.character.clear),
    fail: assetUrl(PUBLIC_ASSET_FILES.character.fail),
    otter: {
      idle: assetUrl(PUBLIC_ASSET_FILES.character.otter.idle),
      walk: assetUrl(PUBLIC_ASSET_FILES.character.otter.walk),
      clear: assetUrl(PUBLIC_ASSET_FILES.character.otter.clear),
      fail: assetUrl(PUBLIC_ASSET_FILES.character.otter.fail),
    },
  },
  object: {
    coin: assetUrl(PUBLIC_ASSET_FILES.object.coin),
  },
  ui: {
    settings: assetUrl(PUBLIC_ASSET_FILES.ui.settings),
    characterMenu: assetUrl(PUBLIC_ASSET_FILES.ui.characterMenu),
    back: assetUrl(PUBLIC_ASSET_FILES.ui.back),
    pause: assetUrl(PUBLIC_ASSET_FILES.ui.pause),
    close: assetUrl(PUBLIC_ASSET_FILES.ui.close),
    check: assetUrl(PUBLIC_ASSET_FILES.ui.check),
    star: assetUrl(PUBLIC_ASSET_FILES.ui.star),
    buttonLarge: assetUrl(PUBLIC_ASSET_FILES.ui.buttonLarge),
    buttonSmall: assetUrl(PUBLIC_ASSET_FILES.ui.buttonSmall),
    popup: assetUrl(PUBLIC_ASSET_FILES.ui.popup),
  },
} as const;
