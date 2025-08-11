import { useState } from "react";
import classes from "./node-search.module.css";

import { Box, CloseButton, Combobox, Input, InputBase, Loader, TextInput, useCombobox } from "@mantine/core";
import type { MDBGraphNode } from "../../types/graph";
import { IconSearch } from "@tabler/icons-react";

type NodeSearchProps = {
  fetchNodes?: ((query: string) => Promise<MDBGraphNode[]>) | undefined;
  onSearchSelection?: ((node: MDBGraphNode) => void) | undefined;
};

export const NodeSearch = ({ fetchNodes, onSearchSelection }: NodeSearchProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MDBGraphNode[]>([]);
  const [value, setValue] = useState<string>("");

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const handleOptionsSubmit = (nodeId: string) => {
    const selectedNode = data.find((node) => node.id === nodeId);
    if (selectedNode) {
      onSearchSelection?.(selectedNode);
      setValue("");
      setData([]);
    }
    combobox.closeDropdown();
  };

  const handleFetchNodes = async (query: string) => {
    if (query.length === 0) {
      setData([]);
      setValue("");
      return;
    }
    if (!fetchNodes) return;

    setLoading(true);
    try {
      const nodes = await fetchNodes(query);
      setData(nodes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.currentTarget.value;
    setValue(query);
    handleFetchNodes(query);
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

  const options = data.map((node: MDBGraphNode) => (
    <Combobox.Option key={node.id} value={node.id}>
      {node.name}
    </Combobox.Option>
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

        <Combobox.Dropdown hidden={data === null}>
          <Combobox.Options>
            {options}
            {data.length === 0 && <Combobox.Empty>No results found</Combobox.Empty>}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  );
};
