import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeIds } = body;

    const cycle = await db.appraisalCycle.findUnique({ where: { id } });
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    if (cycle.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft cycles can be activated' }, { status: 400 });
    }

    const applicableDepts: string[] = JSON.parse(cycle.applicableDepts);

    // Get employees to assign
    const whereClause: Record<string, unknown> = { isActive: true, role: 'employee' };
    if (applicableDepts.length > 0) {
      whereClause.department = { in: applicableDepts };
    }
    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const employees = await db.user.findMany({
      where: whereClause,
      include: {
        lineManager: {
          select: { id: true, name: true },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No eligible employees found for this cycle' }, { status: 400 });
    }

    // Get supervisors
    const supervisors = await db.user.findMany({
      where: { role: { in: ['supervisor', 'management', 'admin'] }, isActive: true },
      select: { id: true, name: true, department: true },
    });

    // Create assignments
    const assignmentData = employees.map((emp) => {
      const supervisorId = emp.lineManagerId || supervisors[0]?.id;
      if (!supervisorId) {
        return null;
      }
      return {
        cycleId: id,
        employeeId: emp.id,
        supervisorId,
        status: 'assigned_to_employee',
        currentActionBy: 'employee',
        deadline: cycle.submissionDeadline,
      };
    }).filter(Boolean);

    if (assignmentData.length === 0) {
      return NextResponse.json({ error: 'No valid assignments could be created. Ensure employees have line managers.' }, { status: 400 });
    }

    // Create assignments in batch
    await db.appraisalAssignment.createMany({
      data: assignmentData as { cycleId: string; employeeId: string; supervisorId: string; status: string; currentActionBy: string; deadline: Date }[],
    });

    // Fetch created assignments to create notifications
    const createdAssignments = await db.appraisalAssignment.findMany({
      where: { cycleId: id },
      include: { employee: true },
    });

    // Create notifications for employees
    const notificationData = createdAssignments.map((a) => ({
      userId: a.employeeId,
      assignmentId: a.id,
      type: 'form_assigned',
      title: 'New Appraisal Assigned',
      message: `You have been assigned a new appraisal: ${cycle.name}. Please complete your self-evaluation by ${cycle.submissionDeadline.toLocaleDateString()}.`,
      actionRequired: true,
      link: `/appraisal/${a.id}`,
    }));

    await db.notification.createMany({ data: notificationData });

    // Update cycle status
    await db.appraisalCycle.update({
      where: { id },
      data: { status: 'active' },
    });

    return NextResponse.json({
      message: 'Cycle activated successfully',
      assignmentsCreated: assignmentData.length,
    });
  } catch (error) {
    console.error('Activate cycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}