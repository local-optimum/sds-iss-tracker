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

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Timeline } from '@/components/Timeline'
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
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [timeWindow, setTimeWindow] = useState(24 * 60 * 60 * 1000) // 24 hours
  const [isMounted, setIsMounted] = useState(false)

  // Handle SSR for Leaflet
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Callbacks for ISS location hook
  const handleNewLocation = useCallback((location: ISSLocation) => {
    console.log('🆕 New ISS position received:', location)
  }, [])

  const handleLocationsUpdate = useCallback((newLocations: ISSLocation[]) => {
    console.log('📊 ISS locations updated:', newLocations.length, 'positions')
    setLocations(newLocations)
  }, [])

  // Subscribe to ISS locations (fetch + real-time)
  useISSLocations({
    onNewLocation: handleNewLocation,
    onLocationsUpdate: handleLocationsUpdate
  })

  // Get current location based on timeline position
  const currentLocation = useMemo(() => {
    if (locations.length === 0) return null
    
    // Find location closest to currentTime
    const closest = locations.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime)
        ? curr
        : prev
    })
    
    return closest
  }, [locations, currentTime])

  // Filter locations for current time window
  const filteredLocations = useMemo(() => {
    return locations.filter(l => currentTime - l.timestamp <= timeWindow)
  }, [locations, currentTime, timeWindow])

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 shadow-xl">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🛰️</span>
                <span>ISS Position Tracker</span>
              </h1>
              <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                <span>Powered by</span>
                <a
                  href="https://datastreams.somnia.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
                >
                  Somnia Data Streams
                </a>
                <span className="text-gray-600">•</span>
                <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full border border-blue-700/50">
                  Schema Inheritance Demo
                </span>
              </div>
            </div>
            
            <a
              href="https://github.com/local-optimum/sds-iss-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm border border-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View Source
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4">
          {/* Map + Timeline */}
          <div className="space-y-4">
            {/* Map */}
            <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
              {isMounted ? (
                <ISSMap
                  locations={filteredLocations}
                  currentTime={currentTime}
                  showTrail={true}
                />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <div className="text-gray-400">Loading map...</div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <Timeline
              currentTime={currentTime}
              onTimeChange={setCurrentTime}
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
            />
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            <ISSInfo
              currentLocation={currentLocation}
              totalLocations={locations.length}
            />
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="font-bold mb-1">Schema Inheritance</h3>
            <p className="text-sm text-gray-400">
              GPS base schema extended with ISS-specific data. Reusable for delivery apps, vehicle tracking, and more.
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-1">Real-Time Reactivity</h3>
            <p className="text-sm text-gray-400">
              WebSocket subscriptions with zero-fetch ethCalls pattern. No polling, instant updates.
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-3xl mb-2">⏮️</div>
            <h3 className="font-bold mb-1">Historical Replay</h3>
            <p className="text-sm text-gray-400">
              Scrub through 24 hours of ISS orbit history. All data stored on-chain, fully verifiable.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-[1800px] mx-auto mt-8 text-center text-sm text-gray-500 pb-8 px-4">
        <div className="border-t border-gray-800 pt-6">
          <p>
            Built with{' '}
            <a
              href="https://datastreams.somnia.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Somnia Data Streams
            </a>
            {' • '}
            ISS data from{' '}
            <a
              href="http://open-notify.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              Open Notify API
            </a>
            {' • '}
            <a
              href="https://github.com/local-optimum/sds-iss-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              View on GitHub
            </a>
          </p>
          <p className="mt-2 text-xs">
            Template example demonstrating schema inheritance and real-time blockchain reactivity
          </p>
        </div>
      </footer>
    </main>
  )
}
