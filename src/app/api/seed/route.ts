import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TECHNICAL_SKILLS, LEADERSHIP_SKILLS, MANAGERIAL_SKILLS } from '@/lib/constants';

/**
 * POST /api/seed
 *
 * Two modes:
 *   ?mode=production  — Creates ONLY the admin account + rating scales + categories.
 *                        No demo users, no fake cycles, no sample data.
 *   ?mode=demo        — (default) Creates full demo dataset for development/testing.
 *
 * Production admin credentials are read from env vars:
 *   ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, ADMIN_EMPLOYEE_ID
 * Falls back to sensible defaults if env vars are not set.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'demo';

    // ── Clear existing data in reverse dependency order ──
    await db.auditLog.deleteMany({});
    await db.notification.deleteMany({});
    await db.appraisalFormData.deleteMany({});
    await db.appraisalAssignment.deleteMany({});
    await db.appraisalCycle.deleteMany({});
    await db.user.deleteMany({});
    await db.designation.deleteMany({});
    await db.department.deleteMany({});
    await db.appraisalCategory.deleteMany({});
    await db.ratingScale.deleteMany({});

    // ── Rating Scales (essential for both modes) ──
    const goalsScale = await db.ratingScale.create({
      data: {
        name: 'Goals Rating (0-3)',
        description: 'Rating scale for achievements and goals evaluation',
        minScore: 0,
        maxScore: 3,
        labelsJson: JSON.stringify([
          { score: 0, label: 'N/A' },
          { score: 1, label: 'Below Average' },
          { score: 2, label: 'Meets Expectations' },
          { score: 3, label: 'Exceeds Expectations' },
        ]),
        appliesTo: 'goals',
        sortOrder: 0,
      },
    });

    const competencyScale = await db.ratingScale.create({
      data: {
        name: 'Competency Rating (1-5)',
        description: 'Rating scale for technical, leadership and managerial competencies',
        minScore: 1,
        maxScore: 5,
        labelsJson: JSON.stringify([
          { score: 1, label: 'Poor' },
          { score: 2, label: 'Below Average' },
          { score: 3, label: 'Average' },
          { score: 4, label: 'Good' },
          { score: 5, label: 'Excellent' },
        ]),
        appliesTo: 'competencies',
        sortOrder: 1,
      },
    });

    const explanationScale = await db.ratingScale.create({
      data: {
        name: 'Explanation Rating (0-3)',
        description: 'Rating scale for notices/explanations severity',
        minScore: 0,
        maxScore: 3,
        labelsJson: JSON.stringify([
          { score: 0, label: 'N/A' },
          { score: 1, label: '1 - Minor' },
          { score: 2, label: '2 - Moderate' },
          { score: 3, label: '3 - Severe' },
        ]),
        appliesTo: 'explanations',
        sortOrder: 2,
      },
    });

    // ── Appraisal Categories (22 competency items — essential) ──
    const categorySeedData: Array<{
      name: string;
      section: string;
      sortOrder: number;
      ratingScaleId: string;
    }> = [];

    TECHNICAL_SKILLS.forEach((name, idx) => {
      categorySeedData.push({ name, section: 'technical_skills', sortOrder: idx, ratingScaleId: competencyScale.id });
    });
    LEADERSHIP_SKILLS.forEach((name, idx) => {
      categorySeedData.push({ name, section: 'leadership_skills', sortOrder: idx, ratingScaleId: competencyScale.id });
    });
    MANAGERIAL_SKILLS.forEach((name, idx) => {
      categorySeedData.push({ name, section: 'managerial_skills', sortOrder: idx, ratingScaleId: competencyScale.id });
    });

    await Promise.all(
      categorySeedData.map((cat) =>
        db.appraisalCategory.create({
          data: { name: cat.name, section: cat.section, description: '', sortOrder: cat.sortOrder, ratingScaleId: cat.ratingScaleId },
        })
      )
    );

    // ── MODE-SPECIFIC DATA ──
    if (mode === 'production') {
      return await seedProduction(goalsScale, competencyScale, explanationScale);
    } else {
      return await seedDemo(goalsScale, competencyScale, explanationScale);
    }
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTION SEED — Admin-only, no demo data
// ═══════════════════════════════════════════════════════════════
async function seedProduction(_goalsScale: any, _competencyScale: any, _explanationScale: any) {
  // Admin credentials from env, with secure defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'imunir@eci.com.pk';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ECI@dm1n#2025!Secure';
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || 'ECI-001';

  const admin = await db.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      password: adminPassword,
      employeeId: adminEmployeeId,
      designation: 'HR Manager',
      department: 'Administration',
      phone: '',
      overallExp: '',
      yearsWithECI: '',
      currentEdu: '',
      role: 'admin',
      isSupervisor: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    message: 'Production seed completed. System ready for use.',
    mode: 'production',
    admin: {
      email: admin.email,
      employeeId: admin.employeeId,
      name: admin.name,
      role: admin.role,
    },
    systemSetup: {
      ratingScales: 3,
      appraisalCategories: 22,
      users: 1,
      departments: 0,
      designations: 0,
      cycles: 0,
    },
    nextSteps: [
      '1. Login with the admin account above',
      '2. Go to Master Data → Departments to create departments',
      '3. Go to Master Data → Designations to create designations',
      '4. Go to Master Data → Employees to add users',
      '5. Go to Appraisal → Cycles to create your first appraisal cycle',
    ],
  }, { status: 201 });
}

// ═══════════════════════════════════════════════════════════════
// DEMO SEED — Full demo dataset for development/testing
// ═══════════════════════════════════════════════════════════════
async function seedDemo(goalsScale: any, competencyScale: any, explanationScale: any) {
  const { createDefaultFormData } = await import('@/lib/constants');

  // Create departments
  const departments = await Promise.all([
    db.department.create({ data: { name: 'Administration' } }),
    db.department.create({ data: { name: 'Program' } }),
    db.department.create({ data: { name: 'Finance' } }),
    db.department.create({ data: { name: 'Human Resources' } }),
    db.department.create({ data: { name: 'Monitoring & Evaluation' } }),
    db.department.create({ data: { name: 'Communication' } }),
  ]);

  // Create designations
  const designations = await Promise.all([
    db.designation.create({ data: { title: 'Chief Executive Officer', requiredExp: '15+ years', requiredEdu: 'Masters degree', department: 'Management' } }),
    db.designation.create({ data: { title: 'HR Manager', requiredExp: '8+ years', requiredEdu: 'MBA/Masters in HR', department: 'Human Resources' } }),
    db.designation.create({ data: { title: 'Program Manager', requiredExp: '7+ years', requiredEdu: 'Masters degree', department: 'Program' } }),
    db.designation.create({ data: { title: 'Finance Manager', requiredExp: '7+ years', requiredEdu: 'CA/MBA Finance', department: 'Finance' } }),
    db.designation.create({ data: { title: 'Program Officer', requiredExp: '3+ years', requiredEdu: 'Masters degree', department: 'Program' } }),
    db.designation.create({ data: { title: 'Finance Officer', requiredExp: '3+ years', requiredEdu: 'BBA/BCOM/MBA Finance', department: 'Finance' } }),
    db.designation.create({ data: { title: 'M&E Officer', requiredExp: '3+ years', requiredEdu: 'Masters in Statistics/Economics', department: 'Monitoring & Evaluation' } }),
    db.designation.create({ data: { title: 'Communication Officer', requiredExp: '3+ years', requiredEdu: 'Masters in Communications', department: 'Communication' } }),
    db.designation.create({ data: { title: 'Admin Assistant', requiredExp: '2+ years', requiredEdu: 'Bachelors degree', department: 'Administration' } }),
  ]);

  // Create users
  const admin = await db.user.create({
    data: { email: 'admin@eci.com', name: 'Sarah Ahmad', employeeId: 'ECI-001', designation: 'HR Manager', department: 'Administration', phone: '+92-300-1000001', overallExp: '10 years', yearsWithECI: '8 years', currentEdu: 'MBA (HRM)', role: 'admin' },
  });

  const management = await db.user.create({
    data: { email: 'ceo@eci.com', name: 'Ahmed Khan', employeeId: 'ECI-002', designation: 'Chief Executive Officer', department: 'Management', phone: '+92-300-1000002', overallExp: '20 years', yearsWithECI: '12 years', currentEdu: 'MBA (Finance)', role: 'management' },
  });

  const supervisor1 = await db.user.create({
    data: { email: 'supervisor1@eci.com', name: 'Fatima Noor', employeeId: 'ECI-003', designation: 'Program Manager', department: 'Program', phone: '+92-300-1000003', overallExp: '9 years', yearsWithECI: '6 years', currentEdu: 'Masters in Development Studies', role: 'supervisor', lineManagerId: management.id, isSupervisor: true },
  });

  const supervisor2 = await db.user.create({
    data: { email: 'supervisor2@eci.com', name: 'Imran Ali', employeeId: 'ECI-004', designation: 'Finance Manager', department: 'Finance', phone: '+92-300-1000004', overallExp: '8 years', yearsWithECI: '5 years', currentEdu: 'MBA (Finance)', role: 'supervisor', lineManagerId: management.id, isSupervisor: true },
  });

  const emp1 = await db.user.create({ data: { email: 'ali.rashid@eci.com', name: 'Ali Rashid', employeeId: 'ECI-005', designation: 'Program Officer', department: 'Program', phone: '+92-300-1000005', overallExp: '4 years', yearsWithECI: '3 years', currentEdu: 'Masters in Social Sciences', role: 'employee', lineManagerId: supervisor1.id } });
  const emp2 = await db.user.create({ data: { email: 'zainab.malik@eci.com', name: 'Zainab Malik', employeeId: 'ECI-006', designation: 'Program Officer', department: 'Program', phone: '+92-300-1000006', overallExp: '5 years', yearsWithECI: '4 years', currentEdu: 'Masters in Public Health', role: 'employee', lineManagerId: supervisor1.id } });
  const emp3 = await db.user.create({ data: { email: 'bilal.hassan@eci.com', name: 'Bilal Hassan', employeeId: 'ECI-007', designation: 'Finance Officer', department: 'Finance', phone: '+92-300-1000007', overallExp: '4 years', yearsWithECI: '2 years', currentEdu: 'MBA (Finance)', role: 'employee', lineManagerId: supervisor2.id } });
  const emp4 = await db.user.create({ data: { email: 'aisha.khan@eci.com', name: 'Aisha Khan', employeeId: 'ECI-008', designation: 'M&E Officer', department: 'Monitoring & Evaluation', phone: '+92-300-1000008', overallExp: '6 years', yearsWithECI: '5 years', currentEdu: 'Masters in Statistics', role: 'employee', lineManagerId: supervisor1.id } });
  const emp5 = await db.user.create({ data: { email: 'omar.farooq@eci.com', name: 'Omar Farooq', employeeId: 'ECI-009', designation: 'Communication Officer', department: 'Communication', phone: '+92-300-1000009', overallExp: '3 years', yearsWithECI: '2 years', currentEdu: 'Masters in Media Studies', role: 'employee', lineManagerId: supervisor1.id } });
  const emp6 = await db.user.create({ data: { email: 'hina.siddiqui@eci.com', name: 'Hina Siddiqui', employeeId: 'ECI-010', designation: 'Admin Assistant', department: 'Administration', phone: '+92-300-1000010', overallExp: '3 years', yearsWithECI: '3 years', currentEdu: 'Bachelors in Business Admin', role: 'employee', lineManagerId: admin.id } });

  // Create appraisal cycle
  const cycle = await db.appraisalCycle.create({
    data: {
      name: 'Mid-Year Performance Appraisal 2025',
      cycleType: 'mid_year',
      year: '2025',
      periodFrom: 'January 2025',
      periodTo: 'June 2025',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-31'),
      submissionDeadline: new Date('2025-08-15'),
      status: 'active',
      applicableDepts: JSON.stringify(['Program', 'Finance', 'Monitoring & Evaluation', 'Communication', 'Administration']),
      createdById: admin.id,
    },
  });

  // Create assignments
  const employees = [emp1, emp2, emp3, emp4, emp5, emp6];
  const supervisors = [supervisor1, supervisor1, supervisor2, supervisor1, supervisor1, admin];
  const assignments = [];

  for (let i = 0; i < employees.length; i++) {
    const assignment = await db.appraisalAssignment.create({
      data: {
        cycleId: cycle.id,
        employeeId: employees[i].id,
        supervisorId: supervisors[i].id,
        status: 'assigned_to_employee',
        currentActionBy: 'employee',
        deadline: cycle.submissionDeadline,
      },
    });
    assignments.push(assignment);
  }

  // Create sample form data for first two employees
  const defaultForm = createDefaultFormData();

  for (let i = 0; i < 2; i++) {
    const a = assignments[i];
    const emp = employees[i];
    const sup = supervisors[i];

    const sampleAchievements = defaultForm.achievements.map((_: any, idx: number) => ({
      description: idx === 0 ? 'Successfully led training workshop for field staff' : idx === 1 ? 'Developed new monitoring framework' : idx === 2 ? '' : '',
      employeeRating: idx < 3 ? [3, 2, 0][idx] : 0,
      supervisorRating: 0,
    }));

    const sampleGoals = defaultForm.goals.map((_: any, idx: number) => ({
      description: idx === 0 ? 'Complete advanced certification course' : idx === 1 ? 'Improve report submission timeline by 20%' : idx === 2 ? 'Mentor 2 junior staff members' : '',
      employeeRating: idx < 3 ? [3, 2, 3][idx] : 0,
      supervisorRating: 0,
    }));

    const sampleTechSkills = defaultForm.technicalSkills.map((skill: { name: string }, idx: number) => ({
      name: skill.name,
      employeeRating: [4, 3, 4, 3, 4, 3, 2, 3, 4, 4][idx],
      supervisorRating: 0,
    }));

    const sampleLeadSkills = defaultForm.leadershipSkills.map((skill: { name: string }, idx: number) => ({
      name: skill.name,
      employeeRating: [3, 4, 3, 4, 3][idx],
      supervisorRating: 0,
    }));

    const sampleMgrSkills = defaultForm.managerialSkills.map((skill: { name: string }, idx: number) => ({
      name: skill.name,
      employeeRating: [3, 4, 3, 3, 4, 3, 3][idx],
      supervisorRating: 0,
    }));

    const designationData = designations.find((d) => d.title === emp.designation);

    await db.appraisalFormData.create({
      data: {
        assignmentId: a.id,
        employeeName: emp.name,
        employeeId: emp.employeeId,
        designation: emp.designation,
        overallExp: emp.overallExp,
        yearsWithECI: emp.yearsWithECI,
        currentEdu: emp.currentEdu,
        requiredExp: designationData?.requiredExp || '',
        requiredEdu: designationData?.requiredEdu || '',
        department: emp.department,
        appraisalPeriod: `${cycle.periodFrom} to ${cycle.periodTo}`,
        lineManagerName: sup.name,
        lineManagerDesignation: sup.designation,
        achievementsJson: JSON.stringify(sampleAchievements),
        goalsJson: JSON.stringify(sampleGoals),
        technicalSkillsJson: JSON.stringify(sampleTechSkills),
        leadershipSkillsJson: JSON.stringify(sampleLeadSkills),
        managerialSkillsJson: JSON.stringify(sampleMgrSkills),
        explanationsJson: JSON.stringify(defaultForm.explanations),
        futureGoalsJson: JSON.stringify(defaultForm.futureGoals),
        remarksJson: JSON.stringify(defaultForm.remarks),
      },
    });

    if (i === 0) {
      await db.appraisalAssignment.update({ where: { id: a.id }, data: { status: 'submitted_by_employee' } });
    }
  }

  // Create notifications
  const notificationData = assignments.map((a) => ({
    userId: a.employeeId,
    assignmentId: a.id,
    type: 'form_assigned',
    title: 'New Appraisal Assigned',
    message: `You have been assigned a new appraisal: ${cycle.name}. Please complete your self-evaluation by ${cycle.submissionDeadline.toLocaleDateString()}.`,
    actionRequired: true,
    link: '',
  }));
  await db.notification.createMany({ data: notificationData });

  return NextResponse.json({
    message: 'Demo seed data created successfully',
    mode: 'demo',
    summary: { departments: 6, designations: 9, users: 10, ratingScales: 3, appraisalCategories: 22, cycles: 1, assignments: 6, notifications: 6 },
  }, { status: 201 });
}