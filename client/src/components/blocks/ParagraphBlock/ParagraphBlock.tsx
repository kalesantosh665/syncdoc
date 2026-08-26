import type { Block } from "../../../types/document";

interface ParagraphBlockProps {
  block: Block;
  onChange: (blockId: string, content: string) => void;
}

function ParagraphBlock({
  block,
  onChange,
}: ParagraphBlockProps) {
  return (
    <textarea
      value={block.content}
      onChange={(event) =>
        onChange(block._id, event.target.value)
      }
      placeholder="Start writing..."
      rows={4}
      style={{
        width: "100%",

        background: "transparent",

        // FIX
        color: "#111827",
        caretColor: "#2563eb",

        border: "1px solid transparent",
        outline: "none",

        resize: "vertical",
        padding: "8px",
        fontSize: "16px",
        lineHeight: "1.6",

        boxSizing: "border-box",
      }}
    />
  );
}

export default ParagraphBlock;