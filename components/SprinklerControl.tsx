import React, { useState } from 'react';
import { SprinklerStatus, SprinklerState } from '../types';

interface SprinklerControlProps {
    status: SprinklerStatus;
    history: any[];
    forecastPeakAQI: number;
    selectedId: string | null;
    nodeName?: string;
    onTrigger: (targetId?: string) => void;
    onStop: (targetId?: string) => void;
    onToggleMode: (targetId: string, mode: boolean) => void;
    onSetThreshold: (value: number) => void;
    isHardwareActive?: boolean;
}

const SprinklerControl: React.FC<SprinklerControlProps> = ({ status, history, forecastPeakAQI, selectedId, nodeName, onTrigger, onStop, onToggleMode, onSetThreshold, isHardwareActive }) => {
    const [showFullHistory, setShowFullHistory] = useState(false);

    // Filter history based on selected node
    const filteredHistory = selectedId
        ? history.filter(h => h.zoneId === selectedId)
        : history;

    // Default to Auto if not set or no selection, but if selected, use specific mode
    const isAuto = selectedId ? (status.autoMode[selectedId] ?? true) : true;

    return (
        <div className="bg-white rounded-lg p-7 border border-slate-200">
            <div className="mb-7">
                <h2 className="text-xl font-black text-slate-900">Sprinkler Control</h2>
            </div>

            <div className="mb-8">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-blue-50 rounded-lg border border-blue-100">
                        <div>

                            <span className="text-sm font-semibold text-blue-900">
                                {selectedId
                                    ? (isHardwareActive || status.activeNodes[selectedId]) ? 'Spraying in Progress...' : 'Active — Monitoring Continuously'
                                    : 'Select a Node to Monitor'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-sm ${(selectedId && (isHardwareActive || status.activeNodes[selectedId])) ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                            <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                                {(selectedId && (isHardwareActive || status.activeNodes[selectedId])) ? 'Active' : 'Standby'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Activation History Log</h3>
                <div className="overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-5 py-3">Time</th>
                                <th className="px-5 py-3">Duration</th>
                                <th className="px-5 py-3">AQI Impact</th>
                                <th className="px-5 py-3">Reduction</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.length > 0 ? filteredHistory.slice(0, 3).map((h, i) => (
                                <tr key={i} className="text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                                    <td className="px-5 py-3.5">{h.duration} min</td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-slate-700">AQI {h.aqiBefore}</span>
                                        <span className="mx-1.5 text-slate-400">→</span>
                                        <span className="text-green-600 font-bold">{h.aqiAfter}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-green-600 font-bold">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No recent activations recorded</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredHistory.length > 3 && (
                    <button
                        onClick={() => setShowFullHistory(true)}
                        className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-blue-600 font-black text-xs uppercase tracking-widest transition-colors border-t border-slate-100"
                    >
                        Show More
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
                                <h2 className="text-2xl font-black">Full Activation History {nodeName ? `— ${nodeName}` : ''}</h2>
                                <p className="text-xs font-medium opacity-80 mt-1">Past 24 Hours • {filteredHistory.length} Total Activations</p>
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
                                    <tr className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        <th className="px-5 py-3.5">Time</th>
                                        <th className="px-5 py-3.5">Duration</th>
                                        <th className="px-5 py-3.5">AQI Impact</th>
                                        <th className="px-5 py-3.5">Reduction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredHistory.map((h, i) => (
                                        <tr key={i} className="text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                                            <td className="px-5 py-4">{h.duration} min</td>
                                            <td className="px-5 py-4">
                                                <span className="text-slate-700">AQI {h.aqiBefore}</span>
                                                <span className="mx-1.5 text-slate-400">→</span>
                                                <span className="text-green-600 font-bold">{h.aqiAfter}</span>
                                            </td>
                                            <td className="px-5 py-4 text-green-600 font-bold">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</td>
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
