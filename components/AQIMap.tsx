
import React, { useEffect, useRef, useState } from 'react';
import { LocationData } from '../types';
import { NAQI_BREAKPOINTS, OFFICIAL_STATION_DATA, MAP_CENTER, COLONY_POLYGON } from '../constants';

interface AQIMapProps {
  locations: LocationData[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  clusters?: any;
}

const AQIMap: React.FC<AQIMapProps> = ({ locations, selectedId, onSelectLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const layerRef = useRef<{ [key: string]: any }>({});
  const [mapReady, setMapReady] = useState(false);
  // Removed layers state as markers are now permanently visible

  const getColor = (category: string) => {
    const bp = NAQI_BREAKPOINTS.find(b => b.category === category);
    const color = bp ? bp.color.replace('bg-', '') : 'gray';
    switch (color) {
      case 'red-900': return '#7f1d1d';
      case 'red-500': return '#ef4444';
      case 'orange-500': return '#f97316';
      case 'yellow-400': return '#facc15';
      case 'green-400': return '#4ade80';
      case 'green-500': return '#22c55e';
      default: return '#64748b';
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView(MAP_CENTER, 14);

    mapRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Initial Boundary Layer
    const boundary = L.polygon(COLONY_POLYGON, {
      color: '#1e3a8a',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '5, 10'
    }).addTo(map);
    layerRef.current['boundary'] = boundary;

    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const map = mapRef.current;

    // Layer Visibility Logic
    // Boundary logic removed (handled by initial render)

    // Clean up old markers
    const currentLocIds = new Set(locations.map(l => l.id));
    currentLocIds.add(OFFICIAL_STATION_DATA.id);

    Object.keys(markersRef.current).forEach(id => {
      // Always remove all markers to ensure fresh render
      if (markersRef.current[id]) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // 1. Render Official Station (Permanently Visible)
    const loc = OFFICIAL_STATION_DATA;
    const latLng = L.latLng(loc.coordinates[0], loc.coordinates[1]);

    const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; border: 4px solid #1e3a8a; box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.2); background-color: white; cursor: pointer;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"/><path d="M5 21V7"/><path d="M19 21V7"/></svg>
              <span style="font-size: 8px; font-weight: 900; color: #1e3a8a; margin-top: 2px;">CPCB</span>
          </div>
          <div style="position: absolute; -top: 10px; -right: 10px; background-color: #1e3a8a; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 10px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translate(50%, -50%);">
            REF
          </div>
        </div>
      `;
    const icon = L.divIcon({ className: 'official-marker', html: markerHtml, iconSize: [56, 56], iconAnchor: [28, 28] });
    const marker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
    marker.bindPopup(`<div style="padding: 10px; font-family: 'Inter', sans-serif;"><h3 style="font-weight: 900; color: #1e3a8a; text-transform: uppercase; font-size: 12px; margin-bottom: 4px;">${loc.officialData?.name}</h3><p style="font-size: 10px; color: #64748b; font-weight: 700; margin-bottom: 8px;">${loc.officialData?.type}</p></div>`);
    markersRef.current[loc.id] = marker;

    // Ensure circle layer exists
    if (!layerRef.current['official-radius']) {
      const circle = L.circle(latLng, { radius: loc.officialData?.coverageRadius * 1000, color: '#1e3a8a', weight: 1, opacity: 0.2, fillOpacity: 0.05, dashArray: '10, 10' }).addTo(map);
      layerRef.current['official-radius'] = circle;
    }

    // 2. Render TEMP Nodes (Permanently Visible)
    locations.filter(l => l.type === 'TEMP_NODE').forEach((loc) => {
      const color = getColor(loc.currentReading.category);
      const isSprinklerActive = loc.currentReading.sprinklerActive;
      const latLng = L.latLng(Number(loc.coordinates[0]), Number(loc.coordinates[1]));

      const markerHtml = `
        <div style="position: relative; width: 44px; height: 44px;">
          ${isSprinklerActive ? `
            <div class="sprinkler-ripple" style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); z-index: -1;"></div>
            <div class="mist-overlay" style="position: absolute; top: -20px; left: -20px; width: 84px; height: 84px; background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; pointer-events: none; z-index: 1;"></div>
          ` : ''}
          <div style="width: 44px; height: 44px; border-radius: 50%; border: 4px solid white; background-color: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px; box-shadow: ${isSprinklerActive ? '0 0 20px #3b82f6' : '0 4px 6px -1px rgba(0,0,0,0.1)'}; relative; z-index: 2;">
            ${loc.currentReading.aqi}
          </div>
        </div>
      `;

      const icon = L.divIcon({ className: 'temp-marker', html: markerHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
      const marker = L.marker(latLng, { icon, zIndexOffset: 500 }).addTo(map).on('click', () => onSelectLocation(loc.id));
      markersRef.current[loc.id] = marker;

      // Flow lines always visible
      const officialLatLng = L.latLng(OFFICIAL_STATION_DATA.coordinates[0], OFFICIAL_STATION_DATA.coordinates[1]);
      const polyline = L.polyline([L.latLng(loc.coordinates[0], loc.coordinates[1]), officialLatLng], {
        color: '#1e3a8a', weight: 1, opacity: 0.15, dashArray: '4, 8', className: 'data-flow-line'
      }).addTo(map);
      markersRef.current['flow-' + loc.id] = polyline;
    });

  }, [locations, selectedId, onSelectLocation, mapReady]);

  return (
    <div className="relative w-full h-[550px] rounded-lg overflow-hidden shadow-2xl border-4 border-white">
      <style>{`
        @keyframes sprinklerRipple {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .sprinkler-ripple {
          animation: sprinklerRipple 2s infinite ease-out;
        }
        @keyframes mistFlow {
          0% { transform: translate(-5%, -5%) scale(1); opacity: 0.4; }
          50% { transform: translate(5%, 5%) scale(1.1); opacity: 0.6; }
          100% { transform: translate(-5%, -5%) scale(1); opacity: 0.4; }
        }
        .mist-overlay {
          animation: mistFlow 4s infinite ease-in-out;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full bg-slate-50" />

      {/* Legend & UI Overlays */}
      {/* Legend & UI Overlays REMOVED per user request */}

      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-slate-200">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Coverage: <span className="text-blue-900">Mayur Vihar Colony Zone 1</span></span>
      </div>
    </div>
  );
};

export default AQIMap;