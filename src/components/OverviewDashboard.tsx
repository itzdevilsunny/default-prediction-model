import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { mockPortfolioSummary, mockLoans } from '../data/mockLoans';
import { TrendingUp, FileText, Database, ShieldAlert, Award, ArrowUpRight } from 'lucide-react';

interface OverviewDashboardProps {
  onViewLoan: (loanId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onViewLoan }) => {
  const riskChartRef = useRef<HTMLDivElement>(null);
  const dataChartRef = useRef<HTMLDivElement>(null);

  // Stats calculation
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    // 1. Risk Distribution Chart
    if (riskChartRef.current) {
      const chart = echarts.init(riskChartRef.current);
      
      // Calculate distribution buckets based on mock loans
      const buckets = Array(10).fill(0);
      mockLoans.forEach((loan) => {
        const bucketIndex = Math.min(Math.floor(loan.defaultProbability12M * 10), 9);
        buckets[bucketIndex]++;
      });

      const option = {
        grid: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 20,
          containLabel: true,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#ffffff',
          borderColor: '#e4e4e7',
          borderWidth: 1,
          textStyle: {
            color: '#09090b',
            fontFamily: 'system-ui',
          },
          formatter: (params: any) => {
            const dataIndex = params[0].dataIndex;
            const start = dataIndex * 10;
            const end = start + 10;
            return `<div class="p-1">
              <p class="text-xs text-brand-gray-text font-medium">Risk Range: ${start}% - ${end}%</p>
              <p class="text-sm font-semibold mt-0.5">Loans Count: ${params[0].value}</p>
            </div>`;
          }
        },
        xAxis: {
          type: 'category',
          data: ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
          axisLine: { lineStyle: { color: '#e4e4e7' } },
          axisLabel: { color: '#71717a', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#f4f4f5' } },
          axisLabel: { color: '#71717a', fontSize: 11 },
        },
        series: [
          {
            data: buckets,
            type: 'bar',
            barWidth: '55%',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#1d4ed8' }, // Cobalt Accent
                { offset: 1, color: '#60a5fa' },
              ]),
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };

      chart.setOption(option);
      
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, []);

  useEffect(() => {
    // 2. Structured vs Unstructured Data Ingestion Chart
    if (dataChartRef.current) {
      const chart = echarts.init(dataChartRef.current);

      const option = {
        grid: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 20,
          containLabel: true,
        },
        legend: {
          data: ['Structured Records', 'Unstructured Records'],
          bottom: 0,
          icon: 'circle',
          textStyle: { color: '#71717a', fontSize: 11 },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#ffffff',
          borderColor: '#e4e4e7',
          borderWidth: 1,
          textStyle: {
            color: '#09090b',
            fontFamily: 'system-ui',
          },
        },
        xAxis: {
          type: 'category',
          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          axisLine: { lineStyle: { color: '#e4e4e7' } },
          axisLabel: { color: '#71717a', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#f4f4f5' } },
          axisLabel: { color: '#71717a', fontSize: 11 },
        },
        series: [
          {
            name: 'Structured Records',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: [15000, 17200, 19100, 21000, 23500, 25840],
            itemStyle: { color: '#09090b' },
            lineStyle: { width: 2.5 },
          },
          {
            name: 'Unstructured Records',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: [8200, 10500, 12800, 15100, 17300, 19420],
            itemStyle: { color: '#1d4ed8' },
            lineStyle: { width: 2.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(29, 78, 216, 0.08)' },
                { offset: 1, color: 'rgba(29, 78, 216, 0)' }
              ])
            }
          },
        ],
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, []);

  // Filter high risk loans for quick action list
  const highRiskLoans = mockLoans
    .filter((l) => l.riskTier === 'High')
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 font-sans">
            Risk & Credit Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time default probability forecasting utilizing hybrid structured-unstructured intelligence.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-zinc-500 font-mono">MODEL AGENT CONNECTED</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Portfolio Value</span>
            <Database className="h-4.5 w-4.5 text-zinc-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
              {formatCurrency(mockPortfolioSummary.totalExposure)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">+12.4%</span>
              <span className="text-zinc-400">YoY expansion</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Model Accuracy</span>
            <Award className="h-4.5 w-4.5 text-brand-accent" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
              {(mockPortfolioSummary.accuracyMetric * 100).toFixed(1)}%
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">&gt;90%</span>
              <span className="text-zinc-400">Target benchmark met</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Forecasted Default Rate</span>
            <TrendingUp className="h-4.5 w-4.5 text-zinc-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
              {(mockPortfolioSummary.averageDefaultProbability * 100).toFixed(1)}%
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono">12-Month</span>
              <span className="text-zinc-400">Predictive stress horizon</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Data Pipeline Ingestion</span>
            <FileText className="h-4.5 w-4.5 text-zinc-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-900">
              {new Intl.NumberFormat('en-US').format(mockPortfolioSummary.unstructuredRecordsCount)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-brand-accent bg-blue-50 px-1.5 py-0.5 rounded font-mono">Hybrid</span>
              <span className="text-zinc-400">Structured + Unstructured docs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Distribution Chart Card */}
          <div className="premium-card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Portfolio Default Risk Distribution</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Forecasted probability of default (12 Months Out)</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-accent"></span>
                <span className="text-xs font-medium text-zinc-600">Active Borrowers</span>
              </div>
            </div>
            <div ref={riskChartRef} className="h-72 w-full"></div>
          </div>

          {/* Ingestion Pipeline Chart Card */}
          <div className="premium-card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Data Fusion Pipeline Volume</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Structured core banking vs. unstructured narrative metadata</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-zinc-950"></span>
                  <span>Structured Core Data</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-accent"></span>
                  <span>Unstructured AI OCR / Notes</span>
                </div>
              </div>
            </div>
            <div ref={dataChartRef} className="h-72 w-full"></div>
          </div>
        </div>

        {/* Right Column: High Risk Alerts & Queue */}
        <div className="space-y-6">
          <div className="premium-card p-6 bg-white flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                    High Default Risk Queue
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Urgent review required (PD &gt; 70%)</p>
                </div>
                <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-mono font-bold">
                  {mockPortfolioSummary.highRiskCount} Loans
                </span>
              </div>

              {/* High Risk Item List */}
              <div className="space-y-3">
                {highRiskLoans.map((loan) => (
                  <div 
                    key={loan.id}
                    className="p-3 border border-zinc-100 rounded-lg hover:border-zinc-200 hover:bg-zinc-50/50 transition-all cursor-pointer flex items-center justify-between"
                    onClick={() => onViewLoan(loan.id)}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-zinc-900">{loan.borrowerName}</span>
                        <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1 rounded">{loan.loanType}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">{loan.id} • {formatCurrency(loan.amount)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-rose-600 font-mono">
                        {(loan.defaultProbability12M * 100).toFixed(1)}%
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-rose-500 mt-0.5 block">Def. Prob.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <button 
                onClick={() => onViewLoan('ALL_HIGH')}
                className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors premium-shadow"
              >
                Open Application Tracker
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
