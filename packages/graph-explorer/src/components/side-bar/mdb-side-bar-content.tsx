import type { Driver } from "@millenniumdb/driver";
import type { GraphAPI } from "../../hooks/use-graph-api";
import type { NodeId } from "../../types/graph";
import {
  Badge,
  Box,
  Code,
  Flex,
  Loader,
  Text,
  Title
} from "@mantine/core";
import { getDescribeQuery } from "../../utils/queries";
import { useEffect, useState } from "react";
import type { GraphSettings } from "../settings/settings";
import { getNodeName } from "../../utils/data-format";

type MDBSideBarContentProps = {
  selectedNodeIds: Set<NodeId>;
  getColorForLabel: (label: string) => string;
  settings: GraphSettings;
  graphAPI: React.RefObject<GraphAPI | null>;
  driver: Driver;
};

type NodeDescription = {
  id: NodeId;
  name: string;
  type: string;
  labels: string[];
  properties: Record<string, any>;
};

export const MDBSideBarContent = ({
  selectedNodeIds,
  getColorForLabel,
  settings,
  graphAPI,
  driver
}: MDBSideBarContentProps) => {
  const [description, setDescription] = useState<NodeDescription | null>(null);
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

        if (records.length === 0) {
          setDescription(null);
          return;
        }

        const record = records[0];
        const nodeDescription = {
          id: record.get("object").id,
          name: getNodeName(
            record.get("object").id,
            record.get("properties"),
            settings.searchProperties
          ),
          type: "Named Node",
          labels: record.get("labels"),
          properties: record.get("properties"),
        };
        
        setDescription(nodeDescription);
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
            height: "100%",
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

    return (
      <Box p="md">
        <Box mb="md">
          <Title order={2}>{description.name}</Title>
          { description.name !== description.id && (
            <Text c="dimmed" size="sm">
              {description.id}
            </Text>
          )}
        </Box>
        <Code display="inline-block">{description.type}</Code>
        <Flex gap="xs" wrap="wrap" mb="md">
          {(description.labels ?? []).map((label) => (
            <Badge key={label} color={getColorForLabel(label)}>
              {label}
            </Badge>
          ))}
        </Flex>
        <Box>
          <Title order={4} mb="xs">
            Properties
          </Title>
          {Object.keys(description.properties ?? {}).length === 0 ? (
            <Text>No properties available</Text>
          ) : (
            Object.entries(description.properties!).map(([key, value]) => (
              <Box key={key} mb="xs">
                <Title order={6} mb="xs">
                  {key}
                </Title>
                <Code block mb="md">{String(value)}</Code>
              </Box>
            ))
          )}
        </Box>
      </Box>
    )
  }

  if (selectedNodeIds.size > 1) {
    return <Text p="sm">{`Selected nodes: ${selectedNodeIds.size}`}</Text>;
  }

  return null; // fallback
};
