import { Box, Code, Loader, Text, Title } from "@mantine/core";
import type { NodeId } from "../../types/graph";
import type { GraphAPI } from "../../hooks/use-graph-api";
import type { Driver } from "@millenniumdb/driver";
import type { GraphSettings } from "../settings/settings";
import { useEffect, useState } from "react";
import { getIriDescription, type IRIDescription } from "../../utils/node-utils";

type SPARQLSideBarContentProps = {
  selectedNodeIds: Set<NodeId>;
  getColorForLabel: (label: string) => string;
  settings: GraphSettings;
  graphAPI: React.RefObject<GraphAPI | null>;
  driver: Driver;
};

export const SPARQLSideBarContent = ({
  selectedNodeIds,
  getColorForLabel,
  settings,
  graphAPI,
  driver,
}: SPARQLSideBarContentProps) => {
  const [description, setDescription] = useState<IRIDescription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const describeNode = async (nodeId: NodeId): Promise<void> => {
      setLoading(true);
      setError(null);
      setDescription(null);

      try {
        const session = driver.session();
        const iriDescription = await getIriDescription(nodeId, settings.searchProperties, session);
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
  }, [selectedNodeIds, settings.searchProperties, driver]);

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
        <Box>
          <Title order={4} mb="xs">
            Literals
          </Title>
          {(description.literals ?? []).map((record, idx) => {
            return (
              <Box key={idx} mb="xs">
                <Title order={6} mb="xs">
                  {String(record.get("p"))}
                </Title>
                <Code block mb="md">
                  {String(record.get("o"))}
                </Code>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (selectedNodeIds.size > 1) {
    return <Text p="sm">{`Selected nodes: ${selectedNodeIds.size}`}</Text>;
  }

  return null; // fallback
};
