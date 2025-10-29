/**
 * ISS Data Encoding/Decoding Helpers
 * 
 * Demonstrates schema inheritance:
 * - GPS Schema (parent): timestamp, lat, lon, altitude, accuracy, entityId, nonce
 * - ISS Schema (child): velocity, visibility
 * 
 * When encoding/decoding, we must include ALL fields from both parent and child schemas
 */
import { encodeAbiParameters, decodeAbiParameters, toHex } from 'viem'
import { ISS_ENTITY_ID } from './constants'
import type { ISSLocation, OpenNotifyResponse, Visibility } from '@/types/iss'

/**
 * Calculate visibility based on ISS position and current time
 * This is a simplified calculation for demonstration purposes
 * 
 * 0 = invisible
 * 1 = visible
 * 2 = day side of Earth
 * 3 = night side of Earth
 */
function calculateVisibility(lat: number, lon: number): Visibility {
  const now = new Date()
  const hourUTC = now.getUTCHours()
  
  // Rough approximation: sun's longitude based on time of day
  // At noon UTC, sun is at 0° longitude
  const sunLongitude = (hourUTC - 12) * 15 // 15° per hour
  
  // Calculate if ISS is on day side (within 90° of sun's position)
  const longitudeDiff = Math.abs(lon - sunLongitude)
  const isDaySide = longitudeDiff < 90 || longitudeDiff > 270
  
  return isDaySide ? 2 : 3 // DaySide or NightSide
}

/**
 * Transform Open Notify API data to our GPS + ISS schema format
 * 
 * This function encodes data according to the inherited schema structure:
 * Parent (GPS) fields + Child (ISS) fields
 * 
 * @param apiData - Response from Open Notify API
 * @param nonce - Monotonically increasing counter for ordering
 * @returns Encoded bytes for blockchain storage
 */
export function encodeISSLocation(
  apiData: OpenNotifyResponse,
  nonce: bigint
): `0x${string}` {
  // ===== GPS Schema Fields (Parent) =====
  const timestamp = BigInt(apiData.timestamp * 1000) // Convert to milliseconds as BigInt
  
  // Store coordinates as integers with 6 decimal precision
  // e.g., 51.234567° becomes 51234567
  const latitude = Math.round(parseFloat(apiData.iss_position.latitude) * 1_000_000)
  const longitude = Math.round(parseFloat(apiData.iss_position.longitude) * 1_000_000)
  
  // ISS orbits at approximately 408km altitude
  const altitude = 408000 // meters
  
  // Position accuracy (ISS tracking is very accurate, ±1km)
  const accuracy = 1000 // meters
  
  // Entity identifier as bytes32
  const entityId = ISS_ENTITY_ID
  
  // ===== ISS Schema Fields (Child Extension) =====
  // ISS travels at approximately 27,600 km/h
  const velocity = 27600
  
  // Calculate whether ISS is on day or night side of Earth
  const visibility = calculateVisibility(
    parseFloat(apiData.iss_position.latitude),
    parseFloat(apiData.iss_position.longitude)
  )

  // Encode with COMPLETE schema (parent + child fields)
  return encodeAbiParameters(
    [
      // GPS schema (parent)
      { name: 'timestamp', type: 'uint64' },
      { name: 'latitude', type: 'int32' },
      { name: 'longitude', type: 'int32' },
      { name: 'altitude', type: 'int32' },
      { name: 'accuracy', type: 'uint32' },
      { name: 'entityId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      // ISS schema (child extension)
      { name: 'velocity', type: 'uint32' },
      { name: 'visibility', type: 'uint8' }
    ],
    [
      timestamp,
      latitude,
      longitude,
      altitude,
      accuracy,
      entityId,
      nonce,
      velocity,
      visibility
    ]
  )
}

/**
 * Decode blockchain data back to ISSLocation object
 * 
 * When reading from blockchain, the SDK automatically joins parent + child schemas
 * We need to decode using the COMPLETE schema structure
 * 
 * @param data - Encoded bytes from blockchain
 * @returns Decoded ISS location object
 */
export function decodeISSLocation(data: `0x${string}`): ISSLocation {
  const decoded = decodeAbiParameters(
    [
      // GPS schema (parent)
      { name: 'timestamp', type: 'uint64' },
      { name: 'latitude', type: 'int32' },
      { name: 'longitude', type: 'int32' },
      { name: 'altitude', type: 'int32' },
      { name: 'accuracy', type: 'uint32' },
      { name: 'entityId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      // ISS schema (child)
      { name: 'velocity', type: 'uint32' },
      { name: 'visibility', type: 'uint8' }
    ],
    data
  )

  return {
    // GPS fields (convert back from storage format)
    timestamp: Number(decoded[0]),
    latitude: Number(decoded[1]) / 1_000_000,  // Convert back to degrees
    longitude: Number(decoded[2]) / 1_000_000, // Convert back to degrees
    altitude: Number(decoded[3]),
    accuracy: Number(decoded[4]),
    entityId: decoded[5],
    nonce: decoded[6],
    // ISS fields
    velocity: Number(decoded[7]),
    visibility: Number(decoded[8])
  }
}

/**
 * Get human-readable visibility label
 */
export function getVisibilityLabel(visibility: number): string {
  const labels = ['Invisible', 'Visible', 'Day Side', 'Night Side']
  return labels[visibility] || 'Unknown'
}

