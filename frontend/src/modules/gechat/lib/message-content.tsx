import type { Message, MessageType } from '@/modules/gechat/types';

export type ParsedMessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'link'; url: string; title?: string }
  | { kind: 'image'; url: string; name?: string }
  | { kind: 'file'; url: string; name: string; size?: number; mime?: string }
  | { kind: 'sticker'; emoji: string };

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export function isEditableMessage(message: Message) {
  if (message.type !== 'text' || message.id.startsWith('temp-')) return false;
  try {
    const data = JSON.parse(message.content);
    if (data?.kind === 'link') return false;
  } catch {
    return true;
  }
  return false;
}

export function parseMessageContent(message: Message): ParsedMessageContent {
  if (message.type === 'image') {
    try {
      const data = JSON.parse(message.content);
      if (data?.kind === 'sticker' && data.emoji) {
        return { kind: 'sticker', emoji: String(data.emoji) };
      }
      if (data?.url) {
        return { kind: 'image', url: String(data.url), name: data.name };
      }
    } catch {
      if (message.content.startsWith('http')) {
        return { kind: 'image', url: message.content };
      }
    }
  }

  if (message.type === 'file') {
    try {
      const data = JSON.parse(message.content);
      return {
        kind: 'file',
        url: String(data.url),
        name: String(data.name ?? 'Arquivo'),
        size: data.size,
        mime: data.mime,
      };
    } catch {
      return { kind: 'file', url: message.content, name: 'Arquivo' };
    }
  }

  try {
    const data = JSON.parse(message.content);
    if (data?.kind === 'link' && data.url) {
      return { kind: 'link', url: String(data.url), title: data.title };
    }
  } catch {
    /* plain text */
  }

  return { kind: 'text', text: message.content };
}

export function buildTextContent(text: string) {
  return text.trim();
}

export function buildLinkContent(url: string, title?: string) {
  return JSON.stringify({ kind: 'link', url, title: title?.trim() || undefined });
}

export function buildImageContent(url: string, name?: string) {
  return JSON.stringify({ url, name });
}

export function buildFileContent(file: { url: string; name: string; size?: number; mime?: string }) {
  return JSON.stringify(file);
}

export function buildStickerContent(emoji: string) {
  return JSON.stringify({ kind: 'sticker', emoji });
}

export function linkifyText(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//i)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return <span key={`txt-${index}`}>{renderInlineFormatting(part, `seg-${index}`)}</span>;
  });
}

function renderInlineFormatting(text: string, keyPrefix: string) {
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|~~[^~]+~~|`[^`]+`)/g;
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <span key={key} className="underline">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <span key={key} className="line-through opacity-80">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-background/40 px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function renderFormattedText(text: string) {
  const codeBlockPattern = /```([\s\S]*?)```/g;
  const segments: Array<{ type: 'code' | 'text'; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  if (!segments.length) segments.push({ type: 'text', value: text });

  return segments.map((segment, index) => {
    if (segment.type === 'code') {
      return (
        <pre
          key={`code-${index}`}
          className="my-1 overflow-x-auto rounded-lg bg-background/40 p-2 font-mono text-xs"
        >
          {segment.value}
        </pre>
      );
    }

    return (
      <span key={`text-${index}`} className="whitespace-pre-wrap">
        {segment.value.split('\n').map((line, lineIndex) => {
          const quote = line.startsWith('> ');
          const list = line.startsWith('- ');
          const content = quote ? line.slice(2) : list ? line.slice(2) : line;

          return (
            <span key={`line-${index}-${lineIndex}`} className="block">
              {quote && (
                <span className="mr-1 border-l-2 border-current pl-2 opacity-80">{linkifyText(content)}</span>
              )}
              {list && (
                <span className="flex gap-2">
                  <span>•</span>
                  <span>{linkifyText(content)}</span>
                </span>
              )}
              {!quote && !list && linkifyText(line)}
              {lineIndex < segment.value.split('\n').length - 1 ? '\n' : null}
            </span>
          );
        })}
      </span>
    );
  });
}

export function previewText(message: Message) {
  return getMessagePlainText(message);
}

export function getMessagePlainText(message: Message): string {
  const parsed = parseMessageContent(message);
  if (parsed.kind === 'text') return parsed.text;
  if (parsed.kind === 'link') return parsed.title ?? parsed.url;
  if (parsed.kind === 'image') return parsed.name ?? 'Imagem';
  if (parsed.kind === 'file') return parsed.name;
  if (parsed.kind === 'sticker') return parsed.emoji;
  return message.content;
}

export function buildQuotedReplyContent(quote: { preview: string }, reply: string) {
  const lines = quote.preview.split('\n').map((line) => `> ${line}`);
  return `${lines.join('\n')}\n\n${reply}`;
}

export function sendPayload(
  conversationId: string,
  content: string,
  type: MessageType = 'text',
  clientId?: string,
) {
  return { conversationId, content, type, clientId };
}
