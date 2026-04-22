import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add trust proxy to get correct client IP behind Nginx
  app.set('trust proxy', true);
  app.use(express.json());

  // API Routes
  app.get("/api/client-info", async (req, res) => {
    let ip = req.ip || req.socket.remoteAddress;
    
    // In dev / cloud run sometimes we just get localhost or private IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1') || ip.startsWith('10.')) {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch(e) {
        // Fallback if ipify is blocked, keep whatever we had
      }
    }

    res.json({
      ip,
      serverHostname: os.hostname(),
    });
  });

  // IP Validator & Info API
  app.get("/api/inspect-ip/:ip", async (req, res) => {
    const { ip } = req.params;
    try {
      // Use ip-api for rich data
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
      const data = await response.json();

      // If it looks like a domain, try to fetch DNS records
      const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      if (domainPattern.test(ip)) {
        const dns = await import("dns/promises");
        try {
          const [mx, ns] = await Promise.allSettled([
            dns.resolveMx(ip),
            dns.resolveNs(ip)
          ]);
          
          data.dns_mx = mx.status === 'fulfilled' ? mx.value : [];
          data.dns_ns = ns.status === 'fulfilled' ? ns.value : [];
          data.is_domain = true;
        } catch (e) {
          console.error("DNS lookup error:", e);
        }
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch IP data" });
    }
  });

  // Basic Port Scanner
  app.post("/api/scan-ports", async (req, res) => {
    const { host, ports } = req.body;
    if (!host || !Array.isArray(ports)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const net = await import("net");
    const results = await Promise.all(
      ports.slice(0, 10).map((port: number) => { // Limited to 10 for safety/speed
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(2000);
          socket.on("connect", () => {
            socket.destroy();
            resolve({ port, status: "open" });
          })
          .on("timeout", () => {
            socket.destroy();
            resolve({ port, status: "timeout" });
          })
          .on("error", () => {
            socket.destroy();
            resolve({ port, status: "closed" });
          })
          .connect(port, host);
        });
      })
    );
    res.json({ host, results });
  });

  // Real ICMP Ping and Simulated Global Nodes
  app.get("/api/global-ping/:host", async (req, res) => {
    const { host } = req.params;
    
    // Ensure host is a safe string before passing to shell (allow IPv4, IPv6, and Domains)
    if (!/^[a-zA-Z0-9.:-]+$/.test(host)) {
      return res.status(400).json({ error: "Invalid host format" });
    }

    const { exec } = await import("child_process");
    
    exec(`ping -c 4 -W 2 ${host}`, (error, stdout, stderr) => {
      // Analyze the ping output to determine reachability and loss
      const isAlive = !error;
      const lossMatch = stdout.match(/(\d+)% packet loss/);
      let lossPercent = lossMatch ? lossMatch[1] : (isAlive ? "0" : "100");

      if (error && !stdout.includes("packet loss")) {
         lossPercent = "100";
      }

      // If practically dead, simulate 100% loss for all global nodes
      const isDead = parseInt(lossPercent) >= 100;
      
      const nodes = [
        { name: 'São Paulo, BR', code: 'BR', base: 15 },
        { name: 'Ashburn, EUA', code: 'US', base: 110 },
        { name: 'Londres, UK', code: 'GB', base: 185 },
        { name: 'Tóquio, JP', code: 'JP', base: 280 },
        { name: 'Frankfurt, DE', code: 'DE', base: 195 },
        { name: 'Sydney, AU', code: 'AU', base: 310 },
        { name: 'Joanesburgo, ZA', code: 'ZA', base: 240 }
      ];

      const results = nodes.map(node => {
        if (isDead) {
          return {
            ...node,
            last: "---",
            avg: "---",
            best: "---",
            worst: "---",
            loss: "100.0"
          };
        } else {
          // Add some jitter for realism if reachable
          const rtt = (node.base + (Math.random() * 20)).toFixed(1);
          return {
            ...node,
            last: rtt,
            avg: (parseFloat(rtt) + 0.5).toFixed(1),
            best: (parseFloat(rtt) - 2).toFixed(1),
            worst: (parseFloat(rtt) + 5).toFixed(1),
            loss: "0.0"
          };
        }
      });

      res.json({ host, results, isDead });
    });
  });

  // Simulated Traceroute
  app.get("/api/traceroute/:host", async (req, res) => {
    const { host } = req.params;
    
    // Simulated geographical path starting from various global hubs
    const hops = [
      { hop: 1, ip: "192.168.1.1", ms: (Math.random() * 5).toFixed(2), city: "Local Gateway", lat: -23.5505, lon: -46.6333 }, // São Paulo baseline
      { hop: 2, ip: "10.0.0.1", ms: (Math.random() * 10 + 5).toFixed(2), city: "iTmanage IXP", lat: -23.5329, lon: -46.6395 },
      { hop: 3, ip: "172.67.12.1", ms: (Math.random() * 15 + 10).toFixed(2), city: "Cloudflare Edge", lat: 38.9072, lon: -77.0369 }, // Washington DC
    ];

    try {
      const targetRes = await fetch(`http://ipify-api.net/api/v1/geo?apiKey=at_dummy&ipAddress=${host}`); // This is a mock/simulation idea, let's use ip-api
      const geoTargetRes = await fetch(`http://ip-api.com/json/${host}?fields=status,query,city,country,lat,lon,isp`);
      const targetData = await geoTargetRes.json();
      
      if (targetData.status === "success") {
        hops.push({
          hop: 4,
          ip: targetData.query,
          ms: (Math.random() * 30 + 20).toFixed(2),
          city: targetData.city + ", " + targetData.country,
          lat: targetData.lat,
          lon: targetData.lon
        });
      }
    } catch (e) {
      hops.push({ hop: 4, ip: host, ms: "??", city: "Destino Remoto", lat: 40.7128, lon: -74.0060 });
    }

    res.json({ host, hops });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
