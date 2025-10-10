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
    initialGraphData: {
      nodes: [
        { id: "0", name: "0", types: ["Chile", "Person"] },
        { id: "1", name: "1", types: ["Dog", "Person"] },
        { id: "2", name: "2" },
      ],
      links: [
        { id: "01", name: "01", source: "0", target: "1" },
        { id: "000", name: "000", source: "0", target: "0" },
        { id: "001", name: "001", source: "0", target: "0" },
        { id: "002", name: "002", source: "0", target: "0" },
        { id: "003", name: "003", source: "0", target: "0" },
        { id: "004", name: "004", source: "0", target: "0" },
        { id: "005", name: "005", source: "0", target: "0" },
        { id: "006", name: "006", source: "0", target: "0" },
        { id: "007", name: "007", source: "0", target: "0" },
        { id: "008", name: "008", source: "0", target: "0" },
        { id: "12", name: "12", source: "1", target: "2" },
        { id: "200", name: "200", source: "2", target: "0" },
        { id: "201", name: "201", source: "2", target: "0" },
        { id: "202", name: "202", source: "2", target: "0" },
        { id: "020", name: "020", source: "0", target: "2" },
        { id: "021", name: "021", source: "0", target: "2" },
        { id: "022", name: "022", source: "0", target: "2" },
      ],
    },
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
1