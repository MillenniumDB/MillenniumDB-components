// .storybook/preview.tsx
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import React from "react";

export const decorators = [
  (Story) => (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Story />
    </MantineProvider>
  ),
];
