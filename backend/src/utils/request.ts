export function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function getQueryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parsePage(value: unknown): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseLimit(value: unknown): number {
  const limit = Number(value ?? 20);
  if (!Number.isInteger(limit) || limit < 1) return 20;
  return Math.min(limit, 100);
}
