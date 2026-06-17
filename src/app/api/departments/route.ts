import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const departments = await db.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('List departments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const existing = await db.department.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Department already exists' }, { status: 409 });
    }

    const department = await db.department.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}