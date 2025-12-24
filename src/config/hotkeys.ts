export type HotkeyAction =
  | "commandPalette"
  | "quickSearch"
  | "newNote"
  | "newTask"
  | "toggleTheme"
  | "lockApp";

export const defaultHotkeys: Record<HotkeyAction, string> = {
  commandPalette: "mod+k",
  quickSearch: "/",
  newNote: "mod+shift+m",
  newTask: "mod+shift+b",
  toggleTheme: "mod+shift+t",
  lockApp: "mod+shift+l",
};
