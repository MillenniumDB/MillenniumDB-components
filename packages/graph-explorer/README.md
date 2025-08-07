# GraphExplorer Component

GraphExplorer is a React component for rendering and interacting with graphs using [react-force-graph-2d](https://github.com/vasturiano/react-force-graph).

It provides a programmatic API (via ref) to interact with the graph (add/remove nodes, links, etc.).

## Installation (pnpm)

```sh
pnpm add @mantine/core
pnpm add @millenniumdb/graph-explorer
```

## Usage

Ensure you have Mantine's core styles imported in your app root:

```tsx
// _app.tsx or equivalent
import '@mantine/core/styles.css';
```

Use component:

```typescript
import { GraphExplorer } from "@millenniumdb/components";
import type { MDBGraphData } from "@millenniumdb/components/types/graph";

const data: MDBGraphData = {
  nodes: [{ id: "1", label: "Node 1" }, { id: "2", label: "Node 2" }],
  links: [{ source: "1", target: "2" }],
};

export default function App() {
  return (
    <GraphExplorer
      width={800}
      height={600}
      initialGraphData={data}
      backgroundColor="#f0f0f0"
    />
  );
}
```

## Props

| Prop               | Type           | Description                                        |
| ------------------ | -------------- | -------------------------------------------------- |
| `width`            | `number`       | Width of the canvas in pixels                      |
| `height`           | `number`       | Height of the canvas in pixels                     |
| `initialGraphData` | `MDBGraphData` | Initial graph data (nodes and links)               |
| `backgroundColor`  | `string?`      | Canvas background color (defaults to white `#fff`) |

## Graph API

The component exposes a programmatic API via ref, using useGraphAPI, to interact with the graph. You can use this to add/remove nodes, update the graph, or reset the view.

```typescript
export default function App() {
  const graphAPI = useRef<GraphExplorerHandle>(null);

  useEffect(() => {
    const api = graphAPI.current;
    if (api) {
        // use graphAPI...
    }
  }, []);

  return (
    <GraphExplorer
      ref={graphAPI}
      width={800}
      height={600}
      initialGraphData={data}
      backgroundColor="#f0f0f0"
    />
  );
}
```
