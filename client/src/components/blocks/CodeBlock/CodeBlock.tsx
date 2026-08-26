import type { Block } from "../../../types/document";

interface CodeBlockProps {
  block: Block;
  onChange: (blockId: string, content: string) => void;
}

function CodeBlock({
  block,
  onChange,
}: CodeBlockProps) {
  return (
    <textarea
      value={block.content}
      onChange={(event) =>
        onChange(block._id, event.target.value)
      }
      rows={5}
      spellCheck={false}
      style={{
        width: "100%",
        background: "#1e1e24",
        color: "white",
        border: "1px solid #333",
        borderRadius: "6px",
        outline: "none",
        padding: "12px",
        fontFamily: "monospace",
        resize: "vertical",
      }}
    />
  );
}

export default CodeBlock;