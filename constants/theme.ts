export const colors = {
  text: {
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    tertiary: "#666666",
  },
  accent: {
    secondary: "#D4A24C",
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

export type ThemeMode = "light" | "dark";

export const lightColors = {
  ...colors,
  text: {
    primary: "#17130B",
    secondary: "#665F52",
    tertiary: "#8B8375",
  },
  background: {
    primary: "#FCFAF5",
    secondary: "#F4EFE4",
    tertiary: "#EAE1D0",
  },
};

export function createTheme(mode: ThemeMode) {
  const isLight = mode === "light";
  const palette = isLight ? lightColors : colors;
  const whiteControl = isLight ? "rgba(38, 29, 14, 0.07)" : "rgba(255,255,255,0.08)";
  const borderPrimary = isLight ? "rgba(38, 29, 14, 0.12)" : "rgba(255,255,255,0.12)";
  const borderSubtle = isLight ? "rgba(38, 29, 14, 0.08)" : "rgba(255,255,255,0.08)";
  const surfacePrimary = isLight ? "#FFFFFF" : "#111111";
  const surfaceSecondary = isLight ? "#F5F0E7" : "#1a1a1a";
  const surfaceElevated = isLight ? "#FFFFFF" : "#222222";
  const onSuccess = isLight ? "#FFFFFF" : "#1A1408";

  return {
    colors: {
      primary: { main: colors.accent.secondary, light: "#E3BC70", dark: "#A4772F" },
      accent: colors.accent,
      text: palette.text,
      background: palette.background,
      surface: {
        primary: surfacePrimary,
        secondary: surfaceSecondary,
        elevated: surfaceElevated,
        subtle: isLight ? "rgba(38,29,14,0.035)" : "rgba(255,255,255,0.035)",
        soft: isLight ? "rgba(38,29,14,0.05)" : "rgba(255,255,255,0.05)",
        control: whiteControl,
      },
      border: {
        primary: borderPrimary,
        secondary: isLight ? "rgba(38, 29, 14, 0.24)" : "rgba(255,255,255,0.24)",
        subtle: borderSubtle,
        faint: isLight ? "rgba(38, 29, 14, 0.16)" : "rgba(255,255,255,0.16)",
      },
      accentSurface: isLight ? "rgba(212,162,76,0.13)" : "rgba(212,162,76,0.09)",
      accentActive: isLight ? "rgba(212,162,76,0.18)" : "rgba(212,162,76,0.11)",
      accentBorder: isLight ? "rgba(164,119,47,0.34)" : "rgba(212,162,76,0.28)",
      semantic: {
        ...theme.colors.semantic,
        onSuccess,
        black: isLight ? "#17130B" : "#000000",
        nearBlack: isLight ? "#2B2418" : "#050505",
        whiteControl,
        whiteSubtle: isLight ? "rgba(38,29,14,0.04)" : "rgba(255,255,255,0.04)",
        whiteLight: isLight ? "rgba(38,29,14,0.06)" : "rgba(255,255,255,0.06)",
        whiteMedium: isLight ? "rgba(38,29,14,0.08)" : "rgba(255,255,255,0.07)",
        whiteStrong: isLight ? "rgba(38,29,14,0.1)" : "rgba(255,255,255,0.1)",
        whiteBorder: isLight ? "rgba(38,29,14,0.18)" : "rgba(255,255,255,0.18)",
        chartGrid: isLight ? "rgba(38,29,14,0.08)" : "rgba(255,255,255,0.05)",
        chartUnderTarget: isLight ? "#9A7137" : "rgba(255,255,255,0.32)",
      },
      whiteMuted: isLight ? "rgba(38,29,14,0.5)" : "rgba(255,255,255,0.5)",
      whiteSubtle: isLight ? "rgba(38,29,14,0.15)" : "rgba(255,255,255,0.15)",
      overlay: isLight ? "rgba(38,29,14,0.45)" : colors.overlay.dark,
      scrim: {
        light: isLight ? "rgba(38,29,14,0.12)" : "rgba(0,0,0,0.22)",
        medium: isLight ? "rgba(38,29,14,0.24)" : "rgba(0,0,0,0.45)",
        strong: isLight ? "rgba(38,29,14,0.38)" : "rgba(0,0,0,0.6)",
        dark: isLight ? "rgba(38,29,14,0.5)" : "rgba(0,0,0,0.7)",
      },
    },
    shadows: theme.shadows,
  };
}

export const theme = {
  colors: {
    primary: {
      main: colors.accent.secondary,
      light: "#E3BC70",
      dark: "#A4772F",
    },
    accent: colors.accent,
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
    accentSurface: "rgba(212,162,76,0.09)",
    accentActive: "rgba(212,162,76,0.11)",
    accentBorder: "rgba(212,162,76,0.28)",
    scrim: {
        light: "rgba(0,0,0,0.22)",
        medium: "rgba(0,0,0,0.45)",
        strong: "rgba(0,0,0,0.6)",
        dark: "rgba(0,0,0,0.7)",
    },
    semantic: {
         success: "#D4A24C",
         successSoft: "rgba(212,162,76,0.08)",
         successMuted: "rgba(212,162,76,0.09)",
         successSurface: "rgba(212,162,76,0.1)",
         successSurfaceStrong: "rgba(212,162,76,0.12)",
         successSurfaceActive: "rgba(212,162,76,0.14)",
         successSurfaceBold: "rgba(212,162,76,0.16)",
         successBorder: "rgba(212,162,76,0.2)",
         successBorderStrong: "rgba(212,162,76,0.22)",
         successBorderActive: "rgba(212,162,76,0.24)",
         successBorderBold: "rgba(212,162,76,0.16)",
         successSolid: "rgba(212,162,76,0.96)",
        warning: "#f59e0b",
        warningBright: "#FBBF24",
        warningLight: "#FCD34D",
        warningPale: "#FDE68A",
        orange: "#FB923C",
        error: "#f87171",
        danger: "#dc2626",
         onSuccess: "#1A1408",
        white: "#FFFFFF",
        black: "#000000",
        nearBlack: "#050505",
        whiteMuted: "rgba(255,255,255,0.45)",
        whiteSubtle: "rgba(255,255,255,0.04)",
        whiteFaint: "rgba(255,255,255,0.05)",
        whiteLight: "rgba(255,255,255,0.06)",
        whiteMedium: "rgba(255,255,255,0.07)",
        whiteControl: "rgba(255,255,255,0.08)",
        whiteStrong: "rgba(255,255,255,0.1)",
        whiteBorder: "rgba(255,255,255,0.18)",
        whiteOverlay: "rgba(255,255,255,0.3)",
        whiteTrack: "rgba(255,255,255,0.35)",
        scrim12: "rgba(0, 0, 0, 0.12)",
        scrim24: "rgba(6, 10, 20, 0.24)",
        scrim36: "rgba(0, 0, 0, 0.36)",
        scrim42: "rgba(0, 0, 0, 0.42)",
        scrim46: "rgba(0, 0, 0, 0.46)",
        scrim48: "rgba(0, 0, 0, 0.48)",
        scrim58: "rgba(0, 0, 0, 0.58)",
        scrim72: "rgba(0,0,0,0.72)",
        scrim84: "rgba(0,0,0,0.84)",
        scrim86: "rgba(0,0,0,0.86)",
        scrim92: "rgba(0,0,0,0.92)",
        chartGrid: "rgba(255,255,255,0.05)",
        chartUnderTarget: "rgba(255,255,255,0.18)",
        privacyBackground: "#ffffff",
        privacyHeading: "#111827",
        privacyBody: "#374151",
        privacyMuted: "#6B7280",
        privacyBorder: "#E5E7EB",
        profileSurface: "#111827",
        profileAccent: "#D1FAE5",
        mutedIcon: "#717171",
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
