export type GraphColorConfig = {
  background: string;
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
    };
  };
  text: {
    background: string;
    foreground: string;
  };
};

const types = [
  "#ff6b6b", // soft red
  "#4ecdc4", // teal
  "#ffe66d", // yellow
  "#1a73e8", // blue
  "#ffa94d", // orange
  "#9b59b6", // purple
  "#00cec9", // cyan
  "#e84393", // magenta
  "#b8e994", // lime
  "#fab1a0", // pink
  "#0984e3", // strong blue
  "#dfe6e9", // light grey
  "#6c5ce7", // violet
  "#f6e58d", // light yellow
  "#c44569", // maroon
  "#55efc4", // mint
  "#636e72", // dark grey
  "#fdcb6e", // peach
  "#2d3436", // charcoal
  "#b2bec3", // silver grey
];

export const DEFAULT_LIGHT_GRAPH_COLORS: GraphColorConfig = {
  types,
  background: "#ffffff",
  node: {
    fill: "#3498db",
    border: {
      default: "#e0e0e0",
      hovered: "#6666ff",
      selected: "#ff6b6b",
    },
  },
  link: {
    fill: {
      default: "#848484",
      hovered: "#6666ff",
    },
  },
  text: {
    background: "rgba(255,255,255,0.8)",
    foreground: "#212121",
  },
};

export const DEFAULT_DARK_GRAPH_COLORS: GraphColorConfig = {
  types,
  background: "#121212",
  node: {
    fill: "#74b9ff",
    border: {
      default: "#2d3436", // charcoal
      hovered: "#a29bfe", // soft violet
      selected: "#ff7675", // soft red
    },
  },
  link: {
    fill: {
      default: "#848484",
      hovered: "#6666ff",
    },
  },
  text: {
    background: "rgba(0,0,0,0.6)",
    foreground: "#f1f1f1",
  },
};
