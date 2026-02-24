"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080c18] flex flex-col items-center justify-between px-6 py-12 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <path d="M8 12a4 4 0 0 0 8 0"/>
              <line x1="8.5" y1="9" x2="8.5" y2="9.01"/>
              <line x1="15.5" y1="9" x2="15.5" y2="9.01"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-wide">FaceID</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#141929] border border-white/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
          </svg>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex flex-col items-center gap-10 flex-1 justify-center">
        {/* Face Icon Area */}
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl scale-150" />
            {/* Scan circle */}
            <div className="relative w-44 h-44 rounded-full border-2 border-blue-500/40 flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-sm" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-sm" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-sm" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-sm" />
              {/* Face icon */}
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5"/>
                <path d="M3 21v-1a9 9 0 0 1 18 0v1"/>
                <circle cx="9" cy="7" r="0.8" fill="#60a5fa"/>
                <circle cx="15" cy="7" r="0.8" fill="#60a5fa"/>
                <path d="M9.5 10.5q2.5 2 5 0"/>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              얼굴 생체 인증
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              안전하고 빠른 얼굴 인식 기술로<br />
              본인을 인증하세요
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="w-full bg-[#111827] border border-white/8 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">보안 연결됨</p>
            <p className="text-slate-500 text-xs mt-0.5">256-bit 암호화 · 생체정보 보호</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">활성</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-4">
          {/* 얼굴 등록 버튼 */}
          <Link href="/register" className="w-full">
            <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base flex items-center justify-center gap-3 shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="16" y1="11" x2="22" y2="11"/>
              </svg>
              얼굴 등록
            </button>
          </Link>

          {/* 인증 시작 버튼 */}
          <Link href="/authenticate" className="w-full">
            <button className="w-full h-14 rounded-2xl bg-[#141929] border border-blue-500/30 text-blue-300 font-semibold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              인증 시작
            </button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center pb-4">
        <p className="text-slate-600 text-xs">
          생체정보는 기기 내에서만 처리됩니다
        </p>
      </footer>
    </div>
  );
}
