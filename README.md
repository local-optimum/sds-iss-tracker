# 🛰️ ISS Position Tracker

> A real-time International Space Station position tracker built with [Somnia Data Streams](https://datastreams.somnia.network/)

![ISS Tracker Banner](https://img.shields.io/badge/Somnia-Data%20Streams-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

## 🎯 Overview

This project demonstrates the power of **Somnia Data Streams** through a real-world ISS tracking application. It showcases:

- **🔗 Schema Inheritance**: GPS base schema extended with ISS-specific data
- **⚡ Real-Time Reactivity**: WebSocket subscriptions with zero-fetch ethCalls pattern
- **🛰️ Live Tracking**: Real-time position updates with orbit trail
- **🌐 On-Chain Storage**: All data verifiable on Somnia blockchain

### Why This Matters

The GPS schema used here is **generic and reusable** for:
- 🚗 Delivery apps
- 🏎️ F1 car position tracking  
- ✈️ Flight radars
- 📦 Package tracking
- ...and any location-based application

This is a **template example** showing how to build composable, interoperable applications with Somnia Data Streams.

---

## 📸 Screenshots

### Real-Time Tracking
![ISS Tracker Main View](./docs/screenshot-main.png)

### Schema Inheritance Demo
The ISS data combines:
- **GPS Schema (Parent)**: timestamp, latitude, longitude, altitude, accuracy, entityId, nonce
- **ISS Schema (Child)**: velocity, visibility

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- A Somnia testnet wallet with STT tokens
- Private key for oracle operations

### 1. Clone and Install

```bash
git clone https://github.com/local-optimum/sds-iss-tracker.git
cd sds-iss-tracker
npm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Required - Your Somnia wallet private key
PRIVATE_KEY=0x...your_private_key_here

# Public (set after schema registration)
NEXT_PUBLIC_GPS_SCHEMA_ID=
NEXT_PUBLIC_ISS_SCHEMA_ID=
NEXT_PUBLIC_PUBLISHER_ADDRESS=

# RPC/WebSocket endpoints
NEXT_PUBLIC_RPC_URL=https://api.infra.testnet.somnia.network
NEXT_PUBLIC_WS_URL=wss://api.infra.testnet.somnia.network/ws
```

**Note:** The oracle service reads from the same `.env.local` file in the project root.

### 3. Register Schemas

This registers the GPS base schema and ISS extension schema on Somnia testnet:

```bash
npm run register-schemas
```

**Expected output:**
```
✅ GPS Schema ID: 0x...
✅ ISS Schema ID: 0x...
✅ ISSPositionUpdated event registered!

📋 Add these to your .env.local file:
NEXT_PUBLIC_GPS_SCHEMA_ID=0x...
NEXT_PUBLIC_ISS_SCHEMA_ID=0x...
NEXT_PUBLIC_PUBLISHER_ADDRESS=0x...
```

**Important:** Copy the output values to your `.env.local` file!

### 4. Start Oracle Service

In one terminal, start the oracle service (publishes ISS position every 5 seconds):

```bash
cd oracle
npm install
npm start
```

**Expected output:**
```
🚀 ISS Oracle Service Starting...
✅ Connected to Somnia testnet
✅ Publishing ISS position #1
✅ Publishing ISS position #2
...
```

### 5. Start Frontend

In a separate terminal, start the Next.js frontend:

```bash
npm run dev
```

### 6. View the App

Open [http://localhost:3000](http://localhost:3000)

You should see:
- 🗺️ World map with dark theme
- 🟢 Green glowing ISS marker (radar ping style)
- 🔵 Blue orbit trail (last ~100 positions)
- 📊 Real-time position updates every ~5 seconds
- 📈 Info panel showing GPS + ISS data

---

## 📁 Project Structure

```
sds-iss-tracker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Main app page
│   └── globals.css               # Global styles (radar ping glow)
├── components/
│   ├── ISSMap.tsx                # Leaflet map component
│   └── ISSInfo.tsx               # Info panel
├── hooks/
│   └── useISSLocations.ts        # Real-time WebSocket subscriptions
├── lib/
│   ├── chains.ts                 # Somnia chain definition
│   ├── constants.ts              # Schemas + constants
│   ├── sdk.ts                    # Server-side SDK
│   ├── client-sdk.ts             # Client-side SDK
│   └── iss-encoding.ts           # Encoding/decoding helpers
├── oracle/                       # Standalone oracle service
│   ├── service.ts                # Main oracle logic (setInterval)
│   ├── package.json              # Oracle dependencies
│   └── tsconfig.json             # Oracle TypeScript config
├── scripts/
│   └── register-schemas.ts       # Schema registration
├── types/
│   └── iss.ts                    # TypeScript interfaces
├── .env.example                  # Environment template
└── README.md                     # This file
```

**Key Components:**

- **`oracle/`**: Standalone Node.js service that fetches ISS data every 5 seconds and publishes to blockchain
- **`hooks/useISSLocations.ts`**: WebSocket subscription hook that builds orbit trail from live data
- **`components/ISSMap.tsx`**: Leaflet map with green radar ping marker and blue trail dots
- **`lib/iss-encoding.ts`**: Encodes/decodes data according to GPS + ISS schema

---

## 🧬 Schema Architecture

### GPS Schema (Parent) - Reusable Base

```typescript
const GPS_SCHEMA = `
  uint64 timestamp,    // Unix milliseconds
  int32 latitude,      // Degrees * 1,000,000
  int32 longitude,     // Degrees * 1,000,000
  int32 altitude,      // Meters
  uint32 accuracy,     // Meters
  bytes32 entityId,    // Entity identifier
  uint256 nonce        // Position counter
`
```

**Use Cases:**
- Delivery tracking
- Vehicle/fleet management
- Aircraft tracking
- Asset tracking
- Gaming (player positions)

### ISS Schema (Child) - Extends GPS

```typescript
const ISS_SCHEMA = `
  uint32 velocity,     // km/h
  uint8 visibility     // 0-3 (day/night side)
`
```

**Combined Data:**
When querying ISS data, you get **both** GPS fields + ISS fields automatically!

---

## 🔄 How It Works

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Oracle Service (Node.js, runs continuously)         │
│    ↓ setInterval every 5 seconds                       │
│    ↓ Fetches from Open Notify API                      │
│    ↓ Encodes with GPS + ISS schemas                    │
│    ↓ Publishes to Somnia blockchain                    │
│    └─ setAndEmitEvents(dataStream, eventStream)        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Blockchain Storage                                   │
│    • Data stored with ISS schema ID                     │
│    • Event emitted: ISSPositionUpdated                  │
│    • All positions indexed by nonce                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Frontend Subscription (WebSocket)                    │
│    ↓ Listens for ISSPositionUpdated events            │
│    ↓ Uses ethCall for zero-fetch pattern              │
│    └─ getLastPublishedDataForSchema bundled in event  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. UI Updates                                           │
│    • Green radar ping marker moves to new position      │
│    • Blue orbit trail extends (last ~100 positions)     │
│    • Info panel updates                                 │
│    • ZERO additional RPC calls needed!                  │
└─────────────────────────────────────────────────────────┘
```

### Key Innovation: Zero-Fetch Pattern

Traditional approach:
```typescript
// ❌ Multiple round trips
1. Listen for event → receive event
2. Fetch latest data → make RPC call
3. Process data → update UI
```

Somnia approach:
```typescript
// ✅ Single round trip
1. Listen for event → receive event WITH data (ethCall)
2. Process data → update UI
// No additional fetches needed!
```

---

## 🛠️ Development

### Available Scripts

**Frontend:**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

**Oracle:**
```bash
cd oracle

# Start oracle service
npm start
```

**Setup:**
```bash
# Register schemas on blockchain (one-time)
npm run register-schemas
```

### Testing Locally

1. **Terminal 1 - Start Oracle:**
   ```bash
   cd oracle
   npm install
   npm start
   ```
   Look for: `✅ Publishing ISS position #X`

2. **Terminal 2 - Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Check browser console for:**
   - "🔌 Setting up WebSocket subscription..."
   - "✅ Subscribed to ISSPositionUpdated events"
   - "🛰️ ISS position #X received!"
   - Watch the green radar ping and blue trail appear on the map!

---

## 🚢 Deployment

### Frontend

The Next.js frontend can be deployed to Vercel, Netlify, or any Node.js hosting platform.

**Environment variables to set:**
- `NEXT_PUBLIC_GPS_SCHEMA_ID`
- `NEXT_PUBLIC_ISS_SCHEMA_ID`
- `NEXT_PUBLIC_PUBLISHER_ADDRESS`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_WS_URL`

### Oracle Service

The oracle service is a standalone Node.js process that needs to run continuously. Deploy it to:
- Cloud VMs (GCP, AWS, Azure)
- Container platforms (Docker, Kubernetes)
- Serverless platforms with long-running support

See `oracle/README.md` for deployment details.

---

## 📚 Learn More

### Somnia Data Streams

- [Documentation](https://datastreams.somnia.network/)
- [SDK on npm](https://www.npmjs.com/package/@somnia-chain/streams)
- [Somnia Network](https://somnia.network/)

### Technologies Used

- [Next.js 16](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Viem](https://viem.sh/) - Ethereum library
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Tailwind CSS](https://tailwindcss.com/) - Styling

### ISS Data

- [Open Notify API](http://open-notify.org/) - Real-time ISS position

---

## 🤝 Contributing

Contributions are welcome! This is a template project meant to inspire and educate.

### Ideas for Extension

- [ ] Add more satellites (Hubble, Starlink)
- [ ] Show ISS visibility predictions for user location
- [ ] Display astronaut information
- [ ] 3D globe visualization
- [ ] Add altitude/velocity charts
- [ ] Implement data pruning (keep last 7 days only)
- [ ] Add notifications when ISS is overhead

---

## 📝 License

MIT License - See [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

- **Somnia Team** for the amazing Data Streams SDK
- **Open Notify** for free ISS position API
- **NASA** for tracking the ISS

---

## 💬 Support

- [Somnia Discord](https://discord.gg/somnia)
- [GitHub Issues](https://github.com/local-optimum/sds-iss-tracker/issues)

---

<p align="center">
  Built by <a href="https://github.com/local-optimum">@local-optimum</a> with ❤️ using <a href="https://datastreams.somnia.network/">Somnia Data Streams</a>
</p>

<p align="center">
  <strong>⭐ Star this repo if you found it helpful!</strong>
</p>
