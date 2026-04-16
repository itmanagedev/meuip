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
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Get client info from our server
        let serverIp = '0.0.0.0';
        let serverHostname = 'Desconhecido';
        try {
          const serverInfo = await axios.get('/api/client-info', { timeout: 5000 });
          serverIp = serverInfo.data.ip;
          serverHostname = serverInfo.data.serverHostname;
        } catch (e) {
          console.warn('Server info call failed');
        }

        // 2. Reliable IPv4 and IPv6 detection
        let ipv4 = '';
        let ipv6 = '';

        const [v4Result, v6Result] = await Promise.allSettled([
          axios.get('https://api.ipify.org?format=json', { timeout: 4000 }),
          axios.get('https://api6.ipify.org?format=json', { timeout: 4000 })
        ]);

        if (v4Result.status === 'fulfilled') ipv4 = v4Result.value.data.ip;
        if (v6Result.status === 'fulfilled') ipv6 = v6Result.value.data.ip;

        // Fallback for IPv4
        if (!ipv4) ipv4 = serverIp.includes(':') ? '' : serverIp;

        // 3. Geolocation with multiple fallbacks
        let geoData = {};
        const geoIp = ipv4 || serverIp;
        
        try {
          // Attempt 1: ipapi.co
          const geoRes1 = await axios.get(`https://ipapi.co/${geoIp}/json/`, { timeout: 5000 });
          if (!geoRes1.data.error) geoData = geoRes1.data;
          else throw new Error('ipapi limit');
        } catch (e) {
          try {
            // Attempt 2: ip-api.com (via server proxy to avoid CORS if needed, or direct)
            const geoRes2 = await axios.get(`http://ip-api.com/json/${geoIp}`);
            if (geoRes2.data.status === 'success') {
              geoData = {
                city: geoRes2.data.city,
                region: geoRes2.data.regionName,
                country_name: geoRes2.data.country,
                org: geoRes2.data.isp,
                asn: geoRes2.data.as,
                latitude: geoRes2.data.lat,
                longitude: geoRes2.data.lon,
                timezone: geoRes2.data.timezone
              };
            }
          } catch (e2) {
            console.error('All geo fallbacks failed');
          }
        }

        // 4. DNS Resolver detection
        let dnsResolver = 'Cloudflare / Google (Padrão)';
        try {
          const dnsRes = await axios.get('https://edns.ip-api.com/json/', { timeout: 3000 });
          if (dnsRes.data && dnsRes.data.dns) {
            dnsResolver = `${dnsRes.data.dns.geo} (${dnsRes.data.dns.ip})`;
          }
        } catch (e) {}

        setIpData({
          ip: ipv4 || serverIp,
          ipv6: ipv6,
          dns_resolver: dnsResolver,
          ...geoData
        } as IPData);

        // 5. Advanced System Info
        const parser = new UAParser();
        const browser = parser.getBrowser();
        const os = parser.getOS();
        
        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Não detectado';
        const resolution = `${window.screen.width}x${window.screen.height}`;
        const language = navigator.language.toUpperCase();

        // GPU Detection
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

        setSystemData({
          os: `${os.name} ${os.version || ''}`,
          browser: `${browser.name} ${browser.version}`,
          ram,
          hostname: serverHostname,
          resolution,
          language,
          gpu
        });

      } catch (err) {
        console.error('Fatal fetch error:', err);
        setError('Ocorreu um erro ao carregar os dados de rede.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { ipData, systemData, loading, error };
}
