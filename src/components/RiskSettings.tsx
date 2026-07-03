import React, { useState } from 'react';
import { getLendingSettings, saveLendingSettings, type LendingSettings } from '../services/api';
import { Settings, Save, RotateCcw, AlertTriangle, ShieldCheck, Percent, TrendingUp } from 'lucide-react';

export const RiskSettings: React.FC = () => {
  const [settings, setSettings] = useState<LendingSettings>(getLendingSettings());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveLendingSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    const defaults: LendingSettings = {
      baseApr: 7.0,
      maxDti: 45.0,
      highRiskProbThreshold: 0.60,
      lowRiskProbThreshold: 0.15,
      riskPremiumMultiplier: 12.0
    };
    setSettings(defaults);
    saveLendingSettings(defaults);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
            <Settings className="h-7 w-7 text-zinc-800" />
            Lending Policy & Risk Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure automated rating thresholds, pricing parameters, and credit limits for the underwriting engine.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Pricing settings */}
        <div className="premium-card p-6 bg-white space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Percent className="h-5 w-5 text-zinc-600" />
            <h3 className="font-extrabold text-zinc-900 text-sm">Pricing & Interest Sizing Engine</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="baseApr" className="text-xs font-bold text-zinc-700 block">Base Interest Rate (Baseline APR)</label>
              <div className="relative">
                <input
                  type="number"
                  id="baseApr"
                  step="0.1"
                  min="1"
                  max="30"
                  value={settings.baseApr}
                  onChange={(e) => setSettings({ ...settings, baseApr: Number(e.target.value) })}
                  className="w-full bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                  required
                />
                <span className="absolute right-3 top-2.5 text-zinc-400 text-xs font-bold font-mono">%</span>
              </div>
              <p className="text-[10px] text-zinc-400">Baseline rate applied before risk premium additions.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="riskPremiumMultiplier" className="text-xs font-bold text-zinc-700 block">Risk Premium Multiplier</label>
              <input
                type="number"
                id="riskPremiumMultiplier"
                step="0.5"
                min="0"
                max="50"
                value={settings.riskPremiumMultiplier}
                onChange={(e) => setSettings({ ...settings, riskPremiumMultiplier: Number(e.target.value) })}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                required
              />
              <p className="text-[10px] text-zinc-400">Multiplied by the default probability to calculate risk adjustments.</p>
            </div>
          </div>
        </div>

        {/* Policy Thresholds */}
        <div className="premium-card p-6 bg-white space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <TrendingUp className="h-5 w-5 text-zinc-600" />
            <h3 className="font-extrabold text-zinc-900 text-sm">Decision & Risk Tier Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="lowRiskProbThreshold" className="text-xs font-bold text-zinc-700 block">Low Risk Limit (APPROVED)</label>
              <div className="relative">
                <input
                  type="number"
                  id="lowRiskProbThreshold"
                  step="0.05"
                  min="0"
                  max="1"
                  value={settings.lowRiskProbThreshold}
                  onChange={(e) => setSettings({ ...settings, lowRiskProbThreshold: Number(e.target.value) })}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-400">Applications with default probabilities below this value are automatically approved.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="highRiskProbThreshold" className="text-xs font-bold text-zinc-700 block">High Risk Limit (REJECTED)</label>
              <div className="relative">
                <input
                  type="number"
                  id="highRiskProbThreshold"
                  step="0.05"
                  min="0"
                  max="1"
                  value={settings.highRiskProbThreshold}
                  onChange={(e) => setSettings({ ...settings, highRiskProbThreshold: Number(e.target.value) })}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-400">Applications with default probabilities above this value are automatically rejected.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="maxDti" className="text-xs font-bold text-zinc-700 block">Advisory Maximum DTI Ratio</label>
              <div className="relative">
                <input
                  type="number"
                  id="maxDti"
                  step="1"
                  min="5"
                  max="90"
                  value={settings.maxDti}
                  onChange={(e) => setSettings({ ...settings, maxDti: Number(e.target.value) })}
                  className="w-full bg-white border border-zinc-200 pl-3 pr-8 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
                  required
                />
                <span className="absolute right-3 top-2.5 text-zinc-400 text-xs font-bold font-mono">%</span>
              </div>
              <p className="text-[10px] text-zinc-400">Target advisory upper limit for borrower debt-to-income metrics.</p>
            </div>
          </div>
        </div>

        {/* Warning Indicator */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-800 block">Rule Impact Warning</span>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Adjusting these rules changes approval flags and interest rate sizing dynamically across all loan portfolios.
              This affects local exports and UI cards but does not overwrite raw historical values inside the database.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Corporate Defaults
          </button>
          
          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 text-[11px] animate-fadeIn">
                <ShieldCheck className="h-4 w-4" />
                Settings saved successfully!
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
