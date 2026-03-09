import classes from "./query-editor.module.css";

import ReactMonacoEditor, { type OnChange, type OnMount } from "@monaco-editor/react";
import { DEFAULT_EDITOR_OPTIONS } from "./editor-options";
import type { CSSProperties } from "react";
import { ActionIcon, Box, LoadingOverlay, Stack, Tooltip, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import clsx from "clsx";
import { IconPlayerPlayFilled, IconPlayerStopFilled, type Icon, type IconProps } from "@tabler/icons-react";
import { useRef, useState, type ForwardRefExoticComponent, type RefAttributes } from "react";
import type { Driver, Record as MDBRecord, Result, Session } from "@millenniumdb/driver";
import { editor } from "monaco-editor";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { DataTable } from "../data-table/data-table";
import type { ColDef } from "ag-grid-community";
import { MDBCellRenderer } from "../data-table/mdb-cell-renderer";

const FLUSH_DELAY_MS = 50;

type ActionButtonProps = {
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  label: string;
  color: string;
  onClick: () => void;
};

const ActionButton = ({ icon: Icon, label, color, onClick }: ActionButtonProps) => (
  <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
    <ActionIcon variant="subtle" aria-label="label" onClick={onClick} color={color}>
      <Icon style={{ width: "70%", height: "70%" }} stroke={1.5} />
    </ActionIcon>
  </Tooltip>
);

export type QueryEditorProps = {
  style?: CSSProperties;
  className?: string;
  driver: Driver;
};

const LoadingEditor = () => {
  return (
    <LoadingOverlay
      visible
      loaderProps={{
        color: "var(--mantine-color-bright)",
        type: "dots",
      }}
    />
  );
};

export const QueryEditor = ({ style, className = "", driver }: QueryEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const gridRef = useRef<AgGridReact | null>(null);

  const runningRef = useRef<boolean>(false);
  const bufferRef = useRef<MDBRecord[]>([]);

  const sessionRef = useRef<Session | null>(null);
  const resultRef = useRef<Result | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { colorScheme } = useMantineColorScheme();

  const [isRunning, setIsRunning] = useState(false);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);

  const flush = () => {
    const buffer = bufferRef.current;
    if (buffer.length === 0) return;

    gridRef.current?.api.applyTransactionAsync({
      add: buffer.map((record) => record.toObject()),
    });

    buffer.length = 0;
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
    if (runningRef.current) return;
    if (!editorRef.current) return;

    runningRef.current = true;
    setIsRunning(true);

    try {
      const query = editorRef.current.getValue();
      sessionRef.current = driver.session();
      resultRef.current = sessionRef.current.run(query);

      resultRef.current.subscribe({
        onVariables: (variables) => {
          updateColumnDefs(variables);
        },
        onRecord: (record) => {
          bufferRef.current.push(record);
        },
        onSuccess: (summary) => {
          stopQuery();
          console.info(summary);
        },
        onError: (error) => {
          stopQuery();
          console.error(error);
        },
      });

      intervalRef.current = setInterval(() => {
        flush();
      }, FLUSH_DELAY_MS);
    } catch (e) {
      console.error(e);
    }
  };

  const stopQuery = () => {
    if (!runningRef.current) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (resultRef.current) {
      driver.cancel(resultRef.current);
      resultRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    flush();

    runningRef.current = false;
    setIsRunning(false);
  };

  const handleOnMount: OnMount = (_editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = _editor;
  };

  const handleOnChange = () => {};

  const actions = [
    {
      icon: isRunning ? IconPlayerStopFilled : IconPlayerPlayFilled,
      label: isRunning ? "Stop" : "Run",
      color: isRunning ? "red" : "green",
      onClick: isRunning ? stopQuery : runQuery,
    },
  ];

  const actionsRender = actions.map((action) => <ActionButton {...action} key={action.label} />);

  return (
    <Box className={clsx(classes.root, className)} style={style}>
      <Box className={classes.editor}>
        <Box className={classes.sidebar}>
          <Stack justify="center" gap={0}>
            {actionsRender}
          </Stack>
        </Box>
        <ReactMonacoEditor
          onMount={handleOnMount}
          onChange={handleOnChange}
          theme={colorScheme === "dark" ? "vs-dark" : "light"}
          loading={<LoadingEditor />}
          options={DEFAULT_EDITOR_OPTIONS}
        />
      </Box>
      <Box className={classes.results}>
        <DataTable ref={gridRef} columnDefs={columnDefs} showIndex />
      </Box>
    </Box>
  );
};
