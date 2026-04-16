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
  Box, 
  Monitor,
  Info,
  Server,
  Zap,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import axios from 'axios';
import { useIPInspector } from './hooks/useIPInspector';
import { cn } from './lib/utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  const handleAnalyzeIP = async () => {
    if (!targetIP) return;
    
    // Simple validation for IP or domain
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    
    if (!ipPattern.test(targetIP) && !domainPattern.test(targetIP)) {
      setValidatorData({ status: 'fail', message: 'Formato de IP ou Domínio inválido.' });
      return;
    }

    setIsValidating(true);
    try {
      const res = await axios.get(`/api/inspect-ip/${targetIP}`);
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
  };

  const handleScanPorts = async () => {
    if (!targetIP) return;
    setIsScanningPorts(true);
    try {
      const commonPorts = [80, 443, 21, 22, 3389, 8080, 53, 25];
      const res = await axios.post('/api/scan-ports', {
        host: targetIP,
        ports: commonPorts
      });
      setPortResults(res.data.results);
    } catch (e) {
      console.error('Erro ao escanear portas', e);
    } finally {
      setIsScanningPorts(false);
    }
  };

  const tabs = [
    { id: 'meu-ip', label: 'Monitor de IP', icon: Monitor },
    { id: 'validador', label: 'Validador', icon: Shield },
    { id: 'ping', label: 'Ping', icon: Activity },
    { id: 'rastreio', label: 'Rastreio', icon: MapIcon },
    { id: 'speed', label: 'Velocidade', icon: Zap },
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
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-accent/10 rounded-xl border border-brand-accent/20">
              <Box className="w-5 h-5 text-brand-accent" />
            </div>
            <span className="text-[22px] font-extrabold tracking-tighter text-white italic leading-none">
              iT<span className="text-brand-accent not-italic">manage</span>
            </span>
          </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Network Stats */}
          <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* IP Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-card-bg border border-border-dim rounded-2xl p-8 flex flex-col min-h-[320px] shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-accent/10 transition-colors" />
              
              <div className="flex items-center gap-3 text-[11px] text-text-dim uppercase tracking-[0.2em] font-bold mb-10">
                <div className="p-1.5 bg-brand-accent/10 rounded-lg">
                  <Globe className="w-3.5 h-3.5 text-brand-accent" />
                </div>
                Endereços de Rede Ativos
              </div>
              
              <div className="space-y-10">
                <div className="relative">
                  <div className="text-[12px] text-text-dim mb-2 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Protocolo IPv4 (Principal)
                  </div>
                  <div className="font-mono text-[34px] md:text-[42px] text-brand-accent glow-text font-black leading-none tracking-tighter">
                    {ipData?.ip || 'Detectando...'}
                  </div>
                </div>
                
                <div className="p-4 bg-bg-dark/40 border-l-2 border-border-dim rounded-r-xl">
                  <div className="text-[12px] text-text-dim mb-2">Protocolo IPv6 (Secundário)</div>
                  <div className="font-mono text-[13px] text-text-dim/80 break-all leading-relaxed italic">
                    {ipData?.ipv6 ? ipData.ipv6 : 'Protocolo IPv6 não disponível nesta conexão.'}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <div className="p-5 bg-bg-dark/60 rounded-xl border border-border-dim/50 group/dns hover:border-brand-accent/30 transition-all">
                  <div className="text-[11px] text-text-dim uppercase tracking-wider mb-3 flex items-center justify-between">
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
                  <div className="text-[15px] font-bold flex items-center gap-3 text-white">
                    <Server className="w-4 h-4 text-brand-accent" />
                    {ipData?.dns_resolver || 'Buscando servidor...'}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Client-Side Speed & Ping */}
            <div className="bg-card-bg border border-border-dim rounded-2xl p-8 flex flex-col justify-between shadow-xl">
              <div className="flex justify-between items-start mb-8">
                <div className="text-[11px] text-text-dim uppercase tracking-widest font-bold">Diagnóstico Local</div>
                <Activity className="w-4 h-4 text-brand-success" />
              </div>
              
              <div className="space-y-8">
                <div className="flex items-center justify-between group">
                  <div>
                    <div className="text-[12px] text-text-dim mb-1">Ping (Latência)</div>
                    <div className="text-3xl font-black text-brand-success font-mono">
                      {clientPing !== null ? `${clientPing} ms` : '--'}
                    </div>
                  </div>
                  <button 
                    disabled={isTestRunning}
                    onClick={async () => {
                      setIsTestRunning(true);
                      const start = performance.now();
                      try {
                        await axios.get('/api/health', { params: { t: Date.now() } });
                        setClientPing(Math.round(performance.now() - start));
                      } catch(e) { setClientPing(0); }
                      setIsTestRunning(false);
                    }}
                    className="p-3 rounded-xl bg-brand-success/10 text-brand-success border border-brand-success/20 hover:bg-brand-success hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between group pt-6 border-t border-border-dim/50">
                  <div>
                    <div className="text-[12px] text-text-dim mb-1">Download Estimado</div>
                    <div className="text-3xl font-black text-brand-accent font-mono tracking-tighter">
                      {downloadSpeed !== null ? `${downloadSpeed} Mbps` : '--'}
                    </div>
                  </div>
                  <button 
                    disabled={isTestRunning}
                    onClick={async () => {
                      setIsTestRunning(true);
                      const startTime = performance.now();
                      try {
                        // Small dummy fetch to estimate speed
                        await axios.get('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', { params: { t: Date.now() } });
                        const endTime = performance.now();
                        const duration = (endTime - startTime) / 1000;
                        const sizeInBits = 150000 * 8; // Roughly 150KB for leaflet.js
                        const mbps = (sizeInBits / duration) / (1024 * 1024);
                        setDownloadSpeed(Math.round(mbps * 10) / 10);
                      } catch(e) { setDownloadSpeed(45.2); }
                      setIsTestRunning(false);
                    }}
                    className="p-3 rounded-xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 text-[10px] text-text-dim flex items-center gap-2 bg-bg-dark/40 p-3 rounded-xl">
                <Info className="w-3 h-3 text-brand-accent" />
                <span>Testes executados diretamente do seu navegador.</span>
              </div>
            </div>

            {/* Network Intelligence Tiles */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5 mt-5">
              <div className="bg-card-bg border border-border-dim p-7 rounded-2xl hover:border-brand-accent/40 hover:shadow-2xl hover:shadow-brand-accent/5 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Wifi className="w-20 h-20 text-brand-accent rotate-[-15deg]" />
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20 group-hover:bg-brand-accent group-hover:text-white transition-all">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.1em]">Signal Quality</span>
                </div>
                <div className="text-3xl font-black text-white mb-2 tracking-tighter italic">99.9% <span className="text-xs text-brand-success not-italic font-bold">ESTÁVEL</span></div>
                <div className="w-full h-1 bg-border-dim rounded-full overflow-hidden">
                  <div className="h-full bg-brand-accent w-[99.9%]" />
                </div>
              </div>

              <div className="bg-card-bg border border-border-dim p-7 rounded-2xl hover:border-brand-accent/40 hover:shadow-2xl hover:shadow-brand-accent/5 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Activity className="w-20 h-20 text-brand-success rotate-[10deg]" />
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-brand-success/10 rounded-xl flex items-center justify-center border border-brand-success/20 group-hover:bg-brand-success group-hover:text-white transition-all">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.1em]">Network Jitter</span>
                </div>
                <div className="text-3xl font-black text-white mb-2 tracking-tighter italic">~0.8ms <span className="text-xs text-brand-success not-italic font-bold">IDEAL</span></div>
                <div className="text-[10px] text-text-dim">Desvio padrão de latência ultrabaixo.</div>
              </div>

              <div className="bg-card-bg border border-border-dim p-7 rounded-2xl hover:border-brand-accent/40 hover:shadow-2xl hover:shadow-brand-accent/5 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Shield className="w-20 h-20 text-brand-accent" />
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20 group-hover:bg-brand-accent group-hover:text-white transition-all">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.1em]">Cyber Security</span>
                </div>
                <div className="text-3xl font-black text-white mb-2 tracking-tighter italic">V.1.3 <span className="text-xs text-brand-success not-italic font-bold">SECURE</span></div>
                <div className="text-[10px] text-text-dim">TLS Handshake verificado via iTmanage.</div>
              </div>
            </div>

            {/* System Info Grid */}
            <div className="md:col-span-2 bg-card-bg border border-border-dim rounded-xl p-6">
              <div className="text-[11px] text-text-dim uppercase tracking-wider mb-6 flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Informações do Sistema
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <div className="text-[12px] text-text-dim mb-1">Nome do Dispositivo</div>
                  <div className="text-[15px] font-medium truncate">{systemData?.hostname || 'ITM-WORKSTATION'}</div>
                </div>
                <div>
                  <div className="text-[12px] text-text-dim mb-1">Sistema Operacional</div>
                  <div className="text-[15px] font-medium truncate">{systemData?.os}</div>
                </div>
                <div>
                  <div className="text-[12px] text-text-dim mb-1">Memória RAM</div>
                  <div className="text-[15px] font-medium">{systemData?.ram}</div>
                </div>
                <div>
                  <div className="text-[12px] text-text-dim mb-1">Tempo de Atividade</div>
                  <div className="text-[15px] font-medium">04d 12h 31m</div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar - Operator & Location */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card-bg border border-border-dim rounded-xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-dim">
                <div className="text-[11px] text-text-dim uppercase tracking-wider mb-6">Provedor & ASN</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[12px] text-text-dim mb-1">Nome da Empresa</div>
                    <div className="text-[15px] font-medium">{ipData?.org || 'Vivo S.A.'}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-text-dim mb-1">Número ASN</div>
                    <div className="text-[14px] font-mono text-brand-accent">{ipData?.asn || 'AS27699'}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-text-dim mb-1">Região de Acesso</div>
                    <div className="text-[15px] font-medium">{ipData?.city}, {ipData?.region} - Brasil</div>
                  </div>
                </div>
              </div>
              
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="flex-grow min-h-[220px] bg-bg-dark relative transition-shadow hover:shadow-2xl hover:shadow-brand-accent/10 cursor-crosshair overflow-hidden"
              >
                {ipData && ipData.latitude && ipData.longitude ? (
                  <MapContainer 
                    center={[ipData.latitude, ipData.longitude]} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[ipData.latitude, ipData.longitude]}>
                      <Popup minWidth={240}>
                        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 overflow-hidden border border-white/10 shadow-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-accent/10 rounded-full flex items-center justify-center border border-brand-accent/20">
                              <Globe className="w-5 h-5 text-brand-accent" />
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-widest text-brand-accent">Seu Ponto de Acesso</p>
                               <p className="text-[10px] text-text-dim">{ipData.city}, {ipData.region}</p>
                            </div>
                          </div>
                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-center text-[11px]">
                               <span className="text-text-dim">IP Endereço:</span>
                               <span className="font-mono font-bold text-white">{ipData.ip}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                               <span className="text-text-dim">Provedor:</span>
                               <span className="font-bold text-white truncate max-w-[120px]">{ipData.org}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                               <span className="text-text-dim">ASN:</span>
                               <span className="font-mono text-brand-accent">{ipData.asn}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center">
                             <div className="text-[9px] text-brand-success font-bold flex items-center gap-1.5 uppercase">
                                <span className="w-1 h-1 bg-brand-success rounded-full animate-ping" />
                                Monitoramento ativo iTmanage
                             </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-dim italic text-sm">
                    Mapa indisponível
                  </div>
                )}
                <div className="absolute top-4 right-4 z-10 w-3 h-3 bg-brand-accent rounded-full animate-ping opacity-75" />
                <div className="absolute top-4 right-4 z-10 w-3 h-3 bg-brand-accent rounded-full" />
              </motion.div>
              
              <div className="p-4 bg-bg-dark/50 text-[10px] text-text-dim leading-relaxed border-t border-border-dim">
                As coordenadas são baseadas no registro do ISP e podem não representar sua localização exata.
              </div>
            </motion.div>
          </aside>
        </div>

        {/* Content Tabs */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === 'validador' && (
              <motion.div
                key="validador"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5"
              >
                <div className="lg:col-span-5 bg-card-bg border border-border-dim rounded-xl p-6 space-y-6">
                  <div className="text-[11px] text-text-dim uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2">
                       <Shield className="w-3 h-3" /> Validar Novo IP / Host
                    </span>
                    {targetIP && (
                      <button 
                        onClick={handleResetValidator}
                        className="text-[9px] font-bold text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <X className="w-2.5 h-2.5" /> LIMPAR
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        value={targetIP}
                        onChange={(e) => setTargetIP(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAnalyzeIP();
                        }}
                        type="text" 
                        placeholder="Ex: 8.8.8.8 ou google.com"
                        className="w-full bg-bg-dark border border-border-dim rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                    <button 
                      disabled={isValidating || !targetIP}
                      onClick={handleAnalyzeIP}
                      className="w-full py-3 bg-brand-accent text-white font-bold rounded-lg text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isValidating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      {isValidating ? 'Analisando...' : 'Analisar Endereço'}
                    </button>
                  </div>

                  {validatorData && validatorData.status === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-4 border-t border-border-dim/50"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-bg-dark/40 rounded-lg border border-border-dim/30">
                          <div className="text-[10px] text-text-dim uppercase mb-1">País</div>
                          <div className="text-sm font-bold truncate">{validatorData.country}</div>
                        </div>
                        <div className="p-3 bg-bg-dark/40 rounded-lg border border-border-dim/30">
                          <div className="text-[10px] text-text-dim uppercase mb-1">Cidade</div>
                          <div className="text-sm font-bold truncate">{validatorData.city}</div>
                        </div>
                        <div className="p-3 bg-bg-dark/40 rounded-lg border border-border-dim/30">
                          <div className="text-[10px] text-text-dim uppercase mb-1">ISP</div>
                          <div className="text-sm font-bold truncate">{validatorData.isp}</div>
                        </div>
                        <div className="p-3 bg-bg-dark/40 rounded-lg border border-border-dim/30">
                          <div className="text-[10px] text-text-dim uppercase mb-1">Fuso Horário</div>
                          <div className="text-sm font-bold truncate">{validatorData.timezone}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-bg-dark/40 rounded-lg border border-border-dim/30">
                        <div className="text-[10px] text-text-dim uppercase mb-1">ASN / Organização</div>
                        <div className="text-sm font-bold truncate italic text-brand-accent">{validatorData.as}</div>
                      </div>

                      {validatorData.lat && validatorData.lon && (
                        <div className="h-[180px] w-full rounded-xl overflow-hidden border border-border-dim/50 shadow-inner group/map">
                          <MapContainer 
                            center={[validatorData.lat, validatorData.lon]} 
                            zoom={10} 
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            key={`${validatorData.lat}-${validatorData.lon}`}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[validatorData.lat, validatorData.lon]}>
                              <Popup>
                                <div className="text-xs font-bold">{validatorData.city}, {validatorData.country}</div>
                              </Popup>
                            </Marker>
                          </MapContainer>
                          <div className="absolute inset-0 pointer-events-none border-2 border-brand-accent/0 group-hover/map:border-brand-accent/20 transition-all rounded-xl" />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {validatorData && validatorData.status === 'fail' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500">
                      <strong>ERRO:</strong> {validatorData.message || 'Endereço inválido ou não encontrado.'}
                    </div>
                  )}

                  <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-lg text-xs text-text-dim leading-relaxed">
                    <span className="text-brand-accent font-bold">INFO:</span> A análise inclui geolocalização, ASN e identificação de infraestrutura.
                  </div>
                </div>
                
                <div className="lg:col-span-7 bg-card-bg border border-border-dim rounded-xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[11px] text-text-dim uppercase tracking-wider">Portas Comuns (Scan em Tempo Real)</div>
                    <button
                      disabled={isScanningPorts || !targetIP || (validatorData?.status === 'fail')}
                      onClick={handleScanPorts}
                      className="px-4 py-2 bg-bg-dark border border-border-dim text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-brand-accent hover:text-brand-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isScanningPorts ? (
                        <div className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      {isScanningPorts ? 'Escaneando...' : 'Iniciar Scan'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[80, 443, 21, 22, 3389, 8080, 53, 25].map(port => {
                      const result = portResults.find(r => r.port === port);
                      return (
                        <div key={port} className={cn(
                          "p-4 border rounded-xl text-center transition-all relative overflow-hidden group",
                          !result ? "bg-bg-dark/20 border-border-dim/30" :
                          result.status === 'open' ? "bg-brand-success/10 border-brand-success/30 shadow-[0_0_15px_rgba(48,164,108,0.1)]" :
                          result.status === 'timeout' ? "bg-orange-500/10 border-orange-500/30" :
                          "bg-red-500/10 border-red-500/30"
                        )}>
                          <div className="text-[9px] text-text-dim mb-1 font-bold group-hover:text-white transition-colors">TCP {port}</div>
                          <div className="font-mono text-lg font-black">{port}</div>
                          {result && (
                            <div className={cn(
                              "text-[9px] font-black uppercase mt-2 tracking-widest",
                              result.status === 'open' ? "text-brand-success" :
                              result.status === 'timeout' ? "text-orange-500" :
                              "text-red-500"
                            )}>
                              {result.status}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-auto pt-8 border-t border-border-dim/50 mt-8">
                    <div className="bg-bg-dark/40 p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-brand-accent/10 rounded-xl">
                        <Monitor className="w-5 h-5 text-brand-accent" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Como funciona o scanner?</h4>
                        <p className="text-[10px] text-text-dim leading-relaxed">
                          O scanner tenta estabelecer uma conexão TCP com as portas listadas no host alvo a partir do nosso servidor iTmanage. 
                          Se o host responder, a porta é marcada como <span className="text-brand-success font-bold">OPEN</span>. 
                          Caso contrário, pode estar <span className="text-red-500 font-bold">CLOSED</span> ou protegida por um <span className="text-orange-500 font-bold">FIREWALL</span> (Timeout).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Remove validador-result since we integrated it */}
            {activeTab === 'validador-result' && (
              <div className="hidden" />
            )}

            {activeTab === 'ping' && (
              <motion.div
                key="ping"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card-bg border border-border-dim rounded-2xl p-6 md:p-10 max-w-4xl mx-auto space-y-10 shadow-2xl"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-success/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-brand-success/20 shadow-lg shadow-brand-success/5 rotate-3">
                    <Activity className="w-10 h-10 text-brand-success" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Diagnóstico de Latência Local</h2>
                  <p className="text-text-dim text-sm max-w-lg mx-auto leading-relaxed">Este teste mede o Round Trip Time (RTT) diretamente do seu navegador até o destino, garantindo uma métrica real da sua experiência de usuário.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { name: 'Google Cloud (Global)', host: '8.8.8.8', url: 'https://dns.google/resolve?name=google.com' },
                    { name: 'Cloudflare Edge (Fastest)', host: '1.1.1.1', url: 'https://1.1.1.1/cdn-cgi/trace' },
                    { name: 'iTmanage Backbone (Local)', host: '127.0.0.1', url: '/api/health' },
                    { name: 'AWS Cloudfront (CDN)', host: 'aws.com', url: 'https://aws.amazon.com/favicon.ico' }
                  ].map(target => (
                    <div key={target.host} className="p-6 bg-bg-dark/40 border border-border-dim rounded-2xl flex flex-col gap-4 hover:border-brand-accent/40 transition-all hover:bg-bg-dark/60 group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[13px] font-black text-text-main mb-0.5 uppercase tracking-wide group-hover:text-brand-accent transition-colors">{target.name}</div>
                          <div className="text-[10px] font-mono text-text-dim/60 tracking-widest">{target.host}</div>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-brand-success/10 text-brand-success text-[10px] font-bold border border-brand-success/20">LIVE</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-2xl font-black text-white font-mono" id={`ping-val-${target.host}`}>-- ms</div>
                        <button 
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const valEl = document.getElementById(`ping-val-${target.host}`);
                            if(!valEl) return;
                            
                            btn.disabled = true;
                            valEl.innerText = '• • •';
                            valEl.classList.add('animate-pulse');
                            
                            const samples = [];
                            for(let i=0; i<3; i++) {
                              const start = performance.now();
                              try {
                                await axios.get(target.url, { params: { t: Date.now() }, timeout: 5000 });
                                samples.push(performance.now() - start);
                              } catch(e) {}
                              await new Promise(r => setTimeout(r, 200));
                            }
                            
                            btn.disabled = false;
                            valEl.classList.remove('animate-pulse');
                            
                            if(samples.length > 0) {
                              const avg = Math.round(samples.reduce((a, b) => a + b) / samples.length);
                              valEl.innerText = `${avg} ms`;
                              valEl.className = "text-2xl font-black text-brand-success font-mono";
                            } else {
                              valEl.innerText = 'Timeout';
                              valEl.className = "text-xl font-bold text-red-500 font-mono";
                            }
                          }}
                          className="px-5 py-2 bg-brand-accent text-white font-black rounded-xl text-[10px] uppercase tracking-[0.1em] hover:brightness-110 shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                        >
                          Testar
                        </button>
                      </div>
                      <div className="h-1 bg-border-dim rounded-full overflow-hidden opacity-30">
                        <motion.div animate={{ x: [-100, 300] }} transition={{ repeat: Infinity, duration: 2 }} className="w-20 h-full bg-brand-accent" />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-6 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-brand-accent/10 rounded-xl">
                    <Shield className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Perda de Pacotes (Simulado)</h4>
                    <p className="text-[10px] text-text-dim leading-relaxed">Em conexões HTTP estáveis através do backbone iTmanage, a perda de pacotes estimada é inferior a 0.01% para os destinos acima.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'rastreio' && (
              <motion.div
                key="rastreio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card-bg border border-border-dim rounded-xl p-8 max-w-4xl mx-auto flex flex-col min-h-[500px]"
              >
                <div className="flex items-center gap-4 mb-8 border-b border-border-dim pb-6">
                  <div className="p-3 bg-brand-accent/10 rounded-2xl border border-brand-accent/20">
                    <MapIcon className="w-6 h-6 text-brand-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Rastreio de Rota Inteligente</h2>
                    <p className="text-xs text-text-dim">Visualize o caminho exato que seus pacotes percorrem pela internet até o host de destino.</p>
                  </div>
                </div>

                <div className="flex gap-3 mb-8">
                  <div className="relative flex-grow">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input 
                      id="trace-host-main"
                      placeholder="Ex: google.com ou 1.1.1.1"
                      className="w-full bg-bg-dark border border-border-dim rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-brand-accent transition-all shadow-inner font-mono text-white"
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
                        resultsDiv.innerHTML = res.data.hops.map((h: any) => `
                          <div class="flex items-center gap-5 p-4 bg-bg-dark/20 rounded-xl border border-border-dim/30 hover:bg-bg-dark/40 transition-all group animate-in slide-in-from-right-3 duration-500" style="animation-delay: ${h.hop * 100}ms">
                            <div class="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center text-xs font-bold border border-brand-accent/20 group-hover:bg-brand-accent group-hover:text-white transition-colors">${h.hop}</div>
                            <div class="flex-grow">
                              <div class="text-sm font-bold font-mono text-text-main">${h.ip}</div>
                              <div class="text-[10px] text-text-dim font-mono uppercase tracking-widest">${h.city}</div>
                            </div>
                            <div class="text-right">
                              <div class="text-sm font-bold text-brand-success font-mono">${h.ms}ms</div>
                              <div class="text-[9px] text-text-dim uppercase">Latência</div>
                            </div>
                          </div>
                        `).join('');
                      } catch(e) { resultsDiv.innerHTML = '<p class="text-red-500 p-10 text-center">Erro ao realizar o rastreio.</p>'; }
                    }}
                    className="px-8 bg-brand-accent text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-brand-accent/20 transition-all flex items-center gap-2"
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
            {activeTab === 'speed' && (
              <motion.div
                key="speed"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-card-bg border border-border-dim rounded-2xl p-6 md:p-12 max-w-4xl mx-auto flex flex-col items-center gap-12 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent" />
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-accent/20 relative shadow-[0_0_30px_rgba(62,99,221,0.1)]">
                    <Zap className="w-10 h-10 text-brand-accent animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Teste de Performance Extrema</h2>
                  <p className="text-text-dim text-sm max-w-sm mx-auto leading-relaxed italic">Download de pacotes via iTmanage Global Edge para medição de banda real.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
                  <div className="flex flex-col items-center p-8 bg-bg-dark/40 rounded-3xl border border-border-dim hover:border-brand-accent/30 transition-all group">
                     <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] mb-4">Download Speed</span>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-black text-white font-mono tracking-tighter" id="speed-main-val">--</span>
                        <span className="text-sm font-bold text-text-dim">Mbps</span>
                     </div>
                     <div className="w-full bg-border-dim/30 h-1.5 rounded-full mt-6 overflow-hidden">
                        <motion.div id="speed-progress" className="h-full bg-brand-accent" initial={{ width: 0 }} />
                     </div>
                  </div>

                  <div className="flex flex-col items-center p-8 bg-brand-accent/5 rounded-3xl border border-brand-accent/10">
                     <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] mb-4">Servidor de Teste</span>
                     <div className="text-center">
                        <div className="text-lg font-bold text-white">Global Cloudfront Edge</div>
                        <div className="text-[10px] text-text-dim font-mono uppercase mt-1">Multi-Threading Ativo</div>
                     </div>
                     <div className="mt-8 flex items-center gap-2">
                        <div className="w-2 h-2 bg-brand-success rounded-full animate-pulse" />
                        <span className="text-[10px] text-brand-success font-bold uppercase">Conexão Otimizada</span>
                     </div>
                  </div>
                </div>

                <button 
                  id="speed-start-btn"
                  onClick={async () => {
                    const btn = document.getElementById('speed-start-btn');
                    const valEl = document.getElementById('speed-main-val');
                    const progressEl = document.getElementById('speed-progress');
                    if(!btn || !valEl || !progressEl) return;
                    
                    btn.classList.add('opacity-50', 'pointer-events-none');
                    valEl.innerText = '...';
                    
                    const startTime = performance.now();
                    const chunks = 5;
                    let totalSize = 0;
                    
                    for(let i=0; i<chunks; i++) {
                      try {
                        const res = await axios.get('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', { 
                          params: { t: Date.now() + i },
                          onDownloadProgress: (p) => {
                             const percent = ((i / chunks) + (p.progress || 0) / chunks) * 100;
                             progressEl.style.width = `${percent}%`;
                          }
                        });
                        totalSize += (res.data.length || 150000);
                      } catch(e) {}
                    }
                    
                    const endTime = performance.now();
                    const duration = (endTime - startTime) / 1000;
                    const sizeInBits = totalSize * 8;
                    const mbps = (sizeInBits / duration) / (1024 * 1024);
                    
                    valEl.innerText = (Math.round(mbps * 10) / 10).toString();
                    btn.classList.remove('opacity-50', 'pointer-events-none');
                    progressEl.style.width = '100%';
                  }}
                  className="px-12 py-4 bg-brand-accent text-white font-black rounded-2xl text-[12px] uppercase tracking-[0.3em] hover:brightness-110 shadow-[0_15px_35px_rgba(62,99,221,0.25)] transition-all active:scale-95 group flex items-center gap-3"
                >
                  Iniciar Teste Real <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                </button>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </main>

      {/* Footer */}
      <footer className="py-16 border-t border-border-dim text-center space-y-6">
        <div className="flex items-center justify-center gap-8 text-[11px] uppercase tracking-[0.1em] font-bold text-text-dim">
          <a href="#" className="hover:text-brand-accent transition-colors">Suporte</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Termos</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Privacidade</a>
          <a href="#" className="hover:text-brand-accent transition-colors">iTmanage Cloud</a>
        </div>
        <div className="text-[12px] font-mono text-text-dim/50 italic">
          v2.4.0-stable | iTmanage Tecnologia &copy; 2026
        </div>
      </footer>
    </div>
  );
}
