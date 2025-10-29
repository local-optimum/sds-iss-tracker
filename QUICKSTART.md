# 🚀 Quick Start - 5 Minutes to ISS Tracking

Get your ISS tracker running in 5 minutes!

## Prerequisites
- Node.js 20+ installed
- Somnia testnet wallet with STT tokens
- Private key ready

## Steps

### 1️⃣ Install Dependencies (30 seconds)
```bash
npm install
```

### 2️⃣ Configure Environment (1 minute)
```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local and add:
# - Your PRIVATE_KEY
# - A random CRON_SECRET
```

### 3️⃣ Register Schemas (1 minute)
```bash
npm run register-schemas

# Copy the output schema IDs to .env.local:
# NEXT_PUBLIC_GPS_SCHEMA_ID=0x...
# NEXT_PUBLIC_ISS_SCHEMA_ID=0x...
# NEXT_PUBLIC_PUBLISHER_ADDRESS=0x...
```

### 4️⃣ Start Dev Server (10 seconds)
```bash
npm run dev
```

### 5️⃣ Publish First Position (30 seconds)
Open a new terminal:
```bash
npm run test-oracle
```

### 6️⃣ View Your Tracker! 🎉
Open http://localhost:3000

You should see:
- 🗺️ World map with ISS marker
- 📊 Position updating every 5 seconds
- 📈 GPS + ISS data in info panel
- ⏯️ Timeline for replay

---

## ✅ Success Checklist

- [ ] Map loads without errors
- [ ] ISS marker appears on map
- [ ] Browser console shows "Subscribed to ISSPositionUpdated events"
- [ ] New positions appear automatically
- [ ] Timeline scrubber works
- [ ] Info panel shows data

---

## 🐛 Something Not Working?

### Map not loading?
```bash
rm -rf .next
npm run dev
```

### No data appearing?
```bash
# In another terminal
npm run test-oracle
# Wait 10 seconds, then refresh browser
```

### Environment variables not set?
Check `.env.local` has all required values from schema registration

---

## 📚 Next Steps

✅ Tracker working? Great!

**Now explore:**
- `README.md` - Full documentation
- `docs/BLOG_POST.md` - Architecture deep-dive
- `docs/NEXT_STEPS.md` - Deployment guide
- `PROJECT_SUMMARY.md` - Technical overview

**Deploy to production:**
```bash
npm i -g vercel
vercel
```

**Customize:**
- Edit colors in components
- Add features (astronauts, predictions)
- Build your own extensions

---

## 💬 Need Help?

- Check `docs/NEXT_STEPS.md` for troubleshooting
- Open GitHub issue
- Ask in Somnia Discord

---

**Happy tracking!** 🛰️

