'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  label: string;
}

const DEMO_USERS: DemoUser[] = [
  { id: '1', email: 'admin@eci.com', name: 'Sarah Ahmad', role: 'admin', label: 'Admin (HR)' },
  { id: '2', email: 'supervisor1@eci.com', name: 'Fatima Noor', role: 'supervisor', label: 'Supervisor 1' },
  { id: '3', email: 'supervisor2@eci.com', name: 'Imran Ali', role: 'supervisor', label: 'Supervisor 2' },
  { id: '4', email: 'ceo@eci.com', name: 'Ahmed Khan', role: 'management', label: 'Management (CEO)' },
  { id: '5', email: 'ali.rashid@eci.com', name: 'Ali Rashid', role: 'employee', label: 'Employee 1' },
  { id: '6', email: 'zainab.malik@eci.com', name: 'Zainab Malik', role: 'employee', label: 'Employee 2' },
];

export default function LoginView() {
  const { setCurrentUser, setIsLoggedIn, setCurrentView } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setIsLoggedIn(true);
        setCurrentView('dashboard');
        toast.success(`Welcome, ${user.name}!`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Login failed');
      }
    } catch {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: DemoUser) => {
    setDemoLoading(demoUser.role);
    try {
      // Try to find a real user, otherwise use demo data
      const res = await fetch(`/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoUser.email }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setIsLoggedIn(true);
        setCurrentView('dashboard');
        toast.success(`Welcome, ${user.name}!`);
      } else {
        // Fallback: create a mock user for demo
        setCurrentUser({
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          employeeId: `ECI-${demoUser.role.toUpperCase()}-001`,
          designation: demoUser.role === 'admin' ? 'HR Manager' : demoUser.role === 'supervisor' ? 'Team Lead' : demoUser.role === 'management' ? 'CEO' : 'Officer',
          department: demoUser.role === 'admin' ? 'Human Resources' : 'Operations',
          phone: '',
          overallExp: '5 Years',
          yearsWithECI: '3 Years',
          currentEdu: 'MBA',
          lineManagerId: null,
          role: demoUser.role as any,
          isActive: true,
          lineManager: null,
        });
        setIsLoggedIn(true);
        setCurrentView('dashboard');
        toast.success(`Demo login as ${demoUser.label}`);
      }
    } catch {
      toast.error('Demo login failed');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/eci-logo.jpg"
            alt="ECI Logo"
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-eci-blue">ECI HRM</h1>
          <p className="text-muted-foreground">Performance Appraisal System</p>
        </div>

        {/* Login Card */}
        <Card className="eci-card">
          <CardHeader>
            <CardTitle className="text-lg text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@eci.com.pk"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button className="w-full eci-btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              Sign In
            </Button>
          </CardContent>
        </Card>

        {/* Demo Users */}
        <Card className="eci-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_USERS.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDemoLogin(user)}
                  disabled={!!demoLoading}
                >
                  {demoLoading === user.email ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  {user.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} ECI Pvt Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}