import { Meta, StoryObj } from "@storybook/react-vite";
import { GraphExplorer } from "../packages/graph-explorer/src/index";
import React, { useRef } from "react";
import { GraphAPI, useGraphAPI } from "../packages/graph-explorer/src/hooks/use-graph-api";

const meta = {
  title: "GraphExplorer",
  component: GraphExplorer,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    backgroundColor: {
      control: { type: "color" },
    },
  },
} satisfies Meta<typeof GraphExplorer>;

export default meta;
type Story = StoryObj<typeof GraphExplorer>;

export const Default: Story = {
  args: {
    backgroundColor: "orange",
    width: 600,
    height: 400,
    initialGraphData: {
      nodes: [
        // { id: "a", name: "A" },
        // { id: "b", name: "B" },
        // { id: "c", name: "C" },
      ],
      links: [
        // { id: "ab", name: "ab", source: "a", target: "b" },
        // { id: "bc", name: "bc", source: "b", target: "c" },
        // { id: "ca", name: "ca", source: "c", target: "a" },
      ],
    },
  },
  render: (args) => {
    const graphApi = useRef<GraphAPI | null>(null);

    return (
      <>
        <button
          onClick={() => {
            const gd = graphApi.current?.graphData;
            if (!gd) return;

            const numNodes = gd.nodes.length;

            graphApi.current?.addNode({ id: `${numNodes}`, name: `${numNodes}` });

            if (numNodes > 0) {
              const target: string = `${Math.floor(Math.random() * numNodes)}`;
              graphApi.current?.addLink({
                id: `${numNodes}->${target}`,
                name: `${numNodes}->${target}`,
                source: `${numNodes}`,
                target,
              });
            }

            graphApi.current?.update();
          }}
        >
          Test
        </button>
        <GraphExplorer ref={graphApi} {...args} />
      </>
    );
  },
};
