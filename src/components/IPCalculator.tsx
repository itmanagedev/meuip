import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, ArrowRight, Shield, Moon, Sun, Copy, Check, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function IPCalculator({ isDarkMode: globalIsDarkMode }: { isDarkMode?: boolean }) {
  const [ipInput, setIpInput] = useState('');
  const [type, setType] = useState<'v4' | 'v6'>('v4');
  const [results, setResults] = useState<any>(null);
  const [localIsDarkMode, setLocalIsDarkMode] = useState(true);

  const isDarkMode = globalIsDarkMode !== undefined ? globalIsDarkMode : localIsDarkMode;
  const setIsDarkMode = globalIsDarkMode !== undefined ? () => {} : setLocalIsDarkMode;
  const hideToggle = globalIsDarkMode !== undefined;

  const expandIPv6 = (ip: string) => {
    if (!ip.includes('::')) return ip.split(':').map(p => p.padStart(4, '0')).join('');
    let [left, right] = ip.split('::');
    let leftParts = left ? left.split(':') : [];
    let rightParts = right ? right.split(':') : [];
    let padding = 8 - (leftParts.length + rightParts.length);
    let middle = Array(padding).fill('0000');
    return [...leftParts, ...middle, ...rightParts].map(p => p ? p.padStart(4, '0') : '0000').join('');
  };

  const bigIntToIPv6 = (n: bigint) => {
    let hex = n.toString(16).padStart(32, '0');
    let parts = [];
    for(let i=0; i<32; i+=4) {
      parts.push(hex.slice(i, i+4).replace(/^0+(?=[0-9a-f])/, ''));
    }
    return parts.join(':').replace(/(^|:)0(:0)+(:|$)/, '::');
  };

  const calculateSubnet = () => {
    try {
      if (type === 'v4') {
        const parts = ipInput.split('/');
        const ip = parts[0];
        const cidr = parts[1] ? parseInt(parts[1], 10) : 24;

        if (cidr < 0 || cidr > 32) throw new Error("CIDR inválido");

        const ipParts = ip.split('.');
        if (ipParts.length !== 4) throw new Error("IP inválido");

        const ipNum = ipParts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
        const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
        
        const network = (ipNum & mask) >>> 0;
        const broadcast = (network | (~mask)) >>> 0;

        const stringifyIPv4 = (n: number) => [24, 16, 8, 0].map(shift => (n >>> shift) & 255).join('.');

        const totalHosts = 2 ** (32 - cidr);
        const usableHosts = cidr >= 31 ? 0 : totalHosts - 2;

        setResults({
          network: stringifyIPv4(network),
          firstHost: cidr >= 31 ? "N/A" : stringifyIPv4((network + 1) >>> 0),
          lastHost: cidr >= 31 ? "N/A" : stringifyIPv4((broadcast - 1) >>> 0),
          broadcast: stringifyIPv4(broadcast),
          mask: stringifyIPv4(mask),
          totalHosts: totalHosts.toLocaleString('pt-BR'),
          usableHosts: usableHosts.toLocaleString('pt-BR'),
          type: 'v4',
          cidr
        });
      } else {
        const parts = ipInput.split('/');
        const ip = parts[0];
        const cidr = parts[1] ? parseInt(parts[1], 10) : 64;

        if (cidr < 0 || cidr > 128) throw new Error("Prefix inválido");

        const expanded = expandIPv6(ip);
        if (expanded.length !== 32) throw new Error("IPv6 inválido");

        const ipBigInt = BigInt('0x' + expanded);
        const MAX_V6 = BigInt("0xffffffffffffffffffffffffffffffff");
        const maskShift = BigInt(128 - cidr);
        const mask = cidr === 0 ? 0n : (MAX_V6 << maskShift) & MAX_V6;

        const network = ipBigInt & mask;
        const broadcast = network | (MAX_V6 ^ mask);

        const totalHosts = 2n ** maskShift;

        setResults({
          network: bigIntToIPv6(network),
          broadcast: bigIntToIPv6(broadcast),
          firstHost: bigIntToIPv6(network + 1n),
          totalHosts: totalHosts.toString(),
          type: 'v6',
          mask: cidr.toString()
        });
      }
    } catch(e) {
      alert("Por favor, digite um formato válido. Ex: 192.168.1.0/24");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border transition-colors duration-500",
        isDarkMode ? "bg-bg-dark border-border-dim" : "bg-white border-slate-200"
      )}
    >
      {!hideToggle && (
        <div className="p-1 flex justify-end">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-3 rounded-2xl transition-all m-2",
              isDarkMode ? "bg-white/5 text-brand-blue hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      )}

      <div className="px-6 pb-12 pt-4 md:px-12 space-y-10">
        <div className="flex flex-col md:flex-row items-center gap-8 border-b pb-8 border-dashed border-slate-700/20">
          <div className={cn(
            "p-6 rounded-3xl border shadow-xl transition-colors",
            isDarkMode ? "bg-brand-blue/10 border-brand-blue/20" : "bg-brand-blue/5 border-brand-blue/10"
          )}>
            <Calculator className="w-10 h-10 text-brand-blue" />
          </div>
          <div className="flex-grow text-center md:text-left space-y-1">
            <h2 className={cn(
              "text-3xl font-black uppercase italic tracking-tighter leading-none text-text-strong",
            )}>Calculadora de Sub-rede</h2>
            <p className="text-sm font-medium text-text-dim">Planejamento estratégico de infraestrutura IPv4 e IPv6.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className={cn(
              "p-6 rounded-2xl border space-y-6",
              isDarkMode ? "bg-card-bg border-border-dim" : "bg-slate-50 border-slate-200"
            )}>
              <div className="space-y-4">
                <label className="text-xs uppercase font-black tracking-widest block text-text-dim">Versão do Protocolo</label>
                <div className={cn(
                  "flex p-1 rounded-xl border w-full",
                  isDarkMode ? "bg-bg-dark border-border-dim" : "bg-white border-slate-200"
                )}>
                  <button 
                    onClick={() => setType('v4')}
                    className={cn(
                      "flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all",
                      type === 'v4' 
                        ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                        : 'text-text-dim hover:text-text-strong'
                    )}
                  >
                    IPv4
                  </button>
                  <button 
                    onClick={() => setType('v6')}
                    className={cn(
                      "flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all",
                      type === 'v6' 
                        ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                        : 'text-text-dim hover:text-text-strong'
                    )}
                  >
                    IPv6
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs uppercase font-black tracking-widest block text-text-dim">Caminho CIDR / Prefixo</label>
                <div className="relative group">
                  <input 
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') calculateSubnet(); }}
                    placeholder={type === 'v4' ? '192.168.1.0/24' : '2001:db8::/32'}
                    className={cn(
                      "w-full rounded-xl px-6 py-4 font-mono text-sm outline-none border transition-all shadow-inner",
                      isDarkMode 
                        ? "bg-bg-dark border-border-dim text-text-strong focus:border-brand-blue" 
                        : "bg-white border-slate-200 text-slate-900 focus:border-brand-blue"
                    )}
                  />
                </div>
              </div>

              <button 
                onClick={calculateSubnet}
                className="w-full bg-brand-blue py-5 rounded-2xl flex items-center justify-center font-black tracking-[0.2em] uppercase hover:brightness-110 active:scale-[0.98] transition-all text-white gap-3 shadow-2xl shadow-brand-blue/30"
              >
                EFETUAR CÁLCULO <ArrowRight className="w-5 h-5"/>
              </button>
            </div>
            
            <div className={cn(
              "p-4 rounded-xl border flex items-start gap-4",
              isDarkMode ? "bg-brand-blue/5 border-brand-blue/10" : "bg-blue-50 border-blue-100"
            )}>
              <Info className="w-5 h-5 text-brand-blue flex-shrink-0 mt-1" />
              <p className={cn(
                "text-[11px] leading-relaxed text-text-dim",
                !isDarkMode && "text-blue-600"
              )}>
                <strong>Dica:</strong> Para IPv4, omita a máscara para assumir /24 por padrão. No IPv6, o prefixo padrão considerado é /64.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {results ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-4",
                    results.type === 'v6' ? 'md:grid-cols-1' : ''
                  )}>
                    {results.type === 'v4' ? (
                      <>
                        <ResultBox isDarkMode={isDarkMode} label="ID de Rede" value={results.network} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Broadcast" value={results.broadcast} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Primeiro Host" value={results.firstHost} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Último Host" value={results.lastHost} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Máscara Sub-rede" value={results.mask} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Máscara CIDR" value={`/${results.cidr}`} />
                      </>
                    ) : (
                      <>
                        <ResultBox isDarkMode={isDarkMode} label="Prefix Address" value={results.network} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Range Final" value={results.broadcast} copyable />
                        <ResultBox isDarkMode={isDarkMode} label="Prefixo IPv6" value={`/${results.mask}`} />
                      </>
                    )}
                  </div>

                  <div className={cn(
                    "p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative",
                    isDarkMode ? "bg-brand-blue/10 border-brand-blue/20" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                    <div className="space-y-2 relative z-10">
                      <div className={cn(
                        "text-[10px] uppercase font-black tracking-widest",
                        isDarkMode ? "text-brand-blue/60" : "text-brand-blue/80"
                      )}>Capacidade do Segmento</div>
                      <div className={cn(
                        "text-3xl font-black font-mono tracking-tighter text-text-strong",
                      )}>
                        {results.usableHosts || results.totalHosts}
                        <span className="text-sm ml-2 font-sans text-text-dim font-bold">Hosts Úteis</span>
                      </div>
                    </div>
                    <div className="relative z-10 h-1 w-full md:w-32 bg-brand-blue/20 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: '100%' }}
                         transition={{ duration: 1, ease: "easeOut" }}
                         className="h-full bg-brand-blue shadow-[0_0_15px_rgba(48,164,108,0.5)]"
                       />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className={cn(
                  "h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center space-y-6",
                  isDarkMode ? "border-border-dim bg-white/[0.02]" : "border-slate-200 bg-slate-50/50"
                )}>
                  <div className={cn(
                    "p-6 rounded-full",
                    isDarkMode ? "bg-white/5" : "bg-slate-100"
                  )}>
                    <Shield className={cn("w-12 h-12", isDarkMode ? "text-text-dim/20" : "text-text-dim/30")} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-text-dim">Pronto para Calcular</h3>
                    <p className="text-sm max-w-xs text-text-dim opacity-60">Insira um endereçamento IP e seu CIDR para visualizar a topologia lógica da rede.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultBox({ label, value, copyable = false, isDarkMode }: { label: string, value: string, copyable?: boolean, isDarkMode: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={cn(
        "rounded-2xl border p-5 flex flex-col justify-between transition-all group relative overflow-hidden",
        isDarkMode 
          ? "bg-card-bg border-border-dim hover:border-brand-blue/50" 
          : "bg-white border-slate-200 hover:border-brand-blue shadow-sm",
        copyable ? 'cursor-pointer active:scale-[0.98]' : ''
      )}
      onClick={copyable ? handleCopy : undefined}
    >
       <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] uppercase font-black tracking-widest text-text-dim">{label}</span>
          {copyable && (
            <div className={cn(
              "p-1.5 rounded-lg transition-all",
              isDarkMode ? "bg-text-strong/5 text-text-dim group-hover:text-brand-blue" : "bg-text-strong/5 text-text-dim group-hover:text-brand-blue"
            )}>
              {copied ? <Check className="w-3 h-3 text-brand-success" /> : <Copy className="w-3 h-3" />}
            </div>
          )}
       </div>
       <div className={cn(
         "font-mono text-sm break-all font-bold tracking-tight text-text-strong",
       )}>
         {value}
       </div>
       
       {copied && (
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="absolute bottom-2 right-4 text-[8px] font-black uppercase text-brand-success tracking-widest"
         >
           Copiado
         </motion.div>
       )}
    </div>
  );
}

