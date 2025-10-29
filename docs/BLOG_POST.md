# Building a Real-Time ISS Tracker with Somnia Data Streams: A Schema Inheritance Tutorial

> A journey through building a production-ready blockchain application that tracks the International Space Station in real-time

---

## Introduction

What if you could build location tracking for delivery apps, F1 races, and space stations using the **same base schema**? That's the power of schema inheritance in Somnia Data Streams.

In this tutorial, we built an ISS position tracker that demonstrates:
- 🔗 **Schema Inheritance**: Reusable GPS base schema
- ⚡ **Real-Time Reactivity**: WebSocket subscriptions with zero-fetch pattern
- ⏮️ **Historical Replay**: 24 hours of verifiable on-chain data
- 🌐 **No Smart Contracts**: Build blockchain apps without Solidity

**Live Demo:** [your-deployment-url]  
**Source Code:** https://github.com/local-optimum/sds-iss-tracker

---

## Table of Contents

1. [The Problem We're Solving](#the-problem)
2. [Why Schema Inheritance Matters](#why-inheritance)
3. [Architecture Overview](#architecture)
4. [Building the GPS Base Schema](#gps-schema)
5. [Extending with ISS-Specific Data](#iss-schema)
6. [Creating the Oracle](#oracle)
7. [Zero-Fetch Pattern Explained](#zero-fetch)
8. [Frontend Real-Time Subscriptions](#frontend)
9. [Lessons Learned](#lessons)
10. [What's Next](#next-steps)

---

## The Problem We're Solving {#the-problem}

Traditional approaches to building location-tracking apps face several challenges:

### Challenge 1: Data Silos
Every app reinvents the wheel:
- Delivery apps build their own tracking
- F1 teams build their own telemetry
- Flight trackers build their own systems

**No interoperability.** **No composability.** **No data sharing.**

### Challenge 2: Real-Time Updates
Polling is expensive and slow:
```typescript
// ❌ Traditional polling approach
setInterval(async () => {
  const data = await fetch('/api/location')
  updateUI(data)
}, 5000)
// Wastes bandwidth, increases latency, costs money
```

### Challenge 3: Data Verification
How do you prove historical data hasn't been tampered with?

---

## Why Schema Inheritance Matters {#why-inheritance}

Imagine a **GPS base schema** that defines:
- Timestamp
- Latitude/Longitude
- Altitude
- Accuracy
- Entity ID

Now **extend it** for different use cases:

### ISS Tracker
```typescript
GPS Schema + {
  velocity: uint32,
  visibility: uint8
}
```

### Delivery App
```typescript
GPS Schema + {
  driverId: bytes32,
  packageId: bytes32,
  status: uint8
}
```

### F1 Car Telemetry
```typescript
GPS Schema + {
  driverNumber: uint256,
  lapNumber: uint32,
  tireCompound: uint8
}
```

**One base schema. Infinite possibilities.**

---

## Architecture Overview {#architecture}

Our ISS tracker follows a clean three-layer architecture:

```
┌─────────────────┐
│  Open Notify    │  ISS position API
│      API        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Oracle        │  Fetches & publishes
│ (Vercel Cron)   │  every 5 seconds
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Somnia        │  On-chain storage
│  Blockchain     │  + event emission
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Frontend      │  Real-time UI
│  (Next.js)      │  with WebSocket
└─────────────────┘
```

Key components:
1. **Oracle**: Serverless function (Vercel Cron)
2. **Smart Contract**: Actually, NONE! Somnia Data Streams handles it
3. **Frontend**: Next.js with React hooks

---

## Building the GPS Base Schema {#gps-schema}

First, we define our reusable GPS schema:

```typescript
// lib/constants.ts
export const GPS_SCHEMA = `
  uint64 timestamp,
  int32 latitude,
  int32 longitude,
  int32 altitude,
  uint32 accuracy,
  bytes32 entityId,
  uint256 nonce
`
```

### Design Decisions

**Why `int32` for coordinates?**
- Store as `degrees * 1,000,000` for 6 decimal precision
- Example: `51.234567°` → `51234567`
- Saves gas compared to `string` or `bytes`

**Why `bytes32` for entityId?**
- Flexible identifier (can be "ISS", "TRUCK-123", etc.)
- More efficient than `string`

**Why `nonce`?**
- Monotonic counter ensures ordering
- Prevents duplicate position bugs
- Critical for replay functionality

### Registering the Schema

```typescript
// scripts/register-schemas.ts
const gpsSchemaId = await sdk.streams.computeSchemaId(GPS_SCHEMA)

await sdk.streams.registerDataSchemas([{
  id: 'gps',
  schema: GPS_SCHEMA,
  parentSchemaId: '0x0000...' // Root schema (no parent)
}])
```

---

## Extending with ISS-Specific Data {#iss-schema}

Now we add ISS-specific fields:

```typescript
// lib/constants.ts
export const ISS_SCHEMA = `
  uint32 velocity,
  uint8 visibility
`
```

### ISS Schema Fields

**`velocity` (km/h)**
- ISS travels at ~27,600 km/h
- Could vary slightly due to orbital adjustments

**`visibility` (0-3)**
- `0`: Invisible
- `1`: Visible
- `2`: Day side of Earth
- `3`: Night side of Earth

### Registering with Inheritance

```typescript
await sdk.streams.registerDataSchemas([{
  id: 'iss-location',
  schema: ISS_SCHEMA,
  parentSchemaId: gpsSchemaId  // Extends GPS! 🎯
}])
```

**Magic moment:** When you query ISS data, you automatically get:
- All GPS fields (timestamp, lat, lon, altitude, etc.)
- All ISS fields (velocity, visibility)

No manual joining required!

---

## Creating the Oracle {#oracle}

The oracle is a serverless function that runs every 5 seconds:

```typescript
// app/api/cron/sync-iss/route.ts
export async function GET(request: NextRequest) {
  // 1. Fetch from Open Notify API
  const response = await fetch(OPEN_NOTIFY_URL)
  const issData = await response.json()
  
  // 2. Encode with GPS + ISS schemas
  const encodedData = encodeISSLocation(issData, currentNonce)
  
  // 3. Publish to blockchain
  const txHash = await sdk.streams.setAndEmitEvents(
    [{ id, schemaId: ISS_SCHEMA_ID, data: encodedData }],
    [{ id: 'ISSPositionUpdated', argumentTopics: [], data: '0x' }]
  )
  
  // 4. Increment nonce for next position
  currentNonce++
  
  return NextResponse.json({ success: true, txHash })
}
```

### Key Oracle Patterns

**Pattern 1: Atomic Write + Event**
```typescript
setAndEmitEvents(dataStream, eventStream)
```
Ensures data and notification are always in sync.

**Pattern 2: Nonce Management**
```typescript
let currentNonce = BigInt(0)  // In-memory counter
```
In production, use Vercel KV or similar for persistence.

**Pattern 3: Idempotency**
Frontend deduplicates by nonce, so re-publishing same data is safe.

---

## Zero-Fetch Pattern Explained {#zero-fetch}

This is where Somnia Data Streams shines.

### Traditional Approach (BAD)
```typescript
// Step 1: Listen for event
socket.on('ISSUpdated', async () => {
  // Step 2: Fetch latest data (additional RPC call!)
  const data = await fetch('/api/latest-iss')
  // Step 3: Update UI
  updateMap(data)
})
```
**Problem:** Every event triggers a fetch = 2x round trips

### Somnia Approach (GOOD)
```typescript
await sdk.streams.subscribe({
  somniaStreamsEventId: 'ISSPositionUpdated',
  
  // Bundle getLastPublishedDataForSchema in the event!
  ethCalls: [{
    to: protocolAddress,
    data: encodeFunctionData({
      abi: protocolAbi,
      functionName: 'getLastPublishedDataForSchema',
      args: [ISS_SCHEMA_ID, PUBLISHER_ADDRESS]
    })
  }],
  
  onData: (data) => {
    // Event arrives WITH data already included!
    const latest = decodeFunctionResult(data.result.simulationResults[0])
    updateMap(latest)  // Zero additional fetches! 🎯
  }
})
```

**Result:** Event delivery includes the data = 1 round trip

### Performance Impact

| Approach | Round Trips | Latency | Bandwidth |
|----------|-------------|---------|-----------|
| Traditional | 2 | ~200ms | High |
| Zero-Fetch | 1 | ~100ms | Low |

For an app updating every 5 seconds:
- Traditional: 17,280 extra fetches/day
- Zero-Fetch: 0 extra fetches/day

---

## Frontend Real-Time Subscriptions {#frontend}

Our custom hook manages everything:

```typescript
// hooks/useISSLocations.ts
export function useISSLocations({ onNewLocation, onLocationsUpdate }) {
  useEffect(() => {
    // 1. Fetch historical data (HTTP client)
    const locations = await fetchInitialLocations()
    
    // 2. Set up WebSocket subscription
    const sub = await sdk.streams.subscribe({
      somniaStreamsEventId: 'ISSPositionUpdated',
      ethCalls: [/* getLastPublishedDataForSchema */],
      onData: (data) => {
        const location = decodeISSLocation(data)
        
        // Deduplicate by nonce
        if (!locations.some(l => l.nonce === location.nonce)) {
          locations.push(location)
          onNewLocation(location)
        }
      },
      onError: (error) => {
        // Auto-reconnect after 3s
        setTimeout(setupSubscription, 3000)
      }
    })
    
    return () => sub.unsubscribe()
  }, [])
}
```

### Key Frontend Patterns

**Pattern 1: Separate HTTP and WebSocket Clients**
```typescript
const fetchSDK = getClientFetchSDK()  // HTTP for initial load
const wsSDK = getClientSDK()          // WebSocket for subscriptions
```
Prevents `SocketClosedError` when tabs sleep.

**Pattern 2: Deduplication**
```typescript
const isDuplicate = locations.some(l => l.nonce === location.nonce)
```
Protects against oracle restarts or network issues.

**Pattern 3: Auto-Reconnection**
Always implement reconnection logic for WebSocket subscriptions.

---

## Lessons Learned {#lessons}

### ✅ What Went Well

1. **Schema inheritance is powerful**
   - GPS schema is now reusable for any tracking app
   - Clean separation of concerns

2. **Zero-fetch pattern is game-changing**
   - Cut RPC calls in half
   - Noticeably faster UI updates

3. **No smart contracts needed**
   - Entire app built without writing Solidity
   - Faster development, fewer bugs

### ⚠️ Gotchas We Hit

1. **WebSocket vs HTTP clients**
   - Initially used WebSocket for everything
   - Got `SocketClosedError` on refetches
   - **Solution:** Separate clients for fetch vs subscribe

2. **getLastPublishedDataForSchema returns bytes**
   ```typescript
   // ❌ Wrong
   const data = result[0]
   
   // ✅ Correct
   const data = result as `0x${string}`
   ```

3. **TypeScript target for BigInt**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020"  // Required for BigInt support
     }
   }
   ```

4. **Nonce persistence**
   - In-memory nonce resets on serverless cold starts
   - For production, use Vercel KV or similar

### 🎓 Key Takeaways

- **Think in schemas, not contracts**
- **Inheritance enables composability**
- **Zero-fetch pattern is non-obvious but powerful**
- **Separation of HTTP/WebSocket clients matters**

---

## What's Next {#next-steps}

### Immediate Enhancements

- [ ] Add more satellites (Hubble, Starlink)
- [ ] Show ISS visibility predictions for user location
- [ ] Display astronaut information (People in Space API)
- [ ] 3D globe visualization

### Schema Reuse Examples

Using the same GPS base schema:

**Delivery Tracking**
```typescript
const deliverySchema = `uint32 estimatedArrival, uint8 status`
// status: 0=pending, 1=in-transit, 2=delivered
```

**F1 Telemetry**
```typescript
const f1Schema = `uint256 driverNumber, uint32 lapNumber, uint8 compound`
```

**Flight Radar**
```typescript
const flightSchema = `bytes32 flightNumber, uint32 heading, uint8 phase`
// phase: 0=taxi, 1=takeoff, 2=cruise, 3=landing
```

---

## Conclusion

We built a production-ready ISS tracker that:
- ✅ Tracks in real-time (5-second updates)
- ✅ Stores verifiable on-chain data
- ✅ Demonstrates schema inheritance
- ✅ Uses zero-fetch pattern for efficiency
- ✅ Requires zero Solidity knowledge

The **GPS base schema** we created can now power:
- Delivery apps
- Vehicle tracking
- Flight radars
- Gaming (player positions)
- Sports telemetry

**This is the future of blockchain development**: composable schemas, real-time reactivity, and no smart contract complexity.

---

## Resources

- **Live Demo:** [your-deployment-url]
- **Source Code:** https://github.com/local-optimum/sds-iss-tracker
- **Somnia Data Streams:** https://datastreams.somnia.network/
- **SDK Documentation:** https://www.npmjs.com/package/@somnia-chain/streams

---

## About the Author

[Your bio and links]

---

**Questions?** Drop them in the comments below or reach out on [Twitter/Discord].

**Found this helpful?** ⭐ Star the repo and share with your network!

---

*This blog post documents the journey of building a real-world blockchain application using Somnia Data Streams. All code is MIT licensed and available on GitHub.*

