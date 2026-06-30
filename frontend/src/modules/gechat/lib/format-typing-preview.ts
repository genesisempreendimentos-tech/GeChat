export function formatTypingPreview(
  typingUserIds: string[],
  currentUserId: string | undefined,
  nameByUserId: Record<string, string>,
): string | null {
  const others = typingUserIds.filter((id) => id !== currentUserId);
  if (!others.length) return null;

  const names = others.map((id) => nameByUserId[id] ?? 'Alguém');

  if (names.length === 1) {
    return `${names[0]} está digitando…`;
  }

  if (names.length === 2) {
    return `${names[0]} e ${names[1]} estão digitando…`;
  }

  return `${names[0]} e mais ${names.length - 1} estão digitando…`;
}
