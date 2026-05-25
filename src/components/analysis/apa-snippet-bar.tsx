"use client";

interface Props {
  text: string;
}

export function APASnippetBar({ text }: Props) {
  if (!text) return null;

  return (
    <p className="text-[11px] text-muted-foreground italic leading-relaxed px-1 border-l-2 border-muted-foreground/15 pl-2.5">
      {text}
    </p>
  );
}
