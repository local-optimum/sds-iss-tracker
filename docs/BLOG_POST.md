# Building a Real-Time ISS Tracker with Somnia Data Streams

**A Template for Location-Based Applications on the Blockchain**

If you're exploring Somnia Data Streams for the first time, this ISS (International Space Station) tracker serves as a practical, real-world example of the protocol's capabilities. While we're tracking a satellite, the same patterns apply to delivery apps, vehicle fleets, flight radars, or any application requiring real-time location updates.

## Why This Matters

Traditional blockchain applications face a fundamental challenge: getting external data on-chain efficiently while maintaining real-time responsiveness. This project demonstrates three core Somnia Data Streams features that solve this:

1. **Schema Inheritance** - Reusable data structures
2. **Oracle Pattern** - Reliable off-chain data ingestion
3. **Real-Time Reactivity** - Push-based updates without polling

Let's break down each component.

---

## Architecture Overview

```
┌─────────────────┐
│  Open Notify    │  External ISS API
│      API        │  
└────────┬────────┘
         │
         │ Fetch every 5s
         ▼
┌─────────────────┐
│  Oracle Service │  Fetches & publishes
│                 │  to blockchain
└────────┬────────┘
         │
         │ Publish transaction
         ▼
┌─────────────────┐
│     Somnia      │  Data Streams Protocol
│   Blockchain    │  Stores encoded positions
└────────┬────────┘
         │
         │ WebSocket subscription
         ▼
┌─────────────────┐
│   Frontend      │  Real-time UI
│   (Browser)     │  
└─────────────────┘
```

### Component Breakdown

**Oracle Service**
- Fetches ISS data every 5 seconds from external API
- Encodes data according to schema
- Publishes to blockchain
- Maintains persistent nonce by reading on-chain state
- Completely stateless and resilient

**Frontend Application**
- React application with Leaflet map visualization
- WebSocket connection for real-time position updates
- Initial data fetch for historical trail (last 100 positions)
- Pure client-side application

---

## Schema Inheritance: GPS Base + ISS Extension

One of the most powerful features of Somnia Data Streams is **schema inheritance**. Instead of creating monolithic schemas for each use case, you define a base schema and extend it.

### The GPS Base Schema

```typescript
const GPS_SCHEMA = `
  uint64 timestamp,
  int32 latitude,
  int32 longitude,
  int32 altitude,
  uint32 accuracy,
  bytes32 entityId,
  uint256 nonce
`
```

This schema captures the essentials of any GPS location:
- **Coordinates** stored as `int32` in microdegrees (1,000,000 = 1 degree) for precision
- **Timestamp** in Unix milliseconds for temporal ordering
- **EntityId** to track multiple objects (vehicles, drones, etc.)
- **Nonce** for monotonic sequence guarantees

### The ISS Extension

```typescript
const ISS_SCHEMA = `
  uint32 velocity,
  uint8 visibility
`
```

ISS-specific data extends the GPS base:
- **Velocity** in km/h
- **Visibility** flag (daylight/eclipse/visible)

When registered, the ISS schema references GPS as its parent:

```typescript
await sdk.streams.registerDataSchemas([
  { id: 'GPS', parentSchemaId: '0x' + '0'.repeat(64) }, // Root schema
  { id: 'ISS', parentSchemaId: gpsSchemaId }            // Extends GPS
])
```

### Why This Matters

The same GPS schema can be reused for:
- 🚗 **Ride-sharing apps** - Add passenger count, destination
- 🏎️ **F1 race tracking** - Add speed, tire compound, fuel level
- ✈️ **Flight radars** - Add heading, altitude rate, squawk code
- 🚚 **Delivery fleets** - Add package count, next stop, ETA

You inherit the proven GPS foundation and add domain-specific fields. **This is composability at the schema level.**

---

## The Oracle Service: Bridging Off-Chain and On-Chain

Oracles are the bridge between external data sources and blockchain state. Our oracle is refreshingly simple:

### Core Logic

