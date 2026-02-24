"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const FaceCamera = dynamic(() => import("../components/FaceCamera"), { ssr: false });

type Step = "guide" | "scanning" | "saving" | "done" | "error";

export default function RegisterPage() {
  const [step,     setStep]     = useState<Step>("guide");
  const [name,     setName]     = useState("");
  const [progress, setProgress] = useState(0);
  const [faceOk,   setFaceOk]   = useState(false);
  const [errMsg,   setErrMsg]   = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const faceOkRef     = useRef(false);
  const progressRef   = useRef(0);
  const descriptorRef = useRef<Float32Array | null>(null);

  const onDetect     = useCallback((d: boolean) => { faceOkRef.current = d; setFaceOk(d); }, []);
  const onDescriptor = useCallback((d: Float32Array | null) => { if (d) descriptorRef.current = d; }, []);

  // ── 얼굴 감지 중일 때 자동 진행 ──────────────────────────────────────
  useEffect(() => {
    if (step !== "scanning") return;
    progressRef.current = 0;
    setProgress(0);

    const id = setInterval(() => {
      if (!faceOkRef.current) return;         // 얼굴 없으면 정지
      progressRef.current = Math.min(progressRef.current + 1.6, 100);
      setProgress(Math.round(progressRef.current));
      if (progressRef.current >= 100) {
        clearInterval(id);
        doSave();
      }
    }, 50);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Supabase 저장 ──────────────────────────────────────────────────
  const doSave = async () => {
    if (!descriptorRef.current) {
      setErrMsg("얼굴 데이터를 캡처하지 못했습니다. 다시 시도해주세요.");
      setStep("error");
      return;
    }
    setStep("saving");

    const { error } = await supabase.from("face_users").insert({
      name:       name.trim(),
      descriptor: Array.from(descriptorRef.current),  // Float32Array → number[]
    });

    if (error) {
      setErrMsg(error.message);
      setStep("error");
    } else {
      // 총 등록 인원 조회
      const { count } = await supabase
        .from("face_users")
        .select("*", { count: "exact", head: true });
      setTotalCount(count ?? 0);
      setStep("done");
    }
  };

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
          <h2 className="text-white font-semibold text-lg">얼굴 등록</h2>
          <p className="text-slate-500 text-xs">생체 인증 등록 · Supabase</p>
        </div>
        {/* 단계 표시 */}
        <div className="ml-auto flex items-center gap-1.5">
          {(["guide","scanning","done"] as const).map((s) => (
            <div key={s} className={`rounded-full transition-all duration-300 ${
              step === s                                    ? "w-4 h-2 bg-blue-500"
              : (step !== "guide" && s === "guide")        ? "w-2 h-2 bg-blue-400"
              : (["done","saving"].includes(step) && s === "scanning") ? "w-2 h-2 bg-blue-400"
              : "w-2 h-2 bg-slate-700"
            }`} />
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-6">

        {/* ── 가이드 단계 ── */}
        {step === "guide" && (
          <>
            {/* 이름 입력 */}
            <div className="w-full bg-[#111827] border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                등록자 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && name.trim() && setStep("scanning")}
                placeholder="이름을 입력하세요"
                maxLength={20}
                className="w-full h-12 bg-[#0d1526] border border-blue-500/30 rounded-xl px-4 text-white placeholder-slate-600 text-sm outline-none focus:border-blue-500/60 transition-colors font-medium"
              />
              <p className="text-slate-600 text-xs">이 이름이 인증 성공 화면에 표시됩니다.</p>
            </div>

            {/* 안내 팁 */}
            <div className="flex flex-col gap-2.5">
              {[
                { icon: "☀️", text: "밝은 조명 아래에서 진행하세요" },
                { icon: "👤", text: "정면을 바라보고 표정을 자연스럽게 유지하세요" },
                { icon: "📐", text: "카메라와 30~50cm 거리를 유지하세요" },
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0f1623] border border-white/6 rounded-xl px-4 py-3">
                  <span className="text-base">{tip.icon}</span>
                  <span className="text-slate-300 text-sm">{tip.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => name.trim() && setStep("scanning")}
              disabled={!name.trim()}
              className={`w-full h-14 rounded-2xl font-semibold text-base transition-all duration-200 active:scale-[0.98] ${
                name.trim()
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                  : "bg-[#141929] border border-white/10 text-slate-600 cursor-not-allowed"
              }`}
            >
              {name.trim() ? `"${name}" 으로 등록 시작` : "이름을 먼저 입력해주세요"}
            </button>
          </>
        )}

        {/* ── 스캔 단계 ── */}
        {step === "scanning" && (
          <>
            {/* 등록자 정보 배지 */}
            <div className="bg-[#111827] border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{name}</p>
                <p className="text-slate-500 text-xs">128차원 얼굴 벡터 수집 중</p>
              </div>
              <div className="ml-auto">
                <div className={`w-2 h-2 rounded-full ${faceOk ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
              </div>
            </div>

            {/* 실시간 카메라 */}
            <FaceCamera onDetectionChange={onDetect} onDescriptorUpdate={onDescriptor} />

            {/* 진행 상태 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className={faceOk ? "text-blue-300" : "text-slate-500"}>
                  {faceOk ? "얼굴 감지됨 · 데이터 수집 중" : "얼굴을 화면 중앙에 맞춰주세요"}
                </span>
                <span className={faceOk ? "text-blue-400 font-bold" : "text-slate-600"}>
                  {progress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* 단계 인디케이터 */}
              <div className="flex justify-between mt-1">
                {["탐지","랜드마크","특징추출","인코딩","완료"].map((lbl, i) => (
                  <div key={lbl} className="flex flex-col items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      progress >= i * 20 + 10 ? "bg-blue-400 shadow-sm shadow-blue-400" : "bg-slate-700"
                    }`} />
                    <span className="text-slate-600 text-[10px]">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 저장 중 ── */}
        {step === "saving" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold">Supabase에 저장 중...</p>
            <p className="text-slate-500 text-sm text-center">
              128차원 얼굴 특징 벡터를<br />데이터베이스에 저장하는 중입니다
            </p>
          </div>
        )}

        {/* ── 완료 ── */}
        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-7">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/10 blur-2xl scale-150" />
              <div className="relative w-28 h-28 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-white text-xl font-bold mb-1">등록 완료!</h3>
              <p className="text-slate-400 text-sm">{name}님의 얼굴 데이터가 저장되었습니다.</p>
            </div>

            {/* 등록 정보 요약 */}
            <div className="w-full bg-[#111827] border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
              {[
                { label: "등록자",        value: name },
                { label: "특징 벡터 차원", value: "128-dim Float32" },
                { label: "저장 위치",      value: "Supabase PostgreSQL" },
                { label: "전체 등록 인원", value: `${totalCount}명` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400 text-sm">{row.label}</span>
                  <span className="text-blue-300 text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="w-full flex flex-col gap-3">
              <Link href="/authenticate" className="w-full">
                <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-transform">
                  인증 시작하기
                </button>
              </Link>
              <Link href="/" className="w-full">
                <button className="w-full h-14 rounded-2xl bg-[#141929] border border-white/10 text-slate-300 font-semibold text-base active:scale-[0.98] transition-transform">
                  홈으로
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ── 오류 ── */}
        {step === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="text-center w-full">
              <p className="text-white font-semibold mb-3">저장 실패</p>
              <p className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 break-all">
                {errMsg}
              </p>
            </div>
            <button
              onClick={() => setStep("scanning")}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold active:scale-[0.98] transition-transform"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
