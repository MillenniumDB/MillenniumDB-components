import { Meta, StoryObj } from "@storybook/react-vite";
import { GraphExplorer, MDBGraphNode } from "../packages/graph-explorer/src/index";
import React, { useRef } from "react";
import { GraphAPI, useGraphAPI } from "../packages/graph-explorer/src/hooks/use-graph-api";
import { Button, Container } from "@mantine/core";

const meta = {
  title: "GraphExplorer",
  component: GraphExplorer,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {},
} satisfies Meta<typeof GraphExplorer>;

export default meta;
type Story = StoryObj<typeof GraphExplorer>;

export const Default: Story = {
  args: {
    // initialGraphData: {
    //   nodes: [
    //     { id: "0", name: "0", types: ["Chile", "Person"] },
    //     { id: "1", name: "1", types: ["Dog", "Person"] },
    //     { id: "2", name: "2" },
    //   ],
    //   links: [
    //     { id: "01", name: "01", source: "0", target: "1" },
    //     { id: "000", name: "000", source: "0", target: "0" },
    //     { id: "001", name: "001", source: "0", target: "0" },
    //     { id: "002", name: "002", source: "0", target: "0" },
    //     { id: "003", name: "003", source: "0", target: "0" },
    //     { id: "004", name: "004", source: "0", target: "0" },
    //     { id: "005", name: "005", source: "0", target: "0" },
    //     { id: "006", name: "006", source: "0", target: "0" },
    //     { id: "007", name: "007", source: "0", target: "0" },
    //     { id: "008", name: "008", source: "0", target: "0" },
    //     { id: "12", name: "12", source: "1", target: "2" },
    //     { id: "200", name: "200", source: "2", target: "0" },
    //     { id: "201", name: "201", source: "2", target: "0" },
    //     { id: "202", name: "202", source: "2", target: "0" },
    //     { id: "020", name: "020", source: "0", target: "2" },
    //     { id: "021", name: "021", source: "0", target: "2" },
    //     { id: "022", name: "022", source: "0", target: "2" },
    //   ],
    // },
  },
  render: (args) => {
    const graphAPI = useRef<GraphAPI>(null);

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
        <Button
          onClick={() => {
            if (!graphAPI.current) return;

            const gd = graphAPI.current.graphData;
            if (!gd) return;

            const numNodes = gd.nodes.length;

            graphAPI.current.addNode({ id: `${numNodes}`, name: `${numNodes}` });

            if (numNodes > 0) {
              const target: string = `${Math.floor(Math.random() * numNodes)}`;
              graphAPI.current.addLink({
                id: `${numNodes}->${target}`,
                name: `${numNodes}->${target}`,
                source: `${numNodes}`,
                target,
              });
            }

            graphAPI.current.update();
          }}
        >
          {"Spawn node"}
        </Button>
        <GraphExplorer
          {...args}
          ref={graphAPI}
          style={{
            flex: 1,
            border: "1px solid red",
          }}
        />
      </Container>
    );
  },
};
