# GraphExplorer Component

GraphExplorer is a React component for rendering and interacting with graphs using [react-force-graph-2d](https://github.com/vasturiano/react-force-graph).

It provides a programmatic API (via ref) to interact with the graph (add/remove nodes, links, etc.).

## Installation (pnpm)

```sh
# peer dependencies
pnpm add @mantine/core
pnpm add @tabler/icons-react
pnpm add millenniumdb-driver
```

```sh
# component
pnpm add @millenniumdb/graph-explorer
```

## Usage

Ensure you have Mantine's core and graph explorer styles imported in your app root:

```tsx
// in your app entry point
import '@mantine/core/styles.css';

import '@millenniumdb/graph-explorer/styles.css'
```

Use the component with MillenniumDB:

```typescript
import { MDBGraphExplorer, type MDBGraphData } from "@millenniumdb/graph-explorer";
import { driver } from "millenniumdb-driver";


const data: MDBGraphData = {
  nodes: [{ id: "1", label: "Node 1" }, { id: "2", label: "Node 2" }],
  links: [{ source: "1", target: "2" }],
};

const driverInstance = driver("http://localhost:1234");

export default function App() {
  return (
    <GraphExplorer
      initialGraphData={data}
      driver={driverInstance}
      style={{ width: 500, height: 500 }}
      // other props...
    />
  );
}
```

## Props

| Prop               | Type            | Description                                      |
| ------------------ | --------------- | ------------------------------------------------ |
| `ref`              | `GraphAPI`      | GraphAPI instance. Receives the initialGraphData |
| `driver`           | `Driver`        | MillenniumDB driver instance                     |
| `initialGraphData` | `MDBGraphData`  | Initial nodes and links                          |
| `style`            | `CSSProperties` | Graph container style                            |
| `className`        | `string`        | Graph container classes                          |
| `searchProperties` | `string[]`      | Array of properties to look for while searching  |

## Graph API

The component exposes a referemce tp a GraphAPI instance, which let you can interact with it programatically. For example, you can use this to add/remove nodes/links, update the graph, or reset the view.

```typescript
import { MDBGraphExplorer, useGraphAPI, type GraphAPI } from "@millenniumdb/graph-explorer";

export default function App() {
  const graphAPI = useRef<GraphAPI | null>(null);

  useEffect(() => {
    const api = graphAPI.current;
    if (api) {
        // use graphAPI...
    }
  }, []);

  return (
    <MDBGraphExplorer
      ref={graphAPI}
      // other props...
    />
  );
}
```

## The base GraphExplorer component

We also expose the base graph explorer (which is not connected to a MillenniumDB driver) for debugging purposes. If a MDBGraphExplorer-like interface is provided, it will work as intended.
