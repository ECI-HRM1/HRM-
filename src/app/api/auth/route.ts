import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        lineManager: {
          select: { id: true, name: true, designation: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
      designation: user.designation,
      department: user.department,
      phone: user.phone,
      overallExp: user.overallExp,
      yearsWithECI: user.yearsWithECI,
      currentEdu: user.currentEdu,
      role: user.role,
      isActive: user.isActive,
      isSupervisor: user.isSupervisor,
      lineManagerId: user.lineManagerId,
      lineManager: user.lineManager,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}