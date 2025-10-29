/**
 * ISS Location data structure
 * Combines GPS base schema with ISS extension schema
 */
export interface ISSLocation {
  // From GPS Schema (parent)
  timestamp: number       // Unix milliseconds
  latitude: number        // Degrees
  longitude: number       // Degrees
  altitude: number        // Meters
  accuracy: number        // Meters
  entityId: string        // "ISS"
  nonce: bigint          // Position counter for ordering
  
  // From ISS Schema (child extension)
  velocity: number       // km/h
  visibility: number     // 0=invisible, 1=visible, 2=day, 3=night
}

/**
 * Open Notify API response format
 * http://api.open-notify.org/iss-now.json
 */
export interface OpenNotifyResponse {
  message: string          // "success" on successful request
  timestamp: number        // Unix seconds
  iss_position: {
    latitude: string       // String representation of latitude
    longitude: string      // String representation of longitude
  }
}

/**
 * Visibility status enum
 */
export enum Visibility {
  Invisible = 0,
  Visible = 1,
  DaySide = 2,
  NightSide = 3
}

