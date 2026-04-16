import { useState, useEffect } from 'react';
import axios from 'axios';
import { UAParser } from 'ua-parser-js';

export interface IPData {
  ip: string;
  ipv6?: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  asn?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  dns_resolver?: string;
}

export interface SystemData {
  os: string;
  browser: string;
  ram: string;
  hostname: string;
  resolution: string;
  language: string;
  gpu?: string;
}

export function useIPInspector() {
  const [ipData, setIpData] = useState<IPData | null>(null);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    async function fetchData() {
      // 1. Immediate System Info (Sync)
      try {
        const parser = new UAParser();
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Não detectado';
        const resolution = `${window.screen.width}x${window.screen.height}`;
        const language = navigator.language.toUpperCase();

        setSystemData({
          os: `${os.name} ${os.version || ''}`,
          browser: `${browser.name} ${browser.version}`,
          ram,
          hostname: 'Auditando...',
          resolution,
          language,
          gpu: 'Detectando...'
        });
      } catch (e) {
        console.error('Initial system info error:', e);
      }

      try {
        setLoading(true);
        setError(null);

        // 2. Main Server Info (High Priority)
        let serverIp = '0.0.0.0';
        let serverHostname = 'Desconhecido';
        try {
          const serverInfo = await axios.get('/api/client-info', { timeout: 3000 });
          serverIp = serverInfo.data.ip;
          serverHostname = serverInfo.data.serverHostname;
          
          if (active) {
            setIpData({ ip: serverIp } as IPData);
            setSystemData(prev => prev ? { ...prev, hostname: serverHostname } : null);
             // We have enough to start the app
             setLoading(false);
          }
        } catch (e) {
          console.error('Server info failed');
          if (active) setLoading(false); // Don't block even if server call fails
        }

        // 3. Background Detection (Non-blocking)
        const runBackgroundTasks = async () => {
          if (!active) return;

          // IPv4 & IPv6 Parallel
          let ipv4 = '';
          let ipv6 = '';
          const [v4Result, v6Result] = await Promise.allSettled([
            axios.get('https://api.ipify.org?format=json', { timeout: 3000 }),
            axios.get('https://api6.ipify.org?format=json', { timeout: 1500 }) // IPv6 is often the slow one
          ]);

          if (v4Result.status === 'fulfilled') ipv4 = v4Result.value.data.ip;
          if (v6Result.status === 'fulfilled') ipv6 = v6Result.value.data.ip;
          
          const finalIp = ipv4 || serverIp;

          // Geodata via Server Proxy (Safer for CORS/SSL)
          let geoData = {};
          try {
             // We use our own backend as a proxy for technical data
             const geoRes = await axios.get(`/api/inspect-ip/${finalIp}`, { timeout: 5000 });
             if (geoRes.data && geoRes.data.status === 'success') {
               geoData = {
                 city: geoRes.data.city,
                 region: geoRes.data.regionName,
                 country_name: geoRes.data.country,
                 org: geoRes.data.isp,
                 asn: geoRes.data.as,
                 latitude: geoRes.data.lat,
                 longitude: geoRes.data.lon,
                 timezone: geoRes.data.timezone
               };
             }
          } catch (e) {
             console.warn('Background geodata failed');
          }

          // DNS Resolver
          let dnsResolver = 'Cloudflare / Google (Padrão)';
          try {
            const dnsRes = await axios.get('https://edns.ip-api.com/json/', { timeout: 2000 });
            if (dnsRes.data && dnsRes.data.dns) {
              dnsResolver = `${dnsRes.data.dns.geo} (${dnsRes.data.dns.ip})`;
            }
          } catch (e) {}

          // GPU (Technical detection)
          let gpu = 'Desconhecida';
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
              const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
              if (debugInfo) {
                gpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              }
            }
          } catch (e) {}

          if (active) {
            setIpData(prev => ({
              ...prev,
              ip: finalIp,
              ipv6,
              dns_resolver: dnsResolver,
              ...geoData
            } as IPData));

            setSystemData(prev => prev ? { ...prev, gpu } : null);
          }
        };

        runBackgroundTasks();

      } catch (err) {
        console.error('Fetch chain error:', err);
        // Error only if we have absolutely nothing
        if (!ipData) {
          setError('Conexão instável detectada. Alguns dados podem não carregar.');
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  return { ipData, systemData, loading, error };
}
