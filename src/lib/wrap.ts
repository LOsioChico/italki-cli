// Word-wrap text to terminal width (fallback 76), preserving an indent prefix

export function wrapText(text: string, indent = "  ", width?: number): string[] {
  const cols = width ?? process.stdout.columns ?? 0;
  const max = (cols > 20 ? cols : 78) - indent.length;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (line.length + word.length + 1 > max && line) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(indent + line);
  return lines;
}
