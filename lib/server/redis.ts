/**
 * Minimal Upstash Redis REST client — plain fetch, no npm dependency.
 * Present when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise callers fall back to local file storage in `.data/`.
 */
const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = process.env;

export const hasRedis = Boolean(url && token);

export async function redisCommand<T = string | number | null>(
  cmd: (string | number)[]
): Promise<T> {
  if (!url || !token) throw new Error('Redis env vars not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}
