import { useState, useEffect } from 'react';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ApplicationTracker } from './components/ApplicationTracker';
import { ModelMonitoring } from './components/ModelMonitoring';
import { GeminiCopilot } from './components/GeminiCopilot';
import { checkApiStatus, type ApiStatus } from './services/api';
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
  Loader2
} from 'lucide-react';

type TabType = 'overview' | 'underwriting' | 'monitoring';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [trackerFilter, setTrackerFilter] = useState('ALL');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  
  // API connectivity status
  const [apiStatus, setApiStatus] = useState<ApiStatus & { loading: boolean }>({
    loading: true,
    online: false,
    url: null,
  });

  // Check API health on mount
  useEffect(() => {
    checkApiStatus().then((status) => {
      setApiStatus({ ...status, loading: false });
    });
  }, []);

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
            <span className="text-[10px] text-zinc-400 font-bold ml-2 font-mono">v2.4.1</span>
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.8 border rounded-lg text-xs font-semibold transition-all ${
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

          {/* User profile */}
          <div className="border-t border-zinc-100 pt-4 flex items-center gap-2.5 pl-1.5">
            <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-800">
              RA
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block">Risk Analyst</span>
              <span className="text-[9px] text-zinc-400 block font-mono">IDBI-Innovate</span>
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
              />
            )}
            {activeTab === 'monitoring' && (
              <ModelMonitoring apiOnline={apiStatus.online} />
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
