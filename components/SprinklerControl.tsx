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
        <div className="bg-white rounded-xl p-8 shadow-md border border-slate-200">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Sprinkler <span className="text-blue-600">Control</span></h2>

                </div>
            </div>

            <div className="mb-8">
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Control Status</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {selectedId
                                        ? (isHardwareActive || status.activeNodes[selectedId]) ? 'Misting in progress...' : 'System standard monitoring'
                                        : 'Select a node for control'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${(selectedId && (isHardwareActive || status.activeNodes[selectedId])) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${(selectedId && (isHardwareActive || status.activeNodes[selectedId])) ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                                {(selectedId && (isHardwareActive || status.activeNodes[selectedId])) ? 'Active' : 'Standby'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activation History</h3>
                        <p className="text-[9px] font-medium text-slate-300 uppercase tracking-wider mt-0.5">Last 6 Events</p>
                    </div>
                    {filteredHistory.length > 0 && (
                        <div className="px-1.5 py-0.5 bg-slate-50 rounded text-[8px] font-bold text-slate-400 uppercase border border-slate-100">
                            {filteredHistory.length} Sessions
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100/50 border-b border-slate-100">
                            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3 text-center">Dur</th>
                                <th className="px-4 py-3 text-right">AQI Delta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.length > 0 ? filteredHistory.slice(0, 6).map((h, i) => (
                                <tr key={i} className="text-[12px] font-bold text-slate-600 hover:bg-white transition-colors">
                                    <td className="px-4 py-3 text-slate-500">
                                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{h.duration}m</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-slate-300 line-through font-normal">{h.aqiBefore}</span>
                                            <span className="text-green-600">{h.aqiAfter}</span>
                                            <span className="text-[9px] font-bold text-green-500 ml-1">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        No History Recorded
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredHistory.length > 6 && (
                    <button
                        onClick={() => setShowFullHistory(true)}
                        className="w-full mt-4 py-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-colors border border-blue-100 rounded-lg shadow-sm"
                    >
                        View Full History
                    </button>
                )}
            </div>

            {showFullHistory && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Sprinkler Activation History</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {nodeName ? `${nodeName}` : 'All Zones'} • {filteredHistory.length} Sessions Total
                                </p>
                            </div>
                            <button
                                onClick={() => setShowFullHistory(false)}
                                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100 sticky top-0">
                                    <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="px-4 py-3">Timestamp</th>
                                        <th className="px-4 py-3 text-center">Duration</th>
                                        <th className="px-4 py-3 text-right">AQI Delta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredHistory.map((h, i) => (
                                        <tr key={i} className="text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className="text-slate-800">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                <span className="ml-2 text-[10px] text-slate-400 uppercase font-medium">{new Date(h.timestamp).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px]">{h.duration} min</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-slate-300 line-through font-normal">{h.aqiBefore}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                    <span className="text-green-600 font-bold">{h.aqiAfter}</span>
                                                    <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px]">-{Math.round((1 - h.aqiAfter / h.aqiBefore) * 100)}%</span>
                                                </div>
                                            </td>
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
