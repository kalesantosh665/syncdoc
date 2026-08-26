import type { Block } from "../../../types/document";

interface HeadingBlockProps {
  block: Block;
  onChange: (blockId: string, content: string) => void;
}

function HeadingBlock({
  block,
  onChange,
}: HeadingBlockProps) {
  return (
    <input
      type="text"
      value={block.content}
      onChange={(event) =>
        onChange(block._id, event.target.value)
      }
      placeholder="Enter heading..."
      style={{
        width: "100%",
        fontSize: "28px",
        fontWeight: "700",

        background: "transparent",

        // FIX
        color: "#111827",
        caretColor: "#2563eb",

        border: "1px solid transparent",
        outline: "none",
        padding: "8px",
        boxSizing: "border-box",
      }}
    />
  );
}

export default HeadingBlock;