import classes from "./query-editor.module.css";

import { type OnMount } from "@monaco-editor/react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import { useRef, useState } from "react";
import type { Driver, Record as MDBRecord, Result, Session } from "@millenniumdb/driver";
import { editor } from "monaco-editor";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { MDBCellRenderer } from "../data-table/mdb-cell-renderer";
import ReactMonacoEditor from "@monaco-editor/react";
import { DEFAULT_EDITOR_OPTIONS } from "./editor-options";
import { DataTable } from "../data-table/data-table";
import { TabPanel, type LogEntry } from "./tab-panel";
import { StopIcon } from "../icons/stop-icon";
import { PlayIcon } from "../icons/play-icon";

const FLUSH_DELAY_MS = 50;

type ActionButtonProps = {
  isRunning: boolean;
  onClick: () => void;
};

const ActionButton = ({ isRunning, onClick }: ActionButtonProps) => (
  <button
    aria-label={isRunning ? "Stop" : "Run"}
    title={isRunning ? "Stop" : "Run"}
    onClick={onClick}
    className={clsx(classes.actionButton, isRunning ? classes.actionButtonStop : classes.actionButtonRun)}
  >
    {isRunning ? <StopIcon /> : <PlayIcon />}
  </button>
);

export type ColorScheme = "light" | "dark";

export type QueryEditorProps = {
  style?: CSSProperties;
  className?: string;
  orientation?: "horizontal" | "vertical";
  colorScheme?: ColorScheme;
  driver: Driver;
};

const LoadingEditor = () => <div className={classes.loadingEditor}>Loading...</div>;

let logIdCounter = 0;

export const QueryEditor = ({
  style,
  className = "",
  orientation = "horizontal",
  colorScheme = "light",
  driver,
}: QueryEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const gridRef = useRef<AgGridReact | null>(null);

  const runningRef = useRef<boolean>(false);
  const bufferRef = useRef<MDBRecord[]>([]);

  const sessionRef = useRef<Session | null>(null);
  const resultRef = useRef<Result | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLogs((prev) => [...prev, { ...entry, id: logIdCounter++, timestamp: new Date() }]);
  };

  const flush = () => {
    const buffer = bufferRef.current;
    if (buffer.length === 0) return;
    bufferRef.current = [];
    gridRef.current?.api.applyTransactionAsync({
      add: buffer.map((record) => record.toObject()),
    });
  };

  const updateColumnDefs = (variables: string[]) => {
    setColumnDefs(
      variables.map((varName, idx) => ({
        colId: idx.toString(),
        cellRenderer: MDBCellRenderer,
        field: varName,
        headerName: varName,
        cellDataType: false,
      })),
    );
  };

  const runQuery = () => {
    gridRef.current?.api?.setGridOption("rowData", []);
    if (runningRef.current) return;
    if (!editorRef.current) return;

    runningRef.current = true;
    setIsRunning(true);

    try {
      const query = editorRef.current.getValue();
      sessionRef.current = driver.session();
      resultRef.current = sessionRef.current.run(query);

      resultRef.current.subscribe({
        onVariables: (variables) => updateColumnDefs(variables),
        onRecord: (record) => {
          bufferRef.current.push(record);
        },
        onSuccess: (summary) => {
          stopQuery();
          console.info(summary);
          const { executionDurationMs, resultCount, update } = summary;
          addLog({
            color: "green",
            title: update ? "Update Success" : "Query Success",
            message: update
              ? `Execution took ${executionDurationMs.toFixed(3)} ms`
              : `Found ${resultCount} result(s) in ${executionDurationMs.toFixed(3)} ms`,
          });
        },
        onError: (error) => {
          stopQuery();
          console.error(error);
          addLog({ title: "Error", color: "red", message: error.toString() });
        },
      });

      intervalRef.current = setInterval(flush, FLUSH_DELAY_MS);
    } catch (e) {
      console.error(e);
    }
  };

  const stopQuery = async () => {
    if (!runningRef.current) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (resultRef.current) {
      try {
        await driver.cancel(resultRef.current);
        resultRef.current = null;
      } catch (e) {}
    }

    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
        sessionRef.current = null;
      } catch (e) {}
    }

    flush();
    runningRef.current = false;
    setIsRunning(false);
  };

  const handleOnMount: OnMount = (_editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = _editor;
  };

  const isHorizontal = orientation === "horizontal";

  return (
    <div className={clsx(classes.root, className)} style={style}>
      <div className={clsx(classes.sidebar, colorScheme === "dark" ? classes.sidebarDark : classes.sidebarLight)}>
        <ActionButton isRunning={isRunning} onClick={isRunning ? stopQuery : runQuery} />
      </div>
      <div
        className={classes.split}
        style={{
          display: "flex",
          flexDirection: isHorizontal ? "column" : "row",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ReactMonacoEditor
            onMount={handleOnMount}
            onChange={() => {}}
            theme={colorScheme === "dark" ? "vs-dark" : "light"}
            loading={<LoadingEditor />}
            options={DEFAULT_EDITOR_OPTIONS}
          />
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TabPanel
            colorScheme={colorScheme}
            logs={logs}
            resultsSlot={<DataTable ref={gridRef} columnDefs={columnDefs} colorScheme={colorScheme} showIndex />}
          />
        </div>
      </div>
    </div>
  );
};
