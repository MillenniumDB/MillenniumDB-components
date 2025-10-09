import { Badge, Box, Code, Flex, Loader, Text, Title } from "@mantine/core";
import type { LinkId, NodeId } from "../../types/graph";
import type { GraphAPI } from "../../hooks/use-graph-api";
import type { Driver } from "@millenniumdb/driver";
import type { GraphSettings } from "../settings/settings";
import { useEffect, useState } from "react";
import { getIriDescription, type IriDescription } from "../../utils/sparql-graph-utils";

type SPARQLSideBarContentProps = {
  selectedNodeIds: Set<NodeId>;
  selectedLinkIds: Set<LinkId>;
  getColorForLabel: (label: string) => string;
  settings: GraphSettings;
  graphAPI: React.RefObject<GraphAPI | null>;
  driver: Driver;
};

export const SPARQLSideBarContent = ({
  selectedNodeIds,
  selectedLinkIds,
  getColorForLabel,
  settings,
  graphAPI,
  driver,
}: SPARQLSideBarContentProps) => {
  const [description, setDescription] = useState<IriDescription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const describeNode = async (nodeId: NodeId): Promise<void> => {
      setLoading(true);
      setError(null);
      setDescription(null);

      try {
        const session = driver.session();
        const labelsProperty = settings.labelsKey ?? "";
        const iriDescription = await getIriDescription(session, nodeId, settings.nameKeys, labelsProperty, settings.prefixes);
        setDescription(iriDescription);
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
  }, [selectedNodeIds, settings, driver]);

  if (selectedNodeIds.size === 0 && selectedLinkIds.size === 0) {
    return <Text p="sm">{"No selection"}</Text>;
  }

  if (selectedNodeIds.size === 1 && selectedLinkIds.size === 0 && graphAPI.current) {
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
      console.error(error);
      return <Text p="sm">{"Error"}</Text>;
    }

    if (!description) {
      return <Text p="sm">{"No statements found"}</Text>;
    }

    return (
      <Box p="md">
        <Box mb="md">
          <Title order={2} style={{ wordBreak: "break-word" }}>
            {description.name}
          </Title>
          {description.name !== description.iri && (
            <Text c="dimmed" size="sm">
              {description.iri}
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
            Literals
          </Title>
          {Object.keys(description.literals ?? {}).length === 0 && (
            <Text c="dimmed" size="sm">
              No literals found
            </Text>
          )}
          {Object.entries(description.literals ?? {}).map(([property, value], idx) => (
            <Box key={idx} mb="xs">
              <Title order={6} mb="xs">
                {property}
              </Title>
              <Code block mb="md">
                {String(value)}
              </Code>
            </Box>
          ))}
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
