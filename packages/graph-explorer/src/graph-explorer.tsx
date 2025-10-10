import classes from "./graph-explorer.module.css";

import { Box } from "@mantine/core";
import { IconArrowsMaximize, IconArrowsMinimize, IconPointer, IconShape, IconTrash } from "@tabler/icons-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import ForceGraph, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import {
  RectangularSelection,
  type OnSelectionEnd,
  type OnSelectionMove,
  type OnSelectionStart,
  type SelectionBounds,
} from "./components/rectangular-selection/rectangular-selection";
import { Toolbar, type ToolId } from "./components/toolbar/toolbar";
import { GRAPH_DIMENSIONS, LINK_DIMENSIONS, NODE_DIMENSIONS } from "./constants/dimensions";
import { useGraphAPI, type GraphAPI } from "./hooks/use-graph-api";
import { useResizeObserver } from "./hooks/use-resize-observer";
import type { LinkId, MDBGraphData, MDBGraphLink, MDBGraphNode, NodeId, LabelBox } from "./types/graph";
import { NodeSearch, type FetchNodesItem } from "./components/node-search/node-search";
import { SideBar } from "./components/side-bar/side-bar";
import clsx from "clsx";
import { Settings, type GraphSettings } from "./components/settings/settings";
import { useGraphColors, type GraphColorConfig } from "./hooks/use-graph-colors";

export type OnNodeExpand = (node: NodeObject<MDBGraphNode>, event: MouseEvent) => void;

