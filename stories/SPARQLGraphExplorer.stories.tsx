import { Meta, StoryObj } from "@storybook/react-vite";
import { SPARQLGraphExplorer } from "../packages/graph-explorer/src/index";
import { Container } from "@mantine/core";
import { driver } from "@millenniumdb/driver";
import React from "react";

const meta = {
  title: "SPARQLGraphExplorer",
  component: SPARQLGraphExplorer,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {},
} satisfies Meta<typeof SPARQLGraphExplorer>;

export default meta;
type Story = StoryObj<typeof SPARQLGraphExplorer>;

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
        <SPARQLGraphExplorer
          {...args}
          style={{ flex: 1, border: "1px solid red" }}
          initialSettings={{
            nameKeys: ["http://example.com/name"],
            searchKeys: ["http://example.com/name"],
            labelsKey: "http://example.com/subject",
            prefixes: {
              ex: "http://example.com/",
              rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            },
          }}
        />
      </Container>
    );
  },
};
