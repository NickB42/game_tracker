const shouldLogTimings = process.env.NODE_ENV === "development" || process.env.PERF_LOGS === "true";

export async function measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
  if (!shouldLogTimings) {
    return operation();
  }

  const start = performance.now();

  try {
    return await operation();
  } finally {
    const duration = Math.round(performance.now() - start);
    console.log(`[perf] ${label} ${duration}ms`);
  }
}
