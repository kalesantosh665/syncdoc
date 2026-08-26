import type { Block } from "../../../types/document";

interface ListBlockProps {
  block: Block;
  onChange: (blockId: string, items: string[]) => void;
}

function ListBlock({
  block,
  onChange,
}: ListBlockProps) {
  const items = block.items ?? [];

  // Edit item
  const updateItem = (
    index: number,
    value: string
  ) => {
    const updatedItems = [...items];

    updatedItems[index] = value;

    onChange(block._id, updatedItems);
  };

  // Add item
  const addItem = () => {
    onChange(block._id, [
      ...items,
      "New item",
    ]);
  };

  // Delete item
  const deleteItem = (index: number) => {
    const updatedItems = items.filter(
      (_, itemIndex) => itemIndex !== index
    );

    onChange(block._id, updatedItems);
  };

  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index}
          style={{
            marginBottom: "10px",
          }}
        >
          <input
            type="text"
            value={item}
            onChange={(event) =>
              updateItem(
                index,
                event.target.value
              )
            }
          />

          <button
            onClick={() => deleteItem(index)}
            style={{
              marginLeft: "10px",
              color: "red",
            }}
          >
            Delete
          </button>
        </li>
      ))}

      <button
        onClick={addItem}
        style={{
          marginTop: "10px",
        }}
      >
        + Add Item
      </button>
    </ul>
  );
}

export default ListBlock;