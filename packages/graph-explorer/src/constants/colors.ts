export type GraphColorConfig = {
  types: string[];
  node: {
    fill: string;
    border: {
      default: string;
      hovered: string;
      selected: string;
    };
  };
  link: {
    fill: {
      default: string;
      hovered: string;
      selected: string;
    };
  };
  text: {
    background: string;
    foreground: string;
  };
};

const types = [
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

export const DEFAULT_GRAPH_COLORS: GraphColorConfig = {
  types,
  node: {
    fill: "#0275d8", // moderate blue
    border: {
      default: "#5bc0de",
      hovered: "#f0ad4e",
      selected: "#d9534f",
    },
  },
  link: {
    fill: {
      default: "#808080",
      hovered: "#f0ad4e",
      selected: "#d9534f",
    },
  },
  text: {
    background: "rgba(0,0,0, 0.8)",
    foreground: "#ffffff",
  },
};
