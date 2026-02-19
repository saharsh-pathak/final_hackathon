
import React, { useState } from 'react';
import { SprinklerStatus, SprinklerState } from '../types';

interface SprinklerControlProps {
    status: SprinklerStatus;
    history: any[];
    forecastPeakAQI: number;
    onTrigger: () => void;
    onSetThreshold: (value: number) => void;
}

const SprinklerControl: React.FC<SprinklerControlProps> = ({ status, history, forecastPeakAQI, onTrigger, onSetThreshold }) => {
    const [showFullHistory, setShowFullHistory] = useState(false);
    return (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="mb-8">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Intervention Manager</h3>
                <h2 className="text-xl font-black text-slate-900">Sprinkler Control</h2>
            </div>

            <div className="mb-8">
                <div className="space-y-4">
                    {/* Static Automatic Mode indicator — always active, no toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-0.5">Automatic Mode</span>
                            <span className="text-xs font-bold text-blue-900">
                                {status.state === SprinklerState.ACTIVE ? 'Spraying in Progress...' : 'Active — Monitoring Continuously'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-sm ${status.state === SprinklerState.ACTIVE ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                                {status.state === SprinklerState.ACTIVE ? 'Active' : 'Standby'}
                            </span>
                        </div>
                    </div>


                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Activation History Log</h3>
                <div className="overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Duration</th>
                                <th className="px-4 py-2">Zones Treated</th>
                                <th className="px-4 py-2">AQI Impact</th>
                                <th className="px-4 py-2">Reduction</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.length > 0 ? history.slice(0, 3).map((h, i) => (
                                <tr key={i} className="text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">{new Date(h.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-4 py-3">{h.duration} min</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black">
                                                {h.zoneCount || 'All'} Zone{(h.zoneCount || 1) !== 1 ? 's' : ''}
                                            </span>
                                            {h.affectedZones && h.affectedZones.length > 0 && (
                                                <span className="text-[9px] text-slate-400 truncate max-w-[120px]" title={h.affectedZones.join(', ')}>
                                                    {h.affectedZones[0]}{h.affectedZones.length > 1 ? `, +${h.affectedZones.length - 1}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-slate-700">AQI {h.aqiBefore}</span>
                                        <span className="mx-1 text-slate-400">→</span>
                                        <span className="text-green-600 font-black">{h.aqiAfter}</span>
                                    </td>
                                    <td className="px-4 py-3 text-green-600 font-black">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No recent activations recorded</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {history.length > 3 && (
                    <button
                        onClick={() => setShowFullHistory(true)}
                        className="mt-4 w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Show More ({history.length} total entries)
                    </button>
                )}
            </div>

            {showFullHistory && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
                    onClick={() => setShowFullHistory(false)}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black">Full Activation History</h2>
                                <p className="text-xs font-medium opacity-80 mt-1">Past 24 Hours • {history.length} Total Activations</p>
                            </div>
                            <button
                                onClick={() => setShowFullHistory(false)}
                                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                    <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="px-4 py-3">Time</th>
                                        <th className="px-4 py-3">Duration</th>
                                        <th className="px-4 py-3">Zones Treated</th>
                                        <th className="px-4 py-3">AQI Impact</th>
                                        <th className="px-4 py-3">Reduction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map((h, i) => (
                                        <tr key={i} className="text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">{new Date(h.timestamp).toLocaleTimeString()}</td>
                                            <td className="px-4 py-3">{h.duration} min</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black">
                                                        {h.zoneCount || 'All'} Zone{(h.zoneCount || 1) !== 1 ? 's' : ''}
                                                    </span>
                                                    {h.affectedZones && h.affectedZones.length > 0 && (
                                                        <span className="text-[9px] text-slate-400 truncate max-w-[200px]" title={h.affectedZones.join(', ')}>
                                                            {h.affectedZones[0]}{h.affectedZones.length > 1 ? `, +${h.affectedZones.length - 1}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-700">AQI {h.aqiBefore}</span>
                                                <span className="mx-1 text-slate-400">→</span>
                                                <span className="text-green-600 font-black">{h.aqiAfter}</span>
                                            </td>
                                            <td className="px-4 py-3 text-green-600 font-black">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SprinklerControl;
