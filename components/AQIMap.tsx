
import React, { useEffect, useRef, useState } from 'react';
import { LocationData, AQICategory } from '../types';
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
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

    // Common fix for rendering issues in flex/grid containers
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 1000);

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

    // Dynamic color based on official AQI category
    const categoryInfo = NAQI_BREAKPOINTS.find(b => loc.currentReading.aqi >= b.minAQI && loc.currentReading.aqi <= b.maxAQI);
    const accentColor = categoryInfo?.category === AQICategory.POOR ? '#f97316' :
      categoryInfo?.category === AQICategory.VERY_POOR ? '#ef4444' :
        categoryInfo?.category === AQICategory.SEVERE ? '#7f1d1d' : '#1e3a8a';

    const markerHtml = `
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #0f172a; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Inter', sans-serif; font-weight: 900; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); position: relative;">
          ${loc.currentReading.aqi}
          <div style="position: absolute; top: -4px; right: -4px; background: #1e3a8a; color: white; border-radius: 4px; padding: 1px 4px; font-size: 7px; font-weight: 900; border: 1.5px solid white; letter-spacing: 0.05em;">BASE</div>
        </div>
      `;
    const icon = L.divIcon({ className: 'official-marker', html: markerHtml, iconSize: [40, 40], iconAnchor: [20, 20] });
    const marker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
    marker.bindPopup(`<div style="padding: 10px; font-family: sans-serif;"><h3 style="font-weight: 800; color: #1e3a8a; text-transform: uppercase; font-size: 12px; margin-bottom: 4px;">${loc.officialData?.name}</h3><p style="font-size: 10px; color: #64748b; font-weight: 700;">Reference Station</p></div>`);
    markersRef.current[loc.id] = marker;

    // Ensure circle layer exists
    if (!layerRef.current['official-radius']) {
      const circle = L.circle(latLng, { radius: loc.officialData?.coverageRadius * 1000, color: '#1e3a8a', weight: 2, opacity: 0.3, fillOpacity: 0.05, dashArray: '10, 15', lineCap: 'round' }).addTo(map);
      layerRef.current['official-radius'] = circle;
    }

    // 2. Render TEMP Nodes (Permanently Visible)
    locations.filter(l => l.type === 'TEMP_NODE').forEach((loc) => {
      const color = getColor(loc.currentReading.category);
      const isSelected = loc.id === selectedId;
      const isSprinklerActive = loc.currentReading.sprinklerActive;
      const latLng = L.latLng(Number(loc.coordinates[0]), Number(loc.coordinates[1]));

      const markerHtml = `
        <div style="position: relative; width: 32px; height: 32px;">
          ${isSprinklerActive ? '<div class="sprinkler-ripple" style="position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); z-index: -1;"></div>' : ''}
          <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; background-color: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; box-shadow: ${isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.2)'}; relative; z-index: 2;">
            ${loc.currentReading.aqi}
          </div>
        </div>
      `;

      const icon = L.divIcon({ className: 'temp-marker', html: markerHtml, iconSize: [52, 52], iconAnchor: [26, 26] });
      const marker = L.marker(latLng, { icon, zIndexOffset: isSelected ? 800 : 500 }).addTo(map).on('click', () => onSelectLocation(loc.id));
      markersRef.current[loc.id] = marker;

      // Flow lines always visible
      const officialLatLng = L.latLng(OFFICIAL_STATION_DATA.coordinates[0], OFFICIAL_STATION_DATA.coordinates[1]);
      const polyline = L.polyline([L.latLng(loc.coordinates[0], loc.coordinates[1]), officialLatLng], {
        color: '#1e3a8a', weight: 1.5, opacity: 0.1, dashArray: '6, 12', className: 'data-flow-line', lineCap: 'round'
      }).addTo(map);
      markersRef.current['flow-' + loc.id] = polyline;
    });

  }, [locations, selectedId, onSelectLocation, mapReady]);

  return (
    <div className="relative w-full h-full rounded-none overflow-hidden border border-slate-200">
      <style>{`
        @keyframes sprinklerRipple {
          0% { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .sprinkler-ripple {
          animation: sprinklerRipple 2.5s infinite ease-out;
        }
        @keyframes mistFlow {
          0% { transform: translate(-8%, -8%) scale(1); opacity: 0.5; }
          50% { transform: translate(8%, 8%) scale(1.15); opacity: 0.7; }
          100% { transform: translate(-8%, -8%) scale(1); opacity: 0.5; }
        }
        .mist-overlay {
          animation: mistFlow 5s infinite ease-in-out;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 0 !important;
          padding: 8px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
        }
        .leaflet-popup-tip {
          background: white !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full bg-[#f8fafc]" />


    </div>
  );
};

export default AQIMap;