import { constants as fsConstants, promises as fs } from "fs";
import os from "os";
import path from "path";

type BoardImageMeta = {
  fileName: string;
  updatedAt: string;
};

const LEGACY_BOARD_DIR = path.join(process.cwd(), "public", "board");
const LEGACY_META_PATH = path.join(process.cwd(), "data", "board-image.json");

const STATE_HOME = process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state");
const DEFAULT_BOARD_ROOT = path.join(STATE_HOME, "personal-lab", "board");
const ENV_BOARD_ROOT = process.env.PERSONAL_LAB_BOARD_ROOT;

const typeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const extensionToType: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

const sanitizeExtension = (ext: string) =>
  ext
    .toLowerCase()
    .replace(/^\./, "")
    .replace(/[^a-z0-9]/g, "");

type BoardStorage = {
  dir: string;
  metaPath: string;
};

const storageFromRoot = (root: string): BoardStorage => ({
  dir: root,
  metaPath: path.join(root, "board-image.json"),
});

const DEFAULT_STORAGE = storageFromRoot(DEFAULT_BOARD_ROOT);
const ENV_STORAGE = ENV_BOARD_ROOT ? storageFromRoot(ENV_BOARD_ROOT) : null;
const LEGACY_STORAGE: BoardStorage = {
  dir: LEGACY_BOARD_DIR,
  metaPath: LEGACY_META_PATH,
};

const READ_STORAGES = [ENV_STORAGE, DEFAULT_STORAGE, LEGACY_STORAGE].filter(
  Boolean,
) as BoardStorage[];

const WRITE_STORAGES =
  process.env.NODE_ENV === "production"
    ? [ENV_STORAGE, DEFAULT_STORAGE, LEGACY_STORAGE]
    : [ENV_STORAGE, LEGACY_STORAGE, DEFAULT_STORAGE];

let cachedWriteStorage: BoardStorage | null = null;

const ensureWritable = async (storage: BoardStorage): Promise<boolean> => {
  try {
    await fs.mkdir(storage.dir, { recursive: true });
    await fs.mkdir(path.dirname(storage.metaPath), { recursive: true });
    await fs.access(storage.dir, fsConstants.W_OK);
    await fs.access(path.dirname(storage.metaPath), fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const resolveWriteStorage = async (): Promise<BoardStorage> => {
  if (cachedWriteStorage) return cachedWriteStorage;

  for (const storage of WRITE_STORAGES) {
    if (!storage) continue;
    if (await ensureWritable(storage)) {
      cachedWriteStorage = storage;
      return storage;
    }
  }

  cachedWriteStorage = DEFAULT_STORAGE;
  return cachedWriteStorage;
};

const readBoardMeta = async (
  storage: BoardStorage,
): Promise<BoardImageMeta | null> => {
  try {
    const raw = await fs.readFile(storage.metaPath, "utf8");
    const parsed = JSON.parse(raw) as BoardImageMeta;
    if (!parsed?.fileName) return null;
    return parsed;
  } catch {
    return null;
  }
};

const resolveBoardImage = async (): Promise<
  { filePath: string; contentType: string; updatedAt: string } | null
> => {
  for (const storage of READ_STORAGES) {
    const meta = await readBoardMeta(storage);
    const metaCandidates = meta?.fileName
      ? [{ fileName: meta.fileName, updatedAt: meta.updatedAt }]
      : [];
    const fallbackCandidates = meta
      ? []
      : Object.keys(extensionToType).map((extension) => ({
          fileName: `board-image.${extension}`,
          updatedAt: "",
        }));
    const candidates = [...metaCandidates, ...fallbackCandidates];

    for (const candidate of candidates) {
      const filePath = path.join(storage.dir, candidate.fileName);
      try {
        const stats = await fs.stat(filePath);
        const extension = sanitizeExtension(path.extname(candidate.fileName));
        const contentType = extensionToType[extension] ?? "application/octet-stream";
        const updatedAt = candidate.updatedAt || stats.mtime.toISOString();
        return { filePath, contentType, updatedAt };
      } catch {
        continue;
      }
    }
  }

  return null;
};

export async function getBoardImage() {
  const resolved = await resolveBoardImage();
  if (!resolved) return null;
  return { src: "/api/board-image", updatedAt: resolved.updatedAt };
}

export async function getBoardImageFile() {
  const resolved = await resolveBoardImage();
  if (!resolved) return null;
  const buffer = await fs.readFile(resolved.filePath);
  return {
    buffer,
    contentType: resolved.contentType,
    updatedAt: resolved.updatedAt,
  };
}

export async function saveBoardImage(file: File) {
  if (!file.type.startsWith("image/")) return null;
  const extFromType = typeToExtension[file.type];
  const extFromName = sanitizeExtension(path.extname(file.name));
  const extension = sanitizeExtension(extFromType ?? extFromName);
  if (!extension) return null;

  const fileName = `board-image.${extension}`;
  const storage = await resolveWriteStorage();
  await fs.mkdir(storage.dir, { recursive: true });
  await fs.mkdir(path.dirname(storage.metaPath), { recursive: true });

  const previous = await resolveBoardImage();
  if (previous && path.basename(previous.filePath) !== fileName) {
    await fs.unlink(previous.filePath).catch(() => undefined);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(storage.dir, fileName), buffer);

  const updatedAt = new Date().toISOString();
  await fs.writeFile(storage.metaPath, JSON.stringify({ fileName, updatedAt }), "utf8");

  return { src: "/api/board-image", updatedAt };
}
