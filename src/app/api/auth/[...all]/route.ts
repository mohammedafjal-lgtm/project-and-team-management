import { type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  return auth.handler(req);
}
