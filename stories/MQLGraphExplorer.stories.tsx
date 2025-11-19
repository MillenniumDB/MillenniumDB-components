import { Meta, StoryObj } from "@storybook/react-vite";
import { MQLGraphExplorer } from "../packages/graph-explorer/src/index";
import { Container } from "@mantine/core";
import { driver } from "@millenniumdb/driver";
import React from "react";

const meta = {
  title: "MQLGraphExplorer",
  component: MQLGraphExplorer,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {},
} satisfies Meta<typeof MQLGraphExplorer>;

export default meta;
type Story = StoryObj<typeof MQLGraphExplorer>;

const driverInstance = driver("http://localhost:1234");

export const Default: Story = {
  args: {
    driver: driverInstance,
  },
  render: (args) => {
    return (
      <Container
        fluid
        p="md"
        h="100vh"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MQLGraphExplorer
          {...args}
          style={{ flex: 1, border: "1px solid red" }}
          initialSettings={{
            nameKeys: ["name", "title"],
            searchKeys: ["name", "title"],
          }}
        />
      </Container>
    );
  },
};
