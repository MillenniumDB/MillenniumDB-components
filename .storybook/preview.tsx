// .storybook/preview.tsx
import "@mantine/core/styles.css";

import "@gfazioli/mantine-split-pane/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import React from "react";
import { Notifications } from "@mantine/notifications";

export const decorators = [
  (Story) => (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <Notifications />
      <Story />
    </MantineProvider>
  ),
];
