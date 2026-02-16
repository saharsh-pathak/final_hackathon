
import React from 'react';
import { VerificationData, ConfidenceTier } from '../types';

const ShieldCheck = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const ActivityIcon = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

interface Props {
  data: VerificationData;
}

const VerificationBadge: React.FC<Props> = ({ data }) => {
  const getTheme = () => {
    switch (data.tier) {
      case 'High': return { color: '#16a34a', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
      case 'Medium': return { color: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
      case 'Low': return { color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
      default: return { color: '#64748b', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };
    }
  };

  const theme = getTheme();

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-2xl border ${theme.bg} ${theme.border} shadow-sm transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data.isHyperlocalEvent ? <ActivityIcon color={theme.color} /> : <ShieldCheck color={theme.color} />}
          <div className="flex flex-col">
            <span className={`text-sm font-black uppercase tracking-tight ${theme.text}`}>
              {data.statusMessage}
            </span>
            {data.isHyperlocalEvent && (
              <span className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-full w-fit mt-1">
                HYPERLOCAL EVENT DETECTED
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-black ${theme.text}`}>{data.confidence}%</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
          <span>Trust Meter</span>
          <span>{data.tier} Trust Level</span>
        </div>
        <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-inherit">
          <div 
            className="h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${data.confidence}%`, 
              backgroundColor: theme.color 
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-inherit/50">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Local Node</span>
          <span className="text-xs font-black text-slate-700">{data.leg1_local}</span>
        </div>
        <div className="flex flex-col text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Core Ref</span>
          <span className="text-xs font-black text-slate-700">{data.leg2_primary_ref}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Peer Ref</span>
          <span className="text-xs font-black text-slate-700">{data.leg3_secondary_ref}</span>
        </div>
      </div>
    </div>
  );
};

export default VerificationBadge;
