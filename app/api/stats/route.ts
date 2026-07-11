import { statsStore } from '@/lib/server/statsStore';

/** Site-wide totals shown on the hub: unique players and completed plays. */
export async function GET() {
  const stats = await statsStore.getStats();
  return Response.json(stats);
}
