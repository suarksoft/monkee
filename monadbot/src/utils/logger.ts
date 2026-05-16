export function log(context: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] ${message}`, data ?? '');
}

export function logError(context: string, message: string, error: unknown) {
  const timestamp = new Date().toISOString();
  const err = error as { message?: string };
  console.error(`[${timestamp}] [${context}] ERROR: ${message}`, err?.message || error);
}
