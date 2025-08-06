export const GRAPH_DIMENSIONS = {
  fontSize: 14, // graph labels fon size
};

export const NODE_DIMENSIONS = {
  radius: 4, // node radius
  relSize: 1, // relative size (keep it as 1 for simplicity)
  nameVerticalOffsetPx: 1, // offset from node's border to its name
  get area() {
    return this.relSize * this.radius * this.radius;
  },
};

export const LINK_DIMENSIONS = {
  curvatureDelta: 0.2, // increasing curvature factor for links (source !== target)
  selfCurvatureDelta: 0.3, // increasing curvature factor for self links (source === target)
};
