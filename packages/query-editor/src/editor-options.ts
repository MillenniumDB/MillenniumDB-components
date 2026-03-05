import type { editor } from "monaco-editor";

export const DEFAULT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  renderWhitespace: "all",
  tabSize: 4,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
  },
  mouseWheelZoom: true,
};