export type GraphExplorerProps = {
  style?: CSSProperties;
  className?: string;
  graphColors?: Partial<GraphColorConfig>;
  initialGraphData?: MDBGraphData | undefined;
  initialSettings?: GraphSettings | undefined;
  onNodeExpand?: (
    node: NodeObject<MDBGraphNode>,
    event: MouseEvent,
    outgoing: boolean,
    settings: GraphSettings
  ) => void;
  fetchNodes?: (query: string, settings: GraphSettings) => Promise<FetchNodesItem[]>;
  abortFetchNodes?: () => Promise<void>;
  onSearchSelection?: (nodeId: string, settings: GraphSettings) => Promise<void>;
  renderSettingsContent?: (
    settings: GraphSettings,
    onSave: (newSettings: GraphSettings) => void,
    close: () => void
  ) => ReactNode;
  onSettingsChange?: (settings: GraphSettings) => void;
  renderSideBarContent?: (
    selectedNodeIds: Set<NodeId>,
    selectedLinkIds: Set<LinkId>,
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => ReactNode;
};

export const GraphExplorer = forwardRef<GraphAPI, GraphExplorerProps>(
  (
    {
      style,
      className = "",
      graphColors,
      initialGraphData,
      initialSettings = {
        nameKeys: [],
        searchKeys: [],
        labelsKey: "",
        prefixes: {},
      },
      onNodeExpand,
      fetchNodes,
      abortFetchNodes,
      onSearchSelection,
      renderSettingsContent,
      onSettingsChange,
      renderSideBarContent,
    },
    ref
  ) => {
    const graphAPI = useGraphAPI();
    // Expose the graphAPI methods via ref
    useImperativeHandle(ref, () => graphAPI, [graphAPI]);

    // Resize handle
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { width, height } = useResizeObserver(wrapperRef);

    // Force graph reference
    const fgRef = useRef<ForceGraphMethods<MDBGraphNode, MDBGraphLink>>(undefined);

    // Graph colors
    const computedGraphColors = useGraphColors(graphColors);

    // Node label colors
    const labelColorMap = useRef(new Map<string, string>());

    // Graph settings
    const [settings, setSettings] = useState<GraphSettings>(initialSettings);

    // Tools
    const [activeToolId, setActiveToolId] = useState<ToolId>("move");

    // Node/Link interaction
    const [hoveredNodeId, setHoveredNodeId] = useState<NodeId | null>(null);
    const [hoveredLinkId, setHoveredLinkId] = useState<LinkId | null>(null);

    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(new Set());
    const [selectedLinkIds, setSelectedLinkIds] = useState<Set<LinkId>>(new Set());

    const [rectangularSelection, setRectangularSelection] = useState<{
      isMultiSelect: boolean;
      nodeIds: Set<NodeId>;
    }>({
      isMultiSelect: false,
      nodeIds: new Set(),
    });

    // Map node labels to colors
    const getColorForLabel = useCallback(
      (label: string) => {
        if (!labelColorMap.current.has(label)) {
          const nextColor = computedGraphColors.types[labelColorMap.current.size % computedGraphColors.types.length];
          labelColorMap.current.set(label, nextColor);
        }
        return labelColorMap.current.get(label)!;
      },
      [computedGraphColors]
    );

    // Updates on graph settings changes
    useEffect(() => {
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    }, [settings]);

    // Truncate text to fit within maxWidth
    const truncateText = useCallback((ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
      const ellipsis = "…";
      const ellipsisWidth = ctx.measureText(ellipsis).width;
      let width = ctx.measureText(text).width;

      if (width <= maxWidth) return text;

      while (text.length > 0 && width + ellipsisWidth > maxWidth) {
        text = text.slice(0, -1);
        width = ctx.measureText(text).width;
      }

      return text + ellipsis;
    }, []);

    // Render nodes
    const handleNodeCanvasObject = useCallback(
      (node: NodeObject<MDBGraphNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const { id, x, y, types, name } = node;

        if (x === undefined || y === undefined) return;

        ctx.save();

        const isHovered = id === hoveredNodeId;
        const isSelected = selectedNodeIds.has(id);
        const isRectangularSelected = rectangularSelection.nodeIds.has(id);

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
            const color = getColorForLabel(types![i]);

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
        let borderWidth: number | null = null;
        let borderColor = '';

        if (isHovered) {
          borderWidth = 4 / globalScale;
          borderColor = computedGraphColors.node.border.selected;
        } else if (isSelected || isRectangularSelected) {
          borderWidth = 3 / globalScale;
          borderColor = computedGraphColors.node.border.hovered;
        }

        if (borderWidth !== null) {
          ctx.beginPath();
          ctx.arc(x, y, NODE_DIMENSIONS.radius + borderWidth / 2, 0, 2 * Math.PI);
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidth;
          ctx.stroke();
        }

        // Draw the name
        ctx.font = `${fontSize}px Sans-Serif`;

        const maxLabelWidth = fontSize * 10;
        const truncated = truncateText(ctx, name, maxLabelWidth);

        const textWidth = ctx.measureText(truncated).width;
        const namePadding = 1;
        const bgWidth = Math.ceil(textWidth + namePadding);
        const bgHeight = Math.ceil(fontSize + namePadding);

        const boxX = x - bgWidth / 2;
        const boxY = y + NODE_DIMENSIONS.radius + NODE_DIMENSIONS.nameVerticalOffsetPx;

        node.labelBox = {
          x: boxX,
          y: boxY,
          width: bgWidth,
          height: bgHeight,
        };

        if (node.showLabel === false) {
          ctx.restore();
          return;
        }

        // Draw background box
        ctx.fillStyle = computedGraphColors.text.background;
        ctx.fillRect(boxX, boxY, bgWidth, bgHeight);

        // Draw text
        ctx.fillStyle = computedGraphColors.text.foreground;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(truncated, x, boxY + bgHeight / 2);

        ctx.restore();
      },
      [hoveredNodeId, selectedNodeIds, rectangularSelection.nodeIds, computedGraphColors]
    );

    // Node label on hover
    const nodeLabel = useCallback(
      (node: NodeObject<MDBGraphNode>) => {
        const { id, name } = node;
        const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeId = id.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
          <div>
            <strong>${safeName}</strong><br/>
            ${safeName !== safeId ? `<span>id: ${safeId}</span>` : ""}
          </div>
        `;
      },
      []
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

    // Link width/thickness
    const handleLinkWidth = useCallback(
      (link: LinkObject<MDBGraphNode, MDBGraphLink>) => {
        const { id } = link;
        return id === hoveredLinkId ? 2 : 1;
      },
      [hoveredLinkId]
    );

    // Link color
    const handleLinkColor = useCallback(
      (link: LinkObject<MDBGraphNode, MDBGraphLink>) => {
        const { id } = link;

        const isSelected = selectedLinkIds.has(id);
        if (isSelected) {
          return computedGraphColors.link.fill.selected;
        }

        const isHovered = id === hoveredLinkId;
        if (isHovered) {
          return computedGraphColors.link.fill.hovered;
        }

        return computedGraphColors.link.fill.default;
      },
      [selectedLinkIds, hoveredLinkId]
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

        // bezier midpoint
        let bx: number;
        let by: number;
        if (source.id === target.id) {
          // self link
          const curvature = curvatureMap.get(id) ?? 0;

          // loop parameters
          const radius = 75 * Math.abs(curvature); // TODO: why 75?
          const angle = curvature > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;

          // bezier control point (offset from node center)
          const cx = source.x + Math.cos(angle) * radius;
          const cy = source.y + Math.sin(angle) * radius;

          // bezier midpoint at t = 0.5
          const t = 0.5;
          bx = (1 - t) ** 2 * source.x + 2 * (1 - t) * t * cx + t ** 2 * source.x;
          by = (1 - t) ** 2 * source.y + 2 * (1 - t) * t * cy + t ** 2 * source.y;
        } else if (curvature === 0) {
          // optimization: straight link
          bx = (source.x + target.x) / 2;
          by = (source.y + target.y) / 2;
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
        }

        ctx.translate(bx, by);

        ctx.font = `${fontSize}px Sans-Serif`;
        const maxLabelWidth = fontSize * 10;
        const truncated = truncateText(ctx, name, maxLabelWidth);
        const textWidth = ctx.measureText(truncated).width;
        const namePadding = 1;
        const bgWidth = Math.ceil(textWidth + namePadding);
        const bgHeight = Math.ceil(fontSize + namePadding);

        link.labelBox = {
          x: bx - bgWidth / 2,
          y: by - bgHeight / 2,
          width: bgWidth,
          height: bgHeight,
        };

        if (link.showLabel === false) {
          ctx.restore();
          return;
        }

        // Draw background box
        ctx.fillStyle = computedGraphColors.text.background;
        ctx.fillRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);

        // Draw the name
        ctx.fillStyle = computedGraphColors.text.foreground;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(truncated, 0, 0);

        ctx.restore();
      },
      [curvatureMap, computedGraphColors]
    );

    // Link label on hover
    const linkLabel = useCallback(
      (link: LinkObject<MDBGraphLink>) => {
        const { id, name } = link;
        const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeId = id.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
          <div>
            <strong>${safeName}</strong><br/>
            ${safeName !== safeId ? `<span>id: ${safeId}</span>` : ""}
          </div>
        `;
      },
      []
    );

    // Node hover interaction
    const handleNodeHover = useCallback((node: NodeObject<MDBGraphNode> | null) => {
      setHoveredNodeId(node?.id ?? null);
    }, []);

    const handleLinkHover = useCallback((link: LinkObject<MDBGraphNode, MDBGraphNode> | null) => {
      setHoveredLinkId(link?.id ?? null);
    }, []);

    const handleNodeClick = useCallback(
      (node: NodeObject<MDBGraphNode>, event: MouseEvent) => {
        switch (activeToolId) {
          case "move": {
            if (event.altKey || event.ctrlKey || event.shiftKey) {
              // modify current selection
              setSelectedNodeIds((prev) => {
                const { id } = node;
                const next = new Set(prev);
                if (next.has(id)) {
                  next.delete(id);
                } else {
                  next.add(id);
                }
                return next;
              });
            } else {
              // single selection
              setSelectedNodeIds(new Set([node.id]));
            }
            break;
          }
          case "expand-outgoing": {
            onNodeExpand?.(node, event, true, settings);
            break;
          }
          case "expand-incoming": {
            onNodeExpand?.(node, event, false, settings);
            break;
          }
          case "remove": {
            graphAPI.removeNode(node.id);
            graphAPI.update();
            break;
          }
          case "rectangular-selection": {
            break;
          }
        }
      },
      [activeToolId]
    );

    const handleLinkClick = useCallback(
      (link: LinkObject<MDBGraphNode, MDBGraphLink>, event: MouseEvent) => {
        switch (activeToolId) {
          case "move": {
            if (event.altKey || event.ctrlKey || event.shiftKey) {
              // modify current selection
              setSelectedLinkIds((prev) => {
                const { id } = link;
                const next = new Set(prev);
                if (next.has(id)) {
                  next.delete(id);
                } else {
                  next.add(id);
                }
                return next;
              });
            } else {
              // single selection
              setSelectedLinkIds(new Set([link.id]));
            }
            break;
          }
          case "remove": {
            graphAPI.removeLink(link.id);
            graphAPI.update();
            break;
          }
          case "expand-outgoing":
          case "expand-incoming":
          case "rectangular-selection": {
            break;
          }
        }
      },
      [activeToolId]
    );

    const handleBackgroundClick = useCallback(() => {
      switch (activeToolId) {
        case "move": {
          // clear selection
          setSelectedNodeIds(new Set());
          setSelectedLinkIds(new Set());
          break;
        }
        case "remove":
        case "rectangular-selection":
        case "expand-outgoing":
        case "expand-incoming": {
          break;
        }
      }
    }, [activeToolId]);

    // Node dragging
    const handleNodeDrag = useCallback(
      (node: NodeObject<MDBGraphNode>, translate: { x: number; y: number }) => {
        const { id } = node;
        if (selectedNodeIds.has(id)) {
          for (const selectedNodeId of selectedNodeIds) {
            if (selectedNodeId === id) continue;

            const selectedNode = graphAPI.getNode(selectedNodeId);
            if (!selectedNode) continue;
            if (!selectedNode.x || !selectedNode.y) continue;

            selectedNode.fx = selectedNode.x + translate.x;
            selectedNode.fy = selectedNode.y + translate.y;
          }
        }
      },
      [graphAPI.getNode, selectedNodeIds]
    );

    const handleNodeDragEnd = useCallback(
      (node: NodeObject<MDBGraphNode>) => {
        if (!node.x || !node.y) return;
        // fix node after drag
        node.fx = node.x;
        node.fy = node.y;
      },
      [selectedNodeIds]
    );

    const handleSelectionStart: OnSelectionStart = useCallback(
      (_: { x: number; y: number }, event: React.MouseEvent) => {
        const isMultiSelect = event.altKey || event.ctrlKey || event.shiftKey;

        if (!isMultiSelect) {
          setSelectedNodeIds(new Set());
        }

        setRectangularSelection({
          isMultiSelect,
          nodeIds: new Set(),
        });
      },
      []
    );

    const handleSelectionMove: OnSelectionMove = useCallback(
      ({ minX, minY, maxX, maxY }: SelectionBounds) => {
        if (!fgRef.current) return;

        const minGraphCoords = fgRef.current.screen2GraphCoords(minX, minY);
        const maxGraphCoords = fgRef.current.screen2GraphCoords(maxX, maxY);

        setRectangularSelection((prev) => {
          const nextNodeIds: Set<NodeId> = new Set();
          for (const node of graphAPI.graphData.nodes) {
            const { id, x, y } = node;

            if (x === undefined || y === undefined) continue;
            if (selectedNodeIds.has(node.id)) continue;

            const isOutsideRectangleSelection =
              minGraphCoords.x > x || minGraphCoords.y > y || maxGraphCoords.x < x || maxGraphCoords.y < y;

            if (!isOutsideRectangleSelection) {
              nextNodeIds.add(id);
            }
          }
          return { ...prev, nodeIds: nextNodeIds };
        });
      },
      [selectedNodeIds, graphAPI.graphData.nodes]
    );

    const handleSelectionEnd: OnSelectionEnd = useCallback(() => {
      setRectangularSelection((prevRectangularSelection) => {
        setSelectedNodeIds(
          (prevSelectedNodeIds) => new Set([...prevSelectedNodeIds, ...prevRectangularSelection.nodeIds])
        );
        const next = { ...prevRectangularSelection, nodeIds: new Set() as Set<NodeId> };
        return next;
      });

      setActiveToolId("move");
    }, []);

    // Recompute label bounding boxes and visibility
    const boxesOverlap = useCallback((a: LabelBox, b: LabelBox): boolean =>
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    , []);

    const updateLabelVisibility = useCallback(
      (nodesAndLinks: (NodeObject<MDBGraphNode> | LinkObject<MDBGraphLink>)[]) => {
        nodesAndLinks.forEach((n) => (n.showLabel = true));

        for (let i = 0; i < nodesAndLinks.length; i++) {
          const a = nodesAndLinks[i];
          if (!a.showLabel) continue;

          for (let j = i + 1; j < nodesAndLinks.length; j++) {
            const b = nodesAndLinks[j];
            if (a.labelBox && b.labelBox && boxesOverlap(a.labelBox, b.labelBox)) {
              b.showLabel = false;
            }
          }
        }
      },
      []
    );

    const handleRecomputeLabelsVisibility = useCallback(() => {
      const nodes = graphAPI.graphData.nodes;
      const links = graphAPI.graphData.links;
      updateLabelVisibility([...nodes, ...links]);
    }, [graphAPI.graphData]);

    // Disable default center force
    useEffect(() => {
      fgRef.current?.d3Force("center", null);
    }, []);

    // update graph on initialGraphData changes
    useEffect(() => {
      if (!initialGraphData) return;

      graphAPI.addGraphData({
        newGraphData: initialGraphData,
        replace: true,
      });
      graphAPI.update();
    }, [initialGraphData]);

    return (
      <Box ref={wrapperRef} className={clsx(classes.root, className)} style={style}>
        <ForceGraph<MDBGraphNode, MDBGraphLink>
          ref={fgRef}
          graphData={graphAPI.graphData}
          width={width}
          height={height}
          backgroundColor={computedGraphColors.background}
          nodeCanvasObject={handleNodeCanvasObject}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={handleLinkCanvasObject}
          linkCanvasObjectMode={() => "after"}
          linkDirectionalArrowLength={NODE_DIMENSIONS.radius}
          linkDirectionalArrowRelPos={1}
          linkCurvature={handleLinkCurvature}
          linkWidth={handleLinkWidth}
          linkColor={handleLinkColor}
          linkDirectionalArrowColor={handleLinkColor}
          nodeVal={NODE_DIMENSIONS.area}
          nodeRelSize={NODE_DIMENSIONS.relSize}
          onNodeHover={handleNodeHover}
          onLinkHover={handleLinkHover}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onBackgroundClick={handleBackgroundClick}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
          nodeLabel={nodeLabel}
          linkLabel={linkLabel}
          onZoom={handleRecomputeLabelsVisibility}
        />
        {/* Widgets */}
        <Toolbar
          activeToolId={activeToolId}
          tools={[
            { id: "move", title: "Move tool", icon: IconPointer, onClick: () => setActiveToolId("move") },
            {
              id: "rectangular-selection",
              title: "Rectangle selection",
              icon: IconShape,
              onClick: () => setActiveToolId("rectangular-selection"),
            },
            {
              id: "expand-outgoing",
              title: "Expand outgoing",
              icon: IconArrowsMaximize,
              onClick: () => setActiveToolId("expand-outgoing"),
            },
            {
              id: "expand-incoming",
              title: "Expand incoming",
              icon: IconArrowsMinimize,
              onClick: () => setActiveToolId("expand-incoming"),
            },
            {
              id: "remove",
              title: "Remove",
              icon: IconTrash,
              onClick: () => setActiveToolId("remove"),
            },
          ]}
        />

        <NodeSearch
          fetchNodes={fetchNodes}
          abortFetchNodes={abortFetchNodes}
          onSearchSelection={onSearchSelection}
          settings={settings}
        />

        <Settings
          initialSettings={settings}
          onSave={setSettings}
          renderContent={renderSettingsContent}
        />

        {activeToolId === "rectangular-selection" && (
          <RectangularSelection
            onSelectionStart={handleSelectionStart}
            onSelectionMove={handleSelectionMove}
            onSelectionEnd={handleSelectionEnd}
          />
        )}

        <SideBar
          selectedNodeIds={selectedNodeIds}
          selectedLinkIds={selectedLinkIds}
          getColorForLabel={getColorForLabel}
          settings={settings}
          renderContent={renderSideBarContent}
        />
      </Box>
    );
  }
);
