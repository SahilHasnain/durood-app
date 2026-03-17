export const theme = {
  colors: {
    background: {
      primary: "#0a1410", // Deep forest green, almost black
      secondary: "#0f1e1a", // Dark emerald
      tertiary: "#1a2e27", // Darker green
    },
    surface: {
      primary: "#152820", // Dark green with depth
      secondary: "#1f3a2f", // Medium dark green
      elevated: "#2a4a3c", // Elevated green
    },
    primary: {
      main: "#10b981", // Emerald-500 (vibrant Islamic green)
      light: "#34d399", // Emerald-400
      dark: "#059669", // Emerald-600
      darker: "#047857", // Emerald-700
      glow: "rgba(16, 185, 129, 0.4)", // Emerald glow
    },
    text: {
      primary: "#d1fae5", // Emerald-100 (soft green-white)
      secondary: "#a7f3d0", // Emerald-200 (light green)
      tertiary: "#6ee7b7", // Emerald-300 (muted green)
      accent: "#10b981", // Emerald-500
    },
    border: {
      primary: "#2a4a3c", // Dark green border
      secondary: "#34d399", // Emerald border
      accent: "#10b981", // Emerald-500
      subtle: "#1f3a2f", // Very subtle border
    },
    success: "#10b981", // Emerald-500
    overlay: "rgba(10, 20, 16, 0.85)",
  },
  shadows: {
    glow: {
      shadowColor: "#10b981",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 8,
    },
    glowStrong: {
      shadowColor: "#10b981",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 30,
      elevation: 12,
    },
    glowSubtle: {
      shadowColor: "#10b981",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 5,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 60,
    "7xl": 72,
    "8xl": 96,
    "9xl": 128,
  },
};

export type Theme = typeof theme;
