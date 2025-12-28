import { promises as fs } from "fs";
import path from "path";

type BoardImageMeta = {
  fileName: string;
  updatedAt: string;
};

const BOARD_DIR = path.join(process.cwd(), "public", "board");
const BOARD_META_PATH = path.join(process.cwd(), "data", "board-image.json");

const typeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const sanitizeExtension = (ext: string) =>
  ext
    .toLowerCase()
    .replace(/^\./, "")
    .replace(/[^a-z0-9]/g, "");

const readBoardMeta = async (): Promise<BoardImageMeta | null> => {
  try {
    const raw = await fs.readFile(BOARD_META_PATH, "utf8");
    const parsed = JSON.parse(raw) as BoardImageMeta;
    if (!parsed?.fileName) return null;
    return parsed;
  } catch {
    return null;
  }
};

export async function getBoardImage() {
  const meta = await readBoardMeta();
  if (!meta) return null;
  const filePath = path.join(BOARD_DIR, meta.fileName);
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }
  return { src: `/board/${meta.fileName}`, updatedAt: meta.updatedAt };
}

export async function saveBoardImage(file: File) {
  if (!file.type.startsWith("image/")) return null;
  const extFromType = typeToExtension[file.type];
  const extFromName = sanitizeExtension(path.extname(file.name));
  const extension = sanitizeExtension(extFromType ?? extFromName);
  if (!extension) return null;

  const fileName = `board-image.${extension}`;
  await fs.mkdir(BOARD_DIR, { recursive: true });
  await fs.mkdir(path.dirname(BOARD_META_PATH), { recursive: true });

  const previous = await readBoardMeta();
  if (previous?.fileName && previous.fileName !== fileName) {
    await fs.unlink(path.join(BOARD_DIR, previous.fileName)).catch(() => undefined);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(BOARD_DIR, fileName), buffer);

  const updatedAt = new Date().toISOString();
  await fs.writeFile(BOARD_META_PATH, JSON.stringify({ fileName, updatedAt }), "utf8");

  return { src: `/board/${fileName}`, updatedAt };
}
