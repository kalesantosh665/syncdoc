export type BlockType =
  | "heading"
  | "paragraph"
  | "code"
  | "list";

export interface Block {
  _id: string;
  type: "heading" | "paragraph" | "code" | "list";
  content: string;
  language?: string;
  items?: string[];
}

export interface SyncDocument {
  _id: string;
  title: string;
  owner: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
}