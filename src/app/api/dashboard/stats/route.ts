import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'employee';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const stats: Record<string, unknown> = {
      activeCycles: 0,
      totalAssigned: 0,
      submittedAppraisals: 0,
      pendingAppraisals: 0,
      overdueAppraisals: 0,
      returnedCases: 0,
      approvedAppraisals: 0,
      departmentProgress: [],
      supervisorProgress: [],
    };

    // Active cycles count
    stats.activeCycles = await db.appraisalCycle.count({
      where: { status: 'active' },
    });

    if (role === 'admin' || role === 'management') {
      // Global stats for admin/management
      const allAssignments = await db.appraisalAssignment.findMany({
        include: {
          employee: { select: { department: true } },
          supervisor: { select: { name: true } },
          cycle: { select: { status: true } },
        },
      });

      const activeAssignments = allAssignments.filter(
        (a) => a.cycle.status === 'active'
      );

      stats.totalAssigned = activeAssignments.length;
      stats.submittedAppraisals = activeAssignments.filter(
        (a) => a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee'
      ).length;
      stats.pendingAppraisals = activeAssignments.filter(
        (a) => a.status !== 'approved' && a.status !== 'shared_with_employee' && a.status !== 'acknowledged_by_employee' && a.status !== 'closed'
      ).length;
      stats.returnedCases = activeAssignments.filter(
        (a) => a.status === 'returned_for_correction'
      ).length;
      stats.approvedAppraisals = activeAssignments.filter(
        (a) => a.status === 'approved'
      ).length;

      // Overdue: past deadline and not completed
      const now = new Date();
      stats.overdueAppraisals = activeAssignments.filter(
        (a) => a.deadline && a.deadline < now && a.status !== 'approved' && a.status !== 'acknowledged_by_employee' && a.status !== 'closed'
      ).length;

      // Department progress
      const deptMap = new Map<string, { total: number; completed: number }>();
      for (const a of activeAssignments) {
        const dept = a.employee.department;
        if (!deptMap.has(dept)) {
          deptMap.set(dept, { total: 0, completed: 0 });
        }
        const d = deptMap.get(dept)!;
        d.total++;
        if (a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee') {
          d.completed++;
        }
      }
      stats.departmentProgress = Array.from(deptMap.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
      }));

      // Supervisor progress
      const supMap = new Map<string, { name: string; total: number; completed: number }>();
      for (const a of activeAssignments) {
        const supName = a.supervisor.name;
        if (!supMap.has(a.supervisorId)) {
          supMap.set(a.supervisorId, { name: supName, total: 0, completed: 0 });
        }
        const s = supMap.get(a.supervisorId)!;
        s.total++;
        if (a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee') {
          s.completed++;
        }
      }
      stats.supervisorProgress = Array.from(supMap.values());

    } else if (role === 'supervisor') {
      // Supervisor stats
      const myAssignments = await db.appraisalAssignment.findMany({
        where: { supervisorId: userId },
        include: {
          cycle: { select: { status: true } },
          employee: { select: { department: true } },
        },
      });

      const activeAssignments = myAssignments.filter(
        (a) => a.cycle.status === 'active'
      );

      stats.totalAssigned = activeAssignments.length;
      stats.submittedAppraisals = activeAssignments.filter(
        (a) => a.status === 'submitted_by_supervisor' || a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee'
      ).length;
      stats.pendingAppraisals = activeAssignments.filter(
        (a) => a.status === 'submitted_by_employee' || a.status === 'under_supervisor_review'
      ).length;
      stats.returnedCases = activeAssignments.filter(
        (a) => a.status === 'returned_for_correction'
      ).length;

      const now = new Date();
      stats.overdueAppraisals = activeAssignments.filter(
        (a) => a.deadline && a.deadline < now && a.status !== 'approved' && a.status !== 'acknowledged_by_employee' && a.status !== 'closed'
      ).length;

    } else {
      // Employee stats
      const myAssignments = await db.appraisalAssignment.findMany({
        where: { employeeId: userId },
        include: {
          cycle: { select: { status: true, name: true, cycleType: true, periodFrom: true, periodTo: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const activeAssignments = myAssignments.filter(
        (a) => a.cycle.status === 'active'
      );

      stats.totalAssigned = activeAssignments.length;
      stats.submittedAppraisals = activeAssignments.filter(
        (a) => a.status === 'submitted_by_employee' || a.status === 'submitted_by_supervisor' || a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee'
      ).length;
      stats.pendingAppraisals = activeAssignments.filter(
        (a) => a.status === 'assigned_to_employee' || a.status === 'returned_for_correction'
      ).length;
      stats.returnedCases = activeAssignments.filter(
        (a) => a.status === 'returned_for_correction'
      ).length;

      // Current active assignment (first non-completed one)
      const current = activeAssignments.find(
        (a) => a.status !== 'approved' && a.status !== 'acknowledged_by_employee' && a.status !== 'closed'
      );
      if (current) {
        stats.currentAssignment = {
          id: current.id,
          status: current.status,
          deadline: current.deadline?.toISOString() || null,
          cycleName: current.cycle.name,
          cycleType: current.cycle.cycleType,
          periodFrom: current.cycle.periodFrom,
          periodTo: current.cycle.periodTo,
        };
      }

      // Appraisal history (completed ones)
      const history = myAssignments.filter(
        (a) => a.status === 'approved' || a.status === 'shared_with_employee' || a.status === 'acknowledged_by_employee' || a.status === 'closed' || a.cycle.status === 'closed'
      );
      stats.appraisalHistory = history.map((h) => ({
        id: h.id,
        cycleName: h.cycle.name,
        cycleType: h.cycle.cycleType,
        status: h.status,
        periodFrom: h.cycle.periodFrom,
        periodTo: h.cycle.periodTo,
      }));
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}