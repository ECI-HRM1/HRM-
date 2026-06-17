'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Clock, CheckCircle, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import type { AppraisalStatus } from '@/lib/types';
import { APPRAISAL_STATUS_LABELS, APPRAISAL_STATUS_COLORS } from '@/lib/constants';

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  department: string;
  assignmentStatus: AppraisalStatus;
  assignmentId?: string;
}

interface SupervisorStats {
  teamMembers: number;
  pendingEvaluations: number;
  submittedEvaluations: number;
  approvedEvaluations: number;
  teamPerformance: { name: string; score: number }[];
  teamMembersList: TeamMember[];
}

const MOCK_STATS: SupervisorStats = {
  teamMembers: 4,
  pendingEvaluations: 2,
  submittedEvaluations: 1,
  approvedEvaluations: 1,
  teamPerformance: [
    { name: 'Ali Rashid', score: 78 },
    { name: 'Zainab Malik', score: 85 },
    { name: 'Hassan Ahmed', score: 72 },
    { name: 'Ayesha Khan', score: 90 },
  ],
  teamMembersList: [
    { id: '5', name: 'Ali Rashid', designation: 'Software Engineer', department: 'Engineering', assignmentStatus: 'employee_review_pending' },
    { id: '6', name: 'Zainab Malik', designation: 'Financial Analyst', department: 'Finance', assignmentStatus: 'supervisor_review_pending' },
    { id: '7', name: 'Hassan Ahmed', designation: 'Operations Executive', department: 'Operations', assignmentStatus: 'approved' },
    { id: '8', name: 'Ayesha Khan', designation: 'Marketing Specialist', department: 'Marketing', assignmentStatus: 'employee_review_pending' },
  ],
};

export default function SupervisorDashboard() {
  const { currentUser, setCurrentView, setViewParams } = useAppStore();
  const [stats, setStats] = useState<SupervisorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    async function fetchData() {
      try {
        const res = await fetch(`/api/dashboard/stats?userId=${currentUser.id}&role=supervisor`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setStats(MOCK_STATS);
        }
      } catch {
        setStats(MOCK_STATS);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const cards = [
    { label: 'Team Members', value: stats?.teamMembers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending Evaluations', value: stats?.pendingEvaluations ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Submitted Evaluations', value: stats?.submittedEvaluations ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="eci-card cursor-pointer"
            onClick={() => {
              if (card.label === 'Pending Evaluations') setCurrentView('appraisal-list');
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance Chart */}
        <Card className="eci-card">
          <CardHeader>
            <CardTitle className="text-lg">Team Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.teamPerformance && stats.teamPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.teamPerformance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: number) => [`${value}%`, 'Avg Score']}
                  />
                  <Bar dataKey="score" fill="#1a3a5c" radius={[4, 4, 0, 0]} name="score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No performance data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="eci-card">
          <CardHeader>
            <CardTitle className="text-lg">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.teamMembersList && stats.teamMembersList.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto eci-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.teamMembersList.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.designation}</TableCell>
                        <TableCell>
                          <Badge className={APPRAISAL_STATUS_COLORS[member.assignmentStatus] || 'bg-gray-100 text-gray-800'}>
                            {APPRAISAL_STATUS_LABELS[member.assignmentStatus] || member.assignmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.assignmentId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentView('appraisal-form');
                                setViewParams({ id: member.assignmentId });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No team members assigned
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}