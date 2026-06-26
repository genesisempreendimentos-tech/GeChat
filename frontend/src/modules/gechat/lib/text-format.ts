export type TextFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'codeBlock'
  | 'quote'
  | 'list';

export function applyTextFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: TextFormat,
): { text: string; selectionStart: number; selectionEnd: number } {
  const hasSelection = selectionEnd > selectionStart;
  const selected = hasSelection ? value.slice(selectionStart, selectionEnd) : '';

  if (format === 'quote' || format === 'list') {
    const blockStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const blockEnd = value.indexOf('\n', selectionEnd);
    const end = blockEnd === -1 ? value.length : blockEnd;
    const block = value.slice(blockStart, end);
    const prefix = format === 'quote' ? '> ' : '- ';
    const transformed = block
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
      .join('\n');
    const text = value.slice(0, blockStart) + transformed + value.slice(end);
    return {
      text,
      selectionStart: blockStart,
      selectionEnd: blockStart + transformed.length,
    };
  }

  const placeholder = selected || 'texto';
  let wrapped = placeholder;

  switch (format) {
    case 'bold':
      wrapped = `**${placeholder}**`;
      break;
    case 'italic':
      wrapped = `*${placeholder}*`;
      break;
    case 'underline':
      wrapped = `__${placeholder}__`;
      break;
    case 'strike':
      wrapped = `~~${placeholder}~~`;
      break;
    case 'code':
      wrapped = `\`${placeholder}\``;
      break;
    case 'codeBlock':
      wrapped = `\`\`\`\n${placeholder}\n\`\`\``;
      break;
    default:
      wrapped = placeholder;
  }

  const text = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
  const cursorStart = selectionStart;
  const cursorEnd = selectionStart + wrapped.length;

  return { text, selectionStart: cursorStart, selectionEnd: cursorEnd };
}
