import type { ReactNode } from "react";

function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`)/g).map((part, index) => {
    if (/^(?:\*\*[^*\n]+\*\*|__[^_\n]+__)$/.test(part))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^`[^`\n]+`$/.test(part))
      return (
        <code key={index} className="rounded bg-black/20 px-1">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

/** Deliberately small Markdown subset: React escapes all text; no raw HTML or links. */
export function JarvisReplyContent({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }
    const list = /^(?:[-*+]\s+|\d+[.)]\s+)\S/.exec(line);
    if (list) {
      const ordered = /^\d/.test(list[0]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const match = (ordered ? /^\d+[.)]\s+(.+)$/ : /^[-*+]\s+(.+)$/).exec(lines[index]);
        if (!match) break;
        items.push(<li key={index}>{inline(match[1])}</li>);
        index++;
      }
      blocks.push(
        ordered ? (
          <ol key={index} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={index} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      );
    } else {
      const paragraph: string[] = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        !/^(?:[-*+]\s+|\d+[.)]\s+)\S/.test(lines[index])
      )
        paragraph.push(lines[index++].replace(/^#{1,4}\s+/, ""));
      blocks.push(
        <p key={index}>
          {paragraph.map((part, position) => (
            <span key={position}>
              {position > 0 && <br />}
              {inline(part)}
            </span>
          ))}
        </p>,
      );
    }
  }
  return <div className="space-y-2 break-words">{blocks}</div>;
}
