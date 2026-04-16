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
        const serverInfo = await axios.get('/api/client-info');
        const initialIp = serverInfo.data.ip;

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

        // 3. Get Geolocation info using the detected IPv4 (or fallback)
        const geoIp = ipv4 || initialIp;
        const geoResponse = await axios.get(`https://ipapi.co/${geoIp}/json/`);
        const geoData = geoResponse.data;

        // 4. Detect DNS Resolver
        let dnsResolver = 'Detectando...';
        try {
          const dnsRes = await axios.get('https://edns.ip-api.com/json/', { timeout: 3000 });
          if (dnsRes.data && dnsRes.data.dns) {
            dnsResolver = `${dnsRes.data.dns.geo} (${dnsRes.data.dns.ip})`;
          }
        } catch (e) {
          dnsResolver = 'Cloudflare / Google (Padrão)';
        }

        setIpData({
          ip: ipv4,
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
          hostname: serverInfo.data.serverHostname || 'Desconhecido', // Real hostname is server-side only
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
