import React from 'react';
import { ClusterData, ClusterConfidence } from '../types';

interface Props {
  cluster: ClusterData;
}

const ClusterStats: React.FC<Props> = ({ cluster }) => {
  const getConfidenceColor = (conf: ClusterConfidence) => {
    switch (conf) {
      case 'High': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getConfidenceColor(cluster.confidence)} shadow-sm mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black uppercase tracking-widest text-inherit">Mesh Cluster Health</h4>
        <span className="text-sm font-bold text-inherit">{cluster.confidence} Confidence</span>
      </div>
      
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              cluster.activeSensors >= i 
                ? (cluster.confidence === 'High' ? 'bg-green-500' : cluster.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-red-500')
                : 'bg-slate-200'
            }`} 
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold opacity-80 uppercase tracking-tighter text-inherit">
          <span>Active Local Nodes</span>
          <span>{cluster.activeSensors} / 4 ONLINE</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold opacity-80 uppercase tracking-tighter text-inherit">
          <span>Calibration Bias</span>
          <span>{(cluster.calibrationFactor * 100).toFixed(0)}%</span>
        </div>
        {cluster.anomalyDetected && (
          <div className="mt-2 flex items-start gap-2 text-[10px] font-bold text-red-700 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            LOCALIZED ANOMALY DETECTED IN CLUSTER
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterStats;