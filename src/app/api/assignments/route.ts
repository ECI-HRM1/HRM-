import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const supervisorId = searchParams.get('supervisorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const department = searchParams.get('department') || undefined;

    const where: Record<string, unknown> = {};

    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;
    if (supervisorId) where.supervisorId = supervisorId;
    if (status) where.status = status;

    if (department) {
      where.employee = { department };
    }

    const assignments = await db.appraisalAssignment.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, designation: true, department: true },
        },
        supervisor: {
          select: { id: true, name: true, designation: true },
        },
        cycle: {
          select: { id: true, name: true, cycleType: true, year: true, periodFrom: true, periodTo: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('List assignments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}