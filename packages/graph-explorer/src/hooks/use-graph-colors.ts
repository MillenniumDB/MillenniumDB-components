// use-graph-colors.ts
import { useMemo } from "react";
import { rgba, useMantineColorScheme, useMantineTheme, type MantineTheme } from "@mantine/core";
import { merge } from "lodash";

export type GraphColorConfig = {
  labels: string[];
  node: {
    fill: string;
    border: {
      hovered: string;
      selected: string;
    };
  };
  link: {
    fill: {
      default: string;
      defaultDimmed: string;
      hovered: string;
      selected: string;
      selectedDimmed: string;
    };
  };
  text: {
    background: string;
    foreground: string;
  };
  background: string;
};

const DEFAULT_LABEL_PALETTE = [
  "#d9534f", // strong red
  "#5bc0de", // sky blue
  "#f0ad4e", // warm gold
  "#5cb85c", // medium green
  "#292b2c", // almost black
  "#0275d8", // moderate blue
  "#f7b500", // golden yellow
  "#6f42c1", // medium purple
  "#fd7e14", // orange
  "#20c997", // teal
];

function getPrimaryShade(theme: MantineTheme, isDark: boolean) {
  if (typeof theme.primaryShade === 'number') {
    return theme.primaryShade;
  }
  return isDark ? theme.primaryShade.dark : theme.primaryShade.light;
}

function makeDefaultGraphColors(theme: MantineTheme, colorScheme: string): GraphColorConfig {
  const isDark = colorScheme === "dark";

  const background = isDark ? theme.colors.dark[7] : theme.white;
  const text = isDark ? theme.colors.dark[0] : theme.black;
  const primaryShade = getPrimaryShade(theme, isDark);

  // Nodes
  const nodeFill = isDark ? theme.colors.indigo[6] : theme.colors.blue[6];
  const borderHovered = theme.colors[theme.primaryColor][primaryShade];
  const borderSelected = theme.colors[theme.primaryColor][primaryShade];

  // Links
  const linkDefault = isDark ? theme.colors.dark[4] : theme.colors.gray[4];
  const linkHovered = theme.colors[theme.primaryColor][primaryShade];
  const linkSelected = theme.colors[theme.primaryColor][primaryShade];

  return {
    labels: DEFAULT_LABEL_PALETTE,
    node: {
      fill: nodeFill,
      border: {
        hovered: borderHovered,
        selected: borderSelected,
      },
    },
    link: {
      fill: {
        default: linkDefault,
        defaultDimmed: rgba(linkDefault, 0.2),
        hovered: linkHovered,
        selected: linkSelected,
        selectedDimmed: rgba(linkSelected, 0.2),
      },
    },
    text: {
      background: rgba(background, 0.8),
      foreground: text,
    },
    background: background,
  };
}

export function useGraphColors(overrides?: Partial<GraphColorConfig>): GraphColorConfig {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return useMemo(() => {
    const defaults = makeDefaultGraphColors(theme, colorScheme);
    return merge({}, defaults, overrides ?? {});
  }, [theme, colorScheme, overrides]);
}