```typescript
async function syncISSPosition() {
  // 1. Fetch from external API
  const response = await fetch('http://api.open-notify.org/iss-now.json')
  const issData: OpenNotifyResponse = await response.json()

  // 2. Encode according to schema
  const encodedData = encodeISSLocation(issData)

  // 3. Get current nonce from on-chain state
  const currentNonce = await sdk.streams.totalPublisherDataForSchema(
    ISS_SCHEMA_ID,
    publisherAddress
  )

  // 4. Publish to blockchain
  const dataStream = [{
    id: locationId,          // Unique ID for this position
    schemaId: ISS_SCHEMA_ID,
    data: encodedData        // ABI-encoded bytes
  }]

  const txHash = await sdk.streams.set(dataStream)
  
  console.log(`✅ Published position #${currentNonce}`)
}

// Run every 5 seconds
setInterval(syncISSPosition, 5000)
```

### Key Design Decisions

**Why Read Nonce from Chain?**
- Oracle can restart without losing count
- Multiple oracle instances could coordinate (future)
- On-chain state is source of truth

**Error Handling**
```typescript
try {
  await syncISSPosition()
} catch (error) {
  console.error('❌ Sync failed:', error)
  // Continue - next interval will retry
}
```

The oracle is **stateless and resilient** - if it crashes, it resumes from the last on-chain nonce.

---

## Real-Time Reactivity: The Zero-Fetch Pattern

Traditional blockchain apps poll for updates:
```typescript
// ❌ Old way - inefficient
setInterval(async () => {
  const data = await fetchFromChain()
  updateUI(data)
}, 5000)
```

Somnia Data Streams uses **WebSocket subscriptions** with a powerful twist: the **zero-fetch ethCalls pattern**.

### Subscription Setup

```typescript
const subscription = await sdk.streams.subscribe({
  somniaStreamsEventId: 'ISSPositionUpdated',  // Event to watch
  ethCalls: [],                                  // No state reads needed!
  onData: (data) => {
    // Parse the emitted event data directly
    const position = decodeISSLocation(data.result.data)
    updateMap(position)
  },
  onError: (error) => {
    console.error('WebSocket error:', error)
    reconnect()
  }
})
```

### Why Zero Calls?

When publishing data, we emit an event:

```typescript
const eventStream = [{
  id: 'ISSPositionUpdated',
  argumentTopics: [locationId, toHex(nonce)],
  data: encodedData  // Full position included in event!
}]

await sdk.streams.setAndEmitEvents(dataStreams, eventStreams)
```

The event **contains the full encoded data**, so subscribers don't need to fetch from chain. They decode the event payload directly:

```typescript
onData: (data) => {
  // data.result.data = encoded position from event
  const location = decodeISSLocation(data.result.data)
  // Instant update, no RPC call needed!
}
```

**Benefits:**
- ⚡ **Zero latency** - No round trip to chain state
- 💰 **No RPC costs** - Event data is pushed, not fetched
- 🔄 **Instant updates** - WebSocket pushes as soon as event emits

### Handling Disconnections

WebSockets can drop when browser tabs sleep. Our hook handles this:

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Tab became visible - catch up on missed data
    fetchLastNPositions(100).then(locations => {
      updateMap(locations)
    })
    
    // Re-establish WebSocket if dropped
    if (!isSubscribed) {
      setupSubscription()
    }
  }
})
```

This ensures users always see the latest data, even after leaving and returning to the tab.

---

## Building Your Own: Key SDK Methods

Here's a quick reference for the most important SDK methods you'll use:

### Registration (One-time setup)

```typescript
// Register data schemas
await sdk.streams.registerDataSchemas([
  { id: 'GPS', parentSchemaId: zeroBytes32 },
  { id: 'Vehicle', parentSchemaId: gpsSchemaId }
])

// Register event schemas
await sdk.streams.registerEventSchemas(
  ['VehicleLocationUpdated'],
  [{
    parentEventId: zeroBytes32,
    eventSchema: 'bytes32 vehicleId, uint256 timestamp'
  }]
)
```

### Writing Data

```typescript
// Option 1: Just write data
await sdk.streams.set([{
  id: uniqueId,
  schemaId: VEHICLE_SCHEMA_ID,
  data: encodedVehicleData
}])

// Option 2: Write data + emit event (for reactivity)
await sdk.streams.setAndEmitEvents(
  [{ id, schemaId, data }],  // Data streams
  [{                          // Event streams
    id: 'VehicleLocationUpdated',
    argumentTopics: [vehicleId, timestamp],
    data: encodedVehicleData
  }]
)
```

### Reading Data

