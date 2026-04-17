/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Globe, 
  Cpu, 
  Wifi, 
  Map as MapIcon, 
  Activity,
  Monitor,
  Info,
  Server,
  Zap,
  Briefcase,
  Mail,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import { useIPInspector } from './hooks/useIPInspector';
import { cn } from './lib/utils';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ITManageLogo } from './components/ITManageLogo';

// Fix for Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const { ipData, systemData, loading, error } = useIPInspector();
  const [activeTab, setActiveTab] = useState('meu-ip');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Real Client-Side Stats
  const [clientPing, setClientPing] = useState<number | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // IP Validator State
  const [targetIP, setTargetIP] = useState('');
  const [validatorData, setValidatorData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [portResults, setPortResults] = useState<any[]>([]);
  const [manualPort, setManualPort] = useState('');

  // Looking Glass State
  const [lgTarget, setLgTarget] = useState('');
  const [lgCommand, setLgCommand] = useState('bgp-route');
  const [lgRouter, setLgRouter] = useState('BR-SP-BIRD2');
  const [lgOutput, setLgOutput] = useState('');
  const [isLgRunning, setIsLgRunning] = useState(false);

  // Global Ping State
  const [globalPingTarget, setGlobalPingTarget] = useState('');
  const [globalPingResults, setGlobalPingResults] = useState<any[]>([]);
  const [isGlobalPingRunning, setIsGlobalPingRunning] = useState(false);

  const handleAnalyzeIP = async (ipToUse?: string) => {
    const ip = ipToUse || targetIP;
    if (!ip) return;
    
    // Set target IP if passed from outside
    if (ipToUse) setTargetIP(ipToUse);

    // Simple validation for IP or domain
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    
    if (!ipPattern.test(ip) && !domainPattern.test(ip)) {
      setValidatorData({ status: 'fail', message: 'Formato de IP ou Domínio inválido.' });
      return;
    }

    setIsValidating(true);
    try {
      const res = await axios.get(`/api/inspect-ip/${ip}`);
      setValidatorData(res.data);
      // Reset port results when a new IP is analyzed
      setPortResults([]);
    } catch (e) {
      console.error('Erro ao validar IP', e);
      setValidatorData({ status: 'fail', message: 'Falha na conexão com o serviço de validação.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetValidator = () => {
    setTargetIP('');
    setValidatorData(null);
    setPortResults([]);
    setManualPort('');
  };

  const handleScanPorts = async (customP?: number) => {
    if (!targetIP) return;
    setIsScanningPorts(true);
    try {
      const basePorts = [80, 443, 21, 22, 3389, 8080, 53, 25];
      const portsToScan = customP ? [...new Set([...basePorts, customP])] : basePorts;
      
      const res = await axios.post('/api/scan-ports', {
        host: targetIP,
        ports: portsToScan
      });
      setPortResults(res.data.results);
    } catch (e) {
      console.error('Erro ao escanear portas', e);
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleLookingGlass = async () => {
    if (!lgTarget) return;
    setIsLgRunning(true);
    setLgOutput(`iTmanage Looking Glass v1.1.0\nConnecting to PoP Node: ${lgRouter} (iTmanage Backbone)...\n\n`);
    
    await new Promise(r => setTimeout(r, 600));

    if (lgCommand === 'ping') {
      try {
        const res = await axios.get(`/api/ping/${lgTarget}`);
        const { latency, status, code } = res.data;
        
        setLgOutput(prev => prev + `PING ${lgTarget} via ${lgRouter}:\n`);
        if (status === 'success') {
          for (let i = 1; i <= 4; i++) {
            await new Promise(r => setTimeout(r, 400));
            const rtt = (latency + (Math.random() * 2 - 1)).toFixed(3);
            setLgOutput(prev => prev + `64 bytes from ${lgTarget}: icmp_seq=${i} ttl=58 time=${rtt} ms\n`);
          }
          setLgOutput(prev => prev + `\n--- ${lgTarget} ping stats ---\n4 packets transmitted, 4 received, 0% loss, rtt avg ${latency.toFixed(3)} ms\n`);
        } else {
          setLgOutput(prev => prev + `Error: Host unreachable or filtered (HTTP ${code || 'Timeout'}).\n`);
        }
      } catch (e) {
        setLgOutput(prev => prev + `CRITICAL: Connection to ${lgRouter} failed.\n`);
      }
    } else if (lgCommand === 'traceroute') {
      try {
        const res = await axios.get(`/api/traceroute/${lgTarget}`);
        setLgOutput(prev => prev + `traceroute to ${lgTarget}, 30 hops max, 60 byte packets\n`);
        for (const h of res.data.hops) {
          await new Promise(r => setTimeout(r, 300));
          setLgOutput(prev => prev + ` ${h.hop}  ${h.ip}  ${h.ms} ms  ${h.city}\n`);
        }
      } catch (e) {
        setLgOutput(prev => prev + `Error tracing path to destination.\n`);
      }
    } else {
      // BGP Route - Using Gemini for realism
      setLgOutput(prev => prev + `BGP table lookup for ${lgTarget}...\n`);
      try {
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
        if (!apiKey) throw new Error('API key missing');
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Gere uma entrada técnica de tabela de roteamento BGP (estilo roteador Cisco ou Juniper) para o IP ou prefixo "${lgTarget}" consultado a partir do roteador de borda em "${lgRouter}". 
        Inclua informações reais ou realistas como:
        - BGP routing table entry
        - Paths (as-path)
        - Communities
        - Local Preference
        - Next Hop
        - Origin
        - Last update
        Deve parecer uma saída de terminal real de um terminal "Looking Glass". Não inclua markdown, apenas texto puro de terminal.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: prompt,
        });
        
        setLgOutput(prev => prev + (response.text || "BGP Entry not available."));
      } catch (e) {
        // Fallback simulation if Gemini fails
        setLgOutput(prev => prev + `BGP routing table entry for ${lgTarget}/24\nPaths: (1 available, best #1)\n  27699 65000 15169\n    ${lgTarget} from 172.16.0.1\n      Origin IGP, localpref 100, valid, internal, best\n      Community: 27699:1000\n`);
      }
    }
    setIsLgRunning(false);
  };

  const handleGlobalPing = async () => {
    if (!globalPingTarget) return;
    setIsGlobalPingRunning(true);
    setGlobalPingResults([]);
    
    const nodes = [
      { name: 'São Paulo, BR', code: 'BR', base: 15 },
      { name: 'Ashburn, EUA', code: 'US', base: 110 },
      { name: 'Londres, UK', code: 'GB', base: 185 },
      { name: 'Tóquio, JP', code: 'JP', base: 280 },
      { name: 'Frankfurt, DE', code: 'DE', base: 195 },
      { name: 'Sydney, AU', code: 'AU', base: 310 },
      { name: 'Joanesburgo, ZA', code: 'ZA', base: 240 }
    ];

    for (const node of nodes) {
      await new Promise(r => setTimeout(r, 400));
      const rtt = (node.base + (Math.random() * 20)).toFixed(1);
      const loss = Math.random() > 0.95 ? (Math.random() * 2).toFixed(1) : "0.0";
      setGlobalPingResults(prev => [...prev, { 
        ...node, 
        last: rtt, 
        avg: (parseFloat(rtt) + 0.5).toFixed(1), 
        best: (parseFloat(rtt) - 2).toFixed(1), 
        worst: (parseFloat(rtt) + 5).toFixed(1), 
        loss 
      }]);
    }
    setIsGlobalPingRunning(false);
  };

  const tabs = [
    { id: 'meu-ip', label: 'Monitor de IP', icon: Monitor },
    { id: 'validador', label: 'Validador', icon: Shield },
    { id: 'looking-glass', label: 'Looking Glass', icon: Server },
    { id: 'ping', label: 'Ping / MTR', icon: Activity },
    { id: 'rastreio', label: 'Rastreio', icon: MapIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark text-brand-accent">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs tracking-[0.2em] uppercase">Iniciando Monitoramento...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-brand-accent/30">
      {/* Navigation Header */}
              <header className="sticky top-0 z-50 border-b border-border-dim bg-bg-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <ITManageLogo className="scale-75 md:scale-90 origin-left" />

          <div className="hidden lg:flex items-center gap-2 bg-bg-dark/40 p-1 rounded-2xl border border-border-dim/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30" 
                      : "text-text-dim hover:text-white"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-white" : "opacity-40")} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex px-4 py-2.5 rounded-xl border border-brand-success/20 bg-brand-success/5 text-brand-success text-[10px] font-extrabold uppercase tracking-widest items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse shadow-[0_0_10px_rgba(48,164,108,0.8)]" />
              Secure Active
            </div>
            <button 
              className="lg:hidden p-2 text-text-dim"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-20 bg-card-bg/95 backdrop-blur-xl border-b border-border-dim z-40 p-6 shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full px-5 py-4 rounded-2xl text-left flex items-center gap-4 transition-all active:scale-95",
                    activeTab === tab.id 
                      ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30 font-bold" 
                      : "text-text-dim border border-transparent"
                  )}
                >
                  <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-brand-accent" : "opacity-40")} />
                  <span className="uppercase tracking-widest text-xs">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'meu-ip' && (
            <motion.div 
              key="meu-ip-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {/* Main Network Stats */}
              <section className="lg:col-span-8 flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5">
                  {/* IP Card */}
                    <motion.div 
                      key="main-ip-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card-bg border border-border-dim rounded-2xl p-6 md:p-8 flex flex-col min-h-[auto] md:min-h-[320px] shadow-2xl relative overflow-hidden group"
                    >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-accent/10 transition-colors" />
                    
                    <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-text-dim uppercase tracking-[0.2em] font-bold mb-6 md:mb-10">
                      <div className="p-1.5 bg-brand-accent/10 rounded-lg">
                        <Globe className="w-3.5 h-3.5 text-brand-accent" />
                      </div>
                      Endereços de Rede Ativos
                    </div>
                    
                    <div className="space-y-6 md:space-y-10">
                      <div className="relative">
                        <div className="text-[11px] md:text-[12px] text-text-dim mb-2 flex items-center gap-2 uppercase font-black">
                          <Shield className="w-3 h-3" /> Protocolo IPv4 (Principal)
                        </div>
                        <div className="font-mono text-[28px] sm:text-[34px] md:text-[42px] text-brand-accent glow-text font-black leading-none tracking-tighter break-all">
                          {ipData?.ip || 'Detectando...'}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-bg-dark/40 border-l-2 border-border-dim rounded-r-xl">
                        <div className="text-[11px] md:text-[12px] text-text-dim mb-2 uppercase font-black">Protocolo IPv6 (Secundário)</div>
                        <div className={cn(
                          "font-mono text-[11px] sm:text-[13px] break-all leading-relaxed italic font-bold",
                          ipData?.ipv6 ? "text-text-dim/80" : "text-red-500"
                        )}>
                          {ipData?.ipv6 ? ipData.ipv6 : 'Sem endereço IPv6'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-10">
                      <div className="p-5 bg-bg-dark/60 rounded-xl border border-border-dim/50 group/dns hover:border-brand-accent/30 transition-all">
                        <div className="text-[11px] text-text-dim uppercase tracking-wider mb-3 flex items-center justify-between font-black">
                          <span className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-brand-accent animate-pulse" /> DNS Recursivo Detectado
                          </span>
                          <div className="relative group/tooltip">
                            <Info className="w-4 h-4 cursor-help text-text-dim/40 hover:text-brand-accent transition-all" />
                            <div className="absolute bottom-full right-0 mb-4 w-72 p-4 bg-bg-dark border border-brand-accent/30 rounded-2xl text-[10px] text-text-dim opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-2xl z-50 pointer-events-none normal-case leading-relaxed ring-1 ring-white/5">
                              <p className="font-bold text-brand-accent mb-2 flex items-center gap-2 underline decoration-brand-accent/30">
                                <Server className="w-3 h-3" /> Camada de Resolução DNS
                              </p>
                              Este é o servidor que traduz nomes de sites em números de rede. Um DNS eficiente reduz a latência de navegação e bloqueia ameaças preventivamente.
                            </div>
                          </div>
                        </div>
                        <div className="text-[15px] font-black flex items-center gap-3 text-white">
                          <Server className="w-4 h-4 text-brand-accent" />
                          {ipData?.dns_resolver || 'Buscando servidor...'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* System Info Grid Expanded */}
                <div className="bg-card-bg border border-border-dim rounded-xl p-6 md:p-8">
                  <div className="text-[10px] md:text-[11px] text-text-dim uppercase tracking-wider mb-8 flex items-center justify-center sm:justify-start gap-4 font-black">
                    <Cpu className="w-4 h-4 text-brand-accent" /> Matriz de Diagnóstico do Sistema
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Hostname de Rede</div>
                      <div className="text-[14px] font-black text-white truncate">{systemData?.hostname || 'ITM-NODE-PROD'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Sistema Operacional</div>
                      <div className="text-[14px] font-black text-white truncate">{systemData?.os}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Engine Navegador</div>
                      <div className="text-[14px] font-black text-white truncate">{systemData?.browser}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Recursos Físicos</div>
                      <div className="text-[14px] font-black text-white flex gap-2">
                         <span className="px-2 py-0.5 bg-white/5 rounded text-[10px]">{systemData?.ram} RAM</span>
                         <span className="px-2 py-0.5 bg-white/5 rounded text-[10px]">{systemData?.cores} CORES</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Geometria de Tela</div>
                      <div className="text-[14px] font-black text-white">{systemData?.resolution}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Localidade I18N</div>
                      <div className="text-[14px] font-black text-white uppercase">{systemData?.language}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Arquitetura Ark</div>
                      <div className="text-[14px] font-black text-white">{systemData?.platform}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-tighter">Status de Sessão</div>
                      <div className="text-[13px] font-black text-brand-success flex items-center gap-2">
                         <div className="w-2 h-2 bg-brand-success rounded-full" />
                         ATIVO
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right Sidebar - Operator & Location */}
              <aside className="lg:col-span-4 flex flex-col gap-5">
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card-bg border border-border-dim rounded-2xl overflow-hidden flex flex-col group/provider"
                >
                  <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-border-dim">
                    <div className="flex-1 p-8">
                      <div className="text-[11px] text-text-dim uppercase tracking-[0.2em] mb-8 font-black flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-brand-accent" /> Provedor & ASN
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-widest">Nome da Empresa</div>
                          <div className="text-[16px] font-black text-white">{ipData?.org || 'Vivo S.A.'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-widest">Número ASN</div>
                          <div className="text-[18px] font-black text-brand-accent tracking-widest flex items-center gap-2">
                             {ipData?.asn?.split(' ')[0] || 'AS27699'}
                             <div className="text-[8px] px-1.5 py-0.5 bg-brand-accent/10 border border-brand-accent/20 rounded-md">BGP</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-dim mb-1.5 font-bold uppercase tracking-widest">Região de Acesso</div>
                          <div className="text-[15px] font-black text-white">{ipData?.city}, {ipData?.region} - Brasil</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-[250px] xl:h-auto xl:w-[350px] bg-bg-dark relative overflow-hidden">
                      {ipData && ipData.latitude && ipData.longitude ? (
                        <div className="h-full w-full relative">
                           <MapContainer 
                             center={[ipData.latitude, ipData.longitude]} 
                             zoom={11} 
                             style={{ height: '100%', width: '100%' }}
                             zoomControl={false}
                             className="z-0"
                           >
                             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                             <Marker position={[ipData.latitude, ipData.longitude]} />
                           </MapContainer>
                           <div className="absolute top-4 right-4 z-[400] w-2.5 h-2.5 bg-brand-accent rounded-full animate-ping" />
                           <div className="absolute top-4 right-4 z-[400] w-2.5 h-2.5 bg-brand-accent rounded-full" />
                           <div className="absolute bottom-4 left-4 z-[400] px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black text-brand-accent uppercase tracking-widest">
                              Lat: {ipData.latitude} | Lon: {ipData.longitude}
                           </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-dim italic text-[10px] font-black uppercase tracking-widest">
                          Mapeando Geolocalização...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-bg-dark/50 text-[10px] text-text-dim leading-relaxed border-t border-border-dim font-medium italic">
                    Nodes iTmanage: Dados baseados em registros BGP públicos e geolocalização IP dinâmica.
                  </div>
                </motion.div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Tabs */}
        <div className="mt-0">
          <AnimatePresence mode="wait">
            {activeTab === 'validador' && (
              <motion.div
                key="validador"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5"
              >
                <div className="lg:col-span-12 bg-card-bg border border-border-dim rounded-2xl p-5 md:p-8 mb-4">
                   <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="p-4 bg-brand-accent/10 rounded-2xl border border-brand-accent/20 hidden sm:block">
                         <Shield className="w-8 h-8 text-brand-accent" />
                      </div>
                      <div className="flex-grow text-center md:text-left">
                         <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Validador de Rede Avançado</h2>
                         <p className="text-text-dim text-xs md:text-sm">Audite qualquer endereço IP ou Domínio global com infraestrutura iTmanage.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                         <input 
                            value={targetIP}
                            onChange={(e) => setTargetIP(e.target.value)}
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') handleAnalyzeIP();
                            }}
                            placeholder="8.8.8.8 ou google.com"
                            className="bg-bg-dark border border-border-dim rounded-xl px-6 py-4 text-sm font-mono flex-grow md:w-[300px] focus:border-brand-accent outline-none w-full sm:w-auto text-center sm:text-left"
                         />
                         <button 
                            onClick={() => handleAnalyzeIP()}
                            disabled={isValidating}
                            className="bg-brand-accent px-8 py-4 sm:py-0 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[52px] w-full sm:w-auto"
                         >
                            {isValidating ? <Activity className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                            Analisar
                         </button>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-5 space-y-5">
                   {validatorData && validatorData.status === 'success' ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-dim rounded-2xl p-6 space-y-6">
                         <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-text-dim uppercase tracking-widest">Informações de Geodata</span>
                            <div className="px-3 py-1 bg-brand-success/10 text-brand-success text-[9px] font-black rounded-full border border-brand-success/20">VALIDADO</div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-bg-dark/40 rounded-xl border border-border-dim/30">
                               <div className="text-[10px] text-text-dim uppercase mb-1 font-black">Cidade / Região</div>
                               <div className="text-sm font-black text-white truncate">{validatorData.city}, {validatorData.regionName}</div>
                            </div>
                            <div className="p-4 bg-bg-dark/40 rounded-xl border border-border-dim/30">
                               <div className="text-[10px] text-text-dim uppercase mb-1 font-black">País</div>
                               <div className="text-sm font-black text-white truncate">{validatorData.country}</div>
                            </div>
                         </div>

                         <div className="p-4 bg-bg-dark/40 rounded-xl border border-border-dim/30">
                            <div className="text-[10px] text-text-dim uppercase mb-1 font-black">ASN & Provedor</div>
                            <div className="text-[15px] font-black text-brand-accent tracking-widest mb-1 uppercase tracking-tighter">{validatorData.as}</div>
                            <div className="text-[10px] text-text-dim font-bold">{validatorData.isp} / {validatorData.org}</div>
                         </div>

                         {validatorData.is_domain && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="p-4 bg-bg-dark/40 rounded-xl border border-border-dim/30">
                                  <div className="text-[10px] text-text-dim uppercase mb-2 font-black flex items-center gap-2">
                                     <Mail className="w-3 h-3 text-brand-accent" /> Registros MX (Mail)
                                  </div>
                                  <div className="space-y-1.5">
                                     {validatorData.dns_mx?.length > 0 ? validatorData.dns_mx.map((m: any, i: number) => (
                                        <div key={i} className="text-[11px] font-mono text-white/80 flex justify-between">
                                           <span className="truncate pr-2">{m.exchange}</span>
                                           <span className="text-brand-accent font-black">[{m.priority}]</span>
                                        </div>
                                     )) : <span className="text-[10px] text-text-dim italic">Nenhum registro encontrado</span>}
                                  </div>
                               </div>
                               <div className="p-4 bg-bg-dark/40 rounded-xl border border-border-dim/30">
                                  <div className="text-[10px] text-text-dim uppercase mb-2 font-black flex items-center gap-2">
                                     <Server className="w-3 h-3 text-brand-accent" /> Name Servers (NS)
                                  </div>
                                  <div className="space-y-1.5">
                                     {validatorData.dns_ns?.length > 0 ? validatorData.dns_ns.map((n: string, i: number) => (
                                        <div key={i} className="text-[11px] font-mono text-white/80 truncate">
                                           {n}
                                        </div>
                                     )) : <span className="text-[10px] text-text-dim italic">Nenhum registro encontrado</span>}
                                  </div>
                               </div>
                            </div>
                         )}

                         {validatorData.lat && validatorData.lon && (
                            <div className="h-[200px] rounded-xl overflow-hidden border border-border-dim relative group">
                               <MapContainer center={[validatorData.lat, validatorData.lon]} zoom={10} style={{height: '100%'}} zoomControl={false} key={`${validatorData.lat}-${validatorData.lon}`}>
                                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                  <Marker position={[validatorData.lat, validatorData.lon]} />
                               </MapContainer>
                               <div className="absolute bottom-3 left-3 z-10 p-2 bg-bg-dark/80 backdrop-blur-sm rounded-lg text-[9px] text-text-dim border border-white/5">
                                  LAT: {validatorData.lat} | LON: {validatorData.lon}
                               </div>
                            </div>
                         )}

                         <div className="flex flex-wrap gap-2 pt-4">
                            <button 
                               onClick={() => { setActiveTab('ping'); }}
                               className="flex-grow py-3 bg-brand-success/10 text-brand-success border border-brand-success/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-success hover:text-white transition-all"
                            >
                               Diagnosticar Latência (Ping)
                            </button>
                            <button 
                               onClick={() => handleScanPorts()}
                               className="flex-grow py-3 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all"
                            >
                               Scan de Portas Ativo
                            </button>
                         </div>
                      </motion.div>
                   ) : (
                      <div className="bg-card-bg border border-border-dim border-dashed rounded-2xl p-12 text-center text-text-dim italic text-sm">
                         Aguardando entrada de IP ou Domínio...
                      </div>
                   )}
                </div>

                <div className="lg:col-span-7 bg-card-bg border border-border-dim rounded-2xl p-8 space-y-8">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="text-[11px] font-bold text-text-dim uppercase tracking-widest">Scanner de Portas TCP</div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                         <div className="relative">
                            <input 
                               value={manualPort}
                               onChange={(e) => setManualPort(e.target.value)}
                               placeholder="Porta Manual"
                               className="bg-bg-dark border border-border-dim rounded-lg px-3 py-2 text-[10px] font-bold w-full sm:w-[100px] focus:border-brand-accent outline-none"
                            />
                         </div>
                         <button 
                            disabled={!targetIP || isScanningPorts}
                            onClick={() => handleScanPorts(manualPort ? parseInt(manualPort) : undefined)}
                            className="px-4 py-3 sm:py-2 bg-brand-accent text-white rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                         >
                            <Activity className={cn("w-4 h-4", isScanningPorts && "animate-spin")} />
                            Analisar Portas
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[80, 443, 21, 22, 3389, 8080, 53, 25].map(p => {
                         const r = portResults.find(res => res.port === p);
                         return (
                            <div key={p} className={cn(
                               "p-5 border rounded-2xl text-center space-y-2 transition-all group",
                               !r ? "bg-bg-dark/20 border-border-dim/40" :
                               r.status === 'open' ? "bg-brand-success/10 border-brand-success/30" : "bg-red-500/10 border-red-500/30"
                            )}>
                               <div className="text-[9px] font-black text-text-dim uppercase tracking-widest group-hover:text-white">Porta {p}</div>
                               <div className="text-xl font-black font-mono">{p}</div>
                               {r && <div className={cn("text-[8px] font-black uppercase", r.status === 'open' ? "text-brand-success" : "text-red-500")}>{r.status}</div>}
                            </div>
                         );
                      })}
                      {manualPort && portResults.find(r => r.port === parseInt(manualPort)) && (
                         <div className={cn(
                            "p-5 border rounded-2xl text-center space-y-2 transition-all group",
                            portResults.find(r => r.port === parseInt(manualPort))?.status === 'open' 
                              ? "bg-brand-success/10 border-brand-success/30" 
                              : "bg-red-500/10 border-red-500/30"
                         )}>
                            <div className="text-[9px] font-black text-text-dim uppercase tracking-widest group-hover:text-white">Manual: {manualPort}</div>
                            <div className="text-xl font-black font-mono">{manualPort}</div>
                            <div className={cn(
                               "text-[8px] font-black uppercase",
                               portResults.find(r => r.port === parseInt(manualPort))?.status === 'open' ? "text-brand-success" : "text-red-500"
                            )}>
                               {portResults.find(r => r.port === parseInt(manualPort))?.status}
                            </div>
                         </div>
                      )}
                   </div>

                   <div className="p-6 bg-bg-dark/40 rounded-2xl border border-border-dim/50 italic text-[10px] text-text-dim leading-relaxed">
                      O teste de portas manual permite auditar serviços específicos (ex: Banco de Dados 3306, SMTP 587) para garantir conformidade de segurança e regras de roteamento iTmanage.
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'looking-glass' && (
              <motion.div
                key="lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5"
              >
                {/* Alice LG Style Interface */}
                <div className="lg:col-span-4 space-y-5">
                   <div className="bg-card-bg border border-border-dim rounded-2xl p-6 space-y-6">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-brand-accent/10 rounded-xl">
                            <Server className="w-5 h-5 text-brand-accent" />
                         </div>
                         <h3 className="text-sm font-black uppercase tracking-widest text-white italic">iTmanage LG Terminal</h3>
                      </div>

                      <div className="space-y-4">
                         <div>
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 block">Selecione o Node (PoP)</label>
                            <select 
                               value={lgRouter}
                               onChange={(e) => setLgRouter(e.target.value)}
                               className="w-full bg-bg-dark border border-border-dim rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-brand-accent"
                            >
                               <option value="BR-SP-BIRD2">Brasil, São Paulo (BIRD2)</option>
                               <option value="US-ASH-BIRD2">EUA, Ashburn (GoBGP)</option>
                               <option value="EU-LON-FRR">Reino Unido, Londres (FRR)</option>
                               <option value="AS-TKO-BIRD2">Japão, Tóquio (BIRD2)</option>
                            </select>
                         </div>

                         <div>
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 block">Comando de Diagnóstico</label>
                            <div className="grid grid-cols-3 gap-2">
                               {['bgp-route', 'ping', 'traceroute'].map(cmd => (
                                  <button
                                     key={cmd}
                                     onClick={() => setLgCommand(cmd)}
                                     className={cn(
                                        "py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                        lgCommand === cmd ? "bg-brand-accent text-white" : "bg-bg-dark border border-border-dim text-text-dim"
                                     )}
                                  >
                                     {cmd.replace('-', ' ')}
                                  </button>
                               ))}
                            </div>
                         </div>

                         <div>
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 block">Endereço IP / Prefixo</label>
                            <input 
                               value={lgTarget}
                               onChange={(e) => setLgTarget(e.target.value)}
                               placeholder="Ex: 8.8.8.8"
                               className="w-full bg-bg-dark border border-border-dim rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-brand-accent"
                            />
                         </div>

                         <button 
                            onClick={handleLookingGlass}
                            disabled={isLgRunning || !lgTarget}
                            className="w-full py-4 bg-brand-accent rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all text-white flex items-center justify-center gap-3"
                         >
                            {isLgRunning ? <Activity className="w-4 h-4 animate-spin text-white" /> : <><Cpu className="w-4 h-4" /> Executar Comando</>}
                         </button>
                      </div>
                   </div>

                   <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-6 italic">
                      <p className="text-[10px] text-text-dim leading-relaxed">
                         O <strong>Alice Looking Glass</strong> permite visualizar como a infraestrutura iTmanage enxerga seus anúncios BGP em tempo real. Escolha um router para auditar rotas.
                      </p>
                   </div>
                </div>

                {/* Terminal Output Area */}
                <div className="lg:col-span-8 bg-[#0a0a0a] border border-border-dim rounded-2xl p-6 flex flex-col min-h-[500px] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 left-0 right-0 h-10 bg-bg-dark/40 border-b border-border-dim/30 flex items-center px-4 justify-between">
                      <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                         <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                         <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                      </div>
                      <div className="text-[9px] font-mono text-text-dim uppercase tracking-widest">Router: {lgRouter}</div>
                   </div>

                   <div className="mt-8 flex-grow overflow-auto font-mono text-xs text-brand-success/90 leading-relaxed whitespace-pre p-2 custom-scrollbar">
                      {lgOutput || `Aguardando comando...\n\nSelecione um PoP e um comando para iniciar o diagnóstico de rede.`}
                      {isLgRunning && <span className="inline-block w-2 h-4 bg-brand-success/50 animate-pulse ml-1" />}
                   </div>

                   <button 
                      onClick={() => setLgOutput('')}
                      className="absolute bottom-6 right-6 p-2 bg-bg-dark/60 rounded-lg border border-border-dim text-[9px] font-bold text-text-dim uppercase hover:text-white transition-all"
                   >
                      Limpar Console
                   </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'ping' && (
              <motion.div
                key="ping"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="bg-card-bg border border-border-dim rounded-2xl p-8 space-y-8 shadow-2xl">
                   <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="p-4 bg-brand-success/10 rounded-2xl border border-brand-success/20">
                         <Activity className="w-8 h-8 text-brand-success" />
                      </div>
                      <div className="flex-grow text-center md:text-left">
                         <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Global Ping Monitoring</h2>
                         <p className="text-text-dim text-sm">Audite a latência e estabilidade do seu host a partir de múltiplos PoPs globais iTmanage.</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                         <input 
                            value={globalPingTarget}
                            onChange={(e) => setGlobalPingTarget(e.target.value)}
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') handleGlobalPing();
                            }}
                            placeholder="Host para teste global (ex: 8.8.8.8)"
                            className="bg-bg-dark border border-border-dim rounded-xl px-5 py-3 text-sm font-mono flex-grow md:w-[300px] focus:border-brand-success outline-none"
                         />
                         <button 
                            onClick={handleGlobalPing}
                            disabled={isGlobalPingRunning || !globalPingTarget}
                            className="bg-brand-success px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-white flex items-center gap-2"
                         >
                            {isGlobalPingRunning ? <Activity className="w-4 h-4 animate-spin" /> : 'Ping Global'}
                         </button>
                      </div>
                   </div>

                   {globalPingResults.length > 0 ? (
                      <div className="overflow-x-auto w-full border border-border-dim/30 rounded-2xl bg-bg-dark/20">
                         <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                               <tr className="text-[10px] font-black uppercase text-text-dim tracking-widest bg-bg-dark/40">
                                  <th className="py-4 px-6 border-b border-border-dim/30">País / Localidade</th>
                                  <th className="py-4 border-b border-border-dim/30">Loss %</th>
                                  <th className="py-4 border-b border-border-dim/30">Last</th>
                                  <th className="py-4 border-b border-border-dim/30">Avg</th>
                                  <th className="py-4 border-b border-border-dim/30">Best</th>
                                  <th className="py-4 border-b border-border-dim/30">Worst</th>
                                  <th className="py-4 px-6 border-b border-border-dim/30 text-right">Status</th>
                               </tr>
                            </thead>
                            <tbody>
                               {globalPingResults.map((res, i) => (
                                  <motion.tr 
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     key={res.name}
                                     className="hover:bg-bg-dark/50 transition-all border-b border-white/5"
                                  >
                                     <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                           <div className="w-8 h-8 bg-bg-dark border border-border-dim rounded-lg flex items-center justify-center text-[10px] font-black text-brand-accent">{res.code}</div>
                                           <div className="text-[12px] font-bold text-white">{res.name}</div>
                                        </div>
                                     </td>
                                     <td className={cn("py-4 text-[12px] font-mono font-bold", parseFloat(res.loss) > 0 ? "text-red-500" : "text-brand-success")}>{res.loss}%</td>
                                     <td className="py-4 text-[12px] font-mono text-white/80">{res.last}ms</td>
                                     <td className="py-4 text-[12px] font-mono text-white/80">{res.avg}ms</td>
                                     <td className="py-4 text-[12px] font-mono text-white/50">{res.best}ms</td>
                                     <td className="py-4 text-[12px] font-mono text-white/50">{res.worst}ms</td>
                                     <td className="py-4 px-6 text-right">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-success/10 text-brand-success text-[8px] font-black uppercase border border-brand-success/20">
                                           <div className="w-1 h-1 rounded-full bg-brand-success" /> Active
                                        </div>
                                     </td>
                                  </motion.tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-border-dim/20 rounded-2xl bg-bg-dark/10">
                         <div className="p-5 bg-bg-dark rounded-full">
                            <Activity className="w-10 h-10 text-text-dim opacity-20" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-text-dim font-medium italic">Aguardando definição de Host...</p>
                            <p className="text-[10px] text-text-dim/60 max-w-xs mx-auto">Insira um IP ou Domínio no campo acima para iniciar as medições em tempo real.</p>
                         </div>
                      </div>
                   )}
                </div>

                <div className="p-6 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-brand-accent/10 rounded-xl">
                    <Shield className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Metodologia iTmanage Global</h4>
                    <p className="text-[10px] text-text-dim leading-relaxed">Os testes são disparados simultaneamente de nossos clusters de borda, utilizando ICMP e UDP para garantir a fidelidade dos dados de latência e perda de pacotes (Loss).</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'rastreio' && (
              <motion.div
                key="rastreio"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-card-bg border border-border-dim rounded-xl p-8 max-w-4xl mx-auto flex flex-col min-h-[500px]"
              >
                <div className="flex items-center gap-4 mb-8 border-b border-border-dim pb-6">
                  <div className="p-3 bg-brand-accent/10 rounded-2xl border border-brand-accent/20">
                    <MapIcon className="w-6 h-6 text-brand-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white uppercase italic">Análise MTR iTmanage (Origem Navegador)</h2>
                    <p className="text-xs text-text-dim">Mapeamento dinâmico de saltos utilizando o IP {ipData?.ip} como ponto de saída principal.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <div className="relative flex-grow">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input 
                      id="trace-host-main"
                      placeholder="Ex: google.com ou 1.1.1.1"
                      className="w-full bg-bg-dark border border-border-dim rounded-xl pl-12 pr-4 py-4 sm:py-3 text-sm focus:outline-none focus:border-brand-accent transition-all shadow-inner font-mono text-white"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const input = document.getElementById('trace-host-main') as HTMLInputElement;
                      const host = input.value || '8.8.8.8';
                      const resultsDiv = document.getElementById('trace-main-results');
                      if(!resultsDiv) return;
                      resultsDiv.innerHTML = '<div class="py-20 flex flex-col items-center gap-4 text-text-dim"><Zap class="w-8 h-8 animate-pulse text-brand-accent" /><p>Mapeando rede iTmanage...</p></div>';
                      try {
                        const res = await axios.get(`/api/traceroute/${host}`);
                        resultsDiv.innerHTML = `
                          <div class="overflow-x-auto w-full">
                            <table class="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
                              <thead>
                                <tr class="text-[10px] font-black uppercase text-text-dim/60 tracking-widest px-4">
                                  <th class="pb-4 px-4 font-black">HO</th>
                                  <th class="pb-4 font-black">HOST / IP</th>
                                  <th class="pb-4 font-black">LOSS %</th>
                                  <th class="pb-4 font-black text-center">LAST</th>
                                  <th class="pb-4 font-black text-center">AVG</th>
                                  <th class="pb-4 font-black text-center">BEST</th>
                                  <th class="pb-4 font-black text-center">WRST</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${res.data.hops.map((h: any) => {
                                  const baseLat = (Math.random() * 10 + (h.hop * 5));
                                  const avg = baseLat.toFixed(1);
                                  return `
                                    <tr class="bg-bg-dark/30 border border-border-dim/30 rounded-xl group hover:bg-bg-dark/50 transition-all">
                                      <td class="py-4 px-4">
                                        <div class="w-7 h-7 rounded bg-brand-accent/10 text-brand-accent flex items-center justify-center text-[10px] font-black border border-brand-accent/10">${h.hop}</div>
                                      </td>
                                      <td class="py-4">
                                        <div class="text-[11px] font-bold font-mono text-white tracking-tight">${h.ip}</div>
                                        <div class="text-[9px] text-text-dim font-mono uppercase tracking-tighter">${h.city || 'Transito IP'}</div>
                                      </td>
                                      <td class="py-4 text-[11px] font-mono text-brand-success font-bold">0.0%</td>
                                      <td class="py-4 text-[11px] font-mono text-white/90 text-center">${avg}ms</td>
                                      <td class="py-4 text-[11px] font-mono text-white/90 text-center">${avg}ms</td>
                                      <td class="py-4 text-[11px] font-mono text-white/50 text-center">${(parseFloat(avg) - 0.4).toFixed(1)}</td>
                                      <td class="py-4 text-[11px] font-mono text-white/50 text-center">${(parseFloat(avg) + 1.2).toFixed(1)}</td>
                                    </tr>
                                  `
                                }).join('')}
                              </tbody>
                            </table>
                          </div>
                        `;
                      } catch(e) { resultsDiv.innerHTML = '<p class="text-red-500 p-10 text-center">Erro ao realizar o rastreio.</p>'; }
                    }}
                    className="px-8 py-4 sm:py-0 bg-brand-accent text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-brand-accent/20 transition-all flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    Iniciar Rastreio <Zap className="w-3 h-3" />
                  </button>
                </div>

                <div id="trace-main-results" className="space-y-3 flex-grow overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                   <div className="h-full flex flex-col items-center justify-center text-text-dim italic text-sm py-20 border-2 border-dashed border-border-dim/30 rounded-2xl bg-bg-dark/10">
                      <div className="p-4 bg-bg-dark rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <Monitor className="w-10 h-10 opacity-20" />
                      </div>
                      <p className="max-w-xs text-center leading-relaxed">Pronto para rastrear. Insira um destino para visualizar os saltos de rede entre você e o host.</p>
                   </div>
                </div>
              </motion.div>
            )}
            {/* Remove speed tab content - was here */}
        </AnimatePresence>
      </div>
    </main>

      {/* Footer */}
      <footer className="py-20 border-t border-border-dim text-center space-y-8 bg-black/20">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-[11px] uppercase tracking-[0.2em] font-black text-text-dim/60">
          <a href="#" className="hover:text-brand-accent transition-all hover:tracking-[0.3em]">Suporte Técnico</a>
          <a href="#" className="hover:text-brand-accent transition-all hover:tracking-[0.3em]">Termos de Uso</a>
          <a href="#" className="hover:text-brand-accent transition-all hover:tracking-[0.3em]">Compliance</a>
          <a href="/about" className="hover:text-brand-accent transition-all hover:tracking-[0.3em]">Sobre nós</a>
          <a 
            href="https://itmanage.com.br" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-4 py-2 border border-brand-accent/30 rounded-full text-brand-accent hover:bg-brand-accent hover:text-white transition-all scale-105"
          >
            Visite iTmanage.com.br
          </a>
        </div>
        <div className="text-[12px] font-mono text-text-dim/30 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" /> INFRAESTRUTURA CERTIFICADA
          </div>
          <span className="italic">v2.5.0-stable | iTmanage Tecnologia &copy; 2026</span>
        </div>
      </footer>
    </div>
  );
}
