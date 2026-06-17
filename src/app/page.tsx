'use client';

import { useAppStore } from '@/store/app-store';

// Dashboard Components
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import SupervisorDashboard from '@/components/dashboards/SupervisorDashboard';
import ManagementDashboard from '@/components/dashboards/ManagementDashboard';
import EmployeeDashboard from '@/components/dashboards/EmployeeDashboard';

// Master Data Components (Enhanced)
import MasterDataOverview from '@/components/master/MasterDataOverview';
import EnhancedEmployeeList from '@/components/master/EnhancedEmployeeList';
import EnhancedEmployeeForm from '@/components/master/EnhancedEmployeeForm';
import EnhancedDepartmentList from '@/components/master/EnhancedDepartmentList';
import EnhancedDesignationList from '@/components/master/EnhancedDesignationList';
import RatingScaleManager from '@/components/master/RatingScaleManager';
import AppraisalCategoryManager from '@/components/master/AppraisalCategoryManager';

// Appraisal Components
import CycleList from '@/components/cycles/CycleList';
import CycleForm from '@/components/cycles/CycleForm';
import CycleDetail from '@/components/cycles/CycleDetail';
import AppraisalList from '@/components/appraisal/AppraisalList';
import AppraisalForm from '@/components/appraisal/AppraisalForm';
import AppraisalView from '@/components/appraisal/AppraisalView';

// Other Components
import NotificationPanel from '@/components/notifications/NotificationPanel';
import ReportViewer from '@/components/reports/ReportViewer';
import AuditLogViewer from '@/components/reports/AuditLogViewer';

// AppShell components
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';

// Login view
import LoginView from '@/components/auth/LoginView';

function DashboardRouter() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role;

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'supervisor') return <SupervisorDashboard />;
  if (role === 'management') return <ManagementDashboard />;
  return <EmployeeDashboard />;
}

function ViewRouter() {
  const { currentView } = useAppStore();

  switch (currentView) {
    case 'dashboard':
      return <DashboardRouter />;
    // Master Data
    case 'master-data':
      return <MasterDataOverview />;
    case 'employees':
      return <EnhancedEmployeeList />;
    case 'employee-create':
    case 'employee-detail':
      return <EnhancedEmployeeForm />;
    case 'departments':
      return <EnhancedDepartmentList />;
    case 'designations':
      return <EnhancedDesignationList />;
    case 'rating-scales':
      return <RatingScaleManager />;
    case 'appraisal-categories':
      return <AppraisalCategoryManager />;
    // Appraisal
    case 'cycles':
      return <CycleList />;
    case 'cycle-create':
      return <CycleForm />;
    case 'cycle-detail':
      return <CycleDetail />;
    case 'appraisal-list':
      return <AppraisalList />;
    case 'appraisal-form':
      return <AppraisalForm />;
    case 'appraisal-view':
      return <AppraisalView />;
    // Other
    case 'notifications':
      return <NotificationPanel />;
    case 'reports':
      return <ReportViewer />;
    case 'audit-logs':
      return <AuditLogViewer />;
    case 'settings':
      return <SettingsPlaceholder />;
    default:
      return <DashboardRouter />;
  }
}

function SettingsPlaceholder() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">Settings</p>
        <p className="text-sm mt-1">Settings page coming soon.</p>
      </div>
    </div>
  );
}

function AppShell() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && <AppSidebar />}
      <div className="flex-1 flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <ViewRouter />
        </main>
        <footer className="eci-gradient-header text-white text-center text-xs py-3 mt-auto">
          © 2025 ECI Pvt Ltd. All Rights Reserved. Performance Appraisal Management System
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  const { isLoggedIn } = useAppStore();

  if (!isLoggedIn) {
    return <LoginView />;
  }

  return <AppShell />;
}