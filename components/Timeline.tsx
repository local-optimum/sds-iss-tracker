/**
 * Timeline Component
 * 
 * Interactive timeline scrubber for replaying ISS orbit history
 * Allows users to:
 * - Scrub through time to see historical positions
 * - Select different time windows (1h, 6h, 12h, 24h)
 * - Play/pause real-time tracking
 * - Reset to current time
 */
'use client'

import { useState, useEffect } from 'react'

interface TimelineProps {
  currentTime: number
  onTimeChange: (time: number) => void
  timeWindow: number
  onTimeWindowChange: (window: number) => void
}

const TIME_WINDOWS = [
  { label: '1h', value: 1 * 60 * 60 * 1000 },
  { label: '6h', value: 6 * 60 * 60 * 1000 },
  { label: '12h', value: 12 * 60 * 60 * 1000 },
  { label: '24h', value: 24 * 60 * 60 * 1000 },
]

export function Timeline({
  currentTime,
  onTimeChange,
  timeWindow,
  onTimeWindowChange
}: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(true)

  const now = Date.now()
  const minTime = now - timeWindow
  const maxTime = now

  // Auto-advance when playing (real-time mode)
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      onTimeChange(Date.now())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isPlaying, onTimeChange])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    onTimeChange(value)
    setIsPlaying(false) // Pause when manually scrubbing
  }

  const handleReset = () => {
    onTimeChange(Date.now())
    setIsPlaying(true)
  }

  const progress = ((currentTime - minTime) / (maxTime - minTime)) * 100

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
      {/* Time range selector */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 font-medium">Time Range:</span>
        <div className="flex gap-2">
          {TIME_WINDOWS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onTimeWindowChange(value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                timeWindow === value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div className="space-y-2">
        {/* Progress bar background */}
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Slider input */}
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer relative -mt-2"
          style={{
            background: 'transparent'
          }}
        />
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{new Date(minTime).toLocaleTimeString()}</span>
          <span className="font-semibold text-white bg-gray-800 px-3 py-1 rounded-md">
            {new Date(currentTime).toLocaleTimeString()}
          </span>
          <span className="font-medium text-green-400">NOW</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-5 py-2 rounded-md transition-all font-medium shadow-lg ${
            isPlaying
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/50'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/50'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={handleReset}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-all font-medium text-white shadow-lg"
        >
          ↻ Reset to Now
        </button>
        
        <div className="text-xs text-gray-500">
          {isPlaying ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Tracking
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Replay Mode
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

