import type { SoundService } from "../audio/SoundService";
import type { NavigationService } from "../flow/NavigationService";
import type { FlowState, ScreenFlowStore } from "../flow/ScreenFlowStore";
import type { SettingsService, SettingKey } from "../settings/SettingsService";
import type { VibrationService } from "../settings/VibrationService";
import type { SaveService } from "../storage/SaveService";
import type { GameSaveData } from "../storage/saveTypes";
import { getStage } from "../data/stages";
import { DOM_ASSETS } from "../assets/assetPaths";
import {
  gameplaySession,
  type GameplaySessionState,
} from "../gameplay/GameplaySessionStore";
import { gameplayInput } from "../gameplay/GameplayInputService";
import { createGameButton } from "./components/GameButton";
import { createGamePopup } from "./components/GamePopup";
import type { CharacterService } from "../characters/CharacterService";
import { CHARACTERS } from "../characters/characterCatalog";

export interface AppShellDependencies {
  flow: ScreenFlowStore;
  navigation: NavigationService;
  saves: SaveService;
  settings: SettingsService;
  sound: SoundService;
  vibration: VibrationService;
  characters: CharacterService;
}

export class AppShell {
  private flowState: Readonly<FlowState>;
  private saveState: Readonly<GameSaveData>;
  private gameplayState: Readonly<GameplaySessionState>;
  private launchingStage = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly dependencies: AppShellDependencies,
  ) {
    this.flowState = dependencies.flow.getSnapshot();
    this.saveState = dependencies.saves.getSnapshot();
    this.gameplayState = gameplaySession.getSnapshot();

    dependencies.flow.subscribe((state) => {
      this.flowState = state;
      if (state.screen === "world-map") this.launchingStage = false;
      this.render();
    });
    dependencies.saves.subscribe((save) => {
      this.saveState = save;
      this.render();
    });
    gameplaySession.subscribe((state) => {
      this.gameplayState = state;
      this.render();
    });
  }

  private render(): void {
    this.root.replaceChildren();

    if (this.flowState.screen === "loading") {
      this.root.append(this.createLoadingOverlay());
      return;
    }

    const safeLayer = document.createElement("div");
    safeLayer.className = "safe-layer";
    safeLayer.append(this.createHud());
    if (
      this.flowState.screen === "game" &&
      this.flowState.popup === null &&
      this.gameplayState.status === "playing"
    ) {
      safeLayer.append(this.createGameControls());
    }
    this.root.append(safeLayer);

    if (this.flowState.screen === "character-select") {
      this.root.append(this.createCharacterSelectBase());
    }

    if (this.flowState.popup) {
      this.root.append(this.createPopup());
    }
  }

  private createLoadingOverlay(): HTMLElement {
    const overlay = document.createElement("section");
    overlay.className = "loading-overlay";
    overlay.setAttribute("aria-label", "게임 불러오는 중");

    const card = document.createElement("div");
    card.className = "loading-card";

    const character = document.createElement("img");
    character.className = "loading-character";
    character.src = DOM_ASSETS.character.reference;
    character.alt = "";

    const title = document.createElement("h1");
    title.className = "loading-title";
    title.textContent = "Crossing Journey";

    const track = document.createElement("div");
    track.className = "loading-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(Math.round(this.flowState.loadingProgress * 100)));

    const fill = document.createElement("div");
    fill.className = "loading-fill";
    fill.style.width = `${Math.round(this.flowState.loadingProgress * 100)}%`;
    track.append(fill);

    const copy = document.createElement("div");
    copy.className = "loading-copy";
    copy.textContent = `에셋 준비 중 ${Math.round(this.flowState.loadingProgress * 100)}%`;

    card.append(character, title, track, copy);
    overlay.append(card);
    return overlay;
  }

  private createHud(): HTMLElement {
    const hud = document.createElement("div");
    hud.className = "hud";

    const left = document.createElement("div");
    left.className = "hud__cluster";
    if (this.flowState.screen === "game") {
      hud.classList.add("hud--game");
      const stage = document.createElement("div");
      stage.className = "game-hud__stage";
      stage.textContent = `스테이지 ${this.flowState.activeStage}`;

      const runCoins = document.createElement("div");
      runCoins.className = "game-hud__coins";
      const coin = document.createElement("img");
      coin.src = DOM_ASSETS.object.coin;
      coin.alt = "";
      const value = document.createElement("span");
      value.textContent = String(this.gameplayState.collectedCoins);
      runCoins.append(coin, value);
      left.append(stage, runCoins);
    } else if (this.flowState.screen === "character-select") {
      left.append(
        createGameButton({
          label: "월드맵",
          ariaLabel: "월드맵으로 돌아가기",
          size: "small",
          iconPath: DOM_ASSETS.ui.back,
          className: "game-button--round game-button--utility game-button--back",
          onClick: () => this.dependencies.navigation.backFromCharacterSelect(),
        }),
      );
    } else {
      const coinCounter = document.createElement("div");
      coinCounter.className = "coin-counter";
      coinCounter.setAttribute("aria-label", `보유 코인 ${this.saveState.coins}개`);
      const coin = document.createElement("img");
      coin.src = DOM_ASSETS.object.coin;
      coin.alt = "";
      const value = document.createElement("span");
      value.textContent = String(this.saveState.coins);
      coinCounter.append(coin, value);
      left.append(coinCounter);
    }

    const right = document.createElement("div");
    right.className = "hud__cluster";

    if (this.flowState.screen === "game") {
      right.append(
        createGameButton({
          label: "일시정지",
          ariaLabel: "일시정지",
          size: "small",
          iconPath: DOM_ASSETS.ui.pause,
          onClick: () => this.dependencies.flow.openPopup("pause"),
        }),
      );
    } else {
      right.append(
        createGameButton({
          label: "설정",
          ariaLabel: "설정",
          size: "small",
          iconPath: DOM_ASSETS.ui.settings,
          className: "game-button--round game-button--utility",
          onClick: () => this.dependencies.flow.openPopup("settings"),
        }),
      );

      if (this.flowState.screen === "world-map") {
        right.classList.add("hud__cluster--vertical");
        right.append(
          createGameButton({
            label: "캐릭터 선택",
            ariaLabel: "캐릭터 선택",
            size: "small",
            iconPath: DOM_ASSETS.ui.characterMenu,
            className:
              "game-button--round game-button--utility game-button--character-menu",
            onClick: () => this.dependencies.navigation.toCharacterSelect(),
          }),
        );
      }
    }

    if (this.flowState.screen === "game") {
      const progress = document.createElement("div");
      progress.className = "game-hud__progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", "스테이지 진행률");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.setAttribute(
        "aria-valuenow",
        String(Math.round(this.gameplayState.progress * 100)),
      );
      const fill = document.createElement("div");
      fill.style.width = `${Math.round(this.gameplayState.progress * 100)}%`;
      progress.append(fill);
      hud.append(left, progress, right);
    } else {
      hud.append(left, right);
    }
    return hud;
  }

  private createCharacterSelectBase(): HTMLElement {
    const screen = document.createElement("section");
    screen.className = "character-screen";

    const title = document.createElement("h1");
    title.className = "character-screen__title";
    title.textContent = "캐릭터";

    const copy = document.createElement("p");
    copy.className = "character-screen__copy";
    copy.textContent = "함께 여행할 캐릭터를 선택하세요";

    const list = document.createElement("div");
    list.className = "character-screen__list";

    for (const character of CHARACTERS) {
      const purchased = this.saveState.purchasedCharacters.includes(character.id);
      const selected = this.saveState.selectedCharacter === character.id;
      const canPurchase = this.saveState.coins >= character.price;
      const card = document.createElement("article");
      card.className = [
        "character-card",
        selected ? "character-card--selected" : "",
      ].filter(Boolean).join(" ");

      const art = document.createElement("img");
      art.className = "character-card__art";
      art.src = character.dom.idle;
      art.alt = character.name;

      const name = document.createElement("h2");
      name.className = "character-card__name";
      name.textContent = character.name;

      const status = document.createElement("div");
      status.className = "character-card__status";
      if (selected) {
        const check = document.createElement("img");
        check.src = DOM_ASSETS.ui.check;
        check.alt = "";
        status.append(check, document.createTextNode("사용 중"));
      } else if (purchased) {
        status.textContent = "보유 중";
      } else {
        const coin = document.createElement("img");
        coin.src = DOM_ASSETS.object.coin;
        coin.alt = "";
        status.append(coin, document.createTextNode(String(character.price)));
      }

      const action = createGameButton({
        label: selected ? "사용 중" : purchased ? "장착" : `${character.price} 구매`,
        ariaLabel: selected
          ? `${character.name} 사용 중`
          : purchased
            ? `${character.name} 장착`
            : `${character.name} ${character.price}코인으로 구매`,
        size: "small",
        disabled: selected || (!purchased && !canPurchase),
        className: purchased && !selected
          ? "character-card__action popup-action--primary"
          : "character-card__action popup-action--secondary",
        onClick: () => this.dependencies.characters.purchaseOrEquip(character.id),
      });

      card.append(art, name, status, action);
      list.append(card);
    }

    screen.append(title, copy, list);
    return screen;
  }

  private createGameControls(): HTMLElement {
    const controls = document.createElement("nav");
    controls.className = "game-controls";
    controls.setAttribute("aria-label", "캐릭터 이동");

    const lateral = document.createElement("div");
    lateral.className = "game-controls__lateral";
    lateral.append(
      createGameButton({
        label: "왼쪽 이동",
        ariaLabel: "왼쪽 이동",
        size: "small",
        iconPath: DOM_ASSETS.ui.back,
        className:
          "game-button--round game-button--utility game-control-button game-control-button--left",
        onClick: () => gameplayInput.requestMove("left"),
      }),
      createGameButton({
        label: "오른쪽 이동",
        ariaLabel: "오른쪽 이동",
        size: "small",
        iconPath: DOM_ASSETS.ui.back,
        className:
          "game-button--round game-button--utility game-control-button game-control-button--right",
        onClick: () => gameplayInput.requestMove("right"),
      }),
    );

    const forward = createGameButton({
      label: "앞으로 이동",
      ariaLabel: "앞으로 이동",
      size: "small",
      iconPath: DOM_ASSETS.ui.back,
      className:
        "game-button--round game-button--utility game-control-button game-control-button--forward",
      onClick: () => gameplayInput.requestMove("forward"),
    });

    controls.append(lateral, forward);
    return controls;
  }

  private createPopup(): HTMLElement {
    const close = () => this.dependencies.flow.closePopup();
    const resume = () => this.dependencies.navigation.resumeGame();
    const stage = this.flowState.activeStage;

    switch (this.flowState.popup) {
      case "pause":
        return createGamePopup({
          title: "일시정지",
          body: "잠시 쉬었다가 이어서 건너세요.",
          onClose: resume,
          actions: [
            {
              label: "계속하기",
              className: "popup-action popup-action--primary",
              onClick: resume,
            },
            {
              label: "다시하기",
              className: "popup-action popup-action--secondary",
              onClick: () => this.dependencies.navigation.toGame(stage),
            },
            {
              label: "월드맵",
              className: "popup-action popup-action--secondary",
              onClick: () => this.dependencies.navigation.toWorldMap(),
            },
          ],
        });
      case "failure":
        return createGamePopup({
          title: "아쉬워요!",
          content: this.createRunSummary(false),
          actions: [
            {
              label: "다시하기",
              className: "popup-action popup-action--primary",
              onClick: () => this.dependencies.navigation.toGame(stage),
            },
            {
              label: "월드맵",
              className: "popup-action popup-action--secondary",
              onClick: () => this.dependencies.navigation.toWorldMap(),
            },
          ],
        });
      case "clear":
        return createGamePopup({
          title: "스테이지 클리어",
          content: this.createRunSummary(true),
          actions: [
            ...(stage < 20
              ? [
                  {
                    label: "다음 스테이지",
                    className: "popup-action popup-action--primary",
                    onClick: () => this.dependencies.navigation.toGame(stage + 1),
                  },
                ]
              : []),
            {
              label: "월드맵",
              className: "popup-action popup-action--secondary",
              onClick: () => this.dependencies.navigation.toWorldMap(),
            },
          ],
        });
      case "settings":
        return createGamePopup({
          title: "설정",
          content: this.createSettingsList(),
          onClose: close,
          actions: [{ label: "확인", onClick: close }],
        });
      case "stage-card":
        return this.createStageCard();
      default:
        throw new Error("Unknown popup state.");
    }
  }

  private createStageCard(): HTMLElement {
    const stageId = this.flowState.selectedStage ?? this.saveState.highestUnlockedStage;
    const stage = getStage(stageId);
    const stageKey = String(stageId);
    const earnedStars = this.saveState.stageStars[stageKey] ?? 0;
    const hasScore = Object.hasOwn(this.saveState.bestScores, stageKey);
    const bestScore = hasScore ? String(this.saveState.bestScores[stageKey]) : "-";

    const content = document.createElement("div");
    content.className = "stage-card";

    const stars = document.createElement("div");
    stars.className = "stage-card__stars";
    stars.setAttribute("aria-label", `최고 별 ${earnedStars}개`);
    for (let index = 0; index < 3; index += 1) {
      const star = document.createElement("img");
      star.src = DOM_ASSETS.ui.star;
      star.alt = "";
      star.className =
        index < earnedStars ? "stage-card__star" : "stage-card__star stage-card__star--empty";
      stars.append(star);
    }

    const scoreRow = document.createElement("div");
    scoreRow.className = "stage-card__stat";
    const scoreLabel = document.createElement("span");
    scoreLabel.textContent = "최고 기록";
    const scoreValue = document.createElement("strong");
    scoreValue.textContent = bestScore;
    scoreRow.append(scoreLabel, scoreValue);

    const rewardRow = document.createElement("div");
    rewardRow.className = "stage-card__reward";
    const coin = document.createElement("img");
    coin.src = DOM_ASSETS.object.coin;
    coin.alt = "";
    const reward = document.createElement("span");
    reward.textContent = `기본 보상 ${stage.baseCoinReward}`;
    rewardRow.append(coin, reward);

    content.append(stars, scoreRow, rewardRow);

    return createGamePopup({
      title: `스테이지 ${stageId}`,
      content,
      onClose: () => this.dependencies.flow.closePopup(),
      actions: [
        {
          label: "PLAY",
          className: "game-button--play",
          disabled:
            stageId > this.saveState.highestUnlockedStage || stageId > 20,
          onClick: () => {
            if (this.launchingStage) return;
            this.launchingStage = true;
            this.dependencies.navigation.toGame(stageId);
          },
        },
      ],
    });
  }

  private createRunSummary(cleared: boolean): HTMLElement {
    const result = this.gameplayState.result;
    const summary = document.createElement("div");
    summary.className = "run-summary";

    if (cleared && result) {
      const stars = document.createElement("div");
      stars.className = "run-summary__stars";
      stars.setAttribute("aria-label", `획득 별 ${result.stars}개`);
      for (let index = 0; index < 3; index += 1) {
        const star = document.createElement("img");
        star.src = DOM_ASSETS.ui.star;
        star.alt = "";
        if (index >= result.stars) star.className = "run-summary__star--empty";
        stars.append(star);
      }
      summary.append(stars);
    }

    const rows: readonly [string, string][] = cleared && result
      ? [
          ["점수", String(result.score)],
          ["코인", `+${result.awardedCoins}`],
          ["최고 기록", result.newBest ? "신기록!" : "기록 유지"],
        ]
      : [
          ["진행률", `${Math.round(this.gameplayState.progress * 100)}%`],
          ["코인", String(this.gameplayState.collectedCoins)],
        ];

    for (const [label, value] of rows) {
      const row = document.createElement("div");
      row.className = "run-summary__row";
      const name = document.createElement("span");
      name.textContent = label;
      const data = document.createElement("strong");
      data.textContent = value;
      row.append(name, data);
      summary.append(row);
    }
    return summary;
  }

  private createSettingsList(): HTMLElement {
    const list = document.createElement("div");
    list.className = "settings-list";

    const items: readonly [SettingKey, string][] = [
      ["soundEffects", "효과음"],
      ["backgroundMusic", "배경음악"],
      ["vibration", "진동"],
    ];

    for (const [key, label] of items) {
      const row = document.createElement("div");
      row.className = "setting-row";

      const name = document.createElement("span");
      name.textContent = label;

      const enabled = this.saveState.settings[key];
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "setting-toggle";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-label", `${label} ${enabled ? "켜짐" : "꺼짐"}`);
      toggle.setAttribute("aria-checked", String(enabled));
      toggle.textContent = enabled ? "ON" : "OFF";
      toggle.addEventListener("click", () => {
        this.dependencies.settings.toggle(key);
        this.dependencies.sound.applySettings();
        if (key !== "vibration") this.dependencies.vibration.pulse();
      });

      row.append(name, toggle);
      list.append(row);
    }

    return list;
  }
}
