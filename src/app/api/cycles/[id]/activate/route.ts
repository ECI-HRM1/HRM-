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

    // Get employees to assign: any active user who has a lineManagerId or is in the employeeIds list
    const whereClause: Record<string, unknown> = { isActive: true };
    if (applicableDepts.length > 0) {
      whereClause.department = { in: applicableDepts };
    }
    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const allActiveUsers = await db.user.findMany({
      where: whereClause,
      include: {
        lineManager: {
          select: { id: true, name: true },
        },
      },
    });

    // Filter: only include users who have a lineManagerId OR were explicitly in employeeIds
    const employees = allActiveUsers.filter((emp) => {
      if (employeeIds && employeeIds.length > 0 && employeeIds.includes(emp.id)) {
        return true;
      }
      return !!emp.lineManagerId;
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No eligible employees found for this cycle' }, { status: 400 });
    }

    // Get potential supervisors: users with supervisor/management/admin role or isSupervisor flag
    const supervisors = await db.user.findMany({
      where: {
        OR: [
          { role: { in: ['supervisor', 'management', 'admin'] } },
          { isSupervisor: true },
        ],
        isActive: true,
      },
      select: { id: true, name: true, department: true },
    });

    // Get admin/HR users for escalation fallback
    const adminUsers = await db.user.findMany({
      where: { role: { in: ['admin', 'management'] }, isActive: true },
      select: { id: true },
    });

    // Helper: find a supervisor for a given employee, preferring same department
    function findSupervisorForEmployee(emp: typeof employees[0]): string | undefined {
      // 1. Use lineManagerId as primary
      if (emp.lineManagerId && emp.lineManagerId !== emp.id) {
        return emp.lineManagerId;
      }

      // 2. Find a supervisor from same department
      const sameDeptSup = supervisors.find(
        (s) => s.department === emp.department && s.id !== emp.id
      );
      if (sameDeptSup) return sameDeptSup.id;

      // 3. Any supervisor not the employee
      const anySup = supervisors.find((s) => s.id !== emp.id);
      if (anySup) return anySup.id;

      return undefined;
    }

    // Helper: find escalation supervisor (for when supervisor would be self)
    function findEscalationSupervisor(emp: typeof employees[0]): string | undefined {
      // Try the employee's own lineManager
      if (emp.lineManagerId && emp.lineManagerId !== emp.id) {
        return emp.lineManagerId;
      }

      // Fall back to any admin/management user
      const fallback = adminUsers.find((a) => a.id !== emp.id);
      if (fallback) return fallback.id;

      // Last resort: any supervisor not the employee
      const anySup = supervisors.find((s) => s.id !== emp.id);
      if (anySup) return anySup.id;

      return undefined;
    }

    // Create assignments with self-review prevention
    const assignmentData: { cycleId: string; employeeId: string; supervisorId: string; escalatedSupervisorId?: string; status: string; currentActionBy: string; deadline: Date }[] = [];

    for (const emp of employees) {
      let supervisorId = findSupervisorForEmployee(emp);
      if (!supervisorId) {
        continue;
      }

      // Self-review prevention: if the resolved supervisor IS the employee, escalate
      if (supervisorId === emp.id) {
        const escalationId = findEscalationSupervisor(emp);
        if (!escalationId) {
          // Cannot create a valid assignment - skip this employee
          continue;
        }
        // Replace supervisorId with the escalation supervisor to prevent self-review
        supervisorId = escalationId;
        assignmentData.push({
          cycleId: id,
          employeeId: emp.id,
          supervisorId,
          escalatedSupervisorId: escalationId,
          status: 'assigned_to_employee',
          currentActionBy: 'employee',
          deadline: cycle.submissionDeadline,
        });
      } else {
        assignmentData.push({
          cycleId: id,
          employeeId: emp.id,
          supervisorId,
          status: 'assigned_to_employee',
          currentActionBy: 'employee',
          deadline: cycle.submissionDeadline,
        });
      }
    }

    if (assignmentData.length === 0) {
      return NextResponse.json({ error: 'No valid assignments could be created. Ensure employees have line managers.' }, { status: 400 });
    }

    // Create assignments in batch
    await db.appraisalAssignment.createMany({
      data: assignmentData,
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