import type { ThemeDefaultParams } from "ag-grid-community";

export const themeParams: Partial<ThemeDefaultParams> = {
  accentColor: "#228be6",
  backgroundColor: "#ffffff",
  foregroundColor: "#1a1a1a",
  headerBackgroundColor: "#ffffff",
  headerTextColor: "#1a1a1a",
  headerColumnResizeHandleColor: "#dee2e6",
  headerFontWeight: "bold",
  oddRowBackgroundColor: {
    ref: "backgroundColor",
    mix: 0.975,
    onto: "foregroundColor",
  },
  cellFontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
  headerFontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
  fontSize: 12,
  spacing: 4,
  wrapperBorderRadius: 0,
};

export const themeParamsDark: Partial<ThemeDefaultParams> = {
  ...themeParams,
  accentColor: "#4dabf7",
  backgroundColor: "#1a1a1a",
  foregroundColor: "#f1f3f5",
  headerBackgroundColor: "#1a1a1a",
  headerTextColor: "#f1f3f5",
  headerColumnResizeHandleColor: "#373a40",
};
