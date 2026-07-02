import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ShieldCheck, Cpu, AlertCircle } from 'lucide-react';

interface ModelMonitoringProps {
  apiOnline?: boolean;
}

export const ModelMonitoring: React.FC<ModelMonitoringProps> = ({ apiOnline: _apiOnline }) => {
  const evolutionChartRef = useRef<HTMLDivElement>(null);
  const importanceChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Accuracy Evolution Chart
    if (evolutionChartRef.current) {
      const chart = echarts.init(evolutionChartRef.current);

      const option = {
        grid: {
          top: 30,
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
            return `<div class="p-1">
              <p class="text-xs text-brand-gray-text font-medium">${params[0].name}</p>
              <p class="text-sm font-bold mt-0.5 text-brand-accent">Accuracy: ${params[0].value}%</p>
            </div>`;
          }
        },
        xAxis: {
          type: 'category',
          data: ['Baseline (Structured)', '+ Sentiment Notes', '+ Transcripts', '+ Macro News', 'Hybrid Fusion ML'],
          axisLine: { lineStyle: { color: '#e4e4e7' } },
          axisLabel: { 
            color: '#71717a', 
            fontSize: 10,
            interval: 0,
            rotate: 15
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: '#f4f4f5' } },
          axisLabel: { color: '#71717a', fontSize: 11, formatter: '{value}%' },
        },
        series: [
          {
            data: [18, 42, 68, 79, 91.2],
            type: 'line',
            smooth: false,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: '#1d4ed8' },
            lineStyle: { width: 3, color: '#1d4ed8' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(29, 78, 216, 0.08)' },
                { offset: 1, color: 'rgba(29, 78, 216, 0)' }
              ])
            },
            label: {
              show: true,
              position: 'top',
              formatter: '{c}%',
              color: '#09090b',
              fontWeight: 'bold',
              fontFamily: 'monospace'
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

  useEffect(() => {
    // 2. Feature Importance Chart
    if (importanceChartRef.current) {
      const chart = echarts.init(importanceChartRef.current);

      const option = {
        grid: {
          top: 20,
          bottom: 30,
          left: 120,
          right: 20,
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
          type: 'value',
          splitLine: { lineStyle: { color: '#f4f4f5' } },
          axisLabel: { color: '#71717a', fontSize: 10, formatter: '{value}%' },
        },
        yAxis: {
          type: 'category',
          data: [
            'Loan Term & Amt',
            'Transcripts',
            'Sector News Index',
            'DTI Ratio',
            'FICO Score',
            'Missed Payments',
            'Officer Notes Sent.'
          ],
          axisLine: { lineStyle: { color: '#e4e4e7' } },
          axisLabel: { color: '#09090b', fontSize: 11, fontWeight: 'medium' },
        },
        series: [
          {
            type: 'bar',
            data: [6, 10, 12, 14, 15, 19, 24],
            itemStyle: {
              color: '#09090b',
              borderRadius: [0, 4, 4, 0],
            },
            barWidth: '60%',
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
            Model Performance & Audit
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Evaluate the mathematical validity, accuracy gains, and explainability vectors of the active prediction engine.
          </p>
        </div>
      </div>

      {/* Accuracy Targets Card */}
      <div className="premium-card p-6 bg-zinc-50/20 border-zinc-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-brand-accent rounded-lg">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Precision Milestones Achieved</h3>
            <p className="text-xs text-zinc-400 mt-1">
              By combining unstructured text transcripts and narrative sentiment indexes with core credit matrices, our model has broken the baseline accuracy barrier of 16-22%.
            </p>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">Baseline accuracy</span>
                <span className="text-xl font-bold font-mono text-zinc-400 block mt-1">16.0% - 22.0%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">Target Accuracy</span>
                <span className="text-xl font-bold font-mono text-zinc-600 block mt-1">90.0%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">Actual Accuracy</span>
                <span className="text-xl font-bold font-mono text-emerald-600 block mt-1">91.2%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">ROC-AUC Value</span>
                <span className="text-xl font-bold font-mono text-brand-accent block mt-1">0.942</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphic Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Evolution Chart */}
        <div className="premium-card p-6 bg-white">
          <h3 className="text-sm font-extrabold text-zinc-900 mb-1">Feature Fusion Accuracy Impact</h3>
          <p className="text-xs text-zinc-400 mb-4">Gains in model forecasting precision relative to supplemental unstructured features.</p>
          <div ref={evolutionChartRef} className="h-72 w-full"></div>
        </div>

        {/* Feature Importance */}
        <div className="premium-card p-6 bg-white">
          <h3 className="text-sm font-extrabold text-zinc-900 mb-1">Global Feature Importance (SHAP Weights)</h3>
          <p className="text-xs text-zinc-400 mb-4">Top predictors based on average absolute Shapley impact across entire loan portfolio.</p>
          <div ref={importanceChartRef} className="h-72 w-full"></div>
        </div>

      </div>

      {/* Bottom Grid: Confusion Matrix & Data Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Confusion Matrix (Takes 1 Col) */}
        <div className="premium-card p-6 bg-white flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 mb-1">Confusion Matrix</h3>
            <p className="text-xs text-zinc-400 mb-4">Model performance on validation fold (Actual vs Predicted)</p>
            
            {/* Visual matrix Grid */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-center text-xs mt-6">
              <div></div>
              <div className="text-[10px] font-sans font-bold text-zinc-400 uppercase">Pred. Good</div>
              <div className="text-[10px] font-sans font-bold text-zinc-400 uppercase">Pred. Default</div>
              
              <div className="flex items-center justify-end pr-2 text-[10px] font-sans font-bold text-zinc-400 uppercase">Act. Good</div>
              <div className="bg-zinc-50 border border-zinc-100 p-3 rounded">
                <div className="font-bold text-zinc-900">24,110</div>
                <div className="text-[9px] text-zinc-400 mt-1">TN (95.5%)</div>
              </div>
              <div className="bg-zinc-50 border border-zinc-100 p-3 rounded">
                <div className="font-bold text-zinc-500">1,130</div>
                <div className="text-[9px] text-zinc-400 mt-1">FP (4.5%)</div>
              </div>

              <div className="flex items-center justify-end pr-2 text-[10px] font-sans font-bold text-zinc-400 uppercase">Act. Default</div>
              <div className="bg-zinc-50 border border-zinc-100 p-3 rounded">
                <div className="font-bold text-zinc-500">690</div>
                <div className="text-[9px] text-zinc-400 mt-1">FN (14.2%)</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded">
                <div className="font-bold text-brand-accent">4,180</div>
                <div className="text-[9px] text-brand-accent mt-1">TP (85.8%)</div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-4 mt-6 text-[10px] text-zinc-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>F1 score = 0.885. Validated 12-Month forward lag testing.</span>
          </div>
        </div>

        {/* Data Pipeline Auditing logs (Takes 2 Cols) */}
        <div className="lg:col-span-2 premium-card p-6 bg-white">
          <h3 className="text-sm font-extrabold text-zinc-900 mb-1">Active Pipeline Training Logs</h3>
          <p className="text-xs text-zinc-400 mb-4">Latest ETL pipeline events and model registry iterations.</p>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3 border-l-2 border-zinc-950 pl-3">
              <span className="font-mono text-zinc-400 min-w-[70px]">14:22:10</span>
              <div>
                <span className="font-bold text-zinc-900">Model Registry Retention Iteration (v2.4.1)</span>
                <p className="text-zinc-500 mt-0.5">Hyperparameter calibration executed via Optuna. F1 score improved from 0.881 to 0.885. Accuracy stable at 91.2%.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 border-l-2 border-zinc-200 pl-3">
              <span className="font-mono text-zinc-400 min-w-[70px]">12:05:00</span>
              <div>
                <span className="font-bold text-zinc-900">Unstructured Document ETL Pipeline Complete</span>
                <p className="text-zinc-500 mt-0.5">Parsed 2,480 new Loan Officer PDF notes and call log transcripts. Hybrid text embeddings computed & cached.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-zinc-200 pl-3">
              <span className="font-mono text-zinc-400 min-w-[70px]">09:15:32</span>
              <div>
                <span className="font-bold text-zinc-900">Structured Bureau Sync Successful</span>
                <p className="text-zinc-500 mt-0.5">Acquired latest bureau records and FICO updates for 45,260 active borrowers. Data mismatch check: 0 files flagged.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-amber-400 pl-3">
              <span className="font-mono text-zinc-400 min-w-[70px]">08:00:00</span>
              <div>
                <span className="font-bold text-zinc-900 flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Minor Concept Drift Warning
                </span>
                <p className="text-zinc-500 mt-0.5">Slight shift detected in Mortgage LTV distributions. Retraining trigger threshold not breached (Drift margin = 2.4%).</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
