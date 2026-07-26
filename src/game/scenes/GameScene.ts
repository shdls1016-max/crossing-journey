import Phaser from "phaser";
import { ASSET_KEYS } from "../../assets/assetCatalog";
import { getStage, type StageDefinition } from "../../data/stages";
import {
  getGameplayStage,
  type CoinPlacement,
  type GameplayStageDefinition,
} from "../../data/gameplayStages";
import { SCENE_KEYS } from "../../flow/NavigationService";
import { gameResultService, saveService, screenFlow } from "../../appServices";
import { CollisionSystem } from "../../gameplay/CollisionSystem";
import { gameplayInput } from "../../gameplay/GameplayInputService";
import { gameplaySession } from "../../gameplay/GameplaySessionStore";
import {
  ObstacleSpawner,
  type ActiveLog,
  type ObstacleLayout,
} from "../../gameplay/ObstacleSpawner";
import {
  PlayerController,
  type MovingTarget,
  type PlayerGridMetrics,
} from "../../gameplay/PlayerController";
import { findSupportingLog, RiverSystem } from "../../gameplay/RiverSystem";
import { getCharacter, type CharacterDefinition } from "../../characters/characterCatalog";
import { TrainSystem } from "../../gameplay/TrainSystem";

interface GameSceneData {
  stageId?: number;
}

interface CoinActor {
  readonly placement: CoinPlacement;
  readonly image: Phaser.GameObjects.Image;
  collected: boolean;
}

interface WaterLaneActor {
  readonly image: Phaser.GameObjects.Image;
  readonly direction: -1 | 1;
  readonly baseX: number;
  readonly phase: number;
}

const TERRAIN_TILE_WIDTH = 1024;

