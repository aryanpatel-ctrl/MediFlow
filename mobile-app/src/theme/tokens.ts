export const colors = {
  bg: "#f7faf8",
  bgGradientTop: "#fbfdfc",
  bgGradientBottom: "#f5faf8",
  surface: "#ffffff",
  surfaceSoft: "#f6faf9",
  surfaceMuted: "#edf4f2",
  border: "#eef2f0",
  text: "#2a3638",
  textSoft: "#92a1a5",
  accent: "#5aaeb4",
  accentStrong: "#438b92",
  accentSoft: "#e8f7f6",
  shadow: "rgba(111, 143, 145, 0.08)",
  shadowStrong: "rgba(92, 130, 131, 0.12)",
  success: "#60a59a",
  warning: "#f4d693",
  danger: "#f7a8ba",
};

export const radius = {
  xl: 20,
  lg: 18,
  md: 14,
  sm: 10,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const typography = {
  brand: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  h1: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
};
