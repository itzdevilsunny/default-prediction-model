import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { runStressTest, type StressTestResponse, type StressedLoan } from '../services/api';
import { TrendingUp, AlertTriangle, Play, RefreshCw, ArrowRight, User } from 'lucide-react';

interface StressTestingProps {
  onInspectLoan: (loanId: string) => void;
  apiOnline?: boolean;
}

export const StressTesting: React.FC<StressTestingProps> = ({ onInspectLoan, apiOnline }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  // Shifts state
  const [ficoShift, setFicoShift] = useState(-50);
  const [rateShift, setRateShift] = useState(3.0);
  const [missedPaymentsShift, setMissedPaymentsShift] = useState(2);
  const [sentimentShift, setSentimentShift] = useState<'Positive' | 'Neutral' | 'Negative' | null>('Negative');

  // Simulation output
  const [result, setResult] = useState<StressTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Stagflation');

  // Presets mapping
  const presets: Record<string, { fico: number; rate: number; payments: number; sentiment: 'Positive' | 'Neutral' | 'Negative' | null }> = {
    'Mild Downturn': { fico: -30, rate: 1.5, payments: 1, sentiment: 'Neutral' },
    'Stagflation': { fico: -80, rate: 3.5, payments: 2, sentiment: 'Negative' },
    'Systemic Crisis': { fico: -120, rate: 5.0, payments: 3, sentiment: 'Negative' },
    'Baseline': { fico: 0, rate: 0.0, payments: 0, sentiment: null }
  };

  const handleApplyPreset = (name: string) => {
    setActivePreset(name);
    const p = presets[name];
    setFicoShift(p.fico);
    setRateShift(p.rate);
    setMissedPaymentsShift(p.payments);
    setSentimentShift(p.sentiment);
  };

  const executeSimulation = async () => {
    setIsLoading(true);
    try {
      const data = await runStressTest({
        fico_shift: ficoShift,
        rate_shift: rateShift,
        missed_payments_shift: missedPaymentsShift,
        sentiment_shift: sentimentShift
      });
      setResult(data);
    } catch (err) {
      console.error('Stress test simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial simulation on mount
  useEffect(() => {
    executeSimulation();
  }, []);

  // Update ECharts
  useEffect(() => {
    if (!result || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const origEL = result.original_summary.expected_loss;
    const stressEL = result.stressed_summary.expected_loss;
    const origHigh = result.original_summary.high_risk_count;
    const stressHigh = result.stressed_summary.high_risk_count;

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Baseline (Pre-stress)', 'Stressed Portfolio'],
        bottom: 0,
        textStyle: { fontFamily: 'Outfit, sans-serif', fontSize: 11 }
      },
      grid: {
        top: 40,
        bottom: 50,
        left: 60,
        right: 20
      },
      xAxis: {
        type: 'category',
        data: ['Expected Loss ($)', 'High Risk Loans (#)'],
        axisLabel: { fontFamily: 'Outfit, sans-serif', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#f3f4f6' } }
      },
      series: [
        {
          name: 'Baseline (Pre-stress)',
          type: 'bar',
          barWidth: '25%',
          data: [origEL, origHigh],
          itemStyle: { color: '#71717a', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: 'Stressed Portfolio',
          type: 'bar',
          barWidth: '25%',
          data: [stressEL, stressHigh],
          itemStyle: { color: '#e11d48', borderRadius: [4, 4, 0, 0] }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [result]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-rose-600" />
            Portfolio Stress Testing
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase self-center ${
              apiOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {apiOnline ? 'Live DB connected' : 'Offline Mode'}
            </span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Simulate credit portfolio resilience by projecting expected losses under custom macroeconomic shocks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Controllers & Sliders */}
        <div className="premium-card p-6 bg-white space-y-6">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Scenario Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(presets).map((name) => (
                <button
                  key={name}
                  onClick={() => handleApplyPreset(name)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                    activePreset === name
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-zinc-100" />

          <div className="space-y-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Custom Shocks</h3>
            
            {/* FICO Shift */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-700">FICO Score Shift</span>
                <span className={`font-mono font-bold ${ficoShift < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {ficoShift > 0 ? '+' : ''}{ficoShift} pts
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="50"
                step="5"
                value={ficoShift}
                title="FICO Score Shift"
                aria-label="FICO Score Shift"
                onChange={(e) => {
                  setFicoShift(Number(e.target.value));
                  setActivePreset('');
                }}
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
            </div>

            {/* Interest Rate Hike */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-700">Interest Rate Delta</span>
                <span className="font-mono font-bold text-rose-600">
                  +{rateShift.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={rateShift}
                title="Interest Rate Delta"
                aria-label="Interest Rate Delta"
                onChange={(e) => {
                  setRateShift(Number(e.target.value));
                  setActivePreset('');
                }}
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
            </div>

            {/* Missed Payments */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-700">Missed Payments (12M) Shift</span>
                <span className="font-mono font-bold text-rose-600">
                  +{missedPaymentsShift}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={missedPaymentsShift}
                title="Missed Payments (12M) Shift"
                aria-label="Missed Payments (12M) Shift"
                onChange={(e) => {
                  setMissedPaymentsShift(Number(e.target.value));
                  setActivePreset('');
                }}
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
            </div>

            {/* Sentiment override */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 block">Qualitative NLP Override</label>
              <select
                value={sentimentShift || ''}
                onChange={(e) => {
                  setSentimentShift(e.target.value ? e.target.value as any : null);
                  setActivePreset('');
                }}
                title="Qualitative NLP Override"
                aria-label="Qualitative NLP Override"
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value="">Keep Original Sentiment</option>
                <option value="Positive">Optimistic Sentiment</option>
                <option value="Neutral">Neutral Sentiment</option>
                <option value="Negative">Distressed / Negative Sentiment</option>
              </select>
            </div>
          </div>

          <button
            onClick={executeSimulation}
            disabled={isLoading}
            className="w-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Stress Simulation
          </button>
        </div>

        {/* Right Side: Charts & High-Level Comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Comparison Cards */}
          {result && (
            <div className="grid grid-cols-2 gap-4">
              {/* Expected Loss Comparison */}
              <div className="premium-card p-5 bg-white border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Expected Loss (EL) Projection</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-bold font-mono text-zinc-500">{formatCurrency(result.original_summary.expected_loss)}</span>
                    <ArrowRight className="h-4 w-4 text-zinc-400 self-center" />
                    <span className="text-2xl font-extrabold font-mono text-rose-600">{formatCurrency(result.stressed_summary.expected_loss)}</span>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-zinc-500 font-semibold bg-zinc-50 p-2 rounded">
                  Portfolio loss rate rises from {result.original_summary.expected_loss_pct}% to <span className="text-rose-600 font-bold">{result.stressed_summary.expected_loss_pct}%</span>
                </div>
              </div>

              {/* High Risk Count Comparison */}
              <div className="premium-card p-5 bg-white border-zinc-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">High Risk Active Loans</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-bold font-mono text-zinc-500">{result.original_summary.high_risk_count}</span>
                    <ArrowRight className="h-4 w-4 text-zinc-400 self-center" />
                    <span className="text-2xl font-extrabold font-mono text-rose-600">{result.stressed_summary.high_risk_count}</span>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-zinc-500 font-semibold bg-zinc-50 p-2 rounded">
                  Expected default probability rises to <span className="text-rose-600 font-bold">{(result.stressed_summary.avg_default_prob * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ECharts Visualization */}
          <div className="premium-card p-6 bg-white">
            <h3 className="text-sm font-extrabold text-zinc-900 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" />
              Impairment & Capital Degradation Projections
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Comparison of baseline portfolio exposure risk vs stressed scenario metrics.</p>
            <div ref={chartRef} className="h-72 w-full"></div>
          </div>
        </div>
      </div>

      {/* Stressed Loans Table */}
      {result && result.loans && (
        <div className="premium-card bg-white overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900">Affected Borrowers simulation registry</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Underwriter audit details displaying loan-by-loan shift and risk migration.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="py-4 px-5">Borrower</th>
                  <th className="py-4 px-4">Exposure</th>
                  <th className="py-4 px-4 text-center">FICO (Orig → Stressed)</th>
                  <th className="py-4 px-4 text-center">Default Prob (Orig)</th>
                  <th className="py-4 px-4 text-center">Default Prob (Stressed)</th>
                  <th className="py-4 px-4 text-center">Risk Migrated</th>
                  <th className="py-4 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {result.loans.map((loan: StressedLoan) => {
                  const probDelta = loan.stressed_prob - loan.original_prob;
                  const isStagedUp = loan.original_tier !== loan.stressed_tier && loan.stressed_tier === 'High';
                  
                  return (
                    <tr key={loan.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-zinc-100 rounded-full text-zinc-600">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 block">{loan.borrower_name}</span>
                            <span className="text-[10px] font-mono text-zinc-400">{loan.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-zinc-700">{formatCurrency(loan.amount)}</td>
                      <td className="py-4 px-4 text-center font-mono text-zinc-500">
                        {loan.original_fico} → <span className="font-bold text-zinc-800">{loan.stressed_fico}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-zinc-500">{(loan.original_prob * 100).toFixed(1)}%</td>
                      <td className={`py-4 px-4 text-center font-mono font-bold ${probDelta > 0.10 ? 'text-rose-600' : 'text-zinc-800'}`}>
                        {(loan.stressed_prob * 100).toFixed(1)}%
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            loan.original_tier === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {loan.original_tier}
                          </span>
                          <ArrowRight className="h-3 w-3 text-zinc-400" />
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            loan.stressed_tier === 'High' ? 'bg-rose-100 text-rose-700' :
                            loan.stressed_tier === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {loan.stressed_tier}
                          </span>
                          {isStagedUp && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              Migrated to High Risk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => onInspectLoan(loan.id)}
                          className="text-zinc-500 hover:text-zinc-950 font-bold hover:underline"
                        >
                          Inspect File
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
