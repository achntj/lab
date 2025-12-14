export type HotkeyAction =
  | "commandPalette"
  | "search"
  | "quickSearch"
  | "newNote"
  | "newTask"
  | "toggleTheme";

export const defaultHotkeys: Record<HotkeyAction, string> = {
  commandPalette: "mod+k",
  search: "mod+shift+space",
  quickSearch: "/",
  newNote: "mod+shift+m",
  newTask: "mod+shift+b",
  toggleTheme: "mod+shift+l",
};
