import type { Driver } from "@millenniumdb/driver";
import type { GraphAPI } from "../../hooks/use-graph-api";
import type { NodeId } from "../../types/graph";
import { Box, Loader, Text } from "@mantine/core";
import { getDescribeQuery } from "../../utils/queries";
import { useEffect, useState } from "react";

type MDBSideBarContentProps = {
  selectedNodeIds: Set<NodeId>;
  graphAPI: React.RefObject<GraphAPI | null>;
  driver: Driver;
};

export const MDBSideBarContent = ({ selectedNodeIds, graphAPI, driver }: MDBSideBarContentProps) => {
  const [description, setDescription] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const describeNode = async (nodeId: NodeId): Promise<void> => {
      setLoading(true);
      setError(null);
      setDescription(null);

      try {
        const query = getDescribeQuery(nodeId);
        const session = driver.session();

        const result = session.run(query);
        const records = await result.records();

        setDescription(records.length > 0 ? records[0] : null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    if (selectedNodeIds.size !== 1) {
      setDescription(null);
      setError(null);
      setLoading(false);
      return;
    }

    const [nodeId] = [...selectedNodeIds];
    describeNode(nodeId);
  }, [selectedNodeIds]);

  if (selectedNodeIds.size === 0) {
    return <Text p="sm">{"No selection"}</Text>;
  }

  if (selectedNodeIds.size === 1 && graphAPI.current) {
    if (loading) {
      return (
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Loader type="dots" />
        </Box>
      );
    }

    if (error) {
      // TODO: More descriptive error?
      return <Text p="sm">{"Error"}</Text>;
    }

    if (!description) {
      return <Text p="sm">{"Node not found"}</Text>;
    }

    // TODO: Render correctly
    return <Text p="sm">{JSON.stringify(description)}</Text>;
  }

  if (selectedNodeIds.size > 1) {
    return <Text p="sm">{`Selected nodes: ${selectedNodeIds.size}`}</Text>;
  }

  return null; // fallback
};
