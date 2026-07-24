export const DESIGN_TOKENS = {
  colors: {
    primary: 0x1fbfc4,
    primaryShadow: 0x078f9c,
    secondary: 0x4aa7e8,
    accent: 0xff7a5c,
    success: 0x58d58a,
    danger: 0xef5b5b,
    surface: 0xfff7ea,
    surfaceCool: 0xeaf7fb,
    text: 0x23435d,
    grass: 0x78d66c,
    locked: 0x6f7d8a,
    disabled: 0xaab4bc,
  },
  depth: {
    background: 0,
    world: 10,
    actor: 20,
    effect: 30,
  },
  layout: {
    referenceWidth: 430,
    referenceHeight: 932,
    minPlayableWidth: 320,
    minPlayableHeight: 480,
  },
} as const;
