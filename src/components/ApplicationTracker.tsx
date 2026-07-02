import React, { useState, useMemo } from 'react';
import type { Loan } from '../data/mockLoans';
import { mockLoans } from '../data/mockLoans';
import { Search, Filter, ChevronRight, X } from 'lucide-react';
import { Customer360Details } from './Customer360Details';

interface ApplicationTrackerProps {
  selectedLoanId: string | null;
  onSelectLoan: (loanId: string | null) => void;
  initialFilter?: string;
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  selectedLoanId,
  onSelectLoan,
  initialFilter = 'ALL'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('ALL');
  const [riskTierFilter, setRiskTierFilter] = useState(initialFilter);

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
    return mockLoans.filter((loan) => {
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
  }, [searchTerm, loanTypeFilter, riskTierFilter]);

  // Find currently selected loan object
  const selectedLoan: Loan | null = useMemo(() => {
    return mockLoans.find((l) => l.id === selectedLoanId) || null;
  }, [selectedLoanId]);

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
            <div className="overflow-x-auto">
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
                            {loan.borrowerName}
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
                              {/* Mono-colored or highly-minimal visual progress bar */}
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

            {/* Pagination / Table Summary */}
            <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 bg-zinc-50/10">
              <span className="font-mono">Showing {filteredLoans.length} of {mockLoans.length} portfolio accounts</span>
              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 border border-zinc-200 rounded bg-white hover:bg-zinc-50 disabled:opacity-50" disabled>Prev</button>
                <button className="px-2.5 py-1 border border-zinc-200 rounded bg-white hover:bg-zinc-50 disabled:opacity-50" disabled>Next</button>
              </div>
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
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
