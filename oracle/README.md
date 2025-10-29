# ISS Oracle Service

Standalone Node.js service that publishes ISS position data to Somnia blockchain every 5 seconds.

## 🏗️ Architecture

```
┌────────────────┐
│  Oracle (GCP)  │
│  setInterval() │
└───────┬────────┘
        │ publishes every 5s
        ↓
┌───────────────────┐
│ Somnia Blockchain │
└───────┬───────────┘
        │ emits events
        ↓
┌───────────────────┐
│ Frontend (Vercel) │
│ WebSocket sub     │
└───────────────────┘
```

## 🚀 Local Development

```bash
# From project root
cd oracle

# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Or run normally
npm start
```

The service will:
1. Load secrets from `../.env.local` (project root)
2. Query blockchain for latest nonce
3. Fetch ISS position from Open Notify API
4. Encode using GPS + ISS schemas
5. Publish to Somnia with `setAndEmitEvents()`
6. Repeat every 5 seconds

## 🖥️ GCP VM Deployment

### 1. Create VM
```bash
gcloud compute instances create iss-oracle \
  --machine-type=e2-micro \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB
```

### 2. Install Node.js
```bash
# SSH into VM
gcloud compute ssh iss-oracle

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v  # Should be v20.x.x
```

### 3. Clone Repository
```bash
# Clone the repo
git clone https://github.com/yourusername/sds-iss-tracker.git
cd sds-iss-tracker

# Or use personal access token if private:
git clone https://YOUR_TOKEN@github.com/yourusername/sds-iss-tracker.git
```

### 4. Set Up Environment
```bash
# Create .env.local in project root
nano .env.local

# Paste your secrets:
# PRIVATE_KEY=0x...
# NEXT_PUBLIC_GPS_SCHEMA_ID=0x...
# NEXT_PUBLIC_ISS_SCHEMA_ID=0x...
# NEXT_PUBLIC_PUBLISHER_ADDRESS=0x...
# RPC_URL=https://dream-rpc.somnia.network

# Secure the file
chmod 600 .env.local
```

### 5. Install Dependencies
```bash
# Install oracle dependencies
cd oracle
npm install
```

### 6. Test Run
```bash
# Test that it works
npm start

# You should see:
# 🚀 ISS Oracle Service Starting...
# 🎬 Running first sync...
# 📡 Fetching from Open Notify...
# ✅ Published! TX: 0x...
```

Press Ctrl+C to stop.

### 7. Set Up PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start oracle service with PM2
pm2 start service.ts --name iss-oracle --interpreter ./node_modules/.bin/tsx

# Set up auto-restart on VM reboot
pm2 startup
# Run the command it outputs (starts with 'sudo env...')

pm2 save

# Check status
pm2 status
pm2 logs iss-oracle --lines 50
```

### 8. Monitoring
```bash
# View logs
pm2 logs iss-oracle

# Real-time monitoring
pm2 monit

# Restart service
pm2 restart iss-oracle

# Stop service
pm2 stop iss-oracle
```

## 🔧 Configuration

### Adjust Sync Interval

Edit `oracle/service.ts`:
```typescript
const INTERVAL = 5000  // Change to 10000 for 10 seconds, 60000 for 1 minute, etc.
```

Then restart:
```bash
pm2 restart iss-oracle
```

### Change RPC Endpoint

Update `.env.local` in project root:
```env
RPC_URL=https://your-alternative-rpc.somnia.network
```

Then restart the service.

## 📊 Monitoring & Alerts

### Log Rotation
```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### GCP Monitoring
Set up Stackdriver alerts:
- VM CPU > 80%
- VM disk > 90%
- Process down

### Check Wallet Balance
```bash
# Add to crontab to alert if balance low
0 */6 * * * /path/to/check-balance.sh
```

## 🛑 Stopping the Service

### Temporary Stop
```bash
pm2 stop iss-oracle
```

### Permanent Stop
```bash
pm2 delete iss-oracle
```

### Delete VM
```bash
gcloud compute instances delete iss-oracle --zone=us-central1-a
```

## 💰 Cost Estimate

**GCP VM (e2-micro):**
- ~$5-7/month
- Always running (720 hours/month)

**Somnia Gas Fees:**
- ~518,400 transactions/month (5-second interval)
- ~$5-10/month estimated

**Total:** ~$10-17/month

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
pm2 logs iss-oracle --err

# Common issues:
# - Missing .env.local file
# - Invalid PRIVATE_KEY
# - Schema IDs not set
```

### Transactions failing
```bash
# Check wallet balance
# (requires cast from foundry)
cast balance YOUR_ADDRESS --rpc-url https://dream-rpc.somnia.network

# Check RPC connectivity
curl https://dream-rpc.somnia.network \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### High memory usage
```bash
# Check with PM2
pm2 monit

# Restart if needed
pm2 restart iss-oracle
```

## 📝 Logs Location

- PM2 logs: `~/.pm2/logs/`
- Application output: `~/.pm2/logs/iss-oracle-out.log`
- Application errors: `~/.pm2/logs/iss-oracle-error.log`

## 🔄 Updates

To update the oracle code:

```bash
cd ~/sds-iss-tracker
git pull
cd oracle
npm install  # If dependencies changed
pm2 restart iss-oracle
```

## 🔐 Security Checklist

- [ ] `.env.local` has 600 permissions
- [ ] VM firewall only allows SSH from known IPs
- [ ] OS security updates enabled
- [ ] PM2 running as non-root user
- [ ] Private key is for dedicated oracle wallet
- [ ] Monitoring alerts set up

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [GCP Compute Engine Docs](https://cloud.google.com/compute/docs)
- [Somnia Documentation](https://docs.somnia.network/)

