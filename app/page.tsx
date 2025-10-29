/**
 * ISS Tracker - Main Page
 * 
 * Demonstrates Somnia Data Streams capabilities:
 * - Schema inheritance (GPS base + ISS extension)
 * - Real-time reactivity with WebSocket subscriptions
 * - Zero-fetch pattern using ethCalls
 * - Historical data replay
 * 
 * This is a template example showing how the same GPS schema
 * can be reused for delivery apps, F1 tracking, flight radars, etc.
 */
'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ISSInfo } from '@/components/ISSInfo'
import { useISSLocations } from '@/hooks/useISSLocations'
import type { ISSLocation } from '@/types/iss'

// Dynamically import map to avoid SSR issues with Leaflet
const ISSMap = dynamic(
  () => import('@/components/ISSMap').then(mod => ({ default: mod.ISSMap })),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  )}
)

export default function Home() {
  const [locations, setLocations] = useState<ISSLocation[]>([])
  const [currentLocation, setCurrentLocation] = useState<ISSLocation | null>(null)

  // Handle new positions from subscription
  const handleNewLocation = useCallback((location: ISSLocation) => {
    setLocations(prev => [...prev, location].slice(-100)) // Keep last 100
    setCurrentLocation(location)
  }, [])

  // Subscribe to real-time ISS updates
  useISSLocations({ onNewLocation: handleNewLocation })

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm z-10 shadow-xl shrink-0">
        <div className="max-w-[1800px] mx-auto px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl">🛰️</span>
                <span className="truncate">ISS Tracker</span>
              </h1>
              <div className="text-xs sm:text-sm text-gray-400 mt-0.5 flex items-center gap-1 sm:gap-2 flex-wrap">
                <a
                  href="https://datastreams.somnia.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
                >
                  Somnia Data Streams
                </a>
              </div>
            </div>
            
            <a
              href="https://github.com/local-optimum/sds-iss-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-xs border border-gray-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="hidden md:inline">Source</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row max-w-[1800px] mx-auto p-2 sm:p-3 gap-2 sm:gap-3">
          {/* Map - takes remaining space */}
          <div className="flex-1 rounded-lg overflow-hidden border border-gray-700 shadow-2xl min-h-0">
            <ISSMap
              locations={locations}
              currentLocation={currentLocation}
              showTrail={true}
            />
          </div>

          {/* Info Panel - fixed width on desktop, auto on mobile */}
          <div className="lg:w-80 lg:overflow-y-auto shrink-0">
            <ISSInfo
              currentLocation={currentLocation}
              totalLocations={locations.length}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 py-2 px-4 border-t border-gray-800 shrink-0">
        <p>
          Built by{' '}
          <a
            href="https://github.com/local-optimum"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline"
          >
            @local-optimum
          </a>
          {' '}with{' '}
          <a
            href="https://datastreams.somnia.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline"
          >
            Somnia Data Streams
          </a>
          {' • '}
          <a
            href="http://open-notify.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:underline"
          >
            ISS API
          </a>
        </p>
      </footer>
    </main>
  )
}
