"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import type { FaceUser } from "@/lib/supabase";
import type { MatchResult } from "@/app/components/FaceCamera";

const FaceCamera = dynamic(() => import("../components/FaceCamera"), { ssr: false });

type Step = "loading" | "ready" | "success" | "fail";

// 유클리드 거리 계산 (face-api.js 없이 직접 구현)
function euclideanDistance(a: Float32Array, b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// 거리 → 유사도 % 변환
// distance 0.0 → 100% | distance 0.2 → 80% | distance 1.0 → 0%
function distToSimilarity(distance: number): number {
  return Math.max(0, Math.round((1 - distance) * 100));
}

export default function AuthenticatePage() {
  const [step,          setStep]          = useState<Step>("loading");
  const [users,         setUsers]         = useState<FaceUser[]>([]);
  const [loadErr,       setLoadErr]       = useState("");
  const [similarity,    setSimilarity]    = useState(0);
  const [candidateName, setCandidateName] = useState("");
  const [matchResult,   setMatchResult]   = useState<MatchResult | null>(null);
  const [authTime,      setAuthTime]      = useState("");
  const [finalResult,   setFinalResult]   = useState<MatchResult | null>(null);

  const usersRef     = useRef<FaceUser[]>([]);
  const stepRef      = useRef<Step>("loading");
  const successCount = useRef(0);

  useEffect(() => { stepRef.current = step; }, [step]);

  // ── Supabase에서 등록된 얼굴 로드 ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("face_users")
        .select("*")
        .order("registered_at", { ascending: false });

      if (error) setLoadErr(error.message);
      else {
        usersRef.current = data ?? [];
        setUsers(data ?? []);
      }
      setStep("ready");
    })();
  }, []);

  // ── 실시간 얼굴 디스크립터 비교 ──────────────────────────────────────
  const onDescriptor = useCallback((descriptor: Float32Array | null) => {
    if (!descriptor || usersRef.current.length === 0 || stepRef.current !== "ready") return;

    // 모든 등록 사용자와 비교 → 최소 거리 찾기
    let best: { name: string; dist: number } | null = null;
    for (const user of usersRef.current) {
      const dist = euclideanDistance(descriptor, user.descriptor);
      if (!best || dist < best.dist) best = { name: user.name, dist };
    }
    if (!best) return;

    const sim = distToSimilarity(best.dist);
    setSimilarity(sim);
    setCandidateName(best.name);

    // FaceCamera 에 전달할 matchResult (60% 이상이면 이름 표시)
    setMatchResult(sim >= 60 ? { name: best.name, similarity: sim } : null);

    // 80% 이상이 20프레임 연속 지속되면 인증 완료
    if (sim >= 80) {
      successCount.current++;
      if (successCount.current >= 20) {
        const now = new Date().toLocaleTimeString("ko-KR");
        setAuthTime(now);
        setFinalResult({ name: best.name, similarity: sim });
        setStep("success");
      }
    } else {
      successCount.current = 0;
    }
  }, []);

  // ── 유사도 색상 ──────────────────────────────────────────────────────
  const simColor    = similarity >= 80 ? "text-green-400" : similarity >= 60 ? "text-yellow-400" : "text-slate-500";
  const simBarColor = similarity >= 80 ? "from-green-600 to-emerald-400" : similarity >= 60 ? "from-yellow-500 to-amber-400" : "from-blue-600 to-indigo-500";

  return (
    <div className="min-h-screen bg-[#080c18] flex flex-col max-w-md mx-auto px-6 py-12">
      {/* 헤더 */}
      <header className="flex items-center gap-4 pt-4 mb-8">
        <Link href="/">
          <button className="w-9 h-9 rounded-full bg-[#141929] border border-white/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        </Link>
        <div>
          <h2 className="text-white font-semibold text-lg">인증 시작</h2>
          <p className="text-slate-500 text-xs">얼굴 생체 인증 · Supabase</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs">보안</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-5">

        {/* ── 로딩 ── */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">등록 데이터 불러오는 중...</p>
            <p className="text-slate-600 text-xs">Supabase에서 얼굴 데이터를 가져옵니다</p>
          </div>
        )}

        {/* ── 준비 (실시간 인증) ── */}
        {step === "ready" && (
          <>
            {/* 오류 / 미등록 안내 */}
            {loadErr && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                {loadErr}
              </div>
            )}
            {users.length === 0 && !loadErr && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-yellow-400 text-xs">등록된 사용자가 없습니다. 먼저 얼굴을 등록해주세요.</span>
              </div>
            )}

            {/* 등록 인원 수 */}
            {users.length > 0 && (
              <div className="bg-[#0d1526] border border-blue-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="text-indigo-300 text-xs">등록된 사용자 <span className="font-bold text-indigo-200">{users.length}명</span>과 실시간 비교 중</span>
              </div>
            )}

            {/* 실시간 카메라 */}
            <FaceCamera onDescriptorUpdate={onDescriptor} matchResult={matchResult} />

            {/* 실시간 유사도 미터 */}
            <div className="w-full bg-[#111827] border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">실시간 일치율</span>
                <span className={`text-2xl font-bold font-mono tabular-nums transition-all duration-200 ${simColor}`}>
                  {similarity}%
                </span>
              </div>

              {/* 프로그레스 바 */}
              <div className="relative w-full h-3 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${simBarColor} transition-all duration-150`}
                  style={{ width: `${similarity}%` }}
                />
                {/* 80% 기준선 */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/20" style={{ left: "80%" }} />
              </div>

              <div className="flex justify-between text-[10px] text-slate-600">
                <span>0%</span>
                <span className="text-slate-500">인증 기준 80%</span>
                <span>100%</span>
              </div>

              {/* 매칭 후보 표시 */}
              {candidateName && similarity > 25 && (
                <div className="border-t border-white/6 pt-3 flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    similarity >= 80 ? "bg-green-400 animate-pulse" : "bg-yellow-400"
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-slate-300 text-sm font-medium">
                      {similarity >= 80
                        ? `${candidateName}님 인증 중... (${20 - Math.min(successCount.current, 20)}프레임 남음)`
                        : `가장 유사: ${candidateName}`}
                    </span>
                    <span className="text-slate-600 text-xs">
                      {similarity >= 80 ? "잠시 정면을 유지해주세요" : "더 선명하게 얼굴을 맞춰주세요"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-slate-600 text-xs text-center">
              80% 이상 유사도가 약 1~2초 지속되면 자동 인증됩니다
            </p>
          </>
        )}

        {/* ── 인증 성공 ── */}
        {step === "success" && finalResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-7">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/10 blur-2xl scale-150" />
              {/* 외부 링 애니메이션 */}
              <div className="absolute inset-0 rounded-full border-2 border-green-500/20 scale-125 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-32 h-32 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-white text-2xl font-bold mb-1">인증 성공</h3>
              <p className="text-green-400 text-lg font-semibold">{finalResult.name}님, 안녕하세요! 👋</p>
            </div>

            {/* 인증 결과 카드 */}
            <div className="w-full bg-green-500/8 border border-green-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-green-300 text-sm font-semibold">생체 인증 완료</span>
              </div>
              <div className="border-t border-green-500/15 pt-3 flex flex-col gap-2.5">
                {[
                  { label: "인증된 사용자",    value: finalResult.name },
                  { label: "얼굴 일치율",       value: `${finalResult.similarity}%` },
                  { label: "비교 알고리즘",     value: "128-dim Euclidean" },
                  { label: "인증 시각",         value: authTime },
                  { label: "데이터 소스",       value: "Supabase DB" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-green-500/70">{row.label}</span>
                    <span className="text-green-300 font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/" className="w-full">
              <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-base shadow-lg shadow-green-900/30 active:scale-[0.98] transition-transform">
                홈으로
              </button>
            </Link>
          </div>
        )}

        {/* ── 인증 실패 ── */}
        {step === "fail" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl scale-150" />
              <div className="relative w-32 h-32 rounded-full bg-red-500/15 border-2 border-red-500/50 flex items-center justify-center">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-white text-2xl font-bold mb-2">인증 실패</h3>
              <p className="text-slate-400 text-sm">등록된 얼굴과 일치하지 않습니다.</p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => { setStep("ready"); setSimilarity(0); setCandidateName(""); successCount.current = 0; setMatchResult(null); }}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-transform"
              >
                다시 시도
              </button>
              <Link href="/" className="w-full">
                <button className="w-full h-14 rounded-2xl bg-[#141929] border border-white/10 text-slate-300 font-semibold text-base active:scale-[0.98] transition-transform">
                  홈으로
                </button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
