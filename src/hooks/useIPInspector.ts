import { useState, useEffect } from 'react';
import axios from 'axios';
import { UAParser } from 'ua-parser-js';

export interface IPData {
  ip: string;
  ipv6?: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
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
  hostname: string;
  platform: string;
  ram: string;
  cores: number;
  resolution: string;
  language: string;
}

export function useIPInspector() {
  const [ipData, setIpData] = useState<IPData | null>(null);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      const fetchData = async (initialIp?: string) => {
         setLoading(true);
         setError(null);
         try {
            // 1. Fetch main IPv4
            let ipv4 = '';
            try {
               const ipv4Res = await axios.get('https://api.ipify.org?format=json');
               ipv4 = ipv4Res.data.ip;
            } catch(e) { console.warn('IPv4 fetch failed'); }

            // 2. Fetch IPv6 (optional, often fails if no v6 connectivity)
            let ipv6 = '';
            try {
               const ipv6Res = await axios.get('https://api64.ipify.org?format=json');
               if (ipv6Res.data.ip !== ipv4) ipv6 = ipv6Res.data.ip;
            } catch(e) { /* ignore v6 error */ }

            // 3. Get Geolocation + ASN for the IPv4
            const geoIp = ipv4 || initialIp || '1.1.1.1'; // fallback IP if everything fails
            let geoData = {};
            try {
               const geoResponse = await axios.get(`/api/inspect-ip/${geoIp}`);
               const data = geoResponse.data;
               if (data.status === 'success') {
                  geoData = {
                     country_name: data.country,
                     country_code: data.countryCode,
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

            // 4. DNS Resolver info (simulated via headers/backend)
            let dns = 'DNS Google (8.8.8.8)';
            try {
               const dnsRes = await axios.get('/api/dns-resolver');
               dns = dnsRes.data.resolver;
            } catch(e) { /* ignore */ }

            setIpData({
               ip: ipv4 || initialIp || '0.0.0.0',
               ipv6,
               dns_resolver: dns,
               ...geoData
            });

            // 5. System data
            const parser = new UAParser();
            const os = parser.getOS();
            const browser = parser.getBrowser();
            
            setSystemData({
               os: `${os.name} ${os.version}`,
               browser: `${browser.name} ${browser.version}`,
               hostname: 'ITM-NODE-BRAZIL',
               platform: navigator.platform,
               ram: '16GB',
               cores: navigator.hardwareConcurrency || 8,
               resolution: `${window.screen.width}x${window.screen.height}`,
               language: navigator.language
            });

         } catch (err: any) {
            setError('Falha ao sincronizar dados da rede iTmanage.');
            console.error(err);
         } finally {
            setLoading(false);
         }
      };

      fetchData();
  }, []);

  return { ipData, systemData, loading, error };
}
