import { useEffect, useState } from "react";
import classes from "./node-search.module.css";

import { Box, CloseButton, Combobox, Loader, TextInput, Text, useCombobox } from "@mantine/core";
import type { MDBGraphNode } from "../../types/graph";
import { IconSearch } from "@tabler/icons-react";

export type FetchNodesItem = {
  category: string;
  node: MDBGraphNode;
  value: string;
};

export type NodeSearchProps = {
  fetchNodes?: ((query: string, properties: string[]) => Promise<FetchNodesItem[]>) | undefined;
  abortFetchNodes?: (() => Promise<void>) | undefined;
  onSearchSelection?: ((node: MDBGraphNode) => void) | undefined;
  searchProperties?: string[] | undefined;
};

const DEBOUNCE_QUERY_MS = 300;

export const NodeSearch = ({ fetchNodes, onSearchSelection, abortFetchNodes, searchProperties }: NodeSearchProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<FetchNodesItem[]>([]);
  const [value, setValue] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const handleOptionsSubmit = (nodeId: string) => {
    const selectedItem = data.find((item) => item.node.id === nodeId);
    if (selectedItem) {
      onSearchSelection?.(selectedItem.node);
      setValue("");
      setData([]);
    }
    combobox.closeDropdown();
  };

  const handleFetchNodes = async (query: string) => {
    await abortFetchNodes?.();

    if (!fetchNodes) return;
    if (query.length === 0) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchNodes(query, searchProperties ?? []);
      console.log(result);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.currentTarget.value;
    setValue(query);
    combobox.resetSelectedOption();
    combobox.openDropdown();
  };

  const handleTextInputClick = () => {
    combobox.openDropdown();
  };

  const handleTextInputFocus = () => {
    combobox.openDropdown();
    if (data === null) {
      handleFetchNodes(value);
    }
  };

  const handleTextInputBlur = () => {
    combobox.closeDropdown();
    handleClear();
  };

  const handleClear = () => {
    setValue("");
    setData([]);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(value);
    }, DEBOUNCE_QUERY_MS);

    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      setData([]);
    } else {
      handleFetchNodes(debouncedQuery);
    }
  }, [debouncedQuery]);

  const groupedData = data.reduce<Record<string, { node: MDBGraphNode; value: string }[]>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push({
      node: item.node,
      value: item.value,
    });
    return acc;
  }, {});

  const options = Object.entries(groupedData).map(([category, items], categoryIdx) => (
    <Combobox.Group key={categoryIdx} label={category}>
      {items.map(({ node, value }, nodeIdx) => (
        <Combobox.Option key={nodeIdx} value={node.id}>
          <Text size="sm" fw={500}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {node.id}
          </Text>
        </Combobox.Option>
      ))}
    </Combobox.Group>
  ));

  return (
    <Box className={classes.root}>
      <Combobox store={combobox} onOptionSubmit={handleOptionsSubmit} withinPortal={false}>
        <Combobox.Target>
          <TextInput
            placeholder="Search nodes"
            value={value}
            onChange={handleTextInputChange}
            onClick={handleTextInputClick}
            onFocus={handleTextInputFocus}
            onBlur={handleTextInputBlur}
            leftSection={<IconSearch size={18} />}
            rightSection={
              loading ? (
                <Loader size={18} />
              ) : value.length > 0 ? (
                <CloseButton
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClear}
                  aria-label="Clear search"
                />
              ) : null
            }
          />
        </Combobox.Target>

        <Combobox.Dropdown hidden={data === null} className={classes.dropdown}>
          <Combobox.Options>
            {options}
            {data.length === 0 && <Combobox.Empty>No results found</Combobox.Empty>}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  );
};
