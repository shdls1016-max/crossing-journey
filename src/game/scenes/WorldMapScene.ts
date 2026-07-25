import Phaser from "phaser";
import { ASSET_KEYS } from "../../assets/assetCatalog";
import {
  progressService,
  saveService,
  screenFlow,
} from "../../appServices";
import { DESIGN_TOKENS } from "../../config/designTokens";
import { getStage, STAGES, type StageRegion } from "../../data/stages";
import { SCENE_KEYS } from "../../flow/NavigationService";
import type { FlowState } from "../../flow/ScreenFlowStore";
import type { GameSaveData, PendingStageUnlock } from "../../storage/saveTypes";

interface StagePoint {
  stageId: number;
  x: number;
  y: number;
}

interface StageNodeView {
  stageId: number;
  container: Phaser.GameObjects.Container;
  node: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Graphics;
  lock: Phaser.GameObjects.Image | null;
  stars: NodeStarView[];
  selectable: boolean;
  current: boolean;
}

interface NodeStarView {
  image: Phaser.GameObjects.Image;
  slotX: number;
  slotY: number;
  scaleX: number;
  scaleY: number;
  filled: boolean;
}

const STAGE_SPACING = 228;
const MAP_PADDING_TOP = 360;
const MAP_PADDING_BOTTOM = 400;
const WORLD_TERRAIN_TILE_WIDTH = 1024;

const PATH_COLORS: Record<StageRegion, number> = {
  meadow: 0xf5d18e,
  "forest-river": 0xc69867,
  "city-rail": 0xbecbd3,
  "snow-night": 0xf5fbff,
};

export class WorldMapScene extends Phaser.Scene {
  private mapHeight = 0;
  private layoutWidth = 0;
  private stagePoints = new Map<number, StagePoint>();
  private stageCurves = new Map<number, Phaser.Curves.QuadraticBezier>();
  private nodeViews = new Map<number, StageNodeView>();
  private selectedNode: StageNodeView | null = null;
  private character: Phaser.GameObjects.Image | null = null;
  private characterShadow: Phaser.GameObjects.Ellipse | null = null;
  private characterOffsetX = 0;
  private characterOffsetY = 0;
  private saveSnapshot!: Readonly<GameSaveData>;
  private pendingUnlock: PendingStageUnlock | null = null;
  private clearStarsAnimationStarted = false;
  private unlockAnimationStarted = false;
  private dragStartY = 0;
  private lastPointerY = 0;
  private dragDistance = 0;
  private unsubscribeFlow: (() => void) | null = null;

  constructor() {
    super(SCENE_KEYS.worldMap);
  }

  create(): void {
    this.clearStarsAnimationStarted = false;
    this.unlockAnimationStarted = false;
    this.pendingUnlock = progressService.consumePendingUnlock();
    this.saveSnapshot = saveService.getSnapshot();
    this.buildMap(this.scale.width, this.scale.height);
    this.bindInput();

    this.unsubscribeFlow = screenFlow.subscribe((state) => this.onFlowChange(state));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    if (this.pendingUnlock) {
      this.time.delayedCall(280, () => this.playClearStarsAnimation(this.pendingUnlock!));
    } else {
      this.startCharacterIdle();
    }
  }

