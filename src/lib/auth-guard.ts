import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';

export interface AuthResult {
  error?: NextResponse;
  userId?: string;
  role?: string;
  user?: { id: string; name: string; role: string; isActive: boolean };
}

function extractUserId(request: NextRequest): string | null {
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  const { searchParams } = new URL(request.url);
  const paramUserId = searchParams.get('userId');
  if (paramUserId) return paramUserId;

  return null;
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult> {
  let userId = extractUserId(request);

  if (!userId) {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const bodyClone = await request.clone().json();
        userId = bodyClone.userId || bodyClone.createdById || null;
      }
    } catch {
      // Body parse failed
    }
  }

  if (!userId) {
    return { error: NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: 'User not found. Please log in again.' }, { status: 401 }) };
  }

  if (!user.isActive) {
    return { error: NextResponse.json({ error: 'Your account has been deactivated. Contact your administrator.' }, { status: 403 }) };
  }

  const actualRole = user.role;

  if (!allowedRoles.includes(actualRole)) {
    return {
      error: NextResponse.json(
        { error: 'Access denied. You do not have permission to perform this action.' },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id, role: actualRole, user };
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  let userId = extractUserId(request);

  if (!userId) {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const bodyClone = await request.clone().json();
        userId = bodyClone.userId || bodyClone.createdById || null;
      }
    } catch {
      // Body parse failed
    }
  }

  if (!userId) {
    return { error: NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { error: NextResponse.json({ error: 'User not found or inactive.' }, { status: 401 }) };
  }

  return { userId: user.id, role: user.role, user };
}

export async function canAccessAssignment(
  request: NextRequest,
  assignmentId: string
): Promise<AuthResult & { canAccess: boolean }> {
  const auth = await requireAuth(request);
  if (auth.error) return { ...auth, canAccess: false };

  const assignment = await db.appraisalAssignment.findUnique({
    where: { id: assignmentId },
    select: { employeeId: true, supervisorId: true, escalatedSupervisorId: true },
  });

  if (!assignment) {
    return { ...auth, canAccess: false, error: NextResponse.json({ error: 'Assignment not found' }, { status: 404 }) };
  }

  const role = auth.role!;
  const userId = auth.userId!;

  if (role === 'admin' || role === 'management' || role === 'hr') {
    return { ...auth, canAccess: true };
  }

  if (role === 'supervisor') {
    const canAccess = assignment.supervisorId === userId || assignment.escalatedSupervisorId === userId || assignment.employeeId === userId;
    return { ...auth, canAccess };
  }

  const canAccess = assignment.employeeId === userId;
  return { ...auth, canAccess };
}