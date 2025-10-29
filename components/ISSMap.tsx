/**
 * ISS Map Component
 * 
 * Displays the International Space Station's position on a world map
 * with orbit trail visualization using Leaflet/React-Leaflet
 * 
 * Features:
 * - Real-time ISS position marker
 * - Orbit trail showing last 24 hours
 * - Smooth map transitions
 * - Dark theme for space aesthetics
 */
'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ISSLocation } from '@/types/iss'
import { getVisibilityLabel } from '@/lib/iss-encoding'

// Fix Leaflet icon paths in Next.js (Leaflet expects images in specific location)
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

interface ISSMapProps {
  locations: ISSLocation[]
  currentTime: number
  showTrail?: boolean
}


/**
 * Main map component showing ISS position and orbit trail
 */
export function ISSMap({ locations, currentTime, showTrail = true }: ISSMapProps) {
  // Get current ISS position based on timeline (closest to currentTime)
  const currentLocation = locations.length > 0
    ? locations.reduce((prev, curr) => {
        return Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime)
          ? curr
          : prev
      })
    : null

  // All locations passed in are already filtered by parent
  // Just use them for the trail
  const trailLocations = showTrail ? locations : []

  // Convert to Leaflet LatLng format
  const trailPath = trailLocations.map(l => [l.latitude, l.longitude] as [number, number])
  
  console.log(`🗺️  ISSMap render: ${locations.length} positions, trail: ${trailPath.length} points, current:`, currentLocation ? `${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)}` : 'none')

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
      className="rounded-lg"
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
      minZoom={2}
    >
      {/* Dark space-themed map tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* ISS orbit trail */}
      {trailPath.length > 1 && (
        <Polyline
          positions={trailPath}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}

      {/* Current ISS position marker */}
      {currentLocation && (
        <>
          <CircleMarker
            center={[currentLocation.latitude, currentLocation.longitude]}
            radius={10}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 1,
              color: '#ffffff',
              weight: 3,
              opacity: 1
            }}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <div className="font-bold text-base mb-2">🛰️ ISS Current Position</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono">{currentLocation.latitude.toFixed(4)}°</span>
                  
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono">{currentLocation.longitude.toFixed(4)}°</span>
                  
                  <span className="text-gray-600">Altitude:</span>
                  <span className="font-mono">{(currentLocation.altitude / 1000).toFixed(0)} km</span>
                  
                  <span className="text-gray-600">Velocity:</span>
                  <span className="font-mono">{currentLocation.velocity.toLocaleString()} km/h</span>
                  
                  <span className="text-gray-600">Visibility:</span>
                  <span>{getVisibilityLabel(currentLocation.visibility)}</span>
                  
                  <span className="text-gray-600">Time:</span>
                  <span className="text-xs">{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  Position #{currentLocation.nonce.toString()}
                </div>
              </div>
            </Popup>
          </CircleMarker>
          
          {/* Pulse effect for current position */}
          <CircleMarker
            center={[currentLocation.latitude, currentLocation.longitude]}
            radius={15}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 0.3,
              color: '#ef4444',
              weight: 2,
              opacity: 0.5
            }}
          />
        </>
      )}

      {/* Map legend */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control bg-gray-900/90 backdrop-blur-sm text-white p-3 rounded-lg border border-gray-700 shadow-xl">
          <div className="text-xs font-semibold mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
              <span>ISS Position</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-blue-500 shadow-sm"></div>
              <span>Orbit Trail</span>
            </div>
            {currentLocation && (
              <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-300">
                <div>{locations.length} positions tracked</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* No data message */}
      {!currentLocation && (
        <div className="leaflet-top leaflet-center" style={{ pointerEvents: 'none' }}>
          <div className="bg-gray-900/90 backdrop-blur-sm text-white p-6 rounded-lg border border-gray-700 shadow-xl text-center">
            <div className="text-4xl mb-2">🛰️</div>
            <div className="text-sm">Waiting for ISS data...</div>
            <div className="text-xs text-gray-400 mt-2">
              Run oracle to publish first position
            </div>
          </div>
        </div>
      )}
    </MapContainer>
  )
}

