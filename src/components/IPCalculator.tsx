import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, ArrowRight, Shield } from 'lucide-react';

export function IPCalculator() {
  const [ipInput, setIpInput] = useState('');
  const [type, setType] = useState<'v4' | 'v6'>('v4');
  const [results, setResults] = useState<any>(null);

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
      // Remove leading zeros for canonical representation
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
          type: 'v4'
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
        const broadcast = network | (MAX_V6 ^ mask); // Broadcast doesn't quite exist in v6 exactly the same way, but it represents the last IP in the subnet block

        const totalHosts = 2n ** maskShift;

        setResults({
          network: bigIntToIPv6(network),
          broadcast: bigIntToIPv6(broadcast), // Last IP
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
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-card-bg border border-border-dim rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
            <Calculator className="w-8 h-8 text-brand-blue" />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Calculadora Sub-rede IP</h2>
            <p className="text-text-dim text-sm">Realize cálculos precisos para planejamento de redes IPv4 e IPv6 e subnetting CIDR.</p>
          </div>
        </div>

        <div className="flex bg-bg-dark border border-border-dim rounded-xl overflow-hidden w-fit mx-auto md:mx-0">
           <button 
             onClick={() => setType('v4')}
             className={`px-6 py-2 font-bold text-sm tracking-wide ${type === 'v4' ? 'bg-brand-blue text-white' : 'text-text-dim hover:bg-white/5'}`}
           >
             IPv4
           </button>
           <button 
             onClick={() => setType('v6')}
             className={`px-6 py-2 font-bold text-sm tracking-wide ${type === 'v6' ? 'bg-brand-blue text-white' : 'text-text-dim hover:bg-white/5'}`}
           >
             IPv6
           </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <input 
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') calculateSubnet(); }}
              placeholder={type === 'v4' ? 'Ex: 192.168.0.1/24' : 'Ex: 2001:db8::/32'}
              className="bg-bg-dark border border-border-dim rounded-xl px-5 py-4 font-mono text-sm flex-grow focus:border-brand-blue outline-none"
           />
           <button 
              onClick={calculateSubnet}
              className="bg-brand-blue px-10 py-4 rounded-xl flex items-center justify-center font-black tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all text-white gap-2 shadow-xl shadow-brand-blue/20"
           >
              CALCULAR <ArrowRight className="w-4 h-4"/>
           </button>
        </div>

        {results && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-bg-dark rounded-xl border border-border-dim/50 p-6 md:p-8"
          >
             {results.type === 'v4' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ResultBox label="Endereço de Rede" value={results.network} copyable />
                    <ResultBox label="Primeiro Host Útil" value={results.firstHost} copyable />
                    <ResultBox label="Último Host Útil" value={results.lastHost} copyable />
                    <ResultBox label="Broadcast" value={results.broadcast} copyable />
                    <ResultBox label="Máscara de Sub-rede" value={results.mask} copyable />
                    <div className="space-y-4">
                       <ResultBox label="Hosts Úteis" value={results.usableHosts} />
                       <ResultBox label="Total de Hosts" value={results.totalHosts} />
                    </div>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResultBox label="Primeiro IP (Rede)" value={results.network} copyable />
                    <ResultBox label="Último IP do Bloco" value={results.broadcast} copyable />
                    <ResultBox label="Tamanho do Prefixo" value={'/' + results.mask} />
                    <ResultBox label="Total de IPs" value={results.totalHosts} />
                 </div>
             )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ResultBox({ label, value, copyable = false }: { label: string, value: string, copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`bg-card-bg rounded-lg border border-border-dim p-4 flex flex-col justify-center ${copyable ? 'cursor-pointer hover:border-brand-blue transition-colors group' : ''}`}
      onClick={copyable ? handleCopy : undefined}
    >
       <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest mb-1">{label}</span>
       <div className="flex items-center justify-between">
          <span className="font-mono text-white text-sm break-all">{value}</span>
          {copyable && (
             <span className={`text-[10px] uppercase font-black tracking-widest ${copied ? 'text-brand-success' : 'text-text-dim opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                {copied ? 'Copiado!' : 'Copiar'}
             </span>
          )}
       </div>
    </div>
  );
}
