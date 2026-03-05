import classes from "./query-editor.module.css";

import ReactMonacoEditor, { type OnChange, type OnMount } from "@monaco-editor/react";
import { DEFAULT_EDITOR_OPTIONS } from "./editor-options";
import type { CSSProperties } from "react";
import { ActionIcon, Box, LoadingOverlay, Stack, Tooltip, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import clsx from "clsx";
import { IconPlayerPlayFilled, IconPlayerStopFilled, type Icon, type IconProps } from "@tabler/icons-react";
import { useRef, useState, type ForwardRefExoticComponent, type RefAttributes } from "react";
import { Driver } from "@millenniumdb/driver";
import { editor } from "monaco-editor";

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
  const runningRef = useRef(false);

  const { colorScheme } = useMantineColorScheme();

  const [isRunning, setIsRunning] = useState(false);

  const runQuery = async () => {
    if (runningRef.current) return;
    if (!editorRef.current) return;

    runningRef.current = true;
    setIsRunning(true);

    try {
      const session = driver.session();
      const query = editorRef.current.getValue();
      const result = session.run(query);
    } catch (e) {
      console.error(e);
    } finally {
      runningRef.current = false;
      setIsRunning(false);
    }
  };

  const stopQuery = () => {
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
      <Box className={classes.results}>xdx</Box>
    </Box>
  );
};
