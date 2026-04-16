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
  cores: number;
  language: string;
  resolution: string;
  platform: string;
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

        // 1. Get client info from our server (initial check)
        let initialIp = '';
        let initialHostname = 'ITM-NODE-PROD';
        try {
           const serverInfo = await axios.get('/api/client-info', { timeout: 3000 });
           initialIp = serverInfo.data.ip;
           initialHostname = serverInfo.data.serverHostname || initialHostname;
        } catch (e) {
           console.warn('Backend client-info failed, using temporary fallback IP');
           initialIp = '1.1.1.1'; // Absolute fallback
        }

        // 2. Reliable IPv4 and IPv6 detection using separate endpoints
        let ipv4 = '';
        let ipv6 = '';

        try {
          const v4Res = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
          ipv4 = v4Res.data.ip;
        } catch (e) {
          console.warn('IPv4 reliable detection failed, falling back');
          ipv4 = initialIp.includes(':') ? '' : initialIp;
        }

        try {
          const v6Res = await axios.get('https://api6.ipify.org?format=json', { timeout: 3000 });
          ipv6 = v6Res.data.ip;
        } catch (e) {
          console.warn('IPv6 reliable detection failed or not available');
          ipv6 = initialIp.includes(':') ? initialIp : '';
        }

        // 3. Get Geolocation info using our own proxy to avoid CORS/adblockers and rate-limits
        const geoIp = ipv4 || initialIp || '1.1.1.1'; // fallback IP if everything fails
        let geoData = {};
        try {
           const geoResponse = await axios.get(`/api/inspect-ip/${geoIp}`);
           // map the fields to match the previous ipapi.co format to avoid breaking the UI
           const data = geoResponse.data;
           if (data.status === 'success') {
              geoData = {
                 country_name: data.country,
                 region: data.regionName,
                 city: data.city,
                 org: data.org || data.isp,
                 asn: data.as,
                 latitude: data.lat,
                 longitude: data.lon,
                 timezone: data.timezone
              };
           }
        } catch (e) {
           console.warn('Geolocation failed', e);
        }

        // 4. Detect DNS Resolver
        let dnsResolver = 'Detectando...';
        try {
          const dnsRes = await axios.get('https://edns.ip-api.com/json/', { timeout: 4000 });
          if (dnsRes.data && dnsRes.data.dns) {
            dnsResolver = `${dnsRes.data.dns.geo} (${dnsRes.data.dns.ip})`;
          }
        } catch (e) {
          dnsResolver = 'Padrão (Servidor DNS Local)';
        }

        setIpData({
          ip: geoIp,
          ipv6: ipv6,
          dns_resolver: dnsResolver,
          ...geoData
        });

        // 4. System Info (Client Side)
        const parser = new UAParser();
        const browser = parser.getBrowser();
        const os = parser.getOS();
        
        // deviceMemory is unofficial but supported in Chrome/Edge
        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Não detectado';

        setSystemData({
          os: `${os.name} ${os.version || ''}`,
          browser: `${browser.name} ${browser.version}`,
          ram,
          hostname: initialHostname,
          cores: navigator.hardwareConcurrency || 0,
          language: navigator.language || 'pt-BR',
          resolution: `${window.screen.width}x${window.screen.height}`,
          platform: (navigator as any).platform || 'Desconhecido',
        });

      } catch (err) {
        console.error(err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { ipData, systemData, loading, error };
}
