import {
  lineIndent,
  maxIndent,
  parseInline,
  type MarkRange,
} from "./rich-text";

// One replacement in the editor text, plus what to select afterwards.
export type TextEdit = {
  from: number;
  to: number;
  text: string;
  selectFrom: number;
  selectTo: number;
};

// Wraps the selection in marks, or removes them when it already has them.
export function toggleWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): TextEdit {
  const outside =
    value.slice(start - before.length, start) === before &&
    value.slice(end, end + after.length) === after &&
    // "*" next to "**" is bold, not italics.
    !(
      before === "*" &&
      value[start - 2] === "*" &&
      value[end + 1] === "*" &&
      value[start - 3] !== "*"
    );
  if (outside && end > start)
    return {
      from: start - before.length,
      to: end + after.length,
      text: value.slice(start, end),
      selectFrom: start - before.length,
      selectTo: end - before.length,
    };
  const selected = value.slice(start, end);
  if (
    selected.length > before.length + after.length &&
    selected.startsWith(before) &&
    selected.endsWith(after) &&
    !(
      before === "*" &&
      selected.startsWith("**") &&
      !selected.startsWith("***")
    )
  ) {
    const inner = selected.slice(before.length, selected.length - after.length);
    return {
      from: start,
      to: end,
      text: inner,
      selectFrom: start,
      selectTo: start + inner.length,
    };
  }
  // Double-clicking a word often selects the space after it; keep spaces
  // outside the marks so they still render.
  const from = start + (selected.length - selected.trimStart().length);
  const to = end - (selected.length - selected.trimEnd().length);
  const inner = to > from ? value.slice(from, to) : placeholder;
  return {
    from: to > from ? from : start,
    to: to > from ? to : end,
    text: `${before}${inner}${after}`,
    selectFrom: (to > from ? from : start) + before.length,
    selectTo: (to > from ? from : start) + before.length + inner.length,
  };
}

// Applies a change to every whole line the selection touches. Headings and
// lists only work as their own paragraph, so `separate` adds blank lines
// around the lines when they would otherwise join their neighbours.
export function editLines(
  value: string,
  start: number,
  end: number,
  change: (lines: string[]) => string[],
  separate = false,
): TextEdit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const found = value.indexOf("\n", last);
  const lineEnd = found < 0 ? value.length : found;
  let text = change(value.slice(lineStart, lineEnd).split("\n")).join("\n");
  let offset = 0;
  if (separate) {
    if (lineStart > 0 && value.slice(lineStart - 2, lineStart) !== "\n\n") {
      text = `\n${text}`;
      offset = 1;
    }
    if (lineEnd < value.length && value.slice(lineEnd, lineEnd + 2) !== "\n\n")
      text = `${text}\n`;
  }
  return {
    from: lineStart,
    to: lineEnd,
    text,
    selectFrom: lineStart + offset,
    selectTo: lineStart + text.trimEnd().length,
  };
}

export const indentLines = (lines: string[]) =>
  lines.map((line) =>
    line.trim() && lineIndent(line).level < maxIndent ? `> ${line}` : line,
  );

export const outdentLines = (lines: string[]) =>
  lines.map((line) => line.replace(/^>[ \t]?/, ""));

// Toggles a prefix such as "## " or "- " after any indent marks.
export function togglePrefix(
  lines: string[],
  pattern: RegExp,
  prefix: (index: number) => string,
) {
  const parts = lines.map((line) => {
    const { text } = lineIndent(line);
    return { indent: line.slice(0, line.length - text.length), text };
  });
  const filled = parts.filter((part) => part.text.trim());
  const remove =
    filled.length > 0 && filled.every((part) => pattern.test(part.text));
  let count = 0;
  return parts.map(({ indent, text }) => {
    if (!text.trim()) return indent + text;
    const bare = text.replace(/^(#{1,3}|-|\d+\.)\s+/, "");
    return remove ? indent + bare : indent + prefix(count++) + bare;
  });
}

export type LineFormat = "heading" | "bullets" | "numbers";
export type Formatting = {
  marks: MarkRange[];
  line: LineFormat | null;
  indent: number;
};

// The formatting around the cursor or selection, for the toolbar's pressed
// buttons. Marks are looked up within the cursor's line.
export function formattingAt(
  value: string,
  start: number,
  end: number,
): Formatting {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const found = value.indexOf("\n", start);
  const line = value.slice(lineStart, found < 0 ? value.length : found);
  const { level, text } = lineIndent(line);
  const ranges: MarkRange[] = [];
  parseInline(text, ranges, lineStart + line.length - text.length);
  return {
    marks: ranges.filter(
      (range) => range.contentStart <= start && end <= range.contentEnd,
    ),
    line: /^#{1,3}\s/.test(text)
      ? "heading"
      : /^-\s/.test(text)
        ? "bullets"
        : /^\d+\.\s/.test(text)
          ? "numbers"
          : null,
    indent: level,
  };
}

// Word-style toggle. Inside formatted text it switches the formatting off for
// the selection (or at the cursor, so what is typed next is plain), keeping
// the rest formatted. Elsewhere it formats the selection, or opens an empty
// pair at the cursor so what is typed next is formatted.
export function toggleMark(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  active: MarkRange | undefined,
): TextEdit {
  if (active) {
    const left = value.slice(active.contentStart, start);
    const middle = value.slice(start, end);
    const right = value.slice(end, active.contentEnd);
    const head = left ? `${before}${left}${after}` : "";
    const text = head + middle + (right ? `${before}${right}${after}` : "");
    return {
      from: active.start,
      to: active.end,
      text,
      selectFrom: active.start + head.length,
      selectTo: active.start + head.length + middle.length,
    };
  }
  if (start === end)
    return {
      from: start,
      to: end,
      text: before + after,
      selectFrom: start + before.length,
      selectTo: start + before.length,
    };
  return toggleWrap(value, start, end, before, after, "");
}
