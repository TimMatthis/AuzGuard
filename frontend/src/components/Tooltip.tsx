import React from 'react';

interface TooltipProps {
  label: string;
  className?: string;
}

export function Tooltip({ label, className }: TooltipProps) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-gray-300 text-[10px] border border-white/10 cursor-help align-middle ${className || ''}`}
      title={label}
      aria-label={label}
      role="note"
    >
      i
    </span>
  );
}

