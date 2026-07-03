import React, { useState } from 'react';
import type { Loan } from '../services/api';
import { submitAudit, submitLoanOutcome } from '../services/api';
import { FileSpreadsheet, MessageSquare, Newspaper, HelpCircle, FileText, CheckCircle, ShieldAlert, Award, Printer } from 'lucide-react';

interface Customer360DetailsProps {
  loan: Loan;
  onUpdate?: () => void;
  userRole?: 'officer' | 'manager' | 'auditor';
}

export const Customer360Details: React.FC<Customer360DetailsProps> = ({ loan, onUpdate, userRole }) => {
  const [riskOverride, setRiskOverride] = useState(loan.riskTier);
  const [auditNotes, setAuditNotes] = useState('');
  const [isAudited, setIsAudited] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrintMemo = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing document export. Please enable pop-ups.');
      return;
    }

    const decisionVal = loan.decisionStatus || (loan.defaultProbability12M >= 0.60 ? 'REJECTED' : loan.defaultProbability12M < 0.15 ? 'APPROVED' : 'REFER');
    const recommendedLimitVal = loan.recommendedLimit !== undefined ? loan.recommendedLimit : 
      (decisionVal === 'REJECTED' ? 0.0 : loan.amount * (1.0 - loan.defaultProbability12M) * (loan.ficoScore / 850.0));
    const recommendedAprVal = loan.recommendedApr !== undefined ? loan.recommendedApr : (loan.interestRate + (loan.defaultProbability12M * 12.0));

    const shapRows = (loan.shapExplanations || []).map(exp => {
      const isRiskIncreaser = exp.value > 0;
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e4e4e7; font-weight: 500;">${exp.feature}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e4e4e7; font-family: monospace; font-weight: bold; text-align: center;">${exp.displayValue}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e4e4e7; font-family: monospace; font-weight: bold; text-align: right; color: ${isRiskIncreaser ? '#dc2626' : '#16a34a'};">
            ${exp.value > 0 ? '+' : ''}${(exp.value * 100).toFixed(0)}%
          </td>
        </tr>
      `;
    }).join('');

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Appraisal Memo - ${loan.borrowerName}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #18181b; margin: 40px; line-height: 1.5; font-size: 13px; }
            .header { border-bottom: 3px double #d4d4d8; padding-bottom: 15px; margin-bottom: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .header p { margin: 5px 0 0 0; font-size: 11px; color: #71717a; font-family: monospace; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #71717a; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; margin-top: 25px; margin-bottom: 12px; letter-spacing: 0.5px; }
            .grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .grid-item { background: #fafafa; border: 1px solid #e4e4e7; padding: 10px; border-radius: 6px; }
            .grid-item span { font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: bold; display: block; }
            .grid-item strong { font-size: 13px; color: #18181b; margin-top: 3px; display: block; font-family: monospace; }
            .decision-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-family: monospace; text-transform: uppercase; font-size: 11px; }
            .badge-approved { background: #d1fae5; color: #065f46; }
            .badge-rejected { background: #fee2e2; color: #991b1b; }
            .badge-refer { background: #fef3c7; color: #92400e; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f4f4f5; padding: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #71717a; border-bottom: 1px solid #e4e4e7; }
            .footer { margin-top: 50px; border-top: 1px solid #e4e4e7; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature-line { border-top: 1px solid #71717a; width: 200px; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold; color: #71717a; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="background: #18181b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 11px; cursor: pointer;">
              Print / Save PDF
            </button>
          </div>
          
          <div class="header">
            <h1>RiskShield Credit Appraisal Memo</h1>
            <p>Ledger REF: ${loan.id} | Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="section-title">Borrower Profile & Core Metrics</div>
          <div class="grid">
            <div class="grid-item">
              <span>Applicant Name</span>
              <strong style="font-family: inherit;">${loan.borrowerName}</strong>
            </div>
            <div class="grid-item">
              <span>Segment Type</span>
              <strong style="font-family: inherit;">${loan.borrowerSegment} Portfolio</strong>
            </div>
            <div class="grid-item">
              <span>Exposure Requested</span>
              <strong>${formatCurrency(loan.amount)}</strong>
            </div>
            <div class="grid-item">
              <span>FICO Credit Score</span>
              <strong>${loan.ficoScore}</strong>
            </div>
            <div class="grid-item">
              <span>DTI Ratio</span>
              <strong>${loan.dti.toFixed(1)}%</strong>
            </div>
            <div class="grid-item">
              <span>Missed Payments (12M)</span>
              <strong>${loan.missedPayments12M}</strong>
            </div>
          </div>

          <div class="section-title">Machine Learning Appraisal & Pricing Recommendation</div>
          <div class="grid">
            <div class="grid-item">
              <span>Automated Recommendation</span>
              <div style="margin-top: 4px;">
                <span class="decision-badge ${
                  decisionVal === 'APPROVED' ? 'badge-approved' :
                  decisionVal === 'REJECTED' ? 'badge-rejected' : 'badge-refer'
                }">${decisionVal}</span>
              </div>
            </div>
            <div class="grid-item">
              <span>Suggested Pricing (APR)</span>
              <strong>${recommendedAprVal.toFixed(2)}%</strong>
            </div>
            <div class="grid-item">
              <span>Stressed Limit Sizing</span>
              <strong>${formatCurrency(recommendedLimitVal)}</strong>
            </div>
            <div class="grid-item">
              <span>Predicted Default Prob</span>
              <strong style="color: ${loan.defaultProbability12M >= 0.50 ? '#dc2626' : 'inherit'};">
                ${(loan.defaultProbability12M * 100).toFixed(1)}%
              </strong>
            </div>
            <div class="grid-item">
              <span>Algorithm Classification</span>
              <strong style="color: ${
                loan.riskTier === 'High' ? '#dc2626' :
                loan.riskTier === 'Medium' ? '#d97706' : '#16a34a'
              }; font-weight: bold;">${loan.riskTier} Risk</strong>
            </div>
            <div class="grid-item">
              <span>Evaluation Date</span>
              <strong>${loan.startDate || loan.lastUpdated}</strong>
            </div>
          </div>

          <div class="section-title">AI Synthesis Risk Summary</div>
          <div style="background: #fafafa; border: 1px solid #e4e4e7; padding: 12px; border-radius: 6px; font-style: italic; color: #52525b; margin-bottom: 20px; line-height: 1.6;">
            "${loan.aiRiskSummary}"
          </div>

          <div class="section-title">Local Explainability Weights (SHAP Impact)</div>
          ${shapRows ? `
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Risk Factor</th>
                  <th>Value</th>
                  <th style="text-align: right;">Probability Delta</th>
                </tr>
              </thead>
              <tbody>
                ${shapRows}
              </tbody>
            </table>
          ` : `
            <p style="font-style: italic; color: #71717a; text-align: center;">No SHAP explanation weights logged for this applicant.</p>
          `}

          <div class="footer">
            <div>
              <div style="font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: bold; margin-bottom: 5px;">Compliance Sign-off</div>
              <div style="font-family: monospace; font-size: 11px; color: #3f3f46;">
                Status: Verified Underwriter Audit Logged<br/>
                Signed By: ${userRole === 'manager' ? 'Risk Manager' : userRole === 'auditor' ? 'Compliance Auditor' : 'Loan Officer'}
              </div>
            </div>
            <div class="signature-line">
              Authorizing Underwriter Signature
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAudited(true);
    try {
      await submitAudit(loan.id, {
        loan_id: loan.id,
        analyst_name: 'Risk Analyst',
        risk_override: riskOverride,
        notes: auditNotes,
        action: 'review',
      });
      alert(`Underwriter audit logged successfully for ${loan.borrowerName}.`);
      setAuditNotes('');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(`Audit submission failed: ${err.message}`);
    } finally {
      setIsAudited(false);
    }
  };

  const handleResolveOutcome = async (outcome: number) => {
    setIsResolving(true);
    try {
      const success = await submitLoanOutcome(loan.id, outcome);
      if (success) {
        alert(`Loan resolved successfully as ${outcome === 1 ? 'DEFAULTED' : 'REPAID'}. The model feedback loop has updated the dataset.`);
        if (onUpdate) onUpdate();
      } else {
        alert('Failed to resolve loan outcome. Check API status.');
      }
    } catch (err: any) {
      alert(`Failed to resolve outcome: ${err.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="p-5 space-y-6">
      {/* Export Appraisal Memo Action Bar */}
      <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200 rounded-lg p-3">
        <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-zinc-500" />
          Appraisal File Memo
        </span>
        <button
          onClick={handlePrintMemo}
          className="flex items-center gap-1.5 bg-zinc-950 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Appraisal Memo
        </button>
      </div>

      {/* Risk Probability Callout */}
      <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">12M Default Probability</span>
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
            loan.riskTier === 'High' ? 'text-rose-700 bg-rose-50' : 
            loan.riskTier === 'Medium' ? 'text-amber-700 bg-amber-50' : 
            'text-emerald-700 bg-emerald-50'
          }`}>
            {loan.riskTier} Risk
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-zinc-950">
            {(loan.defaultProbability12M * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-zinc-400 font-medium">calculated default probability</span>
        </div>
        <div className="mt-3.5 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              loan.riskTier === 'High' ? 'bg-rose-500' :
              loan.riskTier === 'Medium' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`} 
            style={{ width: `${loan.defaultProbability12M * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Decision Engine & Pricing Recommendation Card */}
      <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Decisioning & Pricing Engine
          </span>
          <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${
            (loan.decisionStatus || 'REFER') === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            (loan.decisionStatus || 'REFER') === 'REJECTED' ? 'bg-rose-50 border-rose-200 text-rose-700' :
            'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            {(loan.decisionStatus || 'REFER') === 'APPROVED' ? '🟢 APPROVED' :
             (loan.decisionStatus || 'REFER') === 'REJECTED' ? '🔴 REJECTED' :
             '🟡 REFER'}
          </span>
        </div>

        {/* Credit Limit Rec */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Credit Limit Recommendation</span>
            <span className="font-bold text-zinc-900">
              {loan.decisionStatus === 'REJECTED' ? '$0' : formatCurrency(loan.recommendedLimit ?? loan.amount ?? 0)}
            </span>
          </div>
          <div className="w-full bg-zinc-100 h-2 rounded overflow-hidden flex">
            <div 
              className={`h-full ${
                loan.decisionStatus === 'APPROVED' ? 'bg-emerald-500' :
                loan.decisionStatus === 'REJECTED' ? 'bg-rose-500 w-0' :
                'bg-amber-500'
              }`}
              style={{ 
                width: loan.decisionStatus === 'REJECTED' ? '0%' : 
                       `${Math.min(100, (((loan.recommendedLimit ?? loan.amount ?? 0)) / (loan.amount ?? 1)) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] text-zinc-400">
            <span>Requested: {formatCurrency(loan.amount ?? 0)}</span>
            <span>Recommended Limit Ratio: {loan.decisionStatus === 'REJECTED' ? '0%' : 
              `${Math.round((((loan.recommendedLimit ?? loan.amount ?? 0)) / (loan.amount ?? 1)) * 100)}%`}</span>
          </div>
        </div>

        {/* Interest Rate Pricing Rec */}
        <div className="border-t border-zinc-200/80 pt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Recommended Pricing</span>
            <span className="font-bold text-blue-600 font-mono text-sm">
              {(loan.recommendedApr ?? loan.interestRate ?? 7.0).toFixed(2)}% APR
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center bg-white border border-zinc-100 p-2 rounded-lg text-[10px] font-mono">
            <div>
              <span className="text-[8px] text-zinc-400 block uppercase font-sans">Base APR</span>
              <span className="font-bold text-zinc-700">{(loan.baseRate ?? loan.interestRate ?? 7.0).toFixed(2)}%</span>
            </div>
            <div className="border-x border-zinc-100">
              <span className="text-[8px] text-zinc-400 block uppercase font-sans">Risk Premium</span>
              <span className="font-bold text-rose-600">+{(loan.riskPremium ?? 0).toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-[8px] text-zinc-400 block uppercase font-sans">Requested APR</span>
              <span className="font-bold text-zinc-400">{(loan.interestRate ?? 7.0).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Resolution Feedback Loop (Close the loop) */}
      <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/10 space-y-3">
        <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs uppercase tracking-wider">
          <Award className="h-4 w-4 text-zinc-600" />
          Feedback Loop & Outcomes
        </div>
        {loan.actualDefault !== undefined && loan.actualDefault !== null ? (
          <div className="text-xs space-y-1">
            <span className="text-zinc-400">Loan Resolution Status:</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                loan.actualDefault === 1 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {loan.actualDefault === 1 ? 'DEFAULTED' : 'REPAID'}
              </span>
              <span className="text-zinc-500 italic">This outcome is used in retraining calculations.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <p className="text-zinc-500">This loan is currently **active**. Mark the real-world outcome below to simulate default feedback loop retraining:</p>
            {userRole === 'manager' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => handleResolveOutcome(0)}
                  className="flex-1 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Mark as Repaid
                </button>
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => handleResolveOutcome(1)}
                  className="flex-1 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Mark as Defaulted
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg font-medium">
                🔒 Outcome feedback resolution is restricted to **Risk Managers** only.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Structured Credit Profile */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-100 pb-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Structured Core Credit Profile
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
          <div>
            <span className="text-zinc-400 block font-medium">Borrower Segment</span>
            <span className="font-bold text-zinc-900 mt-0.5 block">{loan.borrowerSegment} Segment</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">Loan Type</span>
            <span className="font-bold text-zinc-900 mt-0.5 block">{loan.loanType} Facility</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">Principal Balance</span>
            <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{formatCurrency(loan.amount)}</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">Interest Rate / Term</span>
            <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{loan.interestRate}% APR / {loan.termMonths}M</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">FICO Credit Bureau</span>
            <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{loan.ficoScore}</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">Debt-to-Income (DTI)</span>
            <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{loan.dti.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-zinc-400 block font-medium">Missed Payments (12M)</span>
            <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{loan.missedPayments12M}</span>
          </div>
          {loan.ltv && (
            <div>
              <span className="text-zinc-400 block font-medium">Loan-to-Value (LTV)</span>
              <span className="font-mono font-bold text-zinc-900 mt-0.5 block">{loan.ltv.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* SHAP Explainable AI Waterfall */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Explainable AI (SHAP Contributions)
          </h4>
          <span className="text-[10px] font-mono text-zinc-400">Baseline = 33.4%</span>
        </div>

        {/* Custom pure CSS waterfall bars */}
        <div className="space-y-2.5">
          {loan.shapExplanations && loan.shapExplanations.length > 0 ? (
            loan.shapExplanations.map((exp, index) => {
              const isRiskIncreaser = exp.value > 0;
              const barWidth = Math.abs(exp.value) * 150; // Scaling for layout

              return (
                <div key={index} className="flex items-center justify-between text-xs gap-3">
                  <div className="w-[45%] truncate font-medium text-zinc-700" title={exp.feature}>
                    {exp.feature}
                  </div>
                  
                  {/* Horizontal Bar Chart Representation */}
                  <div className="flex-1 flex items-center justify-center relative h-5 bg-zinc-50/50 rounded border border-zinc-100 overflow-hidden">
                    
                    {/* Positive Contribution Bar */}
                    {isRiskIncreaser && (
                      <div 
                        className="absolute right-1/2 h-full bg-rose-500/20 border-r border-rose-400"
                        style={{ 
                          width: `${Math.min(barWidth, 50)}%`, 
                          left: '50%' 
                        }}
                      ></div>
                    )}

                    {/* Negative Contribution Bar */}
                    {!isRiskIncreaser && (
                      <div 
                        className="absolute left-1/2 h-full bg-emerald-500/15 border-l border-emerald-400"
                        style={{ 
                          width: `${Math.min(barWidth, 50)}%`,
                          right: '50%',
                          left: 'auto'
                        }}
                      ></div>
                    )}

                    {/* Center line divider */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-300"></div>
                    
                    <span className="absolute z-10 text-[9px] font-mono font-bold text-zinc-500">
                      {exp.displayValue}
                    </span>
                  </div>
                  
                  <div className={`w-[12%] text-right font-mono font-bold ${isRiskIncreaser ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {exp.value > 0 ? '+' : ''}{(exp.value * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-zinc-400 italic text-center py-2">
              No explanation weights generated for this application yet.
            </div>
          )}
        </div>
      </div>

      {/* Unstructured Narrative Intelligence */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-100 pb-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Unstructured Data Fusions
        </h4>

        {/* AI summary block */}
        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 text-xs">
          <div className="flex items-center gap-1 text-zinc-800 font-bold mb-1">
            <CheckCircle className="h-3.5 w-3.5 text-zinc-500" />
            AI Risk Synthesis Summary
          </div>
          <p className="text-zinc-600 leading-relaxed italic">{loan.aiRiskSummary}</p>
        </div>

        {/* Officer Notes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              Loan Officer Notes
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 rounded ${
              loan.officerNotesSentiment === 'Negative' ? 'text-rose-600 bg-rose-50' : 
              loan.officerNotesSentiment === 'Positive' ? 'text-emerald-600 bg-emerald-50' : 
              'text-zinc-600 bg-zinc-100'
            }`}>
              Notes Sentiment: {loan.officerNotesSentiment}
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-5">
            {loan.officerNotesSummary}
          </p>
        </div>

        {/* News Sentiment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5 text-zinc-400" />
              Industry & Macro Sentiment
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 rounded ${
              loan.sectorNewsSentiment === 'Negative' ? 'text-rose-600 bg-rose-50' : 
              loan.sectorNewsSentiment === 'Positive' ? 'text-emerald-600 bg-emerald-50' : 
              'text-zinc-600 bg-zinc-100'
            }`}>
              Sector Sentiment: {loan.sectorNewsSentiment}
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-5">
            {loan.sectorNewsSummary}
          </p>
        </div>
      </div>

      {/* Underwriter Action & Override Panel */}
      <div className="border-t border-zinc-200 pt-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
          Underwriter Override Controls
        </h4>
        
        {userRole === 'manager' ? (
          <form onSubmit={handleAuditSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Override Risk Status</label>
              <select
                value={riskOverride}
                onChange={(e) => setRiskOverride(e.target.value as any)}
                title="Override Risk Status"
                aria-label="Override Risk Status"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent cursor-pointer"
              >
                <option value="Low">Low Risk (Approved)</option>
                <option value="Medium">Medium Risk (Watchlist)</option>
                <option value="High">High Risk (Escalate)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Audit Notes / Overriding Justification</label>
              <textarea
                rows={2}
                placeholder="Provide reason for overriding or locking file..."
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAudited}
                className="flex-1 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {isAudited ? 'Logging Audit...' : 'Log & Sign File'}
              </button>
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 justify-center">
              <ShieldAlert className="h-3 w-3" />
              <span>Updates will write directly to Supabase logs.</span>
            </div>
          </form>
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg font-medium">
            🔒 Risk status overrides and manual signing are restricted to **Risk Managers** only.
          </div>
        )}
      </div>
    </div>
  );
};
