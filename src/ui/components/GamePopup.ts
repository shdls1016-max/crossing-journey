import { DOM_ASSETS } from "../../assets/assetPaths";
import { createGameButton, type GameButtonOptions } from "./GameButton";

export interface GamePopupOptions {
  title: string;
  body?: string;
  content?: HTMLElement;
  actions?: GameButtonOptions[];
  onClose?: () => void;
  closeLabel?: string;
}

export function createGamePopup(options: GamePopupOptions): HTMLElement {
  const backdrop = document.createElement("div");
  backdrop.className = "popup-backdrop";
  backdrop.setAttribute("role", "presentation");

  const panel = document.createElement("section");
  panel.className = "popup-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", options.title);
  panel.style.backgroundImage = `url("${DOM_ASSETS.ui.popup}")`;

  if (options.onClose) {
    const requestClose = () => {
      if (backdrop.dataset.closing === "true") return;
      backdrop.dataset.closing = "true";
      backdrop.classList.add("popup-backdrop--closing");
      window.setTimeout(options.onClose!, 170);
    };
    panel.append(
      createGameButton({
        label: options.closeLabel ?? "닫기",
        ariaLabel: options.closeLabel ?? "닫기",
        size: "small",
        iconPath: DOM_ASSETS.ui.close,
        className: "game-button--round game-button--utility popup-panel__close",
        onClick: requestClose,
      }),
    );
  }

  const contentRegion = document.createElement("div");
  contentRegion.className = "popup-panel__content";

  const title = document.createElement("h2");
  title.className = "popup-panel__title";
  title.textContent = options.title;
  contentRegion.append(title);

  if (options.body) {
    const body = document.createElement("p");
    body.className = "popup-panel__body";
    body.textContent = options.body;
    contentRegion.append(body);
  }

  if (options.content) contentRegion.append(options.content);
  panel.append(contentRegion);

  if (options.actions?.length) {
    const actions = document.createElement("div");
    actions.className = "popup-panel__actions";
    if (options.actions.some((action) => action.className?.split(" ").includes("popup-action"))) {
      actions.classList.add("popup-panel__actions--stacked");
    }
    for (const action of options.actions) {
      actions.append(createGameButton({ ...action, size: action.size ?? "small" }));
    }
    panel.append(actions);
  }

  backdrop.append(panel);
  return backdrop;
}
