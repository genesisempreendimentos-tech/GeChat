export type TextFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'codeBlock'
  | 'quote'
  | 'list';

type FormatResult = { text: string; selectionStart: number; selectionEnd: number };

function wrapInline(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  left: string,
  right: string,
): FormatResult {
  const hasSelection = selectionEnd > selectionStart;
  let start = selectionStart;
  let end = selectionEnd;

  if (!hasSelection && value.length > 0) {
    start = 0;
    end = value.length;
  }

  const selected = end > start ? value.slice(start, end) : '';

  if (!selected) {
    const insertion = `${left}${right}`;
    const text = value.slice(0, start) + insertion + value.slice(end);
    const cursor = start + left.length;
    return { text, selectionStart: cursor, selectionEnd: cursor };
  }

  const wrapped = `${left}${selected}${right}`;
  const text = value.slice(0, start) + wrapped + value.slice(end);
  return {
    text,
    selectionStart: start,
    selectionEnd: start + wrapped.length,
  };
}

export function applyTextFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: TextFormat,
): FormatResult {
  let start = selectionStart;
  let end = selectionEnd;

  if (end <= start && value.length > 0) {
    start = 0;
    end = value.length;
  }

  if (format === 'quote' || format === 'list') {
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    const blockEndRaw = value.indexOf('\n', end);
    const blockEnd = blockEndRaw === -1 ? value.length : blockEndRaw;

    const block = value.slice(blockStart, blockEnd);
    const prefix = format === 'quote' ? '> ' : '- ';
    const transformed = block
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
      .join('\n');
    const text = value.slice(0, blockStart) + transformed + value.slice(blockEnd);
    return {
      text,
      selectionStart: blockStart,
      selectionEnd: blockStart + transformed.length,
    };
  }

  switch (format) {
    case 'bold':
      return wrapInline(value, start, end, '**', '**');
    case 'italic':
      return wrapInline(value, start, end, '*', '*');
    case 'underline':
      return wrapInline(value, start, end, '__', '__');
    case 'strike':
      return wrapInline(value, start, end, '~~', '~~');
    case 'code':
      return wrapInline(value, start, end, '`', '`');
    case 'codeBlock':
      return wrapInline(value, start, end, '```\n', '\n```');
    default:
      return { text: value, selectionStart, selectionEnd };
  }
}

/** Envolve texto em bloco de código para envio (composer não mostra os marcadores). */
export function wrapCodeBlockForSend(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) return trimmed;
  return `\`\`\`\n${trimmed}\n\`\`\``;
}
