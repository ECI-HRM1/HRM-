---
Task ID: 4
Agent: API Routes Developer
Task: Write all API routes

Work Log:
- Created complete API directory structure under src/app/api/
- Wrote /api/auth/route.ts - POST login (find user by email)
- Wrote /api/auth/switch/route.ts - POST role switching for admin testing
- Wrote /api/users/route.ts - GET (list with filters) + POST (create user)
- Wrote /api/users/[id]/route.ts - GET + PUT + DELETE (soft delete)
- Wrote /api/users/[id]/subordinates/route.ts - GET subordinates by lineManagerId
- Wrote /api/departments/route.ts - GET + POST
- Wrote /api/designations/route.ts - GET + POST
- Wrote /api/cycles/route.ts - GET (with assignment counts) + POST
- Wrote /api/cycles/[id]/route.ts - GET (with assignments) + PUT (draft only) + DELETE (draft only)
- Wrote /api/cycles/[id]/activate/route.ts - POST (draft→active, creates assignments + notifications)
- Wrote /api/cycles/[id]/close/route.ts - POST (active→closed)
- Wrote /api/assignments/route.ts - GET with filters (cycleId, employeeId, supervisorId, status, department)
- Wrote /api/assignments/[id]/route.ts - GET single assignment with form data
- Wrote /api/assignments/[id]/form/route.ts - GET (auto-creates defaults) + PUT (saves form, calculates scores)
- Wrote /api/assignments/[id]/submit/route.ts - POST with full workflow state machine (6 actions, validation, audit logs, notifications)
- Wrote /api/notifications/route.ts - GET with unread count
- Wrote /api/notifications/[id]/read/route.ts - POST mark single as read
- Wrote /api/notifications/read-all/route.ts - POST mark all as read
- Wrote /api/dashboard/stats/route.ts - GET role-based dashboard statistics
- Wrote /api/ai/analyze/route.ts - POST generates AI analysis for individual appraisal using z-ai-web-dev-sdk
- Wrote /api/ai/cycle-summary/route.ts - POST generates AI summary for entire cycle
- Wrote /api/reports/export/route.ts - GET export data in JSON format
- Wrote /api/audit-logs/route.ts - GET audit logs by assignment
- Wrote /api/seed/route.ts - POST comprehensive seed data (10 users, 6 departments, 9 designations, 1 active cycle, 6 assignments, notifications, sample form data)
- Removed old placeholder /api/route.ts
- All routes pass ESLint with zero errors

Stage Summary:
- 25 route handler files created across 23 API endpoints
- Full appraisal workflow state machine implemented with 6 valid actions
- z-ai-web-dev-sdk integration for AI analysis (uses ZAI.create() static method)
- Seed endpoint creates complete demo dataset for testing with 10 users across all roles
- All calculations use calculateAppraisalScores() from constants.ts