const WIKI_LINK_REGEX = /\[\[([^[\]]+)\]\]/g;

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttribute = (value: string) => value.replace(/"/g, "&quot;");

const sanitizeHref = (href: string) => {
  if (/^javascript:/i.test(href)) return "#";
  return href;
};

function renderInline(text: string) {
  return text
    .replace(/\[([^[\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safeHref = escapeAttribute(sanitizeHref(href.trim()));
      const safeLabel = label.trim();
      return `<a href="${safeHref}" class="underline decoration-muted-foreground underline-offset-4 hover:text-primary" target="_blank" rel="noreferrer">${safeLabel}</a>`;
    })
    .replace(WIKI_LINK_REGEX, (_, title) => {
      const trimmed = title.trim();
      return `<button type="button" data-wikilink="${escapeAttribute(
        trimmed,
      )}" class="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground break-all whitespace-normal">${trimmed}</button>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>');
}

export function renderMarkdown(markdown: string) {
  const safe = escapeHtml(markdown);
  const lines = safe.split("\n");
  const html: string[] = [];
  let inList = false;

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html.push('<ul class="list-disc space-y-1 pl-5">');
        inList = true;
      }
      const content = line.replace(/^\s*-\s+/, "");
      html.push(`<li>${renderInline(content)}</li>`);
      return;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (!line.trim()) {
      html.push("<br />");
      return;
    }

    if (/^###\s+/.test(line)) {
      html.push(`<h3 class="text-base font-semibold">${renderInline(line.replace(/^###\s+/, ""))}</h3>`);
      return;
    }
    if (/^##\s+/.test(line)) {
      html.push(`<h2 class="text-lg font-semibold">${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
      return;
    }
    if (/^#\s+/.test(line)) {
      html.push(`<h1 class="text-xl font-semibold">${renderInline(line.replace(/^#\s+/, ""))}</h1>`);
      return;
    }

    html.push(`<p>${renderInline(line)}</p>`);
  });

  if (inList) {
    html.push("</ul>");
  }

  return html.join("");
}
