import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDefaultFormData } from '@/lib/constants';

export async function POST() {
  try {
    // Clear existing data in reverse dependency order
    await db.auditLog.deleteMany({});
    await db.notification.deleteMany({});
    await db.appraisalFormData.deleteMany({});
    await db.appraisalAssignment.deleteMany({});
    await db.appraisalCycle.deleteMany({});
    await db.user.deleteMany({});
    await db.designation.deleteMany({});
    await db.department.deleteMany({});

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
      db.designation.create({
        data: { title: 'Chief Executive Officer', requiredExp: '15+ years', requiredEdu: 'Masters degree', department: 'Management' },
      }),
      db.designation.create({
        data: { title: 'HR Manager', requiredExp: '8+ years', requiredEdu: 'MBA/Masters in HR', department: 'Human Resources' },
      }),
      db.designation.create({
        data: { title: 'Program Manager', requiredExp: '7+ years', requiredEdu: 'Masters degree', department: 'Program' },
      }),
      db.designation.create({
        data: { title: 'Finance Manager', requiredExp: '7+ years', requiredEdu: 'CA/MBA Finance', department: 'Finance' },
      }),
      db.designation.create({
        data: { title: 'Program Officer', requiredExp: '3+ years', requiredEdu: 'Masters degree', department: 'Program' },
      }),
      db.designation.create({
        data: { title: 'Finance Officer', requiredExp: '3+ years', requiredEdu: 'BBA/BCOM/MBA Finance', department: 'Finance' },
      }),
      db.designation.create({
        data: { title: 'M&E Officer', requiredExp: '3+ years', requiredEdu: 'Masters in Statistics/Economics', department: 'Monitoring & Evaluation' },
      }),
      db.designation.create({
        data: { title: 'Communication Officer', requiredExp: '3+ years', requiredEdu: 'Masters in Communications', department: 'Communication' },
      }),
      db.designation.create({
        data: { title: 'Admin Assistant', requiredExp: '2+ years', requiredEdu: 'Bachelors degree', department: 'Administration' },
      }),
    ]);

    // Create users
    const admin = await db.user.create({
      data: {
        email: 'admin@eci.com',
        name: 'Sarah Ahmad',
        employeeId: 'ECI-001',
        designation: 'HR Manager',
        department: 'Administration',
        phone: '+92-300-1000001',
        overallExp: '10 years',
        yearsWithECI: '8 years',
        currentEdu: 'MBA (HRM)',
        role: 'admin',
      },
    });

    const management = await db.user.create({
      data: {
        email: 'ceo@eci.com',
        name: 'Ahmed Khan',
        employeeId: 'ECI-002',
        designation: 'Chief Executive Officer',
        department: 'Management',
        phone: '+92-300-1000002',
        overallExp: '20 years',
        yearsWithECI: '12 years',
        currentEdu: 'MBA (Finance)',
        role: 'management',
      },
    });

    const supervisor1 = await db.user.create({
      data: {
        email: 'supervisor1@eci.com',
        name: 'Fatima Noor',
        employeeId: 'ECI-003',
        designation: 'Program Manager',
        department: 'Program',
        phone: '+92-300-1000003',
        overallExp: '9 years',
        yearsWithECI: '6 years',
        currentEdu: 'Masters in Development Studies',
        role: 'supervisor',
        lineManagerId: management.id,
      },
    });

    const supervisor2 = await db.user.create({
      data: {
        email: 'supervisor2@eci.com',
        name: 'Imran Ali',
        employeeId: 'ECI-004',
        designation: 'Finance Manager',
        department: 'Finance',
        phone: '+92-300-1000004',
        overallExp: '8 years',
        yearsWithECI: '5 years',
        currentEdu: 'MBA (Finance)',
        role: 'supervisor',
        lineManagerId: management.id,
      },
    });

    // Create employees
    const emp1 = await db.user.create({
      data: {
        email: 'ali.rashid@eci.com',
        name: 'Ali Rashid',
        employeeId: 'ECI-005',
        designation: 'Program Officer',
        department: 'Program',
        phone: '+92-300-1000005',
        overallExp: '4 years',
        yearsWithECI: '3 years',
        currentEdu: 'Masters in Social Sciences',
        role: 'employee',
        lineManagerId: supervisor1.id,
      },
    });

    const emp2 = await db.user.create({
      data: {
        email: 'zainab.malik@eci.com',
        name: 'Zainab Malik',
        employeeId: 'ECI-006',
        designation: 'Program Officer',
        department: 'Program',
        phone: '+92-300-1000006',
        overallExp: '5 years',
        yearsWithECI: '4 years',
        currentEdu: 'Masters in Public Health',
        role: 'employee',
        lineManagerId: supervisor1.id,
      },
    });

    const emp3 = await db.user.create({
      data: {
        email: 'bilal.hassan@eci.com',
        name: 'Bilal Hassan',
        employeeId: 'ECI-007',
        designation: 'Finance Officer',
        department: 'Finance',
        phone: '+92-300-1000007',
        overallExp: '4 years',
        yearsWithECI: '2 years',
        currentEdu: 'MBA (Finance)',
        role: 'employee',
        lineManagerId: supervisor2.id,
      },
    });

    const emp4 = await db.user.create({
      data: {
        email: 'aisha.khan@eci.com',
        name: 'Aisha Khan',
        employeeId: 'ECI-008',
        designation: 'M&E Officer',
        department: 'Monitoring & Evaluation',
        phone: '+92-300-1000008',
        overallExp: '6 years',
        yearsWithECI: '5 years',
        currentEdu: 'Masters in Statistics',
        role: 'employee',
        lineManagerId: supervisor1.id,
      },
    });

    const emp5 = await db.user.create({
      data: {
        email: 'omar.farooq@eci.com',
        name: 'Omar Farooq',
        employeeId: 'ECI-009',
        designation: 'Communication Officer',
        department: 'Communication',
        phone: '+92-300-1000009',
        overallExp: '3 years',
        yearsWithECI: '2 years',
        currentEdu: 'Masters in Media Studies',
        role: 'employee',
        lineManagerId: supervisor1.id,
      },
    });

    const emp6 = await db.user.create({
      data: {
        email: 'hina.siddiqui@eci.com',
        name: 'Hina Siddiqui',
        employeeId: 'ECI-010',
        designation: 'Admin Assistant',
        department: 'Administration',
        phone: '+92-300-1000010',
        overallExp: '3 years',
        yearsWithECI: '3 years',
        currentEdu: 'Bachelors in Business Admin',
        role: 'employee',
        lineManagerId: admin.id,
      },
    });

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
        applicableDepts: JSON.stringify([
          'Program', 'Finance', 'Monitoring & Evaluation', 'Communication', 'Administration',
        ]),
        createdById: admin.id,
      },
    });

    // Create assignments for all employees
    const assignments = [];
    const employees = [emp1, emp2, emp3, emp4, emp5, emp6];
    const supervisors = [supervisor1, supervisor1, supervisor2, supervisor1, supervisor1, admin];

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

    // Create default form data for some assignments with sample ratings
    const defaultForm = createDefaultFormData();

    // Add sample ratings for first two employees (partially filled)
    for (let i = 0; i < 2; i++) {
      const a = assignments[i];
      const emp = employees[i];
      const sup = supervisors[i];

      // Add sample data for achievements
      const sampleAchievements = defaultForm.achievements.map((_, idx: number) => ({
        description: idx === 0 ? 'Successfully led training workshop for field staff' :
                     idx === 1 ? 'Developed new monitoring framework' :
                     idx === 2 ? '' : '',
        employeeRating: idx < 3 ? [3, 2, 0][idx] : 0,
        supervisorRating: 0,
      }));

      const sampleGoals = defaultForm.goals.map((_, idx: number) => ({
        description: idx === 0 ? 'Complete advanced certification course' :
                     idx === 1 ? 'Improve report submission timeline by 20%' :
                     idx === 2 ? 'Mentor 2 junior staff members' :
                     '',
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

      const designationData = designations.find(
        (d) => d.title === emp.designation
      );

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

      // Update assignment status for the first employee to show different states
      if (i === 0) {
        await db.appraisalAssignment.update({
          where: { id: a.id },
          data: { status: 'submitted_by_employee' },
        });
      }
    }

    // Create notifications for all employees
    const notificationData = assignments.map((a) => ({
      userId: a.employeeId,
      assignmentId: a.id,
      type: 'form_assigned',
      title: 'New Appraisal Assigned',
      message: `You have been assigned a new appraisal: ${cycle.name}. Please complete your self-evaluation by ${cycle.submissionDeadline.toLocaleDateString()}.`,
      actionRequired: true,
      link: `/appraisal/${a.id}`,
    }));

    await db.notification.createMany({ data: notificationData });

    return NextResponse.json({
      message: 'Seed data created successfully',
      summary: {
        departments: departments.length,
        designations: designations.length,
        users: 10, // 1 admin + 1 management + 2 supervisors + 6 employees
        cycles: 1,
        assignments: assignments.length,
        notifications: notificationData.length,
      },
      loginEmails: {
        admin: 'admin@eci.com',
        management: 'ceo@eci.com',
        supervisor: 'supervisor1@eci.com / supervisor2@eci.com',
        employees: 'ali.rashid@eci.com / zainab.malik@eci.com / bilal.hassan@eci.com / aisha.khan@eci.com / omar.farooq@eci.com / hina.siddiqui@eci.com',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: String(error) },
      { status: 500 }
    );
  }
}