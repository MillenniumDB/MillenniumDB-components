import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ForceGraph, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { useGraphAPI } from "./hooks/use-graph-api";
import { useResizeObserver } from "./hooks/use-resize-observer";
import type { LinkId, MDBGraphData, MDBGraphLink, MDBGraphNode, NodeId } from "./types/graph";
import { GRAPH_DIMENSIONS, LINK_DIMENSIONS, NODE_DIMENSIONS } from "./constants/dimensions";
import { type GraphColorConfig, DEFAULT_DARK_GRAPH_COLORS, DEFAULT_LIGHT_GRAPH_COLORS } from "./constants/colors";

export type GraphColorsMode = "light" | "dark";

export type GraphExplorerProps = {
  initialGraphData: MDBGraphData;
  style?: CSSProperties;
  className?: string;
  baseGraphColorsMode?: GraphColorsMode;
  graphColors?: Partial<GraphColorConfig>;
};

export type GraphExplorerAPI = ReturnType<typeof useGraphAPI>;

export const GraphExplorer = forwardRef<GraphExplorerAPI, GraphExplorerProps>(
  ({ initialGraphData, style, className, baseGraphColorsMode, graphColors }, ref) => {
    // Graph state / api
    const graphAPI = useGraphAPI({ initialGraphData });
    useImperativeHandle(ref, () => graphAPI, [graphAPI]);

    // Resize handle
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { width, height } = useResizeObserver(wrapperRef);

    // Force graph reference
    const fgRef = useRef<ForceGraphMethods<MDBGraphNode, MDBGraphLink>>(undefined);

    // Graph colors
    const computedGraphColors = useMemo<GraphColorConfig>(() => {
      switch (baseGraphColorsMode) {
        case "dark":
          return { ...DEFAULT_DARK_GRAPH_COLORS, ...graphColors };
        default:
          return { ...DEFAULT_LIGHT_GRAPH_COLORS, ...graphColors };
      }
    }, [baseGraphColorsMode, graphColors]);

    const [hoveredNodeId, setHoveredNodeId] = useState<NodeId | null>(null);

    // Render nodes
    const handleNodeCanvasObject = useCallback(
      (node: NodeObject<MDBGraphNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const { id, x, y, types, name } = node;

        if (!x || !y) return;
        ctx.save();

        const isHovered = id === hoveredNodeId;

        const fontSize = Math.max(GRAPH_DIMENSIONS.fontSize / globalScale, 1);

        // Draw the slices
        const numSlices = types?.length ?? 0;
        if (numSlices === 0) {
          // no types
          ctx.beginPath();
          ctx.arc(x, y, NODE_DIMENSIONS.radius, 0, 2 * Math.PI);
          ctx.fillStyle = computedGraphColors.node.fill;
          ctx.fill();
        } else {
          // one or more types
          const sliceAngle = (2 * Math.PI) / numSlices;

          for (let i = 0; i < numSlices; ++i) {
            const colorIdx = i % computedGraphColors.types.length;
            const color = computedGraphColors.types[colorIdx];

            const startAngle = sliceAngle * i;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, NODE_DIMENSIONS.radius, startAngle, endAngle);
            ctx.fillStyle = color;
            ctx.fill();
          }
        }

        // Draw the border
        ctx.beginPath();
        ctx.arc(x, y, NODE_DIMENSIONS.radius, 0, 2 * Math.PI);
        if (isHovered) {
          ctx.strokeStyle = computedGraphColors.node.border.hovered;
        } else {
          ctx.strokeStyle = computedGraphColors.node.border.default;
        }
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw the name
        ctx.font = `${fontSize}px Sans-Serif`;

        const textWidth = ctx.measureText(name).width;
        const namePadding = 1;
        const bgWidth = Math.ceil(textWidth + namePadding);
        const bgHeight = Math.ceil(fontSize + namePadding);

        const boxX = x - bgWidth / 2;
        const boxY = y + NODE_DIMENSIONS.radius + NODE_DIMENSIONS.nameVerticalOffsetPx;

        // Draw background box
        ctx.fillStyle = computedGraphColors.text.background;
        ctx.fillRect(boxX, boxY, bgWidth, bgHeight);

        // Draw text
        ctx.fillStyle = computedGraphColors.text.foreground;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, x, boxY + bgHeight / 2);

        ctx.restore();
      },
      [hoveredNodeId, computedGraphColors]
    );

    // map LinkIds to their corresponding curvature
    const curvatureMap = useMemo<Map<LinkId, number>>(() => {
      const numConnectionsMap: Map<string, number> = new Map();
      const numSelfConnectionsMap: Map<string, number> = new Map();

      const nextCurvatureMap: Map<string, number> = new Map();
      for (const { id, source, target } of graphAPI.graphData.links) {
        // source/target can be either a string or converted to a LinkObject afterwards
        const sourceId: string = typeof source === "string" ? source : (source as { id: string }).id;
        const targetId: string = typeof target === "string" ? target : (target as { id: string }).id;

        let curvature = 0;
        if (sourceId === targetId) {
          // self links
          const count = numSelfConnectionsMap.get(sourceId) ?? 0;
          const index = Math.floor(count / 2) + 1; // 1, 1, 2, 2, ...
          const sign = count % 2 === 1 ? 1 : -1; // 1, -1, 1, -1, ...
          curvature = sign * index * LINK_DIMENSIONS.selfCurvatureDelta;

          numSelfConnectionsMap.set(sourceId, count + 1);
        } else {
          // other links
          const [a, b] = [sourceId, targetId].sort();
          const key = `${a}-${b}`;
          const count = numConnectionsMap.get(key) ?? 0;

          if (count > 0) {
            const index = Math.floor((count - 1) / 2) + 1; // 0, 1, 1, 2, 2, ...
            const sign = count % 2 === 1 ? 1 : -1; // 1, -1, 1, -1, 1, ...
            curvature = sign * index * LINK_DIMENSIONS.curvatureDelta;
          }

          numConnectionsMap.set(key, count + 1);
        }

        nextCurvatureMap.set(id, curvature);
      }

      return nextCurvatureMap;
    }, [graphAPI.graphData.links]);

    // Link curvature
    const handleLinkCurvature = useCallback(
      (link: LinkObject<MDBGraphNode, MDBGraphLink>) => {
        const { id } = link;
        return curvatureMap.get(id) ?? 0;
      },
      [curvatureMap]
    );

    // Render links
    const handleLinkCanvasObject = useCallback(
      (link: LinkObject<MDBGraphNode, MDBGraphLink>, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const { id, name, source, target } = link as {
          id: LinkId;
          name: string;
          source: NodeObject<MDBGraphNode>;
          target: NodeObject<MDBGraphNode>;
        };

        // not transformed to LinkObject yet
        if (typeof source === "string" || typeof target === "string") return;

        if (!source.x || !source.y || !target.x || !target.y) return;

        ctx.save();

        const curvature = curvatureMap.get(id) ?? 0;
        const fontSize = Math.max(GRAPH_DIMENSIONS.fontSize / globalScale, 1);

        // ctx.font = `${fontSize}px Sans-Serif`;
        // const textWidth = ctx.measureText(name).width;
        // const [bgWidth, bgHeight] = [textWidth, fontSize].map((n) => n + 0.5 * fontSize);

        // bezier midpoint
        let bx: number;
        let by: number;
        let textAngle: number = 0;
        if (source.id === target.id) {
          // self link
          const curvature = curvatureMap.get(id) ?? 0;

          // loop parameters
          const radius = 75 * Math.abs(curvature); // TODO: why 75
          const angle = curvature > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;

          // bezier control point (offset from node center)
          const cx = source.x + Math.cos(angle) * radius;
          const cy = source.y + Math.sin(angle) * radius;

          // bezier midpoint at t = 0.5
          const t = 0.5;
          bx = (1 - t) ** 2 * source.x + 2 * (1 - t) * t * cx + t ** 2 * source.x;
          by = (1 - t) ** 2 * source.y + 2 * (1 - t) * t * cy + t ** 2 * source.y;
        } else {
          // other links

          // normal vector
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / len;
          const ny = dx / len;

          // bezier control point
          const mx = (source.x + target.x) / 2;
          const my = (source.y + target.y) / 2;
          const cx = mx - curvature * len * nx;
          const cy = my - curvature * len * ny;

          // bezier midpoint at t = 0.5
          const t = 0.5;
          bx = (1 - t) ** 2 * source.x + 2 * (1 - t) * t * cx + t ** 2 * target.x;
          by = (1 - t) ** 2 * source.y + 2 * (1 - t) * t * cy + t ** 2 * target.y;

          // tangent vector at t = 0.5
          const dxdt = 2 * (1 - t) * (cx - source.x) + 2 * t * (target.x - cx);
          const dydt = 2 * (1 - t) * (cy - source.y) + 2 * t * (target.y - cy);
          textAngle = Math.atan2(dydt, dxdt);

          if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
            // adjust angle to be always left-right/top-down
            textAngle += Math.PI;
          }
        }

        ctx.translate(bx, by);
        ctx.rotate(textAngle);

        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(name).width;
        const namePadding = 1;
        const bgWidth = Math.ceil(textWidth + namePadding);
        const bgHeight = Math.ceil(fontSize + namePadding);

        // Draw background box
        ctx.fillStyle = computedGraphColors.text.background;
        ctx.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);

        // Draw the name
        ctx.fillStyle = computedGraphColors.text.foreground;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, 0, 0);

        ctx.restore();
      },
      [curvatureMap, computedGraphColors]
    );

    // Node hover interaction
    const handleNodeHover = useCallback((node: NodeObject<MDBGraphNode> | null) => {
      setHoveredNodeId(node?.id ?? null);
    }, []);

    // Disable default center force
    useEffect(() => {
      fgRef.current?.d3Force("center", null);
    }, []);

    return (
      <div ref={wrapperRef} className={className} style={style}>
        <ForceGraph<MDBGraphNode, MDBGraphLink>
          ref={fgRef}
          backgroundColor={computedGraphColors.background}
          graphData={graphAPI.graphData}
          width={width}
          height={height}
          nodeCanvasObject={handleNodeCanvasObject}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={handleLinkCanvasObject}
          linkCanvasObjectMode={() => "after"}
          linkColor={() => computedGraphColors.link.fill.default}
          linkDirectionalArrowColor={() => computedGraphColors.link.fill.default}
          linkDirectionalArrowLength={NODE_DIMENSIONS.radius}
          linkDirectionalArrowRelPos={1}
          linkCurvature={handleLinkCurvature}
          nodeVal={NODE_DIMENSIONS.area}
          nodeRelSize={NODE_DIMENSIONS.relSize}
          onNodeHover={handleNodeHover}
        />
      </div>
    );
  }
);
