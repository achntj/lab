"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type NoteMarkdownTextareaProps = {
  noteTitles: string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
};

type MatchRange = {
  start: number;
  end: number;
};

export function NoteMarkdownTextarea({
  noteTitles,
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder,
  rows,
  className,
  required,
}: NoteMarkdownTextareaProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchRange, setMatchRange] = useState<MatchRange | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const availableTitles = useMemo(() => {
    const seen = new Set<string>();
    return noteTitles
      .map((title) => title.trim())
      .filter((title) => {
        if (!title) return false;
        const key = title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [noteTitles]);

  useEffect(() => {
    setIsOpen(false);
    setActiveIndex(0);
    setMatchRange(null);
  }, [value]);

  const updateValue = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const computeSuggestions = (nextValue: string, cursor: number | null) => {
    if (!availableTitles.length || cursor === null) {
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
      return;
    }

    const beforeCursor = nextValue.slice(0, cursor);
    const openIndex = beforeCursor.lastIndexOf("[[");
    const closeIndex = beforeCursor.lastIndexOf("]]");
    if (openIndex < 0 || closeIndex > openIndex) {
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
      return;
    }

    const query = beforeCursor.slice(openIndex + 2);
    if (query.includes("\n")) {
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const nextSuggestions = availableTitles
      .filter((title) => title.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);

    if (!nextSuggestions.length) {
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
      return;
    }

    setSuggestions(nextSuggestions);
    setIsOpen(true);
    setActiveIndex(0);
    setMatchRange({ start: openIndex, end: cursor });
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    updateValue(nextValue);
    computeSuggestions(nextValue, event.target.selectionStart);
  };

  const handleSelect = (title: string) => {
    if (!matchRange) return;
    const before = currentValue.slice(0, matchRange.start + 2);
    const after = currentValue.slice(matchRange.end);
    const rest = after.startsWith("]]") ? after.slice(2) : after;
    const nextValue = `${before}${title}]]${rest}`;
    const nextCursor = (before + title + "]]").length;

    updateValue(nextValue);
    setIsOpen(false);
    setSuggestions([]);
    setMatchRange(null);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
      event.currentTarget.form?.requestSubmit();
      return;
    }
    if (!isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const pick = suggestions[activeIndex];
      if (pick) handleSelect(pick);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setSuggestions([]);
      setMatchRange(null);
    }
  };

  const handleCursorChange = () => {
    const cursor = textareaRef.current?.selectionStart ?? null;
    computeSuggestions(currentValue, cursor);
  };

  const handleBlur = () => {
    setIsOpen(false);
    setSuggestions([]);
    setMatchRange(null);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        name={name}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleCursorChange}
        onClick={handleCursorChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        className={className}
        required={required}
      />
      {isOpen ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Link a note
          </div>
          <ul className="max-h-48 overflow-y-auto py-1 text-sm">
            {suggestions.map((title, index) => (
              <li key={`${title}-${index}`}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(title)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left transition",
                    index === activeIndex ? "bg-muted/60 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{title}</span>
                  <span className="text-[10px] uppercase">[[</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