export class GameScene extends Phaser.Scene {
  private stage!: StageDefinition;
  private gameplayStage: GameplayStageDefinition | null = null;
  private readonly playerController = new PlayerController();
  private readonly obstacleSpawner = new ObstacleSpawner();
  private readonly collisionSystem = new CollisionSystem();
  private readonly riverSystem = new RiverSystem();
  private readonly trainSystem = new TrainSystem();
  private readonly laneSprites: Phaser.GameObjects.GameObject[] = [];
  private readonly waterLanes: WaterLaneActor[] = [];
  private readonly coins: CoinActor[] = [];
  private player!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private finish!: Phaser.GameObjects.Image;
  private laneHeight = 96;
  private worldHeight = 0;
  private topPadding = 0;
  private bottomPadding = 0;
  private playLeft = 0;
  private playWidth = 0;
  private elapsedMs = 0;
  private ended = false;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private unsubscribeGameplayInput: (() => void) | null = null;
  private landingLog: ActiveLog | null = null;
  private characterDefinition: CharacterDefinition = getCharacter("main");

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data: GameSceneData): void {
    const requestedStage = Math.floor(data.stageId ?? 1);
    this.stage = getStage(requestedStage);
    this.gameplayStage = getGameplayStage(requestedStage);
    this.elapsedMs = 0;
    this.ended = false;
    this.characterDefinition = getCharacter(saveService.getSnapshot().selectedCharacter);
  }

  create(): void {
    if (!this.gameplayStage) {
      screenFlow.showWorldMap();
      this.scene.start(SCENE_KEYS.worldMap);
      return;
    }

    gameplaySession.start(this.gameplayStage.id);
    this.createWorldActors();
    this.layout(this.scale.width, this.scale.height, true);
    this.attachSystems();
    this.unsubscribeGameplayInput = gameplayInput.subscribe((direction) => {
      if (this.ended || this.scene.isPaused()) return;
      this.playerController.requestMove(direction);
    });
    this.cameras.main.scrollY = this.cameraTargetY(this.scale.height);

    this.resizeHandler = (gameSize) => this.layout(gameSize.width, gameSize.height, false);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(_time: number, delta: number): void {
    if (!this.gameplayStage || this.ended || this.scene.isPaused()) return;
    this.elapsedMs += Math.min(delta, 100);
    this.obstacleSpawner.update(delta);
    this.trainSystem.update(delta);
    this.animateWater(delta);
    this.riverSystem.update();
    this.collisionSystem.update();
    this.updateCamera(delta);
  }

  private createWorldActors(): void {
    this.finish = this.add
      .image(0, 0, ASSET_KEYS.object.finishSign)
      .setOrigin(0.5, 0.9)
      .setDepth(12);
    this.playerShadow = this.add
      .ellipse(0, 0, 48, 16, 0x23435d, 0.18)
      .setDepth(19);
    this.player = this.add
      .image(0, 0, this.characterDefinition.texture.walk)
      .setOrigin(0.5, 0.88)
      .setDepth(20);

    for (const placement of this.gameplayStage?.coins ?? []) {
      const image = this.add
        .image(0, 0, ASSET_KEYS.object.coin)
        .setOrigin(0.5)
        .setDepth(15);
      this.coins.push({ placement, image, collected: false });
    }
  }

  private attachSystems(): void {
    if (!this.gameplayStage) return;
    this.playerController.attach(this, this.player, this.getGridMetrics(), {
      startColumn: Math.floor(this.gameplayStage.columns / 2),
      pointerGestures: window.matchMedia(
        "(hover: hover) and (pointer: fine) and (min-width: 901px) and (min-height: 581px)",
      ).matches,
      resolveMovingTarget: (lane, _column, defaultX) =>
        this.resolveMovingLogTarget(lane, defaultX),
      onMoveStart: () => this.riverSystem.beginTransfer(this.landingLog),
      onBeforeArrive: () => this.riverSystem.completeTransfer(),
      onMoveFailed: () => this.failRun(),
      onPosition: (x, y) => this.playerShadow.setPosition(x + 3, y - 2),
      onArrive: (lane, column) => this.onPlayerArrive(lane, column),
    });
    this.obstacleSpawner.configure(this, this.gameplayStage, this.getObstacleLayout());
    this.trainSystem.configure(this, this.gameplayStage, this.getObstacleLayout());
    this.riverSystem.configure({
      player: this.player,
      getPlayerLane: () => this.playerController.getLane(),
      isPlayerMoving: () => this.playerController.isMoving(),
      isRiverLane: (lane) => this.gameplayStage?.lanes[lane]?.type === "river",
      getLogs: () => this.obstacleSpawner.getLogs(),
      getHorizontalBounds: () => ({
        left: this.playLeft + 12,
        right: this.playLeft + this.playWidth - 12,
      }),
      onPosition: (x, y) => this.playerShadow.setPosition(x + 3, y - 2),
      onFailure: () => this.failRun(),
    });
    this.collisionSystem.configure({
      player: this.player,
      getPlayerLane: () => this.playerController.getLane(),
      getVehicles: () => [
        ...this.obstacleSpawner.getVehicles(),
        ...this.trainSystem.getVehicles(),
      ],
      onCollision: () => this.handleVehicleCollision(),
    });
  }

  private layout(width: number, height: number, initial: boolean): void {
    if (!this.gameplayStage) return;
    const previousPlayLeft = this.playLeft;
    const previousPlayWidth = this.playWidth;
    const preserveRiverPosition =
      !initial &&
      this.gameplayStage.lanes[this.playerController.getLane()]?.type === "river" &&
      previousPlayWidth > 0;
    const normalizedPlayerX = preserveRiverPosition
      ? (this.player.x - previousPlayLeft) / previousPlayWidth
      : 0;
    this.cameras.main.setViewport(0, 0, width, height);
    this.laneHeight = Phaser.Math.Clamp(height * 0.115, 84, 108);
    this.topPadding = Phaser.Math.Clamp(height * 0.16, 92, 150);
    this.bottomPadding = Phaser.Math.Clamp(height * 0.22, 120, 190);
    this.worldHeight =
      this.topPadding + this.bottomPadding + this.gameplayStage.lanes.length * this.laneHeight;
    this.playWidth = Math.min(width, 620);
    this.playLeft = (width - this.playWidth) / 2;
    this.rebuildLanes(width);
    this.positionWorldActors();

    if (!initial) {
      if (preserveRiverPosition) {
        this.player.x = this.playLeft + normalizedPlayerX * this.playWidth;
      }
      this.playerController.setMetrics(this.getGridMetrics(), preserveRiverPosition);
      this.obstacleSpawner.relayout(this.getObstacleLayout(), true);
      this.trainSystem.relayout(this.getObstacleLayout());
    }

    const cameraWorldHeight = Math.max(height, this.worldHeight);
    this.cameras.main.setBounds(0, 0, width, cameraWorldHeight);
    const target = this.cameraTargetY(height);
    if (initial) this.cameras.main.scrollY = target;
    else this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, 0, target);
  }

  private rebuildLanes(width: number): void {
    if (!this.gameplayStage) return;
    for (const object of this.laneSprites) object.destroy();
    this.laneSprites.length = 0;
    this.waterLanes.length = 0;

    const isForestRiver = this.stage.region === "forest-river";
    const isCity = this.stage.region === "city-rail";
    const isSnow = this.stage.region === "snow-night";
    const safeTerrain = isCity
      ? ASSET_KEYS.terrain.city
      : isForestRiver
        ? ASSET_KEYS.terrain.forest
        : ASSET_KEYS.terrain.grass;
    const background = this.add
      .tileSprite(
        -1,
        0,
        width + 2,
        this.worldHeight,
        safeTerrain,
      )
      .setOrigin(0)
      .setTileScale(Math.max(1, width / TERRAIN_TILE_WIDTH), 1)
      .setDepth(0);
    if (isSnow) background.setTint(0xdceee8);
    this.laneSprites.push(background);

    this.gameplayStage.lanes.forEach((lane, laneIndex) => {
      const y = this.laneY(laneIndex) - this.laneHeight / 2;
      const isHazardLane =
        lane.type === "road" ||
        lane.type === "river" ||
        lane.type === "railway";
      if (isSnow && !isHazardLane) return;
      const key =
        lane.type === "road"
          ? ASSET_KEYS.terrain.road
          : lane.type === "river"
            ? ASSET_KEYS.terrain.river
            : lane.type === "railway"
              ? ASSET_KEYS.terrain.railway
              : safeTerrain;
      const surface =
        lane.type === "river"
          ? this.add
              .image(-16, y, key)
              .setOrigin(0)
              .setDisplaySize(width + 32, this.laneHeight + 1)
          : this.add
              .tileSprite(-1, y, width + 2, this.laneHeight + 1, key)
              .setOrigin(0);
      surface.setDepth(
        lane.type === "road" ||
          lane.type === "river" ||
          lane.type === "railway"
          ? 5
          : 2,
      );
      if (surface instanceof Phaser.GameObjects.TileSprite) {
        surface.setTileScale(Math.max(1, width / TERRAIN_TILE_WIDTH), 1);
        if (lane.type === "railway") surface.tilePositionY = 160;
        else if (
          lane.type !== "road" &&
          lane.type !== "river"
        ) {
          surface.tilePositionY = y;
        }
      }
      if (lane.type === "start") surface.setTint(0xa4ed87);
      if (lane.type === "finish") surface.setTint(0xb7f29c);
      if (isCity && lane.type !== "road" && lane.type !== "railway") {
        surface.setTint(0xe4f0f3);
      }
      if (isSnow) {
        surface.setTint(
          lane.type === "river"
            ? 0xc8f1fb
            : lane.type === "road" || lane.type === "railway"
              ? 0xc9d8df
              : 0xdceee8,
        );
      }
      this.laneSprites.push(surface);

      if (lane.type === "river") {
        surface.setTint(0xb8f4ff);
        this.waterLanes.push({
          image: surface as Phaser.GameObjects.Image,
          direction: lane.direction,
          baseX: -16,
          phase: laneIndex * 0.7,
        });
      }

      if (lane.type === "road") {
        const markings = this.add.graphics().setDepth(6);
        markings.lineStyle(3, 0xf7e7a9, 0.42);
        const dashWidth = 26;
        const gap = 24;
        for (let x = 8; x < width; x += dashWidth + gap) {
          markings.lineBetween(x, y + this.laneHeight / 2, x + dashWidth, y + this.laneHeight / 2);
        }
        if (isCity) {
          const crossingCenter = this.playLeft + this.playWidth * 0.5;
          const crossingWidth = Math.min(96, this.playWidth * 0.22);
          markings.fillStyle(0xfff7ea, 0.76);
          for (
            let stripeY = y + this.laneHeight * 0.12;
            stripeY < y + this.laneHeight * 0.86;
            stripeY += 17
          ) {
            markings.fillRoundedRect(
              crossingCenter - crossingWidth * 0.5,
              stripeY,
              crossingWidth,
              9,
              3,
            );
          }
        }
        this.laneSprites.push(markings);
      }
    });

    if (isSnow) {
      const snow = this.add
        .tileSprite(
          -1,
          0,
          width + 2,
          this.worldHeight,
          ASSET_KEYS.terrain.snow,
        )
        .setOrigin(0)
        .setTileScale(Math.max(1, width / TERRAIN_TILE_WIDTH), 1)
        .setAlpha(0.5)
        .setDepth(7);
      this.laneSprites.push(snow);
    }
  }

  private positionWorldActors(): void {
    if (!this.gameplayStage) return;
    const finishLane = this.gameplayStage.lanes.length - 1;
    const actorSize = Phaser.Math.Clamp(this.laneHeight * 0.98, 84, 106);
    this.player.setDisplaySize(actorSize, actorSize);
    this.playerShadow.setSize(actorSize * 0.48, actorSize * 0.15);
    this.finish
      .setDisplaySize(this.laneHeight * 0.72, this.laneHeight * 0.72)
      .setPosition(
        this.playLeft + this.playWidth * 0.5,
        this.laneY(finishLane) - this.laneHeight * 0.22,
      );

    for (const coin of this.coins) {
      coin.image
        .setDisplaySize(this.laneHeight * 0.42, this.laneHeight * 0.42)
        .setPosition(this.columnX(coin.placement.column), this.laneY(coin.placement.lane) - 8);
    }
  }

  private onPlayerArrive(lane: number, column: number): void {
    if (!this.gameplayStage || this.ended) return;
    const finishLane = this.gameplayStage.lanes.length - 1;
    const progress = lane / finishLane;
    gameplaySession.recordMove(progress);
    this.collectCoinAt(lane, column);
    if (lane === finishLane) {
      this.clearRun();
      return;
    }
    this.riverSystem.handleArrival();
    this.landingLog = null;
  }

  private resolveMovingLogTarget(lane: number, defaultX: number): MovingTarget | null {
    this.landingLog = null;
    if (this.gameplayStage?.lanes[lane]?.type !== "river") return null;
    const target = findSupportingLog(
      defaultX,
      lane,
      this.obstacleSpawner.getLogs(),
    );
    if (!target) return null;

    this.landingLog = target;
    const relativeX = Phaser.Math.Clamp(
      defaultX - target.image.x,
      -target.supportWidth * 0.5,
      target.supportWidth * 0.5,
    );
    let previousLogX = target.image.x;

    return {
      getCurrentX: () => {
        if (!target.image.active) return null;
        const currentLogX = target.image.x;
        if (Math.abs(currentLogX - previousLogX) > this.playWidth * 0.5) {
          return null;
        }
        previousLogX = currentLogX;
        const currentTargetX = currentLogX + relativeX;
        if (
          currentTargetX < this.playLeft ||
          currentTargetX > this.playLeft + this.playWidth
        ) {
          return null;
        }
        return currentTargetX;
      },
    };
  }

  private collectCoinAt(lane: number, column: number): void {
    const coin = this.coins.find(
      (candidate) =>
        !candidate.collected &&
        candidate.placement.lane === lane &&
        candidate.placement.column === column,
    );
    if (!coin) return;
    coin.collected = true;
    gameplaySession.collectCoin();
    this.tweens.add({
      targets: coin.image,
      angle: 360,
      scaleX: coin.image.scaleX * 1.55,
      scaleY: coin.image.scaleY * 1.55,
      alpha: 0,
      duration: 260,
      ease: "Back.easeIn",
      onComplete: () => coin.image.setVisible(false),
    });
  }

  private failRun(): void {
    if (!this.gameplayStage || this.ended) return;
    this.ended = true;
    this.player.setTexture(this.characterDefinition.texture.fail);
    this.playerController.setEnabled(false);
    this.obstacleSpawner.setRunning(false);
    this.trainSystem.setRunning(false);
    this.collisionSystem.setEnabled(false);
    this.riverSystem.setEnabled(false);
    const progress = this.playerController.getLane() / (this.gameplayStage.lanes.length - 1);
    gameplaySession.fail(progress);
    this.cameras.main.shake(260, 0.007);
    this.createFailBurst();
    this.time.delayedCall(650, () => gameResultService.failStage());
  }

  private handleVehicleCollision(): void {
    this.failRun();
  }

  private clearRun(): void {
    if (!this.gameplayStage || this.ended) return;
    this.ended = true;
    this.playerController.setEnabled(false);
    this.obstacleSpawner.setRunning(false);
    this.trainSystem.setRunning(false);
    this.collisionSystem.setEnabled(false);
    this.riverSystem.setEnabled(false);
    const session = gameplaySession.getSnapshot();
    const timeBonus = Math.max(0, Math.round((this.gameplayStage.parTimeMs - this.elapsedMs) / 100));
    const moveBonus = Math.max(0, this.gameplayStage.parMoves - session.moves) * 45;
    const score = 1_000 + session.collectedCoins * 120 + moveBonus + timeBonus;
    const withinMoves = session.moves <= this.gameplayStage.parMoves;
    const withinTime = this.elapsedMs <= this.gameplayStage.parTimeMs;
    const stars = withinMoves && withinTime ? 3 : withinMoves || withinTime ? 2 : 1;
    const before = saveService.getSnapshot();
    const previousBest = before.bestScores[String(this.gameplayStage.id)] ?? 0;
    const firstClear = before.clearedStages[String(this.gameplayStage.id)] !== true;
    const awardedCoins =
      session.collectedCoins + (firstClear ? this.stage.baseCoinReward : 0);

    this.player.setTexture(this.characterDefinition.texture.clear);
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 16,
      scaleX: this.player.scaleX * 1.08,
      scaleY: this.player.scaleY * 1.08,
      yoyo: true,
      duration: 220,
      ease: "Sine.easeOut",
    });
    this.time.delayedCall(520, () => {
      gameplaySession.clear({
        score,
        stars,
        collectedCoins: session.collectedCoins,
        awardedCoins,
        progress: 1,
        newBest: score > previousBest,
      });
      gameResultService.clearStage(
        this.gameplayStage!.id,
        score,
        stars,
        session.collectedCoins,
      );
    });
  }

  private createFailBurst(): void {
    for (let index = 0; index < 5; index += 1) {
      const star = this.add
        .image(this.player.x, this.player.y - 45, ASSET_KEYS.ui.star)
        .setDisplaySize(24, 24)
        .setDepth(30)
        .setAlpha(0.9);
      const angle = Phaser.Math.DegToRad(-150 + index * 30);
      this.tweens.add({
        targets: star,
        x: star.x + Math.cos(angle) * 58,
        y: star.y + Math.sin(angle) * 58,
        alpha: 0,
        angle: 90,
        duration: 520,
        onComplete: () => star.destroy(),
      });
    }
  }

  private updateCamera(delta: number): void {
    const target = this.cameraTargetY(this.scale.height);
    const amount = 1 - Math.pow(0.002, Math.min(delta, 50) / 1000);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, target, amount);
  }

  private animateWater(_delta: number): void {
    for (const water of this.waterLanes) {
      water.image.x =
        water.baseX +
        Math.sin(this.elapsedMs * 0.0012 + water.phase) *
          10 *
          water.direction;
    }
  }

  private cameraTargetY(height: number): number {
    const maxScroll = Math.max(0, this.worldHeight - height);
    return Phaser.Math.Clamp(this.player?.y - height * 0.7, 0, maxScroll);
  }

  private getGridMetrics(): PlayerGridMetrics {
    return {
      columns: this.gameplayStage?.columns ?? 5,
      laneCount: this.gameplayStage?.lanes.length ?? 1,
      columnX: (column) => this.columnX(column),
      laneY: (lane) => this.laneY(lane),
    };
  }

  private getObstacleLayout(): ObstacleLayout {
    return {
      width: this.scale.width,
      playLeft: this.playLeft,
      playWidth: this.playWidth,
      laneHeight: this.laneHeight,
      laneY: (lane) => this.laneY(lane),
    };
  }

  private columnX(column: number): number {
    const columns = this.gameplayStage?.columns ?? 5;
    return this.playLeft + (column + 0.5) * (this.playWidth / columns);
  }

  private laneY(lane: number): number {
    const laneCount = this.gameplayStage?.lanes.length ?? 1;
    return this.topPadding + (laneCount - lane - 0.5) * this.laneHeight;
  }

  private shutdown(): void {
    if (this.resizeHandler) this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.unsubscribeGameplayInput?.();
    this.unsubscribeGameplayInput = null;
    this.playerController.destroy();
    this.obstacleSpawner.reset();
    this.trainSystem.reset();
    this.collisionSystem.reset();
    this.riverSystem.reset();
    this.coins.length = 0;
    this.laneSprites.length = 0;
    this.waterLanes.length = 0;
    this.landingLog = null;
    this.resizeHandler = undefined;
  }
}
