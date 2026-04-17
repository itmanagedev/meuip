import React from 'react';

export function ITManageLogo({ className }: { className?: string }) {
  // Brand color from the actual image
  const brandBlue = "#5ba5fb"; 

  return (
    <div className={`flex items-center gap-[6px] ${className || ''}`}>
      {/* Node Graphic with White Shadow as requested */}
      <svg 
        width="44" 
        height="44" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        style={{ filter: "drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.4))" }}
      >
        <g fill={brandBlue}>
          {/* Isolated dot on the left */}
          <circle cx="16" cy="50" r="12" />
          
          {/* Central Body: Head */}
          <circle cx="42" cy="24" r="14" />
          
          {/* Central Body: Torso */}
          <circle cx="45" cy="68" r="21" />
          
          {/* Neck connecting Head and Torso */}
          <path d="M 28 24 Q 36 46 24 68 L 66 68 Q 50 46 56 24 Z" />
          
          {/* Right Element (Megaphone / Cutout semi-circle) */}
          <path d="M 72 12 A 18 18 0 0 1 72 48 L 72 35 L 56 30 L 72 25 Z" />
        </g>
      </svg>
      
      {/* Custom Typographical Logo */}
      <div 
        className="font-black tracking-[-0.04em] leading-none select-none flex items-baseline"
        style={{ 
          fontFamily: "'Poppins', sans-serif", 
          fontSize: '32px', 
          color: brandBlue,
          filter: "drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.2))"
        }}
      >
        <span style={{ fontSize: '25px' }}>i</span>
        <span style={{ marginLeft: '-1px' }}>T</span>
        <span style={{ marginLeft: '-1px' }}>manage</span>
      </div>
    </div>
  );
}
