'use client'

import { useState } from 'react'

export function ReportDateGroup({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string
  count: number
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/70 hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-200">{label}</span>
          <span className="text-[11px] bg-slate-700/80 text-slate-400 rounded-full px-2 py-0.5 tabular-nums">
            {count}건
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-3 py-3 space-y-3 border-t border-slate-700/40 bg-slate-900/30">
          {children}
        </div>
      )}
    </div>
  )
}
