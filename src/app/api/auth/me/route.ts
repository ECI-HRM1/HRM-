import { NextResponse } from 'next/server';

// Simple session check - returns null (no server-side session)
// Authentication is client-side only for this internal app
export async function GET() {
  return NextResponse.json(null, { status: 401 });
}