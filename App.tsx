
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LocationData, AQICategory, SprinklerStatus, SprinklerState } from './types';
import { TEMP_AQI_LOCATIONS, NAQI_BREAKPOINTS, OFFICIAL_STATION_DATA, MAP_CENTER } from './constants';
import { calculateAQI, getCategoryFromAQI, generateMockHistory, simulateNodeData, generateMockPredictions, simulateSprinklerImpact, subscribeToNode1, Node1FirebaseData, saveActivationToFirebase, fetchSprinklerHistory, calculatePM25FromAQI, pushSensorHistory } from './services/aqiService';
import { shouldActivateSprinkler } from './services/controlService';
import AQIMap from './components/AQIMap';
import PredictionModule from './components/PredictionModule';
import SprinklerControl from './components/SprinklerControl';

const App: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [officialStation, setOfficialStation] = useState<LocationData>(OFFICIAL_STATION_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sprinklerStatus, setSprinklerStatus] = useState<SprinklerStatus>({
    state: SprinklerState.INACTIVE,
    threshold: 80, // Target AQI
    autoMode: {}, // Per-node auto mode map
    activeNodes: {}
  });
  const [sprinklerHistory, setSprinklerHistory] = useState<any[]>([]);
  const [zoneLastTreated, setZoneLastTreated] = useState<{ [zoneId: string]: Date }>({});
  const [node1LiveData, setNode1LiveData] = useState<Node1FirebaseData | null>(null);
  const [node1Connected, setNode1Connected] = useState(false);
  const [historyModal, setHistoryModal] = useState<boolean>(false);
  const [time, setTime] = useState(new Date());
  const manualTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const prevHardwareActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firebase live subscription for Node-1
  useEffect(() => {
    console.log('🔥 Subscribing to Firebase Node1...');
    const unsubscribe = subscribeToNode1((data) => {
      console.log('📡 Firebase Node1 update:', data);
      setNode1LiveData(data);
      setNode1Connected(true);

      // GLOBAL SYNC: If Node 1 hardware is active, ensure portal state reflects it
      setSprinklerStatus(prev => {
        const isHardwareActive = !!data.sprinklerActive;
        const hasPortalTriggeredActive = Object.keys(prev.activeNodes).length > 0;

        return {
          ...prev,
          state: (isHardwareActive || hasPortalTriggeredActive) ? SprinklerState.ACTIVE : SprinklerState.INACTIVE
        };
      });

      // HARDWARE HISTORY TRACKING: Detect state transitions for Node 1
      const isNowActive = !!data.sprinklerActive;
      const wasActive = prevHardwareActiveRef.current;

      if (isNowActive && !wasActive) {
        // Hardware started spraying: Start keeping track for history
        console.log('💧 [Hardware] Node 1 started spraying. Capturing start metadata...');
        const currentLocs = locationsRef.current;
        const node1 = currentLocs.find(l => l.id === 'node-1');
        const aqiBefore = node1?.currentReading.aqi || data.aqi || 0;

        activeSessionMetadata.current['node-1'] = {
          startTime: Date.now(),
          aqiBefore,
          projectedDuration: 0 // Unknown for hardware triggers
        };

        setZoneLastTreated(prev => ({
          ...prev,
          ['node-1']: new Date()
        }));
      } else if (!isNowActive && wasActive) {
        // Hardware stopped spraying: Finalize and log to history
        console.log('💧 [Hardware] Node 1 stopped spraying. Finalizing history entry...');
        finalizeActivation('node-1');
      }

      prevHardwareActiveRef.current = isNowActive;

      // Update ref for background recorder
      node1LiveDataRef.current = data;



      // Update Node-1 in locations state with live ESP32 data
      setLocations(prev => {
        // If locations haven't been initialized yet, we can't map. 
        // But we should at least ensure Node-1 will be there.
        if (prev.length === 0) {
          console.warn('📡 [Firebase] Node1 update received before locations initialized.');
          return prev;
        }

        return prev.map(loc => {
          if (loc.id === 'node-1') {
            let aqi = Number(data.aqi) || 0;
            let pm25 = Number(data.pm25) || 0;

            // Ensure PM2.5 and AQI are always in sync for display
            if (aqi > 0 && pm25 === 0) {
              pm25 = calculatePM25FromAQI(aqi);
            } else if (pm25 > 0 && aqi === 0) {
              aqi = calculateAQI(pm25).aqi;
            }

            const category = getCategoryFromAQI(aqi);
            // Firebase stores ms, don't multiply by 1000
            const ts = Number(data.timestamp);
            const timestamp = !isNaN(ts) ? new Date(ts).toISOString() : new Date().toISOString();

            return {
              ...loc,
              currentReading: {
                ...loc.currentReading,
                aqi,
                category,
                pm25,
                pm10: pm25 * 1.6,
                humidity: Number(data.humidity) || 0,
                temperature: Number(data.temperature) || 0,
                sprinklerActive: !!data.sprinklerActive,
                sprinklerStatus: data.sprinklerStatus || 'Ready',
                timestamp
              }
            };
          }
          return loc;
        });
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initData = async () => {
      console.log('🚀 Initializing Enhanced TEMP AQI System...');
      setLoading(true);

      try {
        // Node-1 starts with a sensible fallback; Firebase subscription will overwrite with live data
        // as soon as the onValue listener fires (typically within ~500ms)
        const node1Base = { pm25: 85, pm10: 136, ...calculateAQI(85) };

        // Initialize Official Station
        const offStation = { ...OFFICIAL_STATION_DATA };
        offStation.currentReading.timestamp = new Date().toISOString();
        setOfficialStation(offStation);

        // 1. Fetch persistent history from Firebase FIRST
        const realHistory = await fetchSprinklerHistory();
        setSprinklerHistory(realHistory);

        // 2. Initialize Locations with history-aware defaults
        const data: LocationData[] = TEMP_AQI_LOCATIONS.map((loc, idx) => {
          let nodeReading;
          const node1Base = { pm25: 85, pm10: 136, ...calculateAQI(85) };

          if (idx === 0) {
            nodeReading = node1Base;
          } else {
            // Simulate Nodes 2, 3, 4 as per User requested scenarios
            nodeReading = simulateNodeData(idx + 1);
          }

          // RECONCILE WITH HISTORY: If this node was recently treated, use history value as starting point
          const latestEntry = realHistory.find(h => h.zoneId === loc.id);
          if (latestEntry) {
            console.log(`📍 Syncing ${loc.id} for startup: Using history AQI ${latestEntry.aqiAfter}`);
            nodeReading.aqi = latestEntry.aqiAfter;
            // Re-derive category for UI color consistency
            nodeReading.category = getCategoryFromAQI(nodeReading.aqi);
          }

          return {
            ...loc,
            currentReading: {
              timestamp: new Date().toISOString(),
              temperature: 28 + Math.random() * 4,
              ...nodeReading
            },
            history: generateMockHistory(nodeReading.pm25),
            predictions: generateMockPredictions(nodeReading.pm25)
          };
        });

        setLocations(data);
        if (data.length > 0) setSelectedId(data[0].id);

        // 3. Initialize zone last treated times from real history
        const initialZoneTimes: { [zoneId: string]: Date } = {};
        realHistory.forEach(entry => {
          if (entry.zoneId && (!initialZoneTimes[entry.zoneId] || new Date(entry.timestamp) > initialZoneTimes[entry.zoneId])) {
            initialZoneTimes[entry.zoneId] = new Date(entry.timestamp);
          }
        });
        setZoneLastTreated(initialZoneTimes);

        console.log('✅ Strategic initialization complete!');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const allLocations = useMemo(() => [officialStation, ...locations], [officialStation, locations]);
  const selectedLocation = useMemo(() => allLocations.find(l => l.id === selectedId), [allLocations, selectedId]);

  const colonyAverageAQI = useMemo(() => {
    if (locations.length === 0) return 0;
    const sum = locations.reduce((acc, loc) => acc + loc.currentReading.aqi, 0);
    return Math.round(sum / locations.length);
  }, [locations]);

  const colonyAverageHumidity = useMemo(() => {
    if (locations.length === 0) return 45;
    const validReadings = locations.filter(l => l.currentReading.humidity !== undefined);
    if (validReadings.length === 0) return 45;
    const sum = validReadings.reduce((acc, loc) => acc + (loc.currentReading.humidity || 0), 0);
    return Math.round(sum / validReadings.length);
  }, [locations]);

  const activeSessionMetadata = useRef<{ [key: string]: { startTime: number, aqiBefore: number, projectedDuration: number } }>({});

  const finalizeActivation = (targetId: string) => {
    const meta = activeSessionMetadata.current[targetId];
    if (!meta) return;

    // Clear timer if it's still running (e.g. forced finalization)
    if (manualTimersRef.current[targetId]) {
      clearTimeout(manualTimersRef.current[targetId]);
      delete manualTimersRef.current[targetId];
    }

    const now = Date.now();
    // Actual duration in minutes (min 0.1)
    const actualDuration = Math.max(0.1, (now - meta.startTime) / 60000);
    // If it ran full duration (approx), use projected. Else use actual.
    const durationToLog = Math.abs(actualDuration * 60000 - meta.projectedDuration * 60000) < 1000
      ? meta.projectedDuration
      : parseFloat(actualDuration.toFixed(1));

    const targetZone = locationsRef.current.find(l => l.id === targetId);
    if (!targetZone) return;

    const aqiBefore = meta.aqiBefore;
    // Simulate impact based on duration fraction
    const completionRatio = Math.min(1, actualDuration / meta.projectedDuration);
    const aqiAfter = Math.round(aqiBefore - (aqiBefore * 0.25 * completionRatio)); // Up to 25% reduction

    // 1. Log History
    const newEntry = {
      timestamp: new Date(meta.startTime).toISOString(),
      duration: durationToLog,
      aqiBefore,
      aqiAfter,
      affectedZones: [targetZone.name],
      zoneCount: 1,
      zoneId: targetZone.id
    };

    // Save to Firebase for persistence
    saveActivationToFirebase(newEntry);

    setSprinklerHistory(prev => [newEntry, ...prev]);

    // 2. Update Location Data (AQI Reduction)
    setLocations(prev => prev.map(loc => {
      if (loc.id === targetId) {
        const newPM = loc.currentReading.pm25 * (aqiAfter / aqiBefore);
        // Force Category to match the explicit aqiAfter value
        const category = getCategoryFromAQI(aqiAfter);
        return {
          ...loc,
          currentReading: {
            ...loc.currentReading,
            pm25: newPM,
            aqi: aqiAfter,
            category
          }
        };
      }
      return loc;
    }));

    // 3. Update Status (Inactive)
    setSprinklerStatus(prev => {
      const newActive = { ...prev.activeNodes };
      delete newActive[targetId];
      return {
        ...prev,
        state: Object.keys(newActive).length > 0 ? SprinklerState.ACTIVE : SprinklerState.INACTIVE,
        // Only update global lastActivation if this was the latest one
        lastActivation: new Date().toISOString(),
        activeNodes: newActive
      };
    });

    // Cleanup metadata
    delete activeSessionMetadata.current[targetId];

    console.log(`✅ Activation finalized for ${targetZone.name}. Duration: ${durationToLog}m. AQI: ${aqiBefore} -> ${aqiAfter}`);
  };

  const handleStopSprinkler = (targetId?: string) => {
    if (!targetId) return;
    // If currently running, finalize it to log history & stop
    if (activeSessionMetadata.current[targetId]) {
      finalizeActivation(targetId);
    } else {
      // Fallback cleanup if no metadata exists (shouldn't happen often)
      setSprinklerStatus(prev => {
        const newActive = { ...prev.activeNodes };
        delete newActive[targetId];
        return {
          ...prev,
          state: Object.keys(newActive).length > 0 ? SprinklerState.ACTIVE : SprinklerState.INACTIVE,
          activeNodes: newActive
        };
      });
    }
  };

  const handleToggleMode = useCallback((targetId: string, isAuto: boolean) => {
    // Independent toggling per node
    setSprinklerStatus(p => ({
      ...p,
      autoMode: { ...p.autoMode, [targetId]: isAuto }
    }));
  }, [setSprinklerStatus]);

  const handleTriggerSprinkler = useCallback((targetId: string, isManual: boolean = false) => {
    const targetZone = locations.find(l => l.id === targetId);
    if (!targetZone) return;

    // Check if already active
    if (sprinklerStatus.activeNodes[targetId]) return;

    const aqiBefore = targetZone.currentReading.aqi;
    const humidity = targetZone.currentReading.humidity || colonyAverageHumidity;

    let roundedDuration: number;

    if (isManual) {
      // Manual mode: Fixed 10 minute duration regardless of conditions
      roundedDuration = 10;
    } else {
      // Automatic Mode: Dynamic Duration Algorithm based on Pollution and Humidity
      const baseDuration = 3.0;
      const aqiFactor = aqiBefore / 150;
      const humFactor = (100 - humidity) / 100;
      const calculatedDuration = Math.min(Math.max(baseDuration * aqiFactor * humFactor, 2), 10);
      roundedDuration = Math.round(calculatedDuration * 10) / 10;
    }

    // 1. Set Status Active
    setSprinklerStatus(prev => ({
      ...prev,
      state: SprinklerState.ACTIVE,
      activeNodes: { ...prev.activeNodes, [targetId]: Date.now() }
    }));

    // 2. Metadata for history
    activeSessionMetadata.current[targetId] = {
      startTime: Date.now(),
      aqiBefore,
      projectedDuration: roundedDuration
    };

    // 3. Update Last Treated IMMEDIATELY
    setZoneLastTreated(prev => ({
      ...prev,
      [targetId]: new Date()
    }));

    console.log(`💧 ${isManual ? 'MANUAL' : 'AUTO'} Activation: ${targetZone.name} (AQI: ${aqiBefore}, Humidity: ${humidity}%, Duration: ${roundedDuration}m)`);

    // 4. Timer (Real-time minutes)
    const timer = setTimeout(() => {
      finalizeActivation(targetId);
    }, roundedDuration * 60000);

    manualTimersRef.current[targetId] = timer;
  }, [locations, sprinklerStatus.activeNodes, colonyAverageHumidity, finalizeActivation, setSprinklerStatus, setZoneLastTreated]);

  // Automatic Trigger Logic: Forecast-Aware Proactive Maintenance
  // Checks both current AQI readings AND 30-min forecast peak to decide when to activate
  const forecastPeakAQI = useMemo(() => {
    if (locations.length === 0) return 0;
    let peak = 0;
    locations.filter(l => l.type === 'TEMP_NODE').forEach(loc => {
      if (loc.predictions) {
        loc.predictions.forEach(p => {
          if (p.aqi > peak) peak = p.aqi;
        });
      }
    });
    return peak;
  }, [locations]);

  // Ref for locations to be used in the stable 60s monitoring loop
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Stable 60s Monitoring Loop
  useEffect(() => {
    console.log('🤖 Starting master control monitoring loop (60s interval)...');

    const monitorAllNodes = () => {
      locationsRef.current.filter(l => l.type === 'TEMP_NODE').forEach(loc => {
        // Skip if already active in state
        if (sprinklerStatus.activeNodes[loc.id]) return;

        const currentAQI = loc.currentReading.aqi;
        const humidity = loc.currentReading.humidity || 0;

        let forecastPeak = 0;
        if (loc.predictions && loc.predictions.length > 0) {
          forecastPeak = Math.max(...loc.predictions.map(p => p.aqi));
        }

        // Call the decoupled control service
        const activationRecommended = shouldActivateSprinkler(currentAQI, forecastPeak, humidity);

        if (activationRecommended) {
          const MAINTENANCE_COOLDOWN_MS = 20 * 60 * 1000;
          const lastTreated = zoneLastTreated[loc.id];
          const isOnCooldown = lastTreated && (Date.now() - lastTreated.getTime() < MAINTENANCE_COOLDOWN_MS);

          if (!isOnCooldown) {
            console.log(`🤖 [Control Service] Recommendation: ACTIVATE ${loc.name} (AQI: ${currentAQI}, Peak: ${forecastPeak}, Hum: ${humidity}%)`);
            handleTriggerSprinkler(loc.id, false);
          }
        }
      });
    };

    const intervalId = setInterval(monitorAllNodes, 60000);
    return () => {
      console.log('🛑 Clearing monitoring loop...');
      clearInterval(intervalId);
    };
  }, [zoneLastTreated, sprinklerStatus.activeNodes, handleTriggerSprinkler]); // Minimal stable deps

  // 🤖 BACKGROUND HISTORY RECORDER
  // Periodically saves Node 1 live data to Firebase history so the AI Forecast has data
  const node1LiveDataRef = useRef<Node1FirebaseData | null>(null);
  useEffect(() => {
    console.log('🤖 Starting 5-minute history recording loop...');
    const recordPoint = () => {
      const currentData = node1LiveDataRef.current;
      if (currentData) {
        pushSensorHistory('Node1', {
          aqi: currentData.aqi,
          humidity: currentData.humidity,
          temperature: currentData.temperature,
          timestamp: currentData.timestamp || Math.floor(Date.now() / 1000)
        });
      }
    };

    // Initial record and then every 5 minutes
    recordPoint();
    const interval = setInterval(recordPoint, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getAqiInfo = (category: AQICategory) => NAQI_BREAKPOINTS.find(b => b.category === category);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-black tracking-tight uppercase text-xs">Mapping Hyperlocal Data...</p>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="relative bg-white border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-lg shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">MistMinds</h1>
            </div>
          </div>

          {/* 1. Time Display Widget - Centered */}
          <div className="hidden md:absolute md:left-1/2 md:-translate-x-1/2 md:block px-6 py-2 bg-slate-100/80 backdrop-blur rounded-full border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5" style={{ fontSize: '0.6rem' }}>Local Time</span>
              <span className="text-xl font-black text-slate-800 tracking-widest font-mono leading-none">
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          </div>


          <div className="flex items-center gap-6">
            {/* Firebase Live Status Indicator */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <div className={`h-1.5 w-1.5 rounded-full ${locations.find(l => l.id === 'node-1')?.currentReading.aqi ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {locations.find(l => l.id === 'node-1')?.currentReading.aqi ? 'Node 1: Live' : 'Node 1: Waiting for Data'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 uppercase block">Colony Average</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">{colonyAverageAQI} AQI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Node Grid, Sprinkler Control, and Map */}
          <div className="lg:col-span-7 space-y-8">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {locations.filter(l => l.type === 'TEMP_NODE').map(loc => {
                const currentAqi = loc.currentReading.aqi;
                const currentCategory = getCategoryFromAQI(currentAqi);
                const info = getAqiInfo(currentCategory);
                const lastTreated = zoneLastTreated[loc.id];
                const minutesSince = lastTreated ? (new Date().getTime() - lastTreated.getTime()) / 60000 : 999;
                const isRecentlyTreated = minutesSince < 60;
                const isLiveNode = loc.id === 'node-1' && node1Connected;
                const isNode1 = loc.id === 'node-1';

                // 2. No border highlight - always standard style unless selected
                const borderClass = selectedId === loc.id
                  ? 'bg-white border-blue-900 shadow-xl -translate-y-1'
                  : 'bg-white border-transparent hover:border-slate-200 shadow-sm';

                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      setSelectedId(loc.id);
                    }}
                    className={`p-5 rounded-lg text-left border-4 transition-all relative cursor-pointer ${borderClass}`}
                  >
                    {isLiveNode && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[8px] font-black text-green-600 uppercase">LIVE</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-[9px] font-black text-slate-500 line-clamp-1 uppercase tracking-tight">{loc.name}</h4>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter mb-1 mt-auto">
                      {currentAqi} <span className="text-[8px] font-black text-slate-300 uppercase">AQI</span>
                    </div>
                    <div className={`text-[8px] font-black uppercase tracking-widest ${info?.textColor || 'text-slate-400'}`}>
                      {currentCategory}
                    </div>

                    {isNode1 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sprinkler</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`flex h-1.5 w-1.5 rounded-full ${loc.currentReading.sprinklerActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            <span className={`text-[9px] font-black uppercase ${loc.currentReading.sprinklerActive ? 'text-green-600' : 'text-slate-500'}`}>
                              {loc.currentReading.sprinklerActive ? 'Active' : 'Off'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            <SprinklerControl
              status={sprinklerStatus}
              history={sprinklerHistory}
              forecastPeakAQI={forecastPeakAQI}
              onTrigger={(id) => id && handleTriggerSprinkler(id, true)}
              onStop={handleStopSprinkler}
              onToggleMode={handleToggleMode}
              selectedId={selectedId}
              nodeName={selectedLocation?.name}
              onSetThreshold={(val) => setSprinklerStatus(p => ({ ...p, threshold: val }))}
              isHardwareActive={selectedLocation?.currentReading?.sprinklerActive}
            />

            <AQIMap locations={locations} selectedId={selectedId} onSelectLocation={setSelectedId} clusters={{}} />
          </div>

          {/* Right Column: Node Details and Predictions */}
          <div className="lg:col-span-5 space-y-8">
            {selectedLocation ? (
              <>
                <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">
                          {selectedLocation.type === 'OFFICIAL' ? 'Official Reference' : 'Hyperlocal Node'}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedLocation.name}</h2>

                      </div>
                      <div className={`px-6 py-4 rounded-lg text-center ${getAqiInfo(getCategoryFromAQI(selectedLocation.currentReading.aqi))?.color || 'bg-slate-400'} text-white shadow-2xl`}>
                        <div className="text-4xl font-black tracking-tighter">{selectedLocation.currentReading.aqi}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">AQI</div>
                      </div>
                    </div>

                    {selectedLocation.type === 'OFFICIAL' ? (
                      <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 mb-8">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Official Station Metadata</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Operator</p>
                            <p className="text-xs font-black text-slate-800">DPCC / CPCB</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Radius</p>
                            <p className="text-xs font-black text-slate-800">5.0 Kilometers</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Measured Pollutants</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedLocation.officialData?.pollutants.map(p => (
                                <span key={p} className="px-2 py-1 bg-white text-[8px] font-black rounded-lg border border-slate-200">{p}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                        {/* 1. PM2.5 for ALL nodes */}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM2.5</span>
                          <span className="text-xl font-black text-slate-800">
                            {selectedLocation.currentReading.pm25 ? selectedLocation.currentReading.pm25.toFixed(2) : '0.00'}
                          </span>
                        </div>

                        {/* 2. PM10: 0.00 for Node 1, real value for others */}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM10</span>
                          <span className="text-xl font-black text-slate-800">
                            {selectedLocation.id === 'node-1' ? '0.00' : (selectedLocation.currentReading.pm10 ? selectedLocation.currentReading.pm10.toFixed(2) : '0.00')}
                          </span>
                        </div>

                        {/* 3. Humidity */}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Humidity</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.humidity?.toFixed(1) || '--'}%</span>
                        </div>

                        {/* 4. Temperature */}
                        <div className="p-5 rounded-lg bg-blue-50 border border-blue-100">
                          <span className="text-[9px] font-black text-blue-400 uppercase block mb-1">Temperature</span>
                          <span className="text-xl font-black text-blue-800">
                            {selectedLocation.currentReading.temperature
                              ? selectedLocation.currentReading.temperature.toFixed(1) + '°C'
                              : '--'}
                          </span>
                        </div>

                        {/* 5. Sprinkler Status for ALL nodes */}
                        <div className={`p-5 rounded-lg col-span-2 border ${sprinklerStatus.activeNodes && sprinklerStatus.activeNodes[selectedLocation.id]
                          ? 'bg-green-50 border-green-200'
                          : 'bg-slate-50 border-slate-100'
                          }`}>
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Sprinkler Status</span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${(selectedLocation.id === 'node-1' ? selectedLocation.currentReading.sprinklerActive : (sprinklerStatus.activeNodes && sprinklerStatus.activeNodes[selectedLocation.id]))
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-slate-300'
                              }`} />
                            <span className={`text-xl font-black ${(selectedLocation.id === 'node-1' ? selectedLocation.currentReading.sprinklerActive : (sprinklerStatus.activeNodes && sprinklerStatus.activeNodes[selectedLocation.id]))
                              ? 'text-green-700'
                              : 'text-slate-500'
                              }`}>
                              {selectedLocation.id === 'node-1' ? (selectedLocation.currentReading.sprinklerActive ? 'Active' : 'Standby') : (sprinklerStatus.activeNodes && sprinklerStatus.activeNodes[selectedLocation.id] ? 'Active' : 'Standby')}
                            </span>
                          </div>
                        </div>

                        {/* 6. Station Proximity (Width optimized if column span allowed?) */}
                        {/* Currently 3 cols width in original. I'll maintain col-span-3 on large (md+), col-span-2 on mobile. */}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100 col-span-2 lg:col-span-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16 10-4 4-4-4" /></svg>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Station Proximity</span>
                                <span className="text-sm font-black text-blue-900 tracking-tight">
                                  {(() => {
                                    const lat1 = selectedLocation.coordinates[0];
                                    const lon1 = selectedLocation.coordinates[1];
                                    const lat2 = OFFICIAL_STATION_DATA.coordinates[0];
                                    const lon2 = OFFICIAL_STATION_DATA.coordinates[1];
                                    const R = 6371; // km
                                    const dLat = (lat2 - lat1) * Math.PI / 180;
                                    const dLon = (lon2 - lon1) * Math.PI / 180;
                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                    return (R * c).toFixed(2);
                                  })()} km from Reference Station
                                </span>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-[8px] font-black uppercase">Hyperlocal Zone</div>
                          </div>
                        </div>

                        {/* 7. Last Activation Widget */}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100 col-span-2 lg:col-span-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Last Activated</span>
                                <span className="text-sm font-black text-purple-900 tracking-tight">
                                  {zoneLastTreated[selectedLocation.id] ? (() => {
                                    const diffMs = Date.now() - new Date(zoneLastTreated[selectedLocation.id]).getTime();
                                    const diffMins = Math.floor(diffMs / 60000);
                                    if (diffMins < 60) return `${diffMins} min ago`;
                                    const diffHours = Math.floor(diffMins / 60);
                                    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                                  })() : 'No recent activation'}
                                </span>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-[8px] font-black uppercase">Sprinkler History</div>
                          </div>
                        </div>
                      </div>
                    )}


                  </div>
                </div>


                <PredictionModule
                  selectedId={selectedId}
                  nodeName={selectedLocation?.name}
                  sprinklerActive={selectedLocation.id === 'node-1' ? selectedLocation.currentReading.sprinklerActive : (sprinklerStatus.activeNodes && sprinklerStatus.activeNodes[selectedLocation.id])}
                />

              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center p-12 bg-white rounded-lg border-4 border-dashed border-slate-100 text-slate-300 font-black text-center text-xl uppercase tracking-tighter">
                Click a marker on the map <br /> to reveal analytics.
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default App;
