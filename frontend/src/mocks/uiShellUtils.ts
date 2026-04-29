export function delayMock(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function okResult<T>(data: T) {
  return { data, error: null as null };
}

export function emptyResult<T>() {
  return { data: [] as T[], error: null as null };
}

export async function noopAsync(): Promise<void> {
  return;
}

export function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
