/**
 * ISS Info Panel Component
 * 
 * Displays detailed information about the current ISS position
 * including all data from both the GPS schema (parent) and
 * ISS schema (child extension)
 */
'use client'

import type { ISSLocation } from '@/types/iss'
import { getVisibilityLabel } from '@/lib/iss-encoding'

interface ISSInfoProps {
  currentLocation: ISSLocation | null
  totalLocations: number
}

export function ISSInfo({ currentLocation, totalLocations }: ISSInfoProps) {
  if (!currentLocation) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
        <div className="text-center text-gray-400 space-y-3">
          <div className="text-5xl animate-pulse">🛰️</div>
          <div className="font-medium">Waiting for ISS data...</div>
          <div className="text-sm text-gray-500">
            Checking blockchain for position updates
          </div>
        </div>
      </div>
    )
  }

  const visibility = getVisibilityLabel(currentLocation.visibility)
  const timeSinceUpdate = Date.now() - currentLocation.timestamp
  const isRecent = timeSinceUpdate < 10000 // Less than 10 seconds

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <span className="text-3xl">🛰️</span>
          <span>International Space Station</span>
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isRecent ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></span>
          <span className="text-gray-400">
            {isRecent ? 'Live Tracking' : 'Historical Data'}
          </span>
        </div>
      </div>

      {/* GPS Schema Data (Parent) */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
          📍 GPS Data (Base Schema)
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-gray-800/50 p-3 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Position</div>
            <div className="font-mono text-lg">
              {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 p-3 rounded-md">
              <div className="text-xs text-gray-400 mb-1">Altitude</div>
              <div className="font-mono text-lg">
                {(currentLocation.altitude / 1000).toFixed(0)} km
              </div>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-md">
              <div className="text-xs text-gray-400 mb-1">Accuracy</div>
              <div className="font-mono text-lg">
                ±{(currentLocation.accuracy / 1000).toFixed(1)} km
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-3 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Entity ID</div>
            <div className="font-mono text-xs break-all">
              {currentLocation.entityId}
            </div>
          </div>

          <div className="bg-gray-800/50 p-3 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Position Counter (Nonce)</div>
            <div className="font-mono text-lg">
              #{currentLocation.nonce.toString()}
            </div>
          </div>
        </div>
      </div>

      {/* ISS Schema Data (Child Extension) */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
          🚀 ISS Data (Extension Schema)
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-gray-800/50 p-3 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Velocity</div>
            <div className="font-mono text-lg">
              {currentLocation.velocity.toLocaleString()} km/h
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ~{(currentLocation.velocity / 3600).toFixed(2)} km/s
            </div>
          </div>

          <div className="bg-gray-800/50 p-3 rounded-md">
            <div className="text-xs text-gray-400 mb-1">Visibility</div>
            <div className="font-medium text-base">
              {visibility}
            </div>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Last Update</div>
        <div className="text-sm font-medium">
          {new Date(currentLocation.timestamp).toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {Math.floor(timeSinceUpdate / 1000)}s ago
        </div>
      </div>

      {/* Stats Footer */}
      <div className="pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
        <div className="text-gray-400">
          📊 {totalLocations} positions tracked
        </div>
        <div className="text-xs text-gray-500">
          Schema Inheritance ✓
        </div>
      </div>

      {/* Info box about schema inheritance */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3 text-xs">
        <div className="font-semibold text-blue-400 mb-1">💡 Schema Inheritance Demo</div>
        <div className="text-gray-300 leading-relaxed">
          This data combines the GPS base schema (reusable for any tracking app) 
          with ISS-specific fields. The same GPS schema can power delivery apps, 
          F1 car tracking, flight radars, and more!
        </div>
      </div>
    </div>
  )
}

