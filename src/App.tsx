import { useState, useEffect } from 'react';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ApplicationTracker } from './components/ApplicationTracker';
import { ModelMonitoring } from './components/ModelMonitoring';
import { GeminiCopilot } from './components/GeminiCopilot';
import { Login } from './components/Login';
import { AuditLogViewer } from './components/AuditLogViewer';
import { checkApiStatus, type ApiStatus } from './services/api';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Cpu, 
  Sparkles, 
  TrendingUp,
  Compass,
  Briefcase,
  Wifi,
  WifiOff,
  Loader2,
  LogOut,
  UserCheck,
  ShieldCheck,
  Bell,
  Info
} from 'lucide-react';

import { StressTesting } from './components/StressTesting';

type TabType = 'overview' | 'underwriting' | 'monitoring' | 'audits' | 'stress_test';

interface SystemNotification {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  tab?: TabType;
  loanId?: string;
  read: boolean;
  timestamp: Date;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [trackerFilter, setTrackerFilter] = useState('ALL');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // Auth Session State
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'officer' | 'manager' | 'auditor'>('officer');

  // API connectivity status
  const [apiStatus, setApiStatus] = useState<ApiStatus & { loading: boolean }>({
    loading: true,
    online: false,
    url: null,
    source: 'offline',
  });

