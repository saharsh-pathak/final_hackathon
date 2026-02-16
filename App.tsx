
import React, { useState, useEffect, useMemo } from 'react';
import { LocationData, AQICategory, SprinklerStatus, SprinklerState } from './types';
import { TEMP_AQI_LOCATIONS, NAQI_BREAKPOINTS } from './constants';
import { calculateAQI, generateMockHistory, fetchRealAQI, simulateNodeData, generateMockPredictions, simulateSprinklerImpact } from './services/aqiService';
import AQIMap from './components/AQIMap';
import PredictionModule from './components/PredictionModule';
import SprinklerControl from './components/SprinklerControl';

const App: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sprinklerStatus, setSprinklerStatus] = useState<SprinklerStatus>({
    state: SprinklerState.INACTIVE,
    threshold: 200,
    autoMode: true
  });
  const [sprinklerHistory, setSprinklerHistory] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
      console.log('🚀 Initializing TEMP AQI System...');
      setLoading(true);

      try {
        // Fetch real data for Node 1
        const node1Base = await fetchRealAQI(TEMP_AQI_LOCATIONS[0].coordinates[0], TEMP_AQI_LOCATIONS[0].coordinates[1]);

        const data: LocationData[] = TEMP_AQI_LOCATIONS.map((loc, idx) => {
          let nodeReading;
          if (idx === 0) {
            nodeReading = node1Base;
          } else {
            // Simulate Nodes 2, 3, 4 based on Node 1 with slight offsets
            const offsets = [0, 15, -10, 25]; // Distinct offsets for simulation
            nodeReading = simulateNodeData(node1Base.pm25, offsets[idx]);
          }

          return {
            ...loc,
            currentReading: {
              timestamp: new Date().toISOString(),
              ...nodeReading
            },
            history: generateMockHistory(nodeReading.pm25),
            predictions: generateMockPredictions(nodeReading.pm25)
          };
        });

        setLocations(data);
        if (data.length > 0) setSelectedId(data[0].id);
        console.log('✅ TEMP AQI initialization complete!');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const selectedLocation = useMemo(() => locations.find(l => l.id === selectedId), [locations, selectedId]);

  const colonyAverageAQI = useMemo(() => {
    if (locations.length === 0) return 0;
    const sum = locations.reduce((acc, loc) => acc + loc.currentReading.aqi, 0);
    return Math.round(sum / locations.length);
  }, [locations]);

  const handleTriggerSprinkler = () => {
    if (sprinklerStatus.state === SprinklerState.ACTIVE) return;

    setSprinklerStatus(prev => ({ ...prev, state: SprinklerState.ACTIVE }));

    // Simulate activation for 5 seconds (demo purposes)
    const aqiBefore = colonyAverageAQI;

    setTimeout(() => {
      const aqiAfter = simulateSprinklerImpact(aqiBefore);
      const newEntry = {
        timestamp: new Date().toISOString(),
        duration: 5,
        aqiBefore,
        aqiAfter
      };

      setSprinklerHistory(prev => [newEntry, ...prev]);
      setSprinklerStatus(prev => ({ ...prev, state: SprinklerState.INACTIVE }));

      // Proactively update locations to show reduction (visual impact)
      setLocations(prev => prev.map(loc => {
        const newPM = loc.currentReading.pm25 * (aqiAfter / aqiBefore);
        const { aqi, category } = calculateAQI(newPM);
        return {
          ...loc,
          currentReading: { ...loc.currentReading, pm25: newPM, aqi, category }
        };
      }));
    }, 5000);
  };

  // Automatic Trigger Logic
  useEffect(() => {
    if (sprinklerStatus.autoMode &&
      colonyAverageAQI >= sprinklerStatus.threshold &&
      sprinklerStatus.state === SprinklerState.INACTIVE) {
      console.log('🤖 Auto-Triggering Sprinkler: AQI Threshold Exceeded');
      handleTriggerSprinkler();
    }
  }, [colonyAverageAQI, sprinklerStatus.autoMode, sprinklerStatus.threshold, sprinklerStatus.state]);

  const getAqiInfo = (category: AQICategory) => NAQI_BREAKPOINTS.find(b => b.category === category);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-black tracking-tight uppercase text-xs">Syncing TEMP AQI Network...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-lg shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">TEMP AQI Dashboard</h1>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Hyperlocal Mitigation v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 uppercase block">Colony Average</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">{colonyAverageAQI} AQI</span>
            </div>
            <span className="text-[10px] px-3 py-1 bg-green-100 text-green-700 rounded-full font-black uppercase">Network Stable</span>
            <button
              onClick={() => {
                setLocations(prev => prev.map(loc => ({
                  ...loc,
                  currentReading: { ...loc.currentReading, aqi: 450, pm25: 350, category: AQICategory.SEVERE }
                })));
                console.log('⚠️ [TEST] AQI Spike Simulated at 450');
              }}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase hover:bg-red-200 transition-colors"
            >
              Simulate Spike
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Map and Node Grid */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
            <AQIMap locations={locations} selectedId={selectedId} onSelectLocation={setSelectedId} clusters={{}} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {locations.map(loc => {
              const info = getAqiInfo(loc.currentReading.category);
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedId(loc.id)}
                  className={`p-4 rounded-3xl text-left border-2 transition-all ${selectedId === loc.id ? 'bg-white border-blue-900 shadow-xl scale-105' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                >
                  <div className={`w-8 h-1 rounded-full mb-3 ${info?.color}`} />
                  <h4 className="text-[10px] font-black text-slate-500 line-clamp-1 mb-1 uppercase tracking-tight">{loc.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{loc.currentReading.aqi}</span>
                    <span className="text-[10px] font-bold text-slate-400">AQI</span>
                  </div>
                </button>
              );
            })}
          </div>

          <SprinklerControl
            status={sprinklerStatus}
            history={sprinklerHistory}
            onTrigger={handleTriggerSprinkler}
            onToggleAuto={(val) => setSprinklerStatus(p => ({ ...p, autoMode: val }))}
            onSetThreshold={(val) => setSprinklerStatus(p => ({ ...p, threshold: val }))}
          />
        </div>

        {/* Right Column: Node Details and Predictions */}
        <div className="lg:col-span-5 space-y-8">
          {selectedLocation ? (
            <>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`h-2 ${getAqiInfo(selectedLocation.currentReading.category)?.color}`} />
                <div className="p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Live Monitoring</span>
                      <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedLocation.name}</h2>
                      {selectedLocation.isSimulated && <span className="text-[8px] font-black text-slate-400 uppercase">Simulated Virtual Node</span>}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl text-center ${getAqiInfo(selectedLocation.currentReading.category)?.color} text-white shadow-lg`}>
                      <div className="text-3xl font-black tracking-tighter">{selectedLocation.currentReading.aqi}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-1">AQI</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">PM2.5</span>
                      <span className="text-lg font-black text-slate-800">{selectedLocation.currentReading.pm25}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">PM10</span>
                      <span className="text-lg font-black text-slate-800">{selectedLocation.currentReading.pm10.toFixed(0)}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Humidity</span>
                      <span className="text-lg font-black text-slate-800">{selectedLocation.currentReading.humidity || '--'} %</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900">
                    <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Category Detail</span>
                    <p className="text-xs font-bold leading-relaxed">{getAqiInfo(selectedLocation.currentReading.category)?.description}</p>
                  </div>
                </div>
              </div>

              <PredictionModule predictions={selectedLocation.predictions} />
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-center">
              Select a node to view detailed analytics.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
