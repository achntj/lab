"use client";

import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
  onLinkClick?: (info: { href?: string; title?: string }) => boolean | void;
};

export function MarkdownPreview({ content, className, onLinkClick }: MarkdownPreviewProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onLinkClick) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const wiki = target.closest("[data-wikilink]") as HTMLElement | null;
    if (wiki) {
      const title = wiki.getAttribute("data-wikilink") ?? undefined;
      const handled = onLinkClick({ title });
      if (handled !== false) event.preventDefault();
      return;
    }

    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (anchor) {
      const href = anchor.getAttribute("href") ?? undefined;
      const handled = onLinkClick({ href, title: anchor.textContent ?? undefined });
      if (handled !== false) {
        event.preventDefault();
      }
    }
  };

  return (
    <div
      className={cn(
        "space-y-2 break-words break-all text-sm leading-7 text-foreground [&_a]:break-all [&_a]:text-foreground [&_a:hover]:text-primary [&_code]:break-all [&_code]:text-foreground [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_li]:marker:text-muted-foreground [&_p]:leading-7",
        className,
      )}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
