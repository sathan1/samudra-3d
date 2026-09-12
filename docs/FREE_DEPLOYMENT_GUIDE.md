# SAMUDRA-3D: 100% Free Hosting & Team Universal Access Guide

This guide details three tested, zero-cost methods to host SAMUDRA-3D and share it privately or publicly with your team and evaluators.

---

## Method 1: Instant Universal Live URL via Cloudflare Tunnel (Recommended for Immediate Testing)
**Cost: FREE (No credit card, no cloud account needed)**
**Time to Launch: 60 seconds**

Cloudflare Tunnel lets you instantly expose your running local SAMUDRA-3D stack to a secure, world-accessible HTTPS link (https://xxxx.trycloudflare.com) that your entire team can open on phones, tablets, and laptops.

### Quick Start:
1. Ensure both services are running:
   - Backend: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   - Frontend: cd frontend && npm run dev
2. Download cloudflared (portable single binary from Cloudflare):
   `ash
   # Windows (via winget or direct download)
   winget install Cloudflare.cloudflared
   `
3. Run the instant quick tunnel:
   `ash
   cloudflared tunnel --url http://localhost:5173
   `
4. Cloudflare outputs a live HTTPS link:
   `
   https://random-words.trycloudflare.com
   `
5. Share this link with your team. Anyone in the world can immediately interact with the 3D globe, test logins, and evaluate data!

---

## Method 2: Vercel (Frontend) + Render.com (Backend) (Permanent 24/7 Free Hosting)
**Cost: 100% Free Forever**

### Step A: Deploy Backend to Render.com
1. Push this repository to GitHub (Public or Private repo).
2. Go to [render.com](https://render.com) and sign up with GitHub (free).
3. Click **New +** -> **Web Service**.
4. Select your repository.
5. Render detects ender.yaml automatically, or configure:
   - **Environment:** Python 3
   - **Build Command:** pip install -r backend/requirements.txt
   - **Start Command:** python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 
   - **Plan:** Free
6. Click **Deploy Web Service**. You will receive a URL such as https://samudra-3d-backend.onrender.com.

### Step B: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and select your repository.
3. Configure:
   - **Root Directory:** rontend
   - **Framework Preset:** Vite
   - **Environment Variables:** Add VITE_API_URL = https://your-backend.onrender.com/api
4. Click **Deploy**.
5. Within 30 seconds, Vercel gives you an edge-accelerated live URL (e.g., https://samudra-3d.vercel.app).

---

## Method 3: Hugging Face Spaces (All-in-One Free GPU/CPU Docker)
**Cost: 100% Free**

1. Create a new Space on [huggingface.co/spaces](https://huggingface.co/spaces) with SDK: **Docker**.
2. Push the Dockerfile from this repository.
3. Hugging Face builds and hosts the entire container with 16 GB RAM and 2 vCPUs at zero cost.

---

## Pre-Configured MoES/INCOIS Credentials for Team Evaluation:
- **Chief Oceanographer:**
  - Username: chief.oceanographer
  - Password: Samudra#Command2026!
- **Naval Operations Officer:**
  - Username: cmdr.varma
  - Password: Naval#OpsTactical2026!
- **Marine Researcher:**
  - Username: priya.nair
  - Password: Research#Argo2026!

*All credentials are stored, queried, and verified strictly against the SQLite database (ackend/data/samudra.db).*
