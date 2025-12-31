// Standardized board_items schema

export type StyleRulesItemJson = {
  title: string;
  one_liner: string;
  rules: string[]; // exactly 3
  color_story: string[]; // exactly 3
  avoid: string[]; // exactly 2
  occasion?: string | null;
  day_key?: string;
};

export type OutfitItemJson = {
  title: string;
  why: string;
  items: string[];
  occasion?: string | null;
  confidence?: number;
  created_from: "ask";
};

export type NoteItemJson = {
  title: string;
  body: string;
};

export type BoardItemJson = StyleRulesItemJson | OutfitItemJson | NoteItemJson;

export type BoardItemType = "style_rules" | "outfit" | "note";

// Type guards
export function isStyleRulesItem(
  itemType: string | null | undefined,
  itemJson: any
): itemJson is StyleRulesItemJson {
  return itemType === "style_rules";
}

export function isOutfitItem(
  itemType: string | null | undefined,
  itemJson: any
): itemJson is OutfitItemJson {
  return itemType === "outfit";
}

export function isNoteItem(
  itemType: string | null | undefined,
  itemJson: any
): itemJson is NoteItemJson {
  return itemType === "note";
}

