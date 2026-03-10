import { themeParams, themeParamsDark } from "./ag-grid-theme-params";
import {
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
  CsvExportModule,
  ModuleRegistry,
  PaginationModule,
  RowApiModule,
  themeQuartz,
  ValidationModule,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { ColorScheme } from "../query-editor/query-editor";

let modules = [
  ColumnApiModule,
  CsvExportModule,
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  RowApiModule,
  PaginationModule,
];
if (process.env.NODE_ENV === "development") {
  modules = [ValidationModule, ...modules];
}
ModuleRegistry.registerModules(modules);

export type DataTableProps = {
  columnDefs: ColDef[];
  showIndex?: boolean;
  colorScheme?: ColorScheme;
};

export const DataTable = forwardRef<AgGridReact, DataTableProps>(
  ({ columnDefs, showIndex, colorScheme = "light" }, ref) => {
    const gridRef = useRef<AgGridReact>(null);

    useImperativeHandle(ref, () => gridRef.current!, []);

    const computedColumnDefs = useMemo<ColDef[]>(() => {
      if (!columnDefs.length) return [];
      if (!showIndex) return columnDefs;

      const indexColDef: ColDef = {
        colId: "__index",
        headerName: "#",
        valueGetter: "node.rowIndex + 1",
        flex: 0,
        width: 64,
      };
      return [indexColDef, ...columnDefs];
    }, [columnDefs, showIndex]);

    const theme = useMemo(
      () => (colorScheme === "dark" ? themeQuartz.withParams(themeParamsDark) : themeQuartz.withParams(themeParams)),
      [colorScheme],
    );

    return (
      <div style={{ height: "100%", width: "100%" }}>
        <AgGridReact
          ref={gridRef}
          columnDefs={computedColumnDefs}
          loading={false}
          gridOptions={{
            defaultColDef: {
              flex: 1,
              resizable: true,
              sortable: false,
              filter: false,
              editable: false,
            },
          }}
          theme={theme}
          suppressDragLeaveHidesColumns
          suppressFieldDotNotation
          enableCellTextSelection
          ensureDomOrder
          pagination
        />
      </div>
    );
  },
);
