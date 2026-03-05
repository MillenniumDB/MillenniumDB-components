import { Meta, StoryObj } from "@storybook/react-vite";
import { QueryEditor } from "../packages/query-editor/src/index";
import { Container } from "@mantine/core";
import React from "react";
import { driver } from "@millenniumdb/driver";

const meta = {
  title: "QueryEditor",
  component: QueryEditor,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {},
} satisfies Meta<typeof QueryEditor>;

export default meta;
type Story = StoryObj<typeof QueryEditor>;

const driverInstance = driver("http://localhost:1234");

export const Default: Story = {
  args: {
    driver: driverInstance,
  },
  render: (args) => (
    <Container
      fluid
      p="md"
      h="100vh"
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <QueryEditor
        {...args}
        style={{
          flex: 1,
          border: "1px solid red",
        }}
      />
    </Container>
  ),
};
