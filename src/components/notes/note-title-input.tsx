"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type NoteTitleInputProps = React.ComponentPropsWithoutRef<typeof Input>;

export function NoteTitleInput({ onKeyDown, ...props }: NoteTitleInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return <Input {...props} onKeyDown={handleKeyDown} />;
}
