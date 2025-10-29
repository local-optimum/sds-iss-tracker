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
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
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
  currentLocation: ISSLocation | null
  showTrail?: boolean
}


/**
 * Main map component showing ISS position and orbit trail
 */
export function ISSMap({ locations, currentLocation, showTrail = true }: ISSMapProps) {
  // All locations passed in are already filtered to be valid (non-zero coordinates)
  // Calculate opacity based on position in array (older = less opaque)
  const trailDots = showTrail ? locations.map((l, index) => {
      // Opacity fades from 0.2 (oldest/first) to 1.0 (newest/last)
      const opacity = 0.2 + (index / (locations.length - 1 || 1)) * 0.8
      return {
        lat: l.latitude,
        lon: l.longitude,
        timestamp: l.timestamp,
        nonce: l.nonce,
        opacity
      }
    })
    : []
  
  console.log(`🗺️  ISSMap render:`)
  console.log(`   Received ${locations.length} locations`)
  console.log(`   Rendering ${trailDots.length} trail dots`)
  console.log(`   Current location:`, currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} (nonce ${currentLocation.nonce})` : 'none')
  if (locations.length > 0) {
    const nonces = locations.map(l => l.nonce)
    const minNonce = nonces.reduce((min, n) => n < min ? n : min, nonces[0])
    const maxNonce = nonces.reduce((max, n) => n > max ? n : max, nonces[0])
    console.log(`   Location nonce range: ${minNonce} - ${maxNonce}`)
  }

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

      {/* ISS orbit trail - glowing dots with age-based opacity */}
      {trailDots.map((dot, index) => (
        <CircleMarker
          key={`trail-${dot.nonce}-${index}`}
          center={[dot.lat, dot.lon]}
          radius={3}
          pathOptions={{
            fillColor: '#60a5fa',
            fillOpacity: dot.opacity,
            color: '#3b82f6',
            weight: 0,
            className: 'trail-dot-glow'
          }}
        />
      ))}

      {/* Current ISS position marker - glowing pulsing dot */}
      {currentLocation && (
        <CircleMarker
          key={`iss-${currentLocation.nonce}`}
          center={[currentLocation.latitude, currentLocation.longitude]}
          radius={10}
          pathOptions={{
            fillColor: '#a78bfa',
            fillOpacity: 1,
            color: '#8b5cf6',
            weight: 2,
            opacity: 0.8,
            className: 'iss-marker-glow'
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
      )}

      {/* Map legend */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control bg-gray-900/90 backdrop-blur-sm text-white p-3 rounded-lg border border-gray-700 shadow-xl">
          <div className="text-xs font-semibold mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-purple-400 border border-purple-500 shadow-lg shadow-purple-500/50"></div>
              <span>ISS Position (Live)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-30 shadow-sm shadow-blue-400/50"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50 shadow-sm shadow-blue-400/50"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-70 shadow-sm shadow-blue-400/50"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-90 shadow-md shadow-blue-400/50"></div>
              </div>
              <span>Orbit Trail (24h)</span>
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

