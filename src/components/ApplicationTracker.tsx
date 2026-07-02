import React, { useState, useMemo, useEffect } from 'react';
import type { Loan } from '../services/api';
import { getLoans, submitNewApplication } from '../services/api';
import { mockLoans } from '../data/mockLoans';
import { Search, Filter, ChevronRight, X, PlusCircle, Loader2 } from 'lucide-react';
import { Customer360Details } from './Customer360Details';

interface ApplicationTrackerProps {
  selectedLoanId: string | null;
  onSelectLoan: (loanId: string | null) => void;
  initialFilter?: string;
  apiOnline?: boolean;
  userRole?: 'officer' | 'manager' | 'auditor';
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  selectedLoanId,
  onSelectLoan,
  initialFilter = 'ALL',
  apiOnline,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('ALL');
  const [riskTierFilter, setRiskTierFilter] = useState(initialFilter);
  
  // Ingestion form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [borrowerName, setBorrowerName] = useState('');
  const [loanType, setLoanType] = useState('SME');
  const [borrowerSegment, setBorrowerSegment] = useState('SME');
  const [amount, setAmount] = useState('250000');
  const [interestRate, setInterestRate] = useState('8.5');
  const [termMonths, setTermMonths] = useState('60');
  const [ficoScore, setFicoScore] = useState('710');
  const [dti, setDti] = useState('32.5');
  const [missedPayments12M, setMissedPayments12M] = useState('0');
  const [ltv, setLtv] = useState('75');
  const [officerNotesSentiment, setOfficerNotesSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Positive');
  const [officerNotesSummary, setOfficerNotesSummary] = useState('');
  const [sectorNewsSentiment, setSectorNewsSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Neutral');
  const [sectorNewsSummary, setSectorNewsSummary] = useState('');
  const [communicationSentiment, setCommunicationSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Positive');

  // Live loans state
  const [liveLoans, setLiveLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load loans from API/Database or fallback
  useEffect(() => {
    if (apiOnline) {
      setIsLoading(true);
      getLoans()
        .then((data) => {
          setLiveLoans(data.loans);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('[Application Tracker] Error fetching loans:', err);
          setIsLoading(false);
        });
    } else {
      setLiveLoans([]);
    }
  }, [apiOnline, refreshTrigger]);

  // Resolved list of loans (live API data or local fallback)
  const resolvedLoans = useMemo(() => {
    return liveLoans.length > 0 ? liveLoans : (mockLoans as unknown as Loan[]);
  }, [liveLoans]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return resolvedLoans.filter((loan) => {
      // 1. Search term match
      const matchesSearch = 
        loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Loan Type filter
      const matchesType = loanTypeFilter === 'ALL' || loan.loanType === loanTypeFilter;
      
      // 3. Risk Tier filter
      let matchesRisk = true;
      if (riskTierFilter === 'ALL_HIGH') {
        matchesRisk = loan.riskTier === 'High';
      } else if (riskTierFilter !== 'ALL') {
        matchesRisk = loan.riskTier === riskTierFilter;
      }

      return matchesSearch && matchesType && matchesRisk;
    });
  }, [resolvedLoans, searchTerm, loanTypeFilter, riskTierFilter]);

  // Find currently selected loan object
  const selectedLoan = useMemo(() => {
    return resolvedLoans.find((l) => l.id === selectedLoanId) || null;
  }, [resolvedLoans, selectedLoanId]);

  // Handle new loan application submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerName || !officerNotesSummary) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      borrowerName,
      loanType,
      borrowerSegment,
      amount: Number(amount),
      interestRate: Number(interestRate),
      termMonths: Number(termMonths),
      ficoScore: Number(ficoScore),
      dti: Number(dti),
      missedPayments12M: Number(missedPayments12M),
      ltv: loanType === 'Mortgage' ? Number(ltv) : null,
      officerNotesSentiment,
      officerNotesSummary,
      sectorNewsSentiment,
      sectorNewsSummary: sectorNewsSummary || `Sector indicators show ${sectorNewsSentiment.toLowerCase()} trend.`,
      communicationSentiment,
    };

    try {
      await submitNewApplication(payload);
      setRefreshTrigger((prev) => prev + 1); // reload loans list
      setIsFormOpen(false);
      
      // Reset form
      setBorrowerName('');
      setOfficerNotesSummary('');
      setSectorNewsSummary('');
    } catch (err: any) {
      setFormError(err.message || 'Ingestion failed. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
            Loan Underwriting & Audits
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Analyze credit files and default probabilities forecasted 12 months in advance.
          </p>
        </div>
        {userRole !== 'auditor' ? (
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-4 md:mt-0 flex items-center gap-2 bg-zinc-950 text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Ingest Application
          </button>
        ) : (
          <div className="mt-4 md:mt-0 text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-lg font-mono font-bold">
            🔒 Auditor Read-Only
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="flex gap-6 items-start relative transition-all duration-300">
        
        {/* Loans Table Section (Shrinks when a loan is selected) */}
        <div className={`transition-all duration-300 ${selectedLoanId ? 'w-full lg:w-[60%]' : 'w-full'}`}>
          <div className="premium-card bg-white overflow-hidden">
            
            {/* Table Toolbar */}
            <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/30">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search borrower or Loan ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-all"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Loan Type Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    value={loanTypeFilter}
                    onChange={(e) => setLoanTypeFilter(e.target.value)}
                    title="Filter by loan type"
                    aria-label="Filter by loan type"
                    className="text-xs font-semibold text-zinc-600 bg-transparent focus:outline-none border-none cursor-pointer pr-1"
                  >
                    <option value="ALL">All Loan Types</option>
                    <option value="SME">SME Loans</option>
                    <option value="Business">Business Loans</option>
                    <option value="Mortgage">Mortgages</option>
                    <option value="Personal">Personal Loans</option>
                  </select>
                </div>

                {/* Risk Tier Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5">
                  <select
                    value={riskTierFilter}
                    onChange={(e) => setRiskTierFilter(e.target.value)}
                    title="Filter by risk tier"
                    aria-label="Filter by risk tier"
                    className="text-xs font-semibold text-zinc-600 bg-transparent focus:outline-none border-none cursor-pointer pr-1"
                  >
                    <option value="ALL">All Risk Tiers</option>
                    <option value="ALL_HIGH">High Risk Only</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>

              </div>

            </div>

            {/* Loans Datagrid */}
            <div className="overflow-x-auto relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-brand-accent animate-spin" />
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="py-3.5 px-4 font-mono">Loan ID</th>
                    <th className="py-3.5 px-4">Borrower</th>
                    <th className="py-3.5 px-4">Segment / Type</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">FICO</th>
                    <th className="py-3.5 px-4">12M Default Prob.</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        No credit records matches the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const isSelected = loan.id === selectedLoanId;

                      return (
                        <tr 
                          key={loan.id}
                          className={`hover:bg-zinc-50 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : ''}`}
                          onClick={() => onSelectLoan(loan.id)}
                        >
                          <td className="py-4 px-4 font-mono text-zinc-500 font-medium">
                            {loan.id}
                          </td>
                          <td className="py-4 px-4 font-bold text-zinc-950">
                            <div className="flex items-center gap-2">
                              {loan.borrowerName}
                              {loan.actualDefault !== undefined && loan.actualDefault !== null && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                                  loan.actualDefault === 1 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                  {loan.actualDefault === 1 ? 'Defaulted' : 'Repaid'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-zinc-600">
                            <span className="text-[10px] font-mono border border-zinc-200 rounded px-1.5 py-0.5 bg-zinc-50 font-semibold mr-1.5">
                              {loan.borrowerSegment}
                            </span>
                            <span className="text-zinc-400 text-xs">{loan.loanType}</span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-medium text-zinc-900">
                            {formatCurrency(loan.amount)}
                          </td>
                          <td className="py-4 px-4 font-mono font-medium text-zinc-900">
                            {loan.ficoScore}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-zinc-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    loan.riskTier === 'High' ? 'bg-rose-500' :
                                    loan.riskTier === 'Medium' ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${loan.defaultProbability12M * 100}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-xs font-bold text-zinc-900">
                                {(loan.defaultProbability12M * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                              <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Analyze</span>
                              <ChevronRight className="h-4 w-4 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary */}
            <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 bg-zinc-50/10">
              <span className="font-mono">Showing {filteredLoans.length} of {resolvedLoans.length} active credit files</span>
            </div>

          </div>
        </div>

        {/* Selected Customer 360 Side Panel */}
        {selectedLoanId && selectedLoan && (
          <div className="w-full lg:w-[40%] flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden sticky top-6 premium-shadow animate-slideIn">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">Applicant File Analysis</h3>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{selectedLoan.id}</p>
              </div>
              <button 
                onClick={() => onSelectLoan(null)}
                title="Close panel"
                aria-label="Close panel"
                className="p-1 hover:bg-zinc-200/50 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            
            <div className="max-h-[750px] overflow-y-auto">
              <Customer360Details 
                loan={selectedLoan} 
                onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
                userRole={userRole}
              />
            </div>
          </div>
        )}

      </div>

      {/* Ingest Application Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto premium-shadow flex flex-col animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900">New Credit Application Ingestion</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Ingest files to evaluate default probabilities using the hybrid predictive engine.</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                title="Close Modal"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3.5 font-medium">
                  {formError}
                </div>
              )}

              {/* Section 1: Structured Demographics */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1">
                  1. Structured Credit Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Borrower Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Loan Type</label>
                      <select
                        value={loanType}
                        onChange={(e) => setLoanType(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 cursor-pointer"
                      >
                        <option value="SME">SME</option>
                        <option value="Mortgage">Mortgage</option>
                        <option value="Business">Business</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Segment</label>
                      <select
                        value={borrowerSegment}
                        onChange={(e) => setBorrowerSegment(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 cursor-pointer"
                      >
                        <option value="SME">SME</option>
                        <option value="Retail">Retail</option>
                        <option value="Corporate">Corporate</option>
                        <option value="HNW">HNW</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Amount ($) *</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Term (Months)</label>
                    <input
                      type="number"
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">FICO Score</label>
                    <input
                      type="number"
                      min="300"
                      max="850"
                      value={ficoScore}
                      onChange={(e) => setFicoScore(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">DTI Ratio (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dti}
                      onChange={(e) => setDti(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Missed Payments (12M)</label>
                    <select
                      value={missedPayments12M}
                      onChange={(e) => setMissedPayments12M(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 cursor-pointer"
                    >
                      <option value="0">0 Missed</option>
                      <option value="1">1 Missed</option>
                      <option value="2">2 Missed</option>
                      <option value="3">3 Missed</option>
                      <option value="4">4+ Missed</option>
                    </select>
                  </div>
                  {loanType === 'Mortgage' && (
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">LTV Ratio (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ltv}
                        onChange={(e) => setLtv(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Unstructured Data Narrative fusions */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1">
                  2. Unstructured Narratives & Sentiment Fusions
                </h3>
                <div className="space-y-4">
                  
                  {/* Notes & Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Loan Officer Notes Summary *</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Borrower operates retail locations. Strong historical compliance, but inventory turnover declined..."
                        value={officerNotesSummary}
                        onChange={(e) => setOfficerNotesSummary(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Officer Notes Sentiment</label>
                      <div className="flex flex-col gap-1.5 mt-1 text-xs">
                        {['Positive', 'Neutral', 'Negative'].map((sent) => (
                          <label key={sent} className="flex items-center gap-2 cursor-pointer font-medium text-zinc-700">
                            <input
                              type="radio"
                              name="notes_sent"
                              value={sent}
                              checked={officerNotesSentiment === sent}
                              onChange={() => setOfficerNotesSentiment(sent as any)}
                              className="text-zinc-950 focus:ring-zinc-950"
                            />
                            {sent}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* News Summary & Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Macro/Sector News Indicators</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Tariffs impact domestic manufacturing, sector contracts slightly..."
                        value={sectorNewsSummary}
                        onChange={(e) => setSectorNewsSummary(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Sector News Sentiment</label>
                      <div className="flex flex-col gap-1.5 mt-1 text-xs">
                        {['Positive', 'Neutral', 'Negative'].map((sent) => (
                          <label key={sent} className="flex items-center gap-2 cursor-pointer font-medium text-zinc-700">
                            <input
                              type="radio"
                              name="news_sent"
                              value={sent}
                              checked={sectorNewsSentiment === sent}
                              onChange={() => setSectorNewsSentiment(sent as any)}
                              className="text-zinc-950 focus:ring-zinc-950"
                            />
                            {sent}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Communications Sentiment */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Borrower Communications Channel Sentiment</label>
                    <div className="flex gap-6 mt-1 text-xs">
                      {['Positive', 'Neutral', 'Negative'].map((sent) => (
                        <label key={sent} className="flex items-center gap-2 cursor-pointer font-medium text-zinc-700">
                          <input
                            type="radio"
                            name="comm_sent"
                            value={sent}
                            checked={communicationSentiment === sent}
                            onChange={() => setCommunicationSentiment(sent as any)}
                            className="text-zinc-950 focus:ring-zinc-950"
                          />
                          {sent}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-zinc-950 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    'Ingest & Evaluate Risk'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
