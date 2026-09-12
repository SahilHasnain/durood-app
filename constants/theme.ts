export const colors = {
  text: {
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    tertiary: "#666666",
  },
  accent: {
    secondary: "#10b981",
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
      light: "#34d399",
      dark: "#059669",
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
        subtle: "rgba(255,255,255,0.035)",
        soft: "rgba(255,255,255,0.05)",
        control: "rgba(255,255,255,0.08)",
    },
    border: {
        primary: "rgba(255,255,255,0.12)",
        secondary: "rgba(255,255,255,0.24)",
        subtle: "rgba(255,255,255,0.08)",
        faint: "rgba(255,255,255,0.16)",
    },
    accentSurface: "rgba(16,185,129,0.12)",
    accentActive: "rgba(16,185,129,0.14)",
    accentBorder: "rgba(16,185,129,0.35)",
    scrim: {
        light: "rgba(0,0,0,0.22)",
        medium: "rgba(0,0,0,0.45)",
        strong: "rgba(0,0,0,0.6)",
        dark: "rgba(0,0,0,0.7)",
    },
    whiteMuted: "rgba(255,255,255,0.5)",
    whiteSubtle: "rgba(255,255,255,0.15)",
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