```typescript
// Get total count
const total = await sdk.streams.totalPublisherDataForSchema(schemaId, publisher)

// Get last N positions
const data = await sdk.streams.getBetweenRange(
  schemaId,
  publisher,
  total - 100n,  // Start index
  total - 1n     // End index
)

// Get single position
const position = await sdk.streams.getAtIndex(schemaId, publisher, index)
```

### Subscribing

```typescript
const { subscriptionId, unsubscribe } = await sdk.streams.subscribe({
  somniaStreamsEventId: 'VehicleLocationUpdated',
  ethCalls: [],  // Zero-fetch pattern
  onData: (data) => {
    const location = decodeVehicleLocation(data.result.data)
    updateUI(location)
  },
  onError: (error) => {
    console.error('Connection error:', error)
    reconnect()
  }
})

// Later: clean up
unsubscribe()
```

---

## Data Encoding: The Microdegrees Pattern

GPS coordinates need 6-7 decimal places of precision. Storing as floats is imprecise; strings are inefficient. The solution: **microdegrees**.

### Encoding

```typescript
function encodeISSLocation(issData: OpenNotifyResponse): `0x${string}` {
  const lat = Math.round(parseFloat(issData.iss_position.latitude) * 1_000_000)
  const lon = Math.round(parseFloat(issData.iss_position.longitude) * 1_000_000)
  const alt = Math.round(parseFloat(issData.iss_position.altitude))
  
  return encodeAbiParameters(
    [
      { type: 'uint32', name: 'velocity' },
      { type: 'uint8', name: 'visibility' },
      // GPS parent fields
      { type: 'uint64', name: 'timestamp' },
      { type: 'int32', name: 'latitude' },
      { type: 'int32', name: 'longitude' },
      { type: 'int32', name: 'altitude' },
      { type: 'uint32', name: 'accuracy' },
      { type: 'bytes32', name: 'entityId' },
      { type: 'uint256', name: 'nonce' }
    ],
    [velocity, visibility, timestamp, lat, lon, alt, accuracy, entityId, nonce]
  )
}
```

**Why int32?**
- Range: -2,147,483,648 to 2,147,483,647
- After dividing by 1,000,000: -2,147° to 2,147°
- Latitude: -90° to 90° ✓
- Longitude: -180° to 180° ✓
- Plenty of headroom

### Decoding

```typescript
function decodeISSLocation(data: `0x${string}`): ISSLocation {
  const decoded = decodeAbiParameters(schema, data)
  
  return {
    timestamp: Number(decoded[2]),
    latitude: Number(decoded[3]) / 1_000_000,  // Convert back to degrees
    longitude: Number(decoded[4]) / 1_000_000,
    altitude: Number(decoded[5]),
    // ... other fields
  }
}
```

This pattern gives you **6 decimal places** (±0.000001°) of precision, which is about **11cm accuracy** at the equator. More than enough for any location-based app.

---

## Frontend: React + Leaflet Visualization

The frontend is a standard Next.js app with a few key components:

### Map Component

```typescript
<MapContainer
  center={[0, 0]}
  zoom={2}
  maxBounds={[[-90, -180], [90, 180]]}  // Single globe, no repeat
  maxBoundsViscosity={1.0}
>
  <TileLayer url="https://.../dark_all/{z}/{x}/{y}.png" />
  
  {/* Trail dots with age-based opacity */}
  {locations.map((loc, i) => {
    const opacity = 0.2 + (i / locations.length) * 0.8
    return (
      <CircleMarker
        key={`trail-${loc.nonce}`}
        center={[loc.latitude, loc.longitude]}
        radius={3}
        fillOpacity={opacity}
      />
    )
  })}
  
  {/* Current ISS position */}
  <CircleMarker
    center={[current.latitude, current.longitude]}
    radius={10}
    className="iss-marker-glow"  // Pulsing animation
  />
</MapContainer>
```

### Custom Hook Pattern

```typescript
export function useISSLocations({ onNewLocation, onLocationsUpdate }) {
  useEffect(() => {
    // Fetch initial 100 positions
    fetchInitialLocations().then(locations => {
      onLocationsUpdate(locations)
      
      // Then subscribe for real-time
      setupSubscription()
    })
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
}
```

This separation of concerns keeps the hook reusable and the component focused on rendering.

---

## Extending This Template

Here's how to adapt this for other use cases:

### Delivery Fleet Tracking

