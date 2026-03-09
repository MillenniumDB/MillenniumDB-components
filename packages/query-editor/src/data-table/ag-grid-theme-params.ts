import type { ThemeDefaultParams } from "ag-grid-community";

export const themeParams: Partial<ThemeDefaultParams> = {
  accentColor: "var(--mantine-primary-color-5)",
  backgroundColor: "var(--mantine-color-body)",
  foregroundColor: "var(--mantine-color-bright)",

  headerBackgroundColor: "var(--mantine-color-body)",
  headerTextColor: "var(--mantine-color-bright)",

  headerColumnResizeHandleColor: "var(--mantine-color-default-border)",

  headerFontWeight: "bold",

  oddRowBackgroundColor: {
    ref: "backgroundColor",
    mix: 0.975,
    onto: "foregroundColor",
  },

  cellFontFamily: "var(--mantine-font-family-monospace)",
  headerFontFamily: "var(--mantine-font-family-monospace)",
  fontSize: 12,
  spacing: 4,

  wrapperBorderRadius: 0,
};
