import classes from "./data-table.module.css";

import { ActionIcon, Box, Tooltip, useMantineColorScheme } from "@mantine/core";
import { themeParams } from "./ag-grid-theme-params";
import {
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  colorSchemeDark,
  ColumnApiModule,
  ColumnAutoSizeModule,
  CsvExportModule,
  ModuleRegistry,
  RowApiModule,
  themeQuartz,
  ValidationModule,
  type ColDef,
  type GridReadyEvent,
  type RowDoubleClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

let modules = [
  ColumnApiModule,
  CsvExportModule,
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  RowApiModule,
];

if (process.env.NODE_ENV === "development") {
  modules = [ValidationModule, ...modules];
}

ModuleRegistry.registerModules(modules);

export type DataTableProps = {
  columnDefs: ColDef[];
  // onGridReady?: (event: GridReadyEvent) => void;
  // onRowDoubleClicked?: (event: RowDoubleClickedEvent) => void;
  showIndex?: boolean;
  // withBorder?: boolean;
  // disableExport?: boolean;
};

export const DataTable = forwardRef<AgGridReact, DataTableProps>(({ columnDefs, showIndex }, ref) => {
  const gridRef = useRef<AgGridReact>(null);
  // expose internal ref to parent
  useImperativeHandle(ref, () => gridRef.current!, []);

  const { colorScheme } = useMantineColorScheme();

  const computedColumnDefs = useMemo<ColDef[]>(() => {
    if (!columnDefs.length) return [];

    if (!showIndex) {
      return columnDefs;
    }

    const indexColDef: ColDef = {
      colId: "__index",
      headerName: "#",
      valueGetter: "node.rowIndex + 1",
      flex: 0,
      width: 64,
      cellClass: classes.indexCell,
      headerClass: classes.indexHeader,
    };

    return [indexColDef, ...columnDefs];
  }, [columnDefs, showIndex]);

  return (
    <Box h="100%" w="100%">
      <AgGridReact
        ref={gridRef}
        columnDefs={computedColumnDefs}
        rowData={[]}
        gridOptions={{
          defaultColDef: {
            flex: 1,
            resizable: true,
            sortable: false,
            filter: false,
            editable: false,
          },
        }}
        theme={themeQuartz.withParams(themeParams)}
        suppressDragLeaveHidesColumns
        suppressFieldDotNotation // prevents issues with columns with dot
      />
    </Box>
  );
});
