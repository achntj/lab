import { getBoardImage } from "@/lib/board-image";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const boardImage = await getBoardImage();
  const src = boardImage
    ? `${boardImage.src}?v=${encodeURIComponent(boardImage.updatedAt)}`
    : null;

  return (
    <div className="relative -mx-4 -my-6 overflow-hidden md:-mx-8 md:-my-8">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-[calc(100vh-5rem)] w-full object-cover md:h-[calc(100vh-6rem)]"
        />
      ) : (
        <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]" />
      )}
    </div>
  );
}
