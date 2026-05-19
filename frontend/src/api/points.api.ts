import { http } from './http';

export interface PointHistoryEntry {
  orderId: string;
  orderLookupCode: string | null;
  orderType: 'purchase' | 'redeem';
  delta: number;
  createdAt: string;
}

export async function getPointHistory(): Promise<PointHistoryEntry[]> {
  const res = await http.get<{ data: PointHistoryEntry[] }>('/points/history');
  return res.data.data;
}
