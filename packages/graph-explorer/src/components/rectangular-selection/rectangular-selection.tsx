import classes from "./rectangular-selection.module.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mantine/core";

export type SelectionBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type OnSelectionStart = ({ x, y }: { x: number; y: number }, event: React.MouseEvent) => void;

export type OnSelectionMove = (selectionBounds: SelectionBounds, event: React.MouseEvent) => void;

export type OnSelectionEnd = (selectionBounds: SelectionBounds, event: React.MouseEvent) => void;

type RectangularSelectionProps = {
  onSelectionStart?: OnSelectionStart;
  onSelectionMove?: OnSelectionMove;
  onSelectionEnd?: OnSelectionEnd;
};

export const RectangularSelection = ({
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
}: RectangularSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const [selection, setSelection] = useState({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    isSelecting: false,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || e.button !== 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Trigger selection start
    onSelectionStart?.({ x, y }, e);

    setSelection({
      start: { x, y },
      end: { x, y },
      isSelecting: true,
    });

    isDraggingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get bounds of selection
    const bounds = {
      minX: Math.min(selection.start.x, x),
      minY: Math.min(selection.start.y, y),
      maxX: Math.max(selection.start.x, x),
      maxY: Math.max(selection.start.y, y),
    };

    // Trigger selection move
    onSelectionMove?.(bounds, e);

    setSelection((prev) => ({
      ...prev,
      end: { x, y },
    }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Get bounds of selection
      const bounds = {
        minX: Math.min(selection.start.x, x),
        minY: Math.min(selection.start.y, y),
        maxX: Math.max(selection.start.x, x),
        maxY: Math.max(selection.start.y, y),
      };

      // Trigger selection end
      onSelectionEnd?.(bounds, e);
    }

    setSelection((prev) => ({ ...prev, isSelecting: false }));

    isDraggingRef.current = false;
  };

  return (
    <Box
      ref={containerRef}
      className={classes.root}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Box
        className={classes.selection}
        style={{
          visibility: selection.isSelecting ? "visible" : "hidden",
          left: Math.min(selection.start.x, selection.end.x),
          top: Math.min(selection.start.y, selection.end.y),
          width: Math.abs(selection.end.x - selection.start.x),
          height: Math.abs(selection.end.y - selection.start.y),
        }}
      />
    </Box>
  );
};
