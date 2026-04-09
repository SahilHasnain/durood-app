export const colors = {
  text: {
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    tertiary: "#666666",
  },
  accent: {
    secondary: "#FF6B6B",
  },
  background: {
    primary: "#000000",
    secondary: "#0a0a0a",
    tertiary: "#1a1a1a",
  },
  overlay: {
    dark: "rgba(0, 0, 0, 0.8)",
  },
};

export const theme = {
  colors: {
    primary: {
      main: colors.accent.secondary,
      light: "#ff8a80",
      dark: "#e65a50",
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      tertiary: colors.text.tertiary,
    },
    background: {
      primary: colors.background.primary,
      secondary: colors.background.secondary,
      tertiary: colors.background.tertiary,
    },
    surface: {
      primary: "#111111",
      secondary: "#1a1a1a",
      elevated: "#222222",
    },
    border: {
      primary: "rgba(255,255,255,0.12)",
      secondary: "rgba(255,255,255,0.24)",
    },
    overlay: colors.overlay.dark,
  },
  shadows: {
    glow: {
      shadowColor: colors.accent.secondary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  },
} as const;