  // Check API health and active session on mount
  useEffect(() => {
    checkApiStatus().then((status) => {
      setApiStatus({ ...status, loading: false });
    });

    // Check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user);
        // Default role based on email if logged in
        let role: 'officer' | 'manager' | 'auditor' = 'officer';
        if (session.user.email?.includes('manager')) role = 'manager';
        else if (session.user.email?.includes('auditor')) role = 'auditor';
        setUserRole(role);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
        let role: 'officer' | 'manager' | 'auditor' = 'officer';
        if (session.user.email?.includes('manager')) role = 'manager';
        else if (session.user.email?.includes('auditor')) role = 'auditor';
        setUserRole(role);
      } else {
        setSessionUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hook database listeners to populate warnings
  useEffect(() => {
    if (!sessionUser) {
      setNotifications([]);
      return;
    }

    const loadInitialAlerts = async () => {
      try {
        const { data: loans } = await supabase.from('loans').select('*');
        const { data: audits } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);

        const newAlerts: SystemNotification[] = [];

        // 1. Check for high risk loans
        (loans || []).forEach(l => {
          if (Number(l.default_probability_12m || 0) >= 0.60) {
            newAlerts.push({
              id: `high-risk-${l.id}`,
              message: `High default probability calculated for ${l.borrower_name} (${(Number(l.default_probability_12m) * 100).toFixed(0)}% default risk)`,
              level: 'critical',
              tab: 'underwriting',
              loanId: l.id,
              read: false,
              timestamp: new Date(l.created_at || Date.now())
            });
          }
        });

        // 2. Check for recent overrides
        (audits || []).forEach(a => {
          newAlerts.push({
            id: `audit-${a.id}`,
            message: `${a.analyst_name} overridden risk level for ${a.loan_id} to ${a.risk_override}`,
            level: 'info',
            tab: 'audits',
            read: false,
            timestamp: new Date(a.created_at || Date.now())
          });
        });

        // Sort by timestamp
        setNotifications(newAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      } catch (err) {
        console.warn('Realtime alerts load failed (using mock alert triggers):', err);
      }
    };

    loadInitialAlerts();

    // Subscribe to Postgres changes on Supabase
    const channel = supabase.channel('table-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'loans' }, (payload) => {
        const newLoan = payload.new;
        if (Number(newLoan.default_probability_12m || 0) >= 0.60) {
          setNotifications(prev => [
            {
              id: `high-risk-${newLoan.id}-${Date.now()}`,
              message: `High default probability calculated for ${newLoan.borrower_name} (${(Number(newLoan.default_probability_12m) * 100).toFixed(0)}% default risk)`,
              level: 'critical',
              tab: 'underwriting',
              loanId: newLoan.id,
              read: false,
              timestamp: new Date()
            },
            ...prev
          ]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        const newAudit = payload.new;
        setNotifications(prev => [
          {
            id: `audit-${newAudit.id}-${Date.now()}`,
            message: `${newAudit.analyst_name} overridden risk level for ${newAudit.loan_id} to ${newAudit.risk_override}`,
            level: 'info',
            tab: 'audits',
            read: false,
            timestamp: new Date()
          },
          ...prev
        ]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  const handleViewLoan = (loanId: string) => {
    if (loanId === 'ALL_HIGH') {
      setTrackerFilter('ALL_HIGH');
      setSelectedLoanId(null);
    } else {
      setSelectedLoanId(loanId);
      setTrackerFilter('ALL');
    }
    setActiveTab('underwriting');
  };

  const handleInspectLoanFromCopilot = (loanId: string) => {
    setSelectedLoanId(loanId);
    setTrackerFilter('ALL');
    setActiveTab('underwriting');
  };

  // Render Login page if not authenticated
  if (!sessionUser) {
    return <Login onLoginSuccess={(user, role) => {
      setSessionUser(user);
      setUserRole(role);
    }} />;
  }

  // Get initials for profile badge
  const getInitials = (role: string) => {
    if (role === 'manager') return 'RM';
    if (role === 'auditor') return 'CA';
    return 'LO';
  };

  const getRoleDisplayName = (role: string) => {
    if (role === 'manager') return 'Risk Manager';
    if (role === 'auditor') return 'Compliance Auditor';
    return 'Loan Officer';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* Top Header Navigation */}
      <header className="h-16 border-b border-zinc-200 px-6 flex items-center justify-between bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-950 rounded flex items-center justify-center text-white font-extrabold font-mono text-sm">
            Δ
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-zinc-950">DEFAULT PREDICTOR</span>
            <span className="text-[10px] text-zinc-400 font-bold ml-2 font-mono">v3.2.0</span>
          </div>
        </div>

        {/* Global summary */}
        <div className="hidden md:flex items-center gap-8 text-xs">
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Active Portfolio</span>
            <span className="font-bold text-zinc-900 font-mono mt-0.5">$4.76M Exposure</span>
          </div>
          <div className="h-8 w-[1px] bg-zinc-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Ingested Data</span>
            <span className="font-bold text-zinc-900 font-mono mt-0.5">45,260 Files</span>
          </div>
          <div className="h-8 w-[1px] bg-zinc-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Target Precision</span>
            <span className="font-bold text-emerald-600 font-mono mt-0.5">91.2% ROC-AUC</span>
          </div>
          <div className="h-8 w-[1px] bg-zinc-200"></div>
          
          {/* Live API status badge */}
          <div className="flex flex-col items-end">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">API Status</span>
            <div className="flex items-center gap-1 mt-0.5">
              {apiStatus.loading ? (
                <>
                  <Loader2 className="h-3 w-3 text-zinc-400 animate-spin" />
                  <span className="font-bold text-zinc-400 font-mono text-[10px]">Connecting...</span>
                </>
              ) : apiStatus.online ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  <span className="font-bold text-emerald-600 font-mono text-[10px]">API Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-500" />
                  <span className="font-bold text-amber-600 font-mono text-[10px]">Warming Up</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action button toggles */}
        <div className="flex items-center gap-3 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="System Alerts"
              aria-label="System Alerts"
              className={`p-2 border rounded-lg text-zinc-700 hover:bg-zinc-50 transition-all relative cursor-pointer ${
                isNotificationOpen ? 'bg-zinc-100 border-zinc-300' : 'bg-white border-zinc-200'
              }`}
            >
              <Bell className="h-4 w-4" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full text-[8px] font-bold w-4 h-4 flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden text-xs">
                <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
                  <span className="font-bold text-zinc-800">System Warnings & Alerts</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] text-zinc-500 hover:text-zinc-950 font-bold hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          // Mark as read
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                          setIsNotificationOpen(false);
                          if (n.tab) {
                            setActiveTab(n.tab);
                            if (n.loanId) setSelectedLoanId(n.loanId);
                          }
                        }}
                        className={`p-3 hover:bg-zinc-50 transition-colors cursor-pointer flex gap-2.5 items-start ${
                          n.read ? 'opacity-60' : 'bg-zinc-50/20'
                        }`}
                      >
                        <div className={`p-1 rounded-full shrink-0 ${
                          n.level === 'critical' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Info className="h-3.5 w-3.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-medium text-zinc-800 leading-normal">{n.message}</p>
                          <span className="text-[9px] text-zinc-400 font-mono block">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-zinc-400">
                      No warnings or system alerts currently active.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.8 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isCopilotOpen 
                ? 'bg-blue-50 border-blue-200 text-brand-accent' 
                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Risk Copilot
          </button>
        </div>
      </header>

      {/* Render cold-start warning banner */}
      {!apiStatus.loading && !apiStatus.online && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-semibold">Render API is waking up</span>
            <span className="text-amber-600">— The free-tier server starts cold. Dashboard showing local data; live API will connect shortly.</span>
          </div>
          <button
            onClick={() => {
              setApiStatus(prev => ({ ...prev, loading: true }));
              checkApiStatus().then(s => setApiStatus({ ...s, loading: false }));
            }}
            className="text-amber-700 font-bold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex items-stretch">
        
        {/* Sidebar Left Navigation */}
        <aside className="w-56 border-r border-zinc-200 bg-white p-4 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pl-2">Navigation</span>
              <nav className="mt-2.5 space-y-1">
                <button
                  onClick={() => { setActiveTab('overview'); setSelectedLoanId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'overview' 
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Risk Overview
                </button>
                <button
                  onClick={() => { setActiveTab('underwriting'); setSelectedLoanId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'underwriting' 
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Loan Underwriting
                </button>
                <button
                  onClick={() => { setActiveTab('monitoring'); setSelectedLoanId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'monitoring' 
                      ? 'bg-zinc-950 text-white' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <Cpu className="h-4 w-4" />
                  Model Diagnostics
                </button>
                {(userRole === 'manager' || userRole === 'auditor') && (
                  <>
                    <button
                      onClick={() => { setActiveTab('audits'); setSelectedLoanId(null); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'audits' 
                          ? 'bg-zinc-950 text-white' 
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Compliance Audits
                    </button>
                    <button
                      onClick={() => { setActiveTab('stress_test'); setSelectedLoanId(null); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'stress_test' 
                          ? 'bg-zinc-950 text-white' 
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Stress Testing
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* System Health */}
            <div className="border-t border-zinc-100 pt-5">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pl-2">System Health</span>
              <div className="mt-3.5 space-y-3.5 pl-2 font-mono text-[10px]">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-500" /> AUC Score</span>
                  <span className="font-bold text-zinc-900">0.942</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-zinc-400" /> Database</span>
                  <span className="font-bold text-zinc-900">Supabase</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1.5"><Compass className="h-3 w-3 text-zinc-400" /> Host API</span>
                  <div className="flex items-center gap-1">
                    {apiStatus.loading ? (
                      <Loader2 className="h-2.5 w-2.5 text-zinc-400 animate-spin" />
                    ) : apiStatus.online ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                    )}
                    <span className="font-bold text-zinc-900">Render</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User profile & Sign Out */}
          <div className="border-t border-zinc-150 pt-4 space-y-3">
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(userRole)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-900 block truncate max-w-[100px]">
                    {sessionUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-zinc-400 block font-mono">
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            
            <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-lg flex items-center gap-1.5 text-[9px] font-mono text-emerald-800">
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>RBAC Policy Verified</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Center Work Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-white">
          <div className="max-w-6xl mx-auto h-full">
            {activeTab === 'overview' && (
              <OverviewDashboard onViewLoan={handleViewLoan} apiOnline={apiStatus.online} />
            )}
            {activeTab === 'underwriting' && (
              <ApplicationTracker 
                selectedLoanId={selectedLoanId}
                onSelectLoan={setSelectedLoanId}
                initialFilter={trackerFilter}
                apiOnline={apiStatus.online}
                userRole={userRole}
              />
            )}
            {activeTab === 'monitoring' && (
              <ModelMonitoring apiOnline={apiStatus.online} userRole={userRole} />
            )}
            {activeTab === 'audits' && (
              <AuditLogViewer onInspectLoan={handleInspectLoanFromCopilot} />
            )}
            {activeTab === 'stress_test' && (
              <StressTesting onInspectLoan={handleInspectLoanFromCopilot} apiOnline={apiStatus.online} />
            )}
          </div>
        </main>

        {/* Gemini Copilot Drawer */}
        <GeminiCopilot 
          onInspectLoan={handleInspectLoanFromCopilot}
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
