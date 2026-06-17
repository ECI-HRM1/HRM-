import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getLLMResponse(messages: { role: string; content: string }[]) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SDK = require('z-ai-web-dev-sdk').default;
  const zai = await SDK.create();
  const response = await zai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages,
  });
  return response.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cycleId } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    const cycle = await db.appraisalCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    const assignments = await db.appraisalAssignment.findMany({
      where: { cycleId },
      include: {
        employee: {
          select: { name: true, employeeId: true, designation: true, department: true },
        },
        supervisor: {
          select: { name: true },
        },
        formData: true,
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'No assignments found for this cycle' }, { status: 400 });
    }

    // Build summary data
    const employeeSummaries = assignments.map((a) => {
      const fd = a.formData;
      if (!fd) {
        return { name: a.employee.name, department: a.employee.department, status: 'No form data' };
      }
      return {
        name: a.employee.name,
        employeeId: a.employee.employeeId,
        designation: a.employee.designation,
        department: a.employee.department,
        supervisor: a.supervisor.name,
        status: a.status,
        empPercentage: fd.overallPercentageEmployee,
        empRating: fd.ratingEmployee,
        supPercentage: fd.overallPercentageSupervisor,
        supRating: fd.ratingSupervisor,
      };
    });

    const prompt = `You are an HR analytics expert. Analyze the following appraisal cycle summary data and provide comprehensive insights.

## Cycle Information
- Name: ${cycle.name}
- Type: ${cycle.cycleType}
- Year: ${cycle.year}
- Period: ${cycle.periodFrom} to ${cycle.periodTo}
- Total Appraisals: ${assignments.length}

## Employee Appraisal Results
${employeeSummaries.map((e: { name: string; department: string; designation: string; empPercentage: number; empRating: string; supPercentage: number; supRating: string; status: string }, i: number) => 
  `${i + 1}. ${e.name} (${e.designation}, ${e.department}) - Employee: ${e.empPercentage}% (${e.empRating}), Supervisor: ${e.supPercentage}% (${e.supRating}), Status: ${e.status}`
).join('\n')}

Please provide a structured analysis in JSON format:
{
  "cycleOverview": "Overall cycle summary (2-3 sentences)",
  "overallStatistics": {
    "averageEmployeeScore": number,
    "averageSupervisorScore": number,
    "completionRate": number (percentage),
    "highestPerformer": "name",
    "lowestPerformer": "name"
  },
  "departmentAnalysis": [{"department": "name", "averageScore": number, "count": number}],
  "keyFindings": ["3-5 key findings from the data"],
  "recommendations": ["3-5 organizational recommendations"],
  "topPerformers": ["names of employees with score > 80%"],
  "needsAttention": ["names of employees with score < 50%"],
  "trends": "Any notable trends observed"
}

Return ONLY the JSON, no other text.`;

    const aiResponse = await getLLMResponse([
      { role: 'user', content: prompt },
    ]);

    let analysisJson = '{}';
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysisJson = JSON.stringify(parsed);
      }
    } catch {
      analysisJson = JSON.stringify({ rawAnalysis: aiResponse });
    }

    return NextResponse.json({
      message: 'Cycle summary generated successfully',
      cycleId,
      cycleName: cycle.name,
      totalAppraisals: assignments.length,
      analysis: JSON.parse(analysisJson),
    });
  } catch (error) {
    console.error('AI cycle summary error:', error);
    return NextResponse.json({ error: 'Failed to generate cycle summary' }, { status: 500 });
  }
}