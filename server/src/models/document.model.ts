import { Schema, model, type Document } from "mongoose";

export type BlockType =
  | "heading"
  | "paragraph"
  | "code"
  | "list";

export interface IBlock {
  type: BlockType;
  content: string;
  language?: string;
  items?: string[];
}

export interface ISharedUser {
  user: string;
  permission: "view" | "edit";
}

export interface IDocument extends Document {
  title: string;
  owner: string;
  blocks: IBlock[];
  sharedWith: ISharedUser[];
  isStarred: boolean;
   isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --------------------------------
// Block Schema
// --------------------------------

const blockSchema = new Schema<IBlock>(
  {
    type: {
      type: String,
      enum: [
        "heading",
        "paragraph",
        "code",
        "list",
      ],
      required: true,
    },

    content: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: undefined,
    },

    items: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: true,
  }
);

// --------------------------------
// Shared User Schema
// --------------------------------

const sharedUserSchema =
  new Schema<ISharedUser>(
    {
      user: {
        type: String,
        required: true,
        trim: true,
      },

      permission: {
        type: String,
        enum: ["view", "edit"],
        default: "view",
      },
    },
    {
      _id: false,
    }
  );

// --------------------------------
// Document Schema
// --------------------------------

const documentSchema =
  new Schema<IDocument>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 200,
      },

      owner: {
        type: String,
        required: true,
        trim: true,
      },

      isStarred: {
        type: Boolean,
        default: false,
      },
isDeleted: {
  type: Boolean,
  default: false,
},
      sharedWith: {
        type: [sharedUserSchema],
        default: [],
      },

      blocks: {
        type: [blockSchema],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

// --------------------------------
// AST Validation
// --------------------------------

documentSchema.pre(
  "validate",
  function () {
    for (const block of this.blocks) {
      // Heading / Paragraph
      if (
        (
          block.type === "heading" ||
          block.type === "paragraph"
        ) &&
        !block.content.trim()
      ) {
        throw new Error(
          `${block.type} block requires content`
        );
      }

      // Code
      if (block.type === "code") {
        if (!block.content.trim()) {
          throw new Error(
            "Code block requires content"
          );
        }

        if (!block.language?.trim()) {
          throw new Error(
            "Code block requires a language"
          );
        }
      }

      // List
      if (block.type === "list") {
        if (
          !block.items ||
          block.items.length === 0
        ) {
          throw new Error(
            "List block requires at least one item"
          );
        }
      }
    }
  }
);

// --------------------------------
// Model
// --------------------------------

export const DocumentModel =
  model<IDocument>(
    "Document",
    documentSchema
  );