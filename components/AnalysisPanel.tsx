import React from 'react';
import { AnalysisResult, SafetyLevel } from '../types';
import { AlertTriangle, ShieldCheck, ShieldAlert, Ban, Activity, MapPin, Gauge, Layers, BarChart3 } from 'lucide-react';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  loading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, loading }) => {
  // Loading State
  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 p-6 bg-hud-dark text-hud-primary">
        <div className="relative">
          <Activity className="w-16 h-16 animate-spin text-hud-primary opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-hud-primary rounded-full animate-ping"></div>
          </div>
        </div>
        <div className="text-center">
          <p className="font-mono text-sm tracking-[0.2em] text-hud-primary animate-pulse">PROCESSING</p>
          <p className="text-[10px] text-hud-text-dim font-mono mt-1">AI VISION MODEL INFERENCE...</p>
        </div>
        <div className="w-48 bg-hud-border h-0.5 mt-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-hud-primary/20"></div>
          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-hud-primary animate-[shimmer_1s_infinite_linear]"></div>
        </div>
      </div>
    );
  }

  // Standby / Dashboard Mode (No Result)
  if (!result) {
    return (
      <div className="h-full w-full flex flex-col p-6 bg-hud-dark overflow-y-auto custom-scrollbar">
        <div className="mb-6 border-b border-hud-border pb-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-hud-text-dim mb-1">Live Telemetry</h2>
          <div className="text-[10px] text-hud-primary animate-pulse">Awaiting Live Feed...</div>
        </div>

        <div className="space-y-4 flex-1">
          {/* Widget 1: Road Condition */}
          <div className="bg-hud-gray/30 border border-hud-border p-4 rounded-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Layers className="w-12 h-12 text-hud-primary" />
            </div>
            <h3 className="text-[10px] uppercase font-mono text-hud-text-dim mb-2">Road Condition Index</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold font-mono text-hud-text-dim/50">0.0</span>
              <span className="text-xs text-hud-text-dim/30 mb-1 font-mono">/ 10.0</span>
            </div>
            <div className="w-full h-1 bg-hud-border mt-3 rounded-full overflow-hidden">
              <div className="w-0 h-full bg-hud-primary transition-all duration-1000"></div>
            </div>
          </div>

          {/* Widget 2: Vehicle Telemetry */}
          <div className="bg-hud-gray/30 border border-hud-border p-4 rounded-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Gauge className="w-12 h-12 text-hud-warning" />
            </div>
            <h3 className="text-[10px] uppercase font-mono text-hud-text-dim mb-2">Velocity / G-Force</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold font-mono text-hud-text-dim/50">0 <span className="text-xs font-normal">MPH</span></div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono text-hud-text-dim/50">0.0 <span className="text-xs font-normal">G</span></div>
              </div>
            </div>
          </div>

          {/* Widget 3: Hazard Count */}
          <div className="bg-hud-gray/30 border border-hud-border p-4 rounded-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <AlertTriangle className="w-12 h-12 text-hud-danger" />
            </div>
            <h3 className="text-[10px] uppercase font-mono text-hud-text-dim mb-2">Active Hazards</h3>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono text-hud-text-dim/50">0</span>
              <span className="text-[10px] text-hud-text-dim/40 uppercase max-w-[80px] leading-tight">No Threats Detected</span>
            </div>
          </div>

          <div className="mt-8 p-4 border border-dashed border-hud-border rounded bg-hud-gray/10 text-center">
            <p className="text-xs text-hud-text-dim font-mono">System Ready. Please Select Source.</p>
          </div>
        </div>
      </div>
    );
  }

  // Active Analysis Result View
  const getSafetyColor = (level: SafetyLevel) => {
    switch (level) {
      case SafetyLevel.SAFE: return 'text-hud-success border-hud-success shadow-[0_0_20px_rgba(0,255,157,0.15)]';
      case SafetyLevel.CAUTION: return 'text-hud-warning border-hud-warning shadow-[0_0_20px_rgba(255,174,0,0.15)]';
      case SafetyLevel.DANGER: return 'text-hud-danger border-hud-danger shadow-[0_0_20px_rgba(255,42,42,0.15)]';
      default: return 'text-hud-text-dim border-hud-text-dim';
    }
  };

  const SafetyIcon = {
    [SafetyLevel.SAFE]: ShieldCheck,
    [SafetyLevel.CAUTION]: ShieldAlert,
    [SafetyLevel.DANGER]: AlertTriangle
  }[result.safetyLevel];

  return (
    <div className="h-full w-full flex flex-col bg-hud-dark overflow-y-auto custom-scrollbar">

      {/* Top Status Bar (Score) */}
      <div className={`p-6 border-b border-hud-border ${getSafetyColor(result.safetyLevel)} bg-gradient-to-r from-hud-gray to-transparent`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-mono text-[10px] uppercase tracking-widest opacity-80 text-hud-text">Safety Assessment</h2>
          <span className="font-mono text-[10px] text-hud-text-dim">{result.timestamp}</span>
        </div>
        <div className="flex items-center space-x-4">
          <SafetyIcon className="w-10 h-10" />
          <span className="text-3xl font-bold font-mono tracking-tighter">{result.safetyLevel}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Recommendation Box */}
        <div className="relative pl-4 border-l-2 border-hud-primary">
          <h3 className="text-hud-primary text-[10px] font-mono mb-1 uppercase tracking-widest">AI Recommendation</h3>
          <p className="text-sm font-medium leading-relaxed text-hud-text">{result.recommendation}</p>
        </div>

        {/* Hazards Section */}
        <div>
          <h3 className="text-hud-danger text-[10px] font-mono mb-3 uppercase tracking-widest flex items-center">
            <AlertTriangle className="w-3 h-3 mr-2" />
            Detected Hazards <span className="ml-2 bg-hud-danger/10 border border-hud-danger/30 text-hud-danger px-1.5 py-0.5 rounded text-[10px]">{result.hazards.length}</span>
          </h3>
          <div className="space-y-2">
            {result.hazards.length === 0 ? (
              <div className="p-3 border border-hud-border rounded bg-hud-gray/20 text-center">
                <p className="text-hud-text-dim text-xs italic">No immediate hazards detected.</p>
              </div>
            ) : (
              result.hazards.map((hazard, idx) => (
                <div key={idx} className="bg-hud-danger/5 border border-hud-danger/20 p-3 rounded-sm hover:bg-hud-danger/10 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-hud-text font-mono">{hazard.type}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${hazard.severity === 'HIGH' ? 'bg-red-600 text-white' :
                        hazard.severity === 'MEDIUM' ? 'bg-orange-600 text-white' :
                          'bg-yellow-600 text-black'
                      }`}>{hazard.severity}</span>
                  </div>
                  <p className="text-xs text-hud-text-dim leading-snug">{hazard.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Road Signs Section */}
        <div>
          <h3 className="text-hud-primary text-[10px] font-mono mb-3 uppercase tracking-widest flex items-center">
            <Ban className="w-3 h-3 mr-2" />
            Signage Analysis <span className="ml-2 bg-hud-primary/10 border border-hud-primary/30 text-hud-primary px-1.5 py-0.5 rounded text-[10px]">{result.signs.length}</span>
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {result.signs.length === 0 ? (
              <div className="p-3 border border-hud-border rounded bg-hud-gray/20 text-center">
                <p className="text-hud-text-dim text-xs italic">No traffic signs identified.</p>
              </div>
            ) : (
              result.signs.map((sign, idx) => (
                <div key={idx} className="bg-hud-primary/5 border border-hud-primary/20 p-2.5 flex items-start justify-between rounded-sm hover:bg-hud-primary/10 transition-colors">
                  <div className="flex-1 mr-3">
                    <div className="font-bold text-sm text-hud-text font-mono mb-0.5">{sign.type}</div>
                    <div className="text-xs text-hud-text-dim leading-snug">{sign.meaning}</div>
                  </div>
                  <div className="flex items-center text-[9px] font-mono bg-hud-black/50 border border-hud-primary/30 px-2 py-1 text-hud-primary rounded whitespace-nowrap">
                    <MapPin className="w-2 h-2 mr-1" />
                    {sign.location}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info (Model Stats) */}
        <div className="pt-4 mt-2 border-t border-hud-border text-[9px] font-mono text-hud-text-dim flex justify-between uppercase">
          <span>Gemini Pro Vision</span>
          <span>Latency: ~120ms</span>
        </div>

      </div>
    </div>
  );
};

export default AnalysisPanel;