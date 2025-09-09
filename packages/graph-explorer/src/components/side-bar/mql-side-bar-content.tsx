import type { Driver } from "@millenniumdb/driver";
import type { GraphAPI } from "../../hooks/use-graph-api";
import type { LinkId, NodeId } from "../../types/graph";
import { Badge, Box, Code, Flex, Loader, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import type { GraphSettings } from "../settings/settings";
import { getNodeDescription } from "../../utils/node-utils";

type MQLSideBarContentProps = {
  selectedNodeIds: Set<NodeId>;
  selectedLinkIds: Set<LinkId>;
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

export const MQLSideBarContent = ({
  selectedNodeIds,
  selectedLinkIds,
  getColorForLabel,
  settings,
  graphAPI,
  driver,
}: MQLSideBarContentProps) => {
  const [description, setDescription] = useState<NodeDescription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const describeNode = async (nodeId: NodeId): Promise<void> => {
      setLoading(true);
      setError(null);
      setDescription(null);

      try {
        const session = driver.session();
        const nodeDescription = await getNodeDescription(nodeId, settings.searchProperties, session);
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
  }, [selectedNodeIds, settings.searchProperties, driver]);

  if (selectedNodeIds.size === 0 && selectedLinkIds.size === 0) {
    return <Text p="sm">{"No selection"}</Text>;
  }

  if (selectedNodeIds.size === 1 && selectedLinkIds.size === 0 && graphAPI.current) {
    // single node selected
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
          <Title order={2} style={{ wordBreak: "break-word" }}>
            {description.name}
          </Title>
          {description.name !== description.id && (
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
                <Code block mb="md">
                  {String(value)}
                </Code>
              </Box>
            ))
          )}
        </Box>
      </Box>
    );
  }

  if (selectedLinkIds.size === 1 && selectedNodeIds.size === 0 && graphAPI.current) {
    // single link selected
    return <Box>{'TODO: handle single link selection'}</Box>
  }

  // multi selection
  return <Text p="sm">{`Selected ${selectedNodeIds.size} nodes and ${selectedLinkIds.size} links`}</Text>;
};
