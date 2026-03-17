export const theme = {
  colors: {
    background: {
      primary: "#0a0a0f", // Very dark, almost black
      secondary: "#111827", // gray-900
      tertiary: "#1f2937", // gray-800
    },
    surface: {
      primary: "#1a1a24", // Dark with slight warmth
      secondary: "#2d2d3a", // Slightly lighter
      elevated: "#3a3a4a", // Even lighter
    },
    primary: {
      main: "#fbbf24", // amber-400 (warm yellow)
      light: "#fcd34d", // amber-300
      dark: "#f59e0b", // amber-500
      darker: "#d97706", // amber-600
      glow: "rgba(251, 191, 36, 0.4)", // amber glow
    },
    text: {
      primary: "#fef3c7", // amber-100 (warm white)
      secondary: "#fde68a", // amber-200 (soft yellow)
      tertiary: "#9ca3af", // gray-400 (muted)
      accent: "#fbbf24", // amber-400
    },
    border: {
      primary: "#374151", // gray-700
      secondary: "#4b5563", // gray-600
      accent: "#fbbf24", // amber-400
      subtle: "#2d3748", // Very subtle border
    },
    success: "#fbbf24", // amber-400
    overlay: "rgba(0, 0, 0, 0.85)",
  },
  shadows: {
    glow: {
      shadowColor: "#fbbf24",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 8,
    },
    glowStrong: {
      shadowColor: "#fbbf24",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 30,
      elevation: 12,
    },
    glowSubtle: {
      shadowColor: "#fbbf24",
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