  private buildMap(width: number, height: number): void {
    this.layoutWidth = width;
    this.children.removeAll(true);
    this.tweens.killAll();
    this.stagePoints.clear();
    this.stageCurves.clear();
    this.nodeViews.clear();
    this.selectedNode = null;
    this.character = null;
    this.characterShadow = null;

    this.mapHeight =
      MAP_PADDING_TOP + MAP_PADDING_BOTTOM + (STAGES.length - 1) * STAGE_SPACING;
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, this.mapHeight);
    this.createStagePoints(width);
    this.createRegionBackgrounds(width);
    this.createRegionAccents(width);
    this.createPath();
    this.createDecorations(width);
    this.createStageNodes(width);
    this.createCharacter(width);
    this.focusInitialPosition(width, height);
  }

  private createStagePoints(width: number): void {
    const centerX = width * 0.5;
    const amplitude = Math.min(width * 0.27, 176);
    for (const stage of STAGES) {
      const x =
        centerX +
        Math.sin((stage.id - 1) * 0.94 - 0.7) * amplitude +
        Math.sin((stage.id - 1) * 0.31) * amplitude * 0.12;
      const y =
        this.mapHeight - MAP_PADDING_BOTTOM - (stage.id - 1) * STAGE_SPACING;
      this.stagePoints.set(stage.id, { stageId: stage.id, x, y });
    }
  }

  private createRegionBackgrounds(width: number): void {
    const bandHeight = this.mapHeight / 4;
    const bands = [
      { y: 0, key: ASSET_KEYS.terrain.city, tint: 0xcfe9f3 },
      { y: bandHeight, key: ASSET_KEYS.terrain.city, tint: 0xc7d9df },
      { y: bandHeight * 2, key: ASSET_KEYS.terrain.forest, tint: 0x82b879 },
      { y: bandHeight * 3, key: ASSET_KEYS.terrain.grass, tint: 0xffffff },
    ] as const;

    for (const band of bands) {
      this.add
        .tileSprite(0, band.y, width, bandHeight + 2, band.key)
        .setOrigin(0)
        .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
        .setTint(band.tint)
        .setDepth(DESIGN_TOKENS.depth.background);
    }

    this.add
      .tileSprite(0, 0, width, bandHeight + 30, ASSET_KEYS.terrain.snow)
      .setOrigin(0)
      .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
      .setAlpha(0.72)
      .setDepth(DESIGN_TOKENS.depth.background + 1);

    this.add
      .rectangle(0, 0, width, bandHeight + 30, 0x152b53, 0.25)
      .setOrigin(0)
      .setDepth(DESIGN_TOKENS.depth.background + 2);

    const topGlow = this.add.graphics().setDepth(DESIGN_TOKENS.depth.background + 3);
    topGlow.fillStyle(0x5fd8e8, 0.08);
    topGlow.fillRect(0, 0, width, bandHeight * 0.58);
  }

  private createRegionAccents(width: number): void {
    const meadowY = this.stagePoints.get(3)!.y + 72;
    const railY = this.stagePoints.get(13)!.y + 42;
    const snowRoadY = this.stagePoints.get(18)!.y + 64;

    this.add
      .tileSprite(0, meadowY, width, 92, ASSET_KEYS.terrain.road)
      .setOrigin(0)
      .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
      .setAlpha(0.36)
      .setDepth(DESIGN_TOKENS.depth.background + 4);
    const riverBands = [
      { y: this.stagePoints.get(6)!.y + 76, height: 76, alpha: 0.52 },
      { y: this.stagePoints.get(8)!.y + 28, height: 116, alpha: 0.9 },
      { y: this.stagePoints.get(10)!.y + 62, height: 88, alpha: 0.62 },
    ] as const;
    for (const river of riverBands) {
      this.add
        .tileSprite(0, river.y, width, river.height, ASSET_KEYS.terrain.river)
        .setOrigin(0)
        .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
        .setTint(0xb8f4ff)
        .setAlpha(river.alpha)
        .setDepth(DESIGN_TOKENS.depth.background + 4);
    }
    const rail = this.add
      .tileSprite(0, railY, width, 138, ASSET_KEYS.terrain.railway)
      .setOrigin(0)
      .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
      .setAlpha(0.5)
      .setDepth(DESIGN_TOKENS.depth.background + 4);
    rail.tilePositionY = 160;
    this.add
      .tileSprite(0, snowRoadY, width, 92, ASSET_KEYS.terrain.road)
      .setOrigin(0)
      .setTileScale(Math.max(1, width / WORLD_TERRAIN_TILE_WIDTH), 1)
      .setTint(0xb9d8e5)
      .setAlpha(0.34)
      .setDepth(DESIGN_TOKENS.depth.background + 4);
  }

  private createPath(): void {
    const graphics = this.add.graphics().setDepth(DESIGN_TOKENS.depth.world);

    for (let stageId = 1; stageId < STAGES.length; stageId += 1) {
      const from = this.stagePoints.get(stageId)!;
      const to = this.stagePoints.get(stageId + 1)!;
      const direction = stageId % 2 === 0 ? -1 : 1;
      const control = new Phaser.Math.Vector2(
        (from.x + to.x) * 0.5 + direction * 34,
        (from.y + to.y) * 0.5,
      );
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(from.x, from.y),
        control,
        new Phaser.Math.Vector2(to.x, to.y),
      );
      const points = curve.getSpacedPoints(26);
      const region = getStage(stageId).region;

      graphics.lineStyle(38, 0x654c42, 0.2);
      graphics.strokePoints(points, false, false);
      graphics.lineStyle(29, PATH_COLORS[region], 1);
      graphics.strokePoints(points, false, false);
      graphics.lineStyle(4, 0xffffff, region === "snow-night" ? 0.48 : 0.24);
      graphics.strokePoints(points, false, false);
      this.stageCurves.set(stageId, curve);
    }
  }

  private createDecorations(width: number): void {
    const sideX = (side: "left" | "right", inset: number) =>
      side === "left" ? inset : width - inset;
    const decorations = [
      {
        key: ASSET_KEYS.object.finishSign,
        x: sideX("left", 58),
        y: this.stagePoints.get(5)!.y + 84,
        size: 70,
        angle: -5,
      },
      {
        key: ASSET_KEYS.vehicle.compact,
        x: sideX("right", 70),
        y: this.stagePoints.get(2)!.y + 80,
        size: 92,
        angle: 2,
      },
      {
        key: ASSET_KEYS.obstacle.logSmall,
        x: sideX("left", 64),
        y: this.stagePoints.get(7)!.y + 34,
        size: 86,
        angle: -12,
      },
      {
        key: ASSET_KEYS.obstacle.logLong,
        x: sideX("right", 78),
        y: this.stagePoints.get(9)!.y + 82,
        size: 118,
        angle: 8,
      },
      {
        key: ASSET_KEYS.vehicle.truck,
        x: sideX("left", 68),
        y: this.stagePoints.get(12)!.y + 62,
        size: 102,
        angle: -2,
      },
      {
        key: ASSET_KEYS.vehicle.train,
        x: sideX("right", 84),
        y: this.stagePoints.get(14)!.y + 72,
        size: 126,
        angle: 0,
      },
      {
        key: ASSET_KEYS.object.finishSign,
        x: sideX("left", 58),
        y: this.stagePoints.get(16)!.y + 92,
        size: 66,
        angle: 5,
      },
    ] as const;

    for (const decoration of decorations) {
      this.add
        .image(decoration.x, decoration.y, decoration.key)
        .setDisplaySize(decoration.size, decoration.size)
        .setAngle(decoration.angle)
        .setAlpha(0.82)
        .setDepth(DESIGN_TOKENS.depth.world + 1);
    }
  }

  private createStageNodes(width: number): void {
    const nodeSize = Phaser.Math.Clamp(width * 0.22, 78, 106);
    const highest = this.saveSnapshot.highestUnlockedStage;

    for (const stage of STAGES) {
      const point = this.stagePoints.get(stage.id)!;
      const stageKey = String(stage.id);
      const cleared = this.saveSnapshot.clearedStages[stageKey] === true;
      const locked = stage.id > highest;
      const current = stage.id === highest;
      const texture = locked
        ? ASSET_KEYS.node.locked
        : cleared
          ? ASSET_KEYS.node.completed
          : current
            ? ASSET_KEYS.node.current
            : ASSET_KEYS.node.normal;

      const container = this.add
        .container(point.x, point.y)
        .setDepth(DESIGN_TOKENS.depth.actor);
      const glow = this.add.graphics();
      glow.fillStyle(current ? 0x62ecdf : 0xffffff, current ? 0.22 : 0);
      glow.fillCircle(0, 0, nodeSize * 0.61);
      container.add(glow);

      const node = this.add
        .image(0, 0, texture)
        .setDisplaySize(nodeSize, nodeSize)
        .setInteractive({ useHandCursor: !locked });
      container.add(node);

      const number = this.add
        .text(0, -nodeSize * 0.08, String(stage.id), {
          fontFamily: "Trebuchet MS, Arial Rounded MT Bold, sans-serif",
          fontSize: `${Math.round(nodeSize * 0.25)}px`,
          fontStyle: "bold",
          color: locked ? "#677480" : "#23435d",
          stroke: locked ? "#dce2e6" : "#fff7ea",
          strokeThickness: Math.max(3, Math.round(nodeSize * 0.04)),
        })
        .setOrigin(0.5);
      container.add(number);

      let lock: Phaser.GameObjects.Image | null = null;
      let stars: NodeStarView[] = [];
      if (locked) {
        lock = this.add
          .image(0, nodeSize * 0.2, ASSET_KEYS.ui.lock)
          .setDisplaySize(nodeSize * 0.28, nodeSize * 0.28);
        container.add(lock);
      } else if (cleared) {
        stars = this.addNodeStars(
          container,
          nodeSize,
          this.saveSnapshot.stageStars[stageKey] ?? 0,
        );
      }

      const view: StageNodeView = {
        stageId: stage.id,
        container,
        node,
        glow,
        lock,
        stars,
        selectable: !locked,
        current,
      };
      if (this.pendingUnlock?.fromStage === stage.id) {
        this.prepareClearStars(view);
      }
      this.nodeViews.set(stage.id, view);

      node.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.tweens.add({
          targets: container,
          scale: 0.94,
          duration: 70,
          ease: "Sine.Out",
        });
      });
      node.on(Phaser.Input.Events.POINTER_UP, () => {
        if (this.dragDistance > 10) {
          this.tweens.add({ targets: container, scale: 1, duration: 100 });
          return;
        }
        if (locked) {
          this.playLockedFeedback(view);
        } else {
          this.selectNode(view);
        }
      });
      node.on(Phaser.Input.Events.POINTER_OUT, () => {
        if (this.selectedNode !== view) {
          this.tweens.add({ targets: container, scale: 1, duration: 100 });
        }
      });

      if (current) {
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.52, to: 0.2 },
          scale: { from: 1.08, to: 0.96 },
          duration: 1150,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
        this.tweens.add({
          targets: node,
          scaleX: node.scaleX * 1.035,
          scaleY: node.scaleY * 1.035,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
    }
  }

  private addNodeStars(
    container: Phaser.GameObjects.Container,
    nodeSize: number,
    earnedStars: number,
  ): NodeStarView[] {
    const stars: NodeStarView[] = [];
    for (let index = 0; index < 3; index += 1) {
      const slotX = (index - 1) * nodeSize * 0.19;
      const slotY = nodeSize * 0.43;
      const filled = index < earnedStars;
      const star = this.add
        .image(slotX, slotY, ASSET_KEYS.ui.star)
        .setDisplaySize(nodeSize * 0.2, nodeSize * 0.2);
      if (!filled) {
        star.setTint(0x6f7d8a).setAlpha(0.36);
      }
      container.add(star);
      stars.push({
        image: star,
        slotX,
        slotY,
        scaleX: star.scaleX,
        scaleY: star.scaleY,
        filled,
      });
    }
    return stars;
  }

  private prepareClearStars(view: StageNodeView): void {
    for (const star of view.stars) {
      if (!star.filled) continue;
      star.image
        .setPosition(0, 0)
        .setAlpha(0)
        .setScale(star.scaleX * 0.35, star.scaleY * 0.35);
    }
  }

  private playClearStarsAnimation(unlock: PendingStageUnlock): void {
    if (this.clearStarsAnimationStarted || this.unlockAnimationStarted) return;
    this.clearStarsAnimationStarted = true;
    const view = this.nodeViews.get(unlock.fromStage);
    const filledStars = view?.stars.filter((star) => star.filled) ?? [];
    if (filledStars.length === 0) {
      this.playUnlockAnimation(unlock);
      return;
    }

    filledStars.forEach((star, index) => {
      this.tweens.add({
        targets: star.image,
        x: star.slotX,
        y: star.slotY,
        alpha: 1,
        scaleX: star.scaleX,
        scaleY: star.scaleY,
        duration: 360,
        delay: index * 130,
        ease: "Back.Out",
        onComplete:
          index === filledStars.length - 1
            ? () => this.time.delayedCall(220, () => this.playUnlockAnimation(unlock))
            : undefined,
      });
    });
  }

  private restoreClearStars(stageId: number): void {
    const view = this.nodeViews.get(stageId);
    if (!view) return;
    for (const star of view.stars) {
      if (!star.filled) continue;
      star.image
        .setPosition(star.slotX, star.slotY)
        .setAlpha(1)
        .setScale(star.scaleX, star.scaleY);
    }
  }

  private createCharacter(width: number): void {
    const nodeSize = Phaser.Math.Clamp(width * 0.22, 78, 106);
    const initialStage = this.pendingUnlock?.fromStage ?? this.saveSnapshot.highestUnlockedStage;
    const point = this.stagePoints.get(initialStage)!;
    const characterSize = nodeSize * 1.22;
    this.characterOffsetX = 0;
    this.characterOffsetY = -nodeSize * 0.16;
    this.characterShadow = this.add
      .ellipse(
        point.x + this.characterOffsetX,
        point.y - nodeSize * 0.04,
        nodeSize * 0.42,
        nodeSize * 0.12,
        0x23435d,
        0.14,
      )
      .setDepth(DESIGN_TOKENS.depth.actor + 2);
    this.character = this.add
      .image(
        point.x + this.characterOffsetX,
        point.y + this.characterOffsetY,
        ASSET_KEYS.character.reference,
      )
      .setOrigin(0.5, 0.88)
      .setDisplaySize(characterSize, characterSize)
      .setDepth(DESIGN_TOKENS.depth.actor + 3);
  }

  private focusInitialPosition(width: number, height: number): void {
    const focusStage = this.pendingUnlock?.fromStage ?? this.saveSnapshot.highestUnlockedStage;
    const point = this.stagePoints.get(focusStage)!;
    this.cameras.main.centerOn(width * 0.5, point.y);
    this.clampCamera(height);
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragStartY = pointer.y;
    this.lastPointerY = pointer.y;
    this.dragDistance = 0;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    const delta = pointer.y - this.lastPointerY;
    this.dragDistance = Math.max(this.dragDistance, Math.abs(pointer.y - this.dragStartY));
    this.cameras.main.scrollY -= delta;
    this.lastPointerY = pointer.y;
  }

  private handlePointerUp(): void {
    this.time.delayedCall(0, () => {
      this.dragDistance = 0;
    });
  }

  private handleWheel(
    _pointer: Phaser.Input.Pointer,
    _objects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    this.cameras.main.scrollY += deltaY * 0.72;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (Math.abs(gameSize.width - this.layoutWidth) < 2) {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.cameras.main.setBounds(0, 0, gameSize.width, this.mapHeight);
      this.clampCamera(gameSize.height);
      return;
    }
    const interruptedUnlock =
      this.pendingUnlock !== null &&
      (this.clearStarsAnimationStarted || this.unlockAnimationStarted);
    const focus = this.saveSnapshot.highestUnlockedStage;
    this.buildMap(gameSize.width, gameSize.height);
    if (interruptedUnlock && this.pendingUnlock) {
      this.restoreClearStars(this.pendingUnlock.fromStage);
      this.finishUnlockAnimation(this.pendingUnlock.toStage);
      this.pendingUnlock = null;
      return;
    }
    const point = this.stagePoints.get(focus)!;
    this.cameras.main.centerOn(gameSize.width * 0.5, point.y);
  }

  private selectNode(view: StageNodeView, openCard = true): void {
    if (!view.selectable) return;
    if (this.selectedNode && this.selectedNode !== view) {
      this.resetNodeSelection(this.selectedNode);
    }
    this.selectedNode = view;
    view.glow.clear();
    view.glow.fillStyle(0xffffff, 0.38);
    view.glow.fillCircle(0, 0, view.node.displayWidth * 0.65);
    this.tweens.add({
      targets: view.container,
      scale: 1.08,
      duration: 190,
      ease: "Back.Out",
      onComplete: () => {
        if (openCard && this.selectedNode === view) {
          screenFlow.openStageCard(view.stageId);
        }
      },
    });
  }

  private resetNodeSelection(view: StageNodeView): void {
    this.tweens.add({
      targets: view.container,
      scale: 1,
      duration: 150,
      ease: "Sine.Out",
    });
    view.glow.clear();
    view.glow.fillStyle(0x62ecdf, view.current ? 0.22 : 0);
    view.glow.fillCircle(0, 0, view.node.displayWidth * 0.61);
  }

  private playLockedFeedback(view: StageNodeView): void {
    view.container.setScale(1);
    this.tweens.add({
      targets: view.container,
      x: {
        from: view.container.x - 6,
        to: view.container.x + 6,
      },
      duration: 55,
      yoyo: true,
      repeat: 3,
      ease: "Sine.InOut",
      onComplete: () => {
        const point = this.stagePoints.get(view.stageId)!;
        view.container.x = point.x;
      },
    });
    if (view.lock) {
      this.tweens.add({
        targets: view.lock,
        scaleX: view.lock.scaleX * 1.22,
        scaleY: view.lock.scaleY * 1.22,
        alpha: { from: 1, to: 0.58 },
        duration: 100,
        yoyo: true,
        repeat: 1,
      });
    }
  }

  private playUnlockAnimation(unlock: PendingStageUnlock): void {
    if (this.unlockAnimationStarted || !this.character) return;
    this.unlockAnimationStarted = true;
    this.character.setTexture(ASSET_KEYS.character.play);
    const curve = this.stageCurves.get(unlock.fromStage);
    const destination = this.stagePoints.get(unlock.toStage);
    if (!curve || !destination) {
      this.finishUnlockAnimation(unlock.toStage);
      return;
    }

    const proxy = { progress: 0 };
    const cameraTargetY =
      (this.stagePoints.get(unlock.fromStage)!.y + destination.y) * 0.5;
    this.cameras.main.pan(
      this.scale.width * 0.5,
      cameraTargetY,
      900,
      "Sine.easeInOut",
    );
    this.tweens.add({
      targets: proxy,
      progress: 1,
      duration: 1350,
      ease: "Sine.InOut",
      onUpdate: () => {
        if (!this.character) return;
        const point = curve.getPoint(proxy.progress);
        const hop = Math.abs(Math.sin(proxy.progress * Math.PI * 5)) * -9;
        this.character.setPosition(
          point.x + this.characterOffsetX,
          point.y + this.characterOffsetY + hop,
        );
        this.characterShadow?.setPosition(
          point.x + this.characterOffsetX,
          point.y - 4,
        );
        this.character.setAngle(Math.sin(proxy.progress * Math.PI * 5) * 2.5);
      },
      onComplete: () => this.finishUnlockAnimation(unlock.toStage),
    });
  }

  private finishUnlockAnimation(stageId: number): void {
    if (!this.character) return;
    const point = this.stagePoints.get(stageId)!;
    this.character
      .setTexture(ASSET_KEYS.character.reference)
      .setPosition(
        point.x + this.characterOffsetX,
        point.y + this.characterOffsetY,
      )
      .setAngle(0);
    this.characterShadow?.setPosition(
      point.x + this.characterOffsetX,
      point.y - 4,
    );
    this.startCharacterIdle();
    const view = this.nodeViews.get(stageId);
    if (view) this.selectNode(view, false);
    this.pendingUnlock = null;
    this.time.delayedCall(520, () => screenFlow.openStageCard(stageId));
  }

  private startCharacterIdle(): void {
    if (!this.character) return;
    this.tweens.killTweensOf(this.character);
    const baseY = this.character.y;
    this.tweens.add({
      targets: this.character,
      y: baseY - 5,
      scaleY: this.character.scaleY * 1.012,
      angle: { from: -0.5, to: 0.5 },
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private onFlowChange(state: Readonly<FlowState>): void {
    if (state.screen !== "world-map") return;
    if (state.selectedStage === null && this.selectedNode) {
      this.resetNodeSelection(this.selectedNode);
      this.selectedNode = null;
    }
  }

  private clampCamera(viewHeight: number): void {
    const maxScroll = Math.max(0, this.mapHeight - viewHeight);
    this.cameras.main.scrollY = Phaser.Math.Clamp(
      this.cameras.main.scrollY,
      0,
      maxScroll,
    );
  }

  private cleanup(): void {
    this.unsubscribeFlow?.();
    this.unsubscribeFlow = null;
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.off(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }
}
