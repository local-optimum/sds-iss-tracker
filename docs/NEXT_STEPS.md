# 🚀 Next Steps - ISS Tracker Setup Guide

Congratulations on setting up the ISS Tracker! Here's what to do next:

## ✅ Immediate Actions

### 1. Set Up Environment Variables

Create `.env.local` file:
```bash
cp .env.example .env.local
```

You'll need:
- **PRIVATE_KEY**: Your Somnia testnet wallet private key
- **CRON_SECRET**: Generate a random string for Vercel cron security

### 2. Get Testnet Tokens

1. Create a wallet on Somnia Testnet
2. Get testnet STT tokens from the faucet
3. Save your private key securely

### 3. Register Schemas

Run the registration script:
```bash
npm run register-schemas
```

This will output schema IDs that you need to add to `.env.local`:
```env
NEXT_PUBLIC_GPS_SCHEMA_ID=0x...
NEXT_PUBLIC_ISS_SCHEMA_ID=0x...
NEXT_PUBLIC_PUBLISHER_ADDRESS=0x...
```

### 4. Test Locally

Terminal 1 - Start dev server:
```bash
npm run dev
```

Terminal 2 - Publish first ISS position:
```bash
npm run test-oracle
```

Terminal 3 - Watch for updates (optional):
```bash
# Open browser console at http://localhost:3000
# Look for:
# - "Loaded X historical positions"
# - "Subscribed to ISSPositionUpdated events"
# - "New ISS position received!"
```

---

## 🎯 Verification Checklist

- [ ] Schemas registered successfully
- [ ] Environment variables set in `.env.local`
- [ ] Dev server running without errors
- [ ] Oracle publishes first position successfully
- [ ] Map displays ISS marker
- [ ] Real-time updates working (console shows new positions)
- [ ] Timeline scrubber functional
- [ ] Info panel shows GPS + ISS data correctly

---

## 🚢 Deployment to Vercel

### Prerequisites
- GitHub repository with your code
- Vercel account (free tier works)

### Steps

1. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "Initial ISS tracker implementation"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set Environment Variables in Vercel:**
   Go to Project Settings → Environment Variables:
   ```
   PRIVATE_KEY=0x...
   CRON_SECRET=your_random_string
   NEXT_PUBLIC_GPS_SCHEMA_ID=0x...
   NEXT_PUBLIC_ISS_SCHEMA_ID=0x...
   NEXT_PUBLIC_PUBLISHER_ADDRESS=0x...
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Verify Cron Job:**
   - Go to Vercel Dashboard → Your Project → Cron
   - Should see `/api/cron/sync-iss` scheduled
   - Check logs to confirm it's running every 5 seconds

---

## 🐛 Troubleshooting

### Schema Registration Fails

**Problem:** "Insufficient funds" or transaction reverts

**Solution:**
- Check you have STT tokens in your wallet
- Verify RPC URL is correct
- Try again (might be network congestion)

### No ISS Positions on Chain

**Problem:** "No ISS positions on-chain yet"

**Solution:**
1. Run oracle manually: `npm run test-oracle`
2. Check transaction was successful
3. Wait 10 seconds for blockchain confirmation
4. Refresh app

### WebSocket Not Connecting

**Problem:** Console shows "Failed to subscribe"

**Solution:**
- Check WSS URL in `.env.local` uses `wss://` not `ws://`
- Verify you're on a secure connection (HTTPS in production)
- Check browser console for detailed error

### Map Not Loading

**Problem:** "Loading map..." stays forever

**Solution:**
- Leaflet doesn't work with SSR
- Check dynamic import is correct: `ssr: false`
- Clear `.next` cache: `rm -rf .next && npm run dev`

### Oracle Errors in Production

**Problem:** Vercel cron logs show errors

**Solution:**
1. Check environment variables are set
2. Verify CRON_SECRET matches in Vercel
3. Check function timeout (increase if needed)
4. Monitor Open Notify API status

---

## 📊 Monitoring & Debugging

### Check Blockchain Explorer

- Somnia Explorer: https://explorer.somnia.network
- Search for your publisher address
- Verify transactions are going through

### Browser Console Commands

```javascript
// Check current locations
console.log(locations)

// Force refetch
window.location.reload()

// Check WebSocket connection
// Look for: "Subscribed to ISSPositionUpdated events"
```

### Vercel Logs

```bash
vercel logs --follow
```

Watch for:
- Oracle execution logs
- Transaction hashes
- Error messages

---

## 🎨 Customization Ideas

### Easy Wins

1. **Change colors:**
   - Edit `components/ISSMap.tsx` for map marker colors
   - Update Tailwind classes in components

2. **Add more info:**
   - Show ISS speed in different units (m/s, mph)
   - Display current country below ISS
   - Add astronaut count (People in Space API)

3. **Improve timeline:**
   - Add playback speed control
   - Show markers at interesting events
   - Add date picker for historical dates

### Advanced Features

1. **Multi-satellite tracking:**
   - Extend GPS schema for Hubble, Starlink
   - Show multiple markers on map
   - Add satellite selector dropdown

2. **Notifications:**
   - Alert when ISS is overhead
   - Email/SMS when visible from user location
   - Browser push notifications

3. **3D visualization:**
   - Use Three.js for 3D globe
   - Show orbit path in 3D
   - Rotate camera to follow ISS

4. **Data analytics:**
   - Chart altitude over time
   - Calculate orbit decay
   - Show statistics dashboard

---

## 📚 Learning Resources

### Somnia Data Streams
- [Documentation](https://datastreams.somnia.network/)
- [SDK npm package](https://www.npmjs.com/package/@somnia-chain/streams)
- [Discord Community](https://discord.gg/somnia)

### ISS Tracking
- [Open Notify API](http://open-notify.org/)
- [Celestrak TLE Data](https://celestrak.com/)
- [NASA ISS Tracker](https://spotthestation.nasa.gov/)

### Web Development
- [Next.js Documentation](https://nextjs.org/docs)
- [Leaflet Guide](https://leafletjs.com/examples.html)
- [Viem Documentation](https://viem.sh/)

---

## 🤝 Getting Help

### Community
- **Somnia Discord**: Best for SDK questions
- **GitHub Issues**: For bugs/feature requests
- **Stack Overflow**: Tag `somnia` + `blockchain`

### Documentation
- Check `README.md` for full setup guide
- Read `docs/BLOG_POST.md` for architecture deep-dive
- Review code comments for implementation details

---

## 🎉 You're All Set!

Your ISS tracker should now be:
- ✅ Tracking ISS in real-time
- ✅ Storing data on Somnia blockchain
- ✅ Demonstrating schema inheritance
- ✅ Using zero-fetch pattern

**What's next?**
1. Customize the UI to match your brand
2. Add new features (see ideas above)
3. Write a blog post about your experience
4. Share on social media with #SomniaDataStreams

**Need help?** Open an issue on GitHub or ask in Discord!

**Found this useful?** ⭐ Star the repo and share with others!

---

Happy tracking! 🛰️

