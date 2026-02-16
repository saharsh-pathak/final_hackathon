
import React from 'react';
import { SprinklerStatus, SprinklerState } from '../types';

interface SprinklerControlProps {
    status: SprinklerStatus;
    history: any[];
    onTrigger: () => void;
    onToggleAuto: (enabled: boolean) => void;
    onSetThreshold: (value: number) => void;
}

const SprinklerControl: React.FC<SprinklerControlProps> = ({ status, history, onTrigger, onToggleAuto, onSetThreshold }) => {
    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Intervention Manager</h3>
                    <h2 className="text-xl font-black text-slate-900">Sprinkler Control</h2>
                </div>
                <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${status.state === SprinklerState.ACTIVE ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${status.state === SprinklerState.ACTIVE ? 'bg-blue-600' : 'bg-slate-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{status.state}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase block">Automatic Mode</span>
                            <span className="text-xs font-bold text-slate-900">{status.autoMode ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <button
                            onClick={() => onToggleAuto(!status.autoMode)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${status.autoMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${status.autoMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {status.autoMode && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Proactive Maintenance</h4>
                                    <p className="text-[10px] font-bold text-blue-700 leading-tight">
                                        System targeting <span className="underlineDecoration">Healthy Zone (AQI 80)</span>.
                                    </p>
                                    <p className="text-[8px] font-medium text-blue-500 italic">
                                        Frequent short bursts prevent hazardous pollution build-up.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!status.autoMode && (
                        <button
                            onClick={onTrigger}
                            disabled={status.state === SprinklerState.ACTIVE}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${status.state === SprinklerState.ACTIVE ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-900 text-white hover:bg-blue-800 active:scale-95'}`}
                        >
                            {status.state === SprinklerState.ACTIVE ? 'Spraying in Progress...' : 'Activate Mist Now'}
                        </button>
                    )}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest block mb-4">Water Consumption</span>
                    <div className="text-4xl font-black mb-1">~12.4<span className="text-xl">L</span></div>
                    <p className="text-[10px] font-medium opacity-40 uppercase tracking-tighter">Est. Daily Usage • Delhi N/A</p>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg. Impact</span>
                            <span className="text-green-400 font-black text-xs">18% Reduction</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Activation History Log</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-50">
                            {history.length > 0 ? history.map((h, i) => (
                                <tr key={i} className="text-[10px] font-bold text-slate-600">
                                    <td className="px-4 py-3">{new Date(h.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-4 py-3">{h.duration} min</td>
                                    <td className="px-4 py-3">AQI {h.aqiBefore} → {h.aqiAfter}</td>
                                    <td className="px-4 py-3 text-green-600">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className="px-4 py-6 text-center text-slate-400">No recent activations recorded</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SprinklerControl;