```typescript
// Extend GPS schema
const DELIVERY_SCHEMA = `
  uint8 vehicleType,      // 0=bike, 1=car, 2=truck
  uint16 packageCount,
  uint32 nextStopETA,
  bytes32 currentOrderId
`

// Register with GPS parent
registerDataSchemas([
  { id: 'GPS', parentSchemaId: zeroBytes32 },
  { id: 'Delivery', parentSchemaId: gpsSchemaId }
])

// Oracle fetches from your fleet management API
async function syncFleet() {
  const vehicles = await fetch('https://your-api.com/fleet')
  
  for (const vehicle of vehicles) {
    const encoded = encodeDeliveryData(vehicle)
    await sdk.streams.set([{
      id: vehicle.id,
      schemaId: DELIVERY_SCHEMA_ID,
      data: encoded
    }])
  }
}
```

### F1 Race Tracking

```typescript
const F1_SCHEMA = `
  uint16 speed,           // km/h
  uint16 rpm,
  uint8 gear,
  uint8 drsEnabled,
  uint8 tireCompound,     // 0=soft, 1=medium, 2=hard
  uint16 lapNumber
`

// Update every 100ms during race
setInterval(syncRaceCars, 100)

// Frontend shows:
// - Live positions on track map
// - Speed comparison
// - Tire strategy overlay
```

### Drone Fleet Monitoring

```typescript
const DRONE_SCHEMA = `
  uint16 batteryPercent,
  int16 verticalSpeed,    // cm/s
  uint8 flightMode,       // 0=manual, 1=auto, 2=return
  bytes32 missionId
`

// Multiple drones sharing same GPS schema base
// Each drone has unique entityId
```

---

## Key Takeaways for Developers

1. **Schema Inheritance is Powerful**
   - Design reusable base schemas
   - Extend with domain-specific fields
   - Benefit from composability across apps

2. **Oracles are Simple Services**
   - Fetch external data
   - Encode according to schema
   - Publish to chain
   - No complex consensus needed for trusted sources

3. **Reactivity Beats Polling**
   - Zero-fetch pattern eliminates redundant RPC calls
   - WebSocket subscriptions provide instant updates
   - Events carry full data payload

4. **State Lives On-Chain**
   - No separate database needed
   - Built-in persistence and ordering (nonce)
   - Read historical data via range queries

5. **Frontend Stays Thin**
   - Just decode and render
   - SDK handles all blockchain complexity
   - Focus on UX, not infrastructure

---

## Challenges & Lessons Learned

### Schema Inheritance Gotcha
During development, we discovered `getBetweenRange` returns fields in unexpected order with schema inheritance - child fields come first but with parent field names. This is documented as an SDK bug and worked around in the code. **Always test with real data** when using inheritance.

### WebSocket Reconnection
Browser tabs sleeping can drop WebSocket connections. The Page Visibility API is essential:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refetchData()
    reconnectWebSocket()
  }
})
```

### Nonce Management
Initially used in-memory counters for the oracle. **Bad idea.** Reading nonce from chain state makes the oracle stateless and resilient to restarts.

---

## Next Steps

Want to build your own Somnia Data Streams app?

1. **Clone this repo**: `git clone https://github.com/local-optimum/sds-iss-tracker`
2. **Follow the QUICKSTART.md**: Get running in 5 minutes
3. **Modify the schemas**: Adapt GPS + ISS to your domain
4. **Replace the oracle source**: Point at your API instead of Open Notify
5. **Customize the frontend**: Build your own visualization

**Resources:**
- [Somnia Data Streams Documentation](https://datastreams.somnia.network/)
- [SDK Reference](https://www.npmjs.com/package/@somnia-chain/streams)
- [This project's GitHub](https://github.com/local-optimum/sds-iss-tracker)

---

## Conclusion

Somnia Data Streams transforms how we think about blockchain applications. Instead of smart contracts managing complex state transitions, we use the chain as a **persistent, reactive data layer**:

- **Write**: Oracle publishes encoded data + events
- **Store**: On-chain state provides persistence and ordering
- **Subscribe**: Clients receive instant WebSocket updates
- **Query**: Historical data available via range queries

This ISS tracker proves the pattern works for real-time location data. The same architecture scales to **any** application needing external data, real-time updates, and historical queries.

**The best part?** You can build it without writing a single line of Solidity.

Happy building! 🚀

---

*Built by Oliver Smith | Follow the project: [GitHub](https://github.com/local-optimum/sds-iss-tracker)*

