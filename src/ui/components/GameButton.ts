import { DOM_ASSETS } from "../../assets/assetPaths";

export interface GameButtonOptions {
  label: string;
  onClick: () => void;
  size?: "large" | "small";
  iconPath?: string;
  leadingIconPath?: string;
  symbol?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function createGameButton(options: GameButtonOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "game-button",
    options.size === "small" ? "game-button--small" : "",
    options.iconPath ? "game-button--icon" : "",
    options.leadingIconPath ? "game-button--with-label-icon" : "",
    options.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  button.disabled = options.disabled ?? false;
  button.setAttribute("aria-label", options.ariaLabel ?? options.label);
  const buttonImage =
    options.size === "small" ? DOM_ASSETS.ui.buttonSmall : DOM_ASSETS.ui.buttonLarge;
  const resolvedButtonImage = new URL(buttonImage, document.baseURI).href;
  button.style.setProperty("--button-image", `url("${resolvedButtonImage}")`);

  if (options.iconPath) {
    const icon = document.createElement("img");
    icon.className = "game-button__icon";
    icon.src = options.iconPath;
    icon.alt = "";
    button.append(icon);
  } else if (options.symbol) {
    const symbol = document.createElement("span");
    symbol.className = "game-button__symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = options.symbol;
    button.append(symbol);
  } else {
    if (options.leadingIconPath) {
      const icon = document.createElement("img");
      icon.className = "game-button__leading-icon";
      icon.src = options.leadingIconPath;
      icon.alt = "";
      button.append(icon);
    }
    const label = document.createElement("span");
    label.className = "game-button__label";
    label.textContent = options.label;
    button.append(label);
  }

  button.addEventListener("click", options.onClick);
  return button;
}
