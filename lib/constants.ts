/**
 * GPS Schema (Base/Parent)
 * This is a generic GPS schema that can be extended by any tracking application
 * - Delivery apps
 * - F1 car positions
 * - Aircraft tracking
 * - ISS tracking (our use case)
 */
export const GPS_SCHEMA = `uint64 timestamp, int32 latitude, int32 longitude, int32 altitude, uint32 accuracy, bytes32 entityId, uint256 nonce`

/**
 * ISS Schema (Extension/Child)
 * Extends GPS schema with ISS-specific data
 */
export const ISS_SCHEMA = `uint32 velocity, uint8 visibility`

// Schema IDs - Will be set after schema registration
export const GPS_SCHEMA_ID = (process.env.NEXT_PUBLIC_GPS_SCHEMA_ID || '') as `0x${string}`
export const ISS_SCHEMA_ID = (process.env.NEXT_PUBLIC_ISS_SCHEMA_ID || '') as `0x${string}`
export const PUBLISHER_ADDRESS = (process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS || '') as `0x${string}`

// ISS constants
export const ISS_ENTITY_ID = '0x4953530000000000000000000000000000000000000000000000000000000000' // "ISS" as bytes32
export const ISS_ALTITUDE = 408000 // ~408km in meters
export const ISS_VELOCITY = 27600 // ~27,600 km/h
export const ISS_ACCURACY = 1000 // ±1km accuracy

// Open Notify API
export const OPEN_NOTIFY_URL = 'http://api.open-notify.org/iss-now.json'

// Poll rate (per Open Notify recommendations)
export const ISS_POLL_INTERVAL = 5000 // 5 seconds

