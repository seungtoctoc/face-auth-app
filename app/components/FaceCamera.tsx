"use client";

import { useEffect, useRef, useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

export interface MatchResult {
  name: string;
  similarity: number;
}

interface FaceCameraProps {
  onDetectionChange?: (detected: boolean) => void;
  onDescriptorUpdate?: (descriptor: Float32Array | null) => void;
  matchResult?: MatchResult | null;
}

// ── 유틸리티 ──────────────────────────────────────────────────────────
type Pt  = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };
const rng = (s: number, e: number) => Array.from({ length: e - s }, (_, i) => i + s);

// ① 내부 도트 매트릭스 그리드
function drawDotMatrix(ctx: CanvasRenderingContext2D, { x, y, width: w, height: h }: Box) {
  ctx.fillStyle = "rgba(96,165,250,0.09)";
  const sp = 18;
  for (let gx = x + sp; gx < x + w - 4; gx += sp)
    for (let gy = y + sp; gy < y + h - 4; gy += sp) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
}

// ② 글로우 외곽선 박스
function drawGlowBox(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w, height: h }: Box,
  rgb: string, pulse: number
) {
  ctx.save();
  ctx.shadowBlur  = 32 * pulse;
  ctx.shadowColor = `rgba(${rgb},0.9)`;
  ctx.strokeStyle = `rgba(${rgb},${0.22 * pulse})`;
  ctx.lineWidth   = 5;
  ctx.strokeRect(x - 7, y - 7, w + 14, h + 14);
  ctx.restore();
  ctx.strokeStyle = `rgba(${rgb},0.55)`;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x, y, w, h);
}

// ③ 애니메이션 코너 브라켓
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w, height: h }: Box,
  color: string, pulse: number
) {
  const cLen = Math.min(w, h) * 0.22 * pulse;
  ctx.save();
  ctx.shadowBlur  = 24 * pulse;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 4;
  ctx.lineCap     = "round";
  const corners: [number,number,number,number,number,number][] = [
    [x,       y + cLen, x,     y,     x + cLen, y    ],
    [x+w-cLen,y,        x + w, y,     x + w,    y+cLen],
    [x,       y+h-cLen, x,     y + h, x + cLen, y + h],
    [x+w-cLen,y + h,    x + w, y + h, x + w,    y+h-cLen],
  ];
  corners.forEach(([x1,y1,x2,y2,x3,y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3);
    ctx.stroke();
  });
  ctx.restore();
}

// ④ 수평 스캔 라인
function drawScanLine(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w, height: h }: Box,
  frame: number
) {
  const sy = y + ((Math.sin(frame * 0.055) + 1) / 2) * h;
  const sg = ctx.createLinearGradient(x, 0, x + w, 0);
  sg.addColorStop(0,   "transparent");
  sg.addColorStop(0.15,"rgba(147,197,253,0.05)");
  sg.addColorStop(0.5, "rgba(96,165,250,0.9)");
  sg.addColorStop(0.85,"rgba(147,197,253,0.05)");
  sg.addColorStop(1,   "transparent");
  ctx.save();
  ctx.shadowBlur  = 16;
  ctx.shadowColor = "#60a5fa";
  ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy);
  ctx.strokeStyle = sg;
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  // 스캔 위 영역 미세 채우기
  ctx.fillStyle = "rgba(59,130,246,0.02)";
  ctx.fillRect(x, y, w, sy - y);
  ctx.restore();
}

// ⑤ 색상별 랜드마크 연결선 (68점)
function drawColoredSegments(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const segs = [
    { i: rng(0,17),  c:"rgba(148,163,184,0.5)", w:1.2, cl:false }, // 턱선
    { i: rng(17,22), c:"rgba(251,191,36,0.75)", w:1.5, cl:false }, // 왼쪽 눈썹
    { i: rng(22,27), c:"rgba(251,191,36,0.75)", w:1.5, cl:false }, // 오른쪽 눈썹
    { i: rng(27,31), c:"rgba(249,115,22,0.7)",  w:1.2, cl:false }, // 코 다리
    { i: rng(31,36), c:"rgba(249,115,22,0.7)",  w:1.2, cl:false }, // 코 끝
    { i: rng(36,42), c:"rgba(34,211,238,0.85)", w:1.5, cl:true  }, // 왼쪽 눈
    { i: rng(42,48), c:"rgba(34,211,238,0.85)", w:1.5, cl:true  }, // 오른쪽 눈
    { i: rng(48,60), c:"rgba(74,222,128,0.8)",  w:1.5, cl:true  }, // 입술 외곽
    { i: rng(60,68), c:"rgba(134,239,172,0.65)",w:1.2, cl:true  }, // 입술 내곽
  ];
  segs.forEach(({ i: idxs, c, w, cl }) => {
    ctx.beginPath();
    idxs.forEach((idx, j) => {
      const p = pts[idx];
      j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    if (cl) ctx.closePath();
    ctx.strokeStyle = c;
    ctx.lineWidth   = w;
    ctx.stroke();
  });
}

// ⑥ 글로우 랜드마크 점
function drawGlowDots(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const regions = [
    { r:[0,17],  c:"#94a3b8" },   // 턱
    { r:[17,27], c:"#fbbf24" },   // 눈썹
    { r:[27,36], c:"#fb923c" },   // 코
    { r:[36,48], c:"#22d3ee" },   // 눈
    { r:[48,68], c:"#4ade80" },   // 입
  ];
  pts.forEach((p, i) => {
    const color = regions.find(rc => i >= rc.r[0] && i < rc.r[1])?.c ?? "#93c5fd";
    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  });
}

// ⑦ 코너 회로 장식
function drawCircuitDeco(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w, height: h }: Box,
  alpha: number
) {
  ctx.save();
  ctx.strokeStyle = `rgba(96,165,250,${alpha * 0.28})`;
  ctx.lineWidth   = 0.8;
  ctx.setLineDash([2, 6]);
  const e = 28, z = 9;
  const lines: [number,number,number,number,number,number][] = [
    [x-e,   y,     x-z,   y,     x-z,   y-z  ],
    [x,     y-e,   x,     y-z,   x+z,   y-z  ],
    [x+w+e, y,     x+w+z, y,     x+w+z, y-z  ],
    [x+w,   y-e,   x+w,   y-z,   x+w-z, y-z  ],
    [x-e,   y+h,   x-z,   y+h,   x-z,   y+h+z],
    [x,     y+h+e, x,     y+h+z, x+z,   y+h+z],
    [x+w+e, y+h,   x+w+z, y+h,   x+w+z, y+h+z],
    [x+w,   y+h+e, x+w,   y+h+z, x+w-z, y+h+z],
  ];
  lines.forEach(([x1,y1,x2,y2,x3,y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
}

// ⑧ 파티클 스폰 (코너에서 방출)
function spawnParticles(particles: Particle[], { x, y, width: w, height: h }: Box) {
  const corners = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]];
  const colors  = ["#60a5fa","#93c5fd","#a5b4fc","#67e8f9","#86efac","#fbbf24","#f0abfc"];
  corners.forEach(([cx,cy]) => {
    if (Math.random() < 0.4) {
      particles.push({
        x:  cx + (Math.random()-0.5) * 20,
        y:  cy + (Math.random()-0.5) * 20,
        vx: (Math.random()-0.5) * 3,
        vy: (Math.random()-0.5) * 3 - 0.5,
        life:    1,
        maxLife: 50 + Math.random() * 60,
        color:   colors[Math.floor(Math.random()*colors.length)],
        size:    1 + Math.random() * 2.5,
      });
    }
  });
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy -= 0.03;
    p.life -= 1 / p.maxLife;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.shadowBlur  = 9;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

// ⑨ 상단 레이블 (FACE ID / 이름 + 일치율)
function drawLabel(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w }: Box,
  frame: number,
  match: MatchResult | null | undefined
) {
  const lx    = x + w / 2;
  const ly    = y - 14;
  const alpha = 0.65 + 0.35 * Math.sin(frame * 0.12);
  ctx.save();
  ctx.textAlign = "center";
  ctx.font      = "bold 11px 'Courier New', monospace";

  if (match && match.similarity >= 80) {
    ctx.shadowBlur  = 20;
    ctx.shadowColor = "#4ade80";
    ctx.fillStyle   = "#4ade80";
    ctx.fillText(`✓  ${match.name}   ${match.similarity}%`, lx, ly);
  } else if (match && match.similarity >= 50) {
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = "#fbbf24";
    ctx.fillStyle   = "#fbbf24";
    ctx.fillText(`◐  ${match.name}  ${match.similarity}%`, lx, ly);
  } else {
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = "#60a5fa";
    ctx.fillStyle   = "#93c5fd";
    ctx.fillText("◈  FACE  ID  SCANNING", lx, ly);
  }
  ctx.restore();
}

// ⑩ 성공 시 반짝이는 삼중 링
function drawSuccessRings(
  ctx: CanvasRenderingContext2D,
  { x, y, width: w, height: h }: Box,
  frame: number
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r  = Math.max(w, h) / 2 + 8;
  [0, 0.4, 0.8].forEach((offset, i) => {
    const scale = 1 + i * 0.12;
    const a = Math.max(0, Math.sin(frame * 0.08 + offset) * 0.5 + 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = "#4ade80";
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * scale, r * scale * (h/w), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

// ── 메인 드로우 함수 ──────────────────────────────────────────────────
function drawAll(
  ctx:       CanvasRenderingContext2D,
  box:       Box,
  pts:       Pt[],
  frame:     number,
  particles: Particle[],
  match:     MatchResult | null | undefined
) {
  const t       = frame * 0.04;
  const pulse   = 0.85 + 0.15 * Math.sin(t * 2.5);
  const fp      = 0.90 + 0.10 * Math.sin(t * 6);
  const isGreen = (match?.similarity ?? 0) >= 80;
  const rgb     = isGreen ? "74,222,128"  : "59,130,246";
  const bright  = isGreen ? "#86efac"     : "#60a5fa";

  drawDotMatrix(ctx, box);
  drawGlowBox(ctx, box, rgb, pulse);
  drawCornerBrackets(ctx, box, bright, fp);

  if (isGreen) {
    drawSuccessRings(ctx, box, frame);
  } else {
    drawScanLine(ctx, box, frame);
  }

  ctx.save(); drawColoredSegments(ctx, pts); ctx.restore();
  ctx.save(); drawGlowDots(ctx, pts);        ctx.restore();
  drawCircuitDeco(ctx, box, pulse);

  spawnParticles(particles, box);
  ctx.save(); renderParticles(ctx, particles); ctx.restore();
  drawLabel(ctx, box, frame, match);
}

// ── React 컴포넌트 ────────────────────────────────────────────────────
export default function FaceCamera({
  onDetectionChange,
  onDescriptorUpdate,
  matchResult,
}: FaceCameraProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 콜백 ref (effect 재실행 없이 최신값 유지)
  const cbDetect  = useRef(onDetectionChange);
  const cbDesc    = useRef(onDescriptorUpdate);
  const matchRef  = useRef(matchResult);
  useEffect(() => { cbDetect.current = onDetectionChange; }, [onDetectionChange]);
  useEffect(() => { cbDesc.current   = onDescriptorUpdate; }, [onDescriptorUpdate]);
  useEffect(() => { matchRef.current = matchResult; },        [matchResult]);

  const frameRef    = useRef(0);
  const particles   = useRef<Particle[]>([]);
  const [status,   setStatus]   = useState<"models"|"camera"|"ready">("models");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let animId    = 0;
    let stream: MediaStream | null = null;

    const run = async () => {
      // ① face-api.js 동적 임포트 (SSR 방지)
      const faceapi = await import("face-api.js");
      if (cancelled) return;

      // ② 3개 모델 병렬 로드
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      if (cancelled) return;
      setStatus("camera");

      // ③ 카메라 스트림
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      const vid = videoRef.current!;
      vid.srcObject = stream;
      await new Promise<void>(res => {
        if (vid.readyState >= 2) return res();
        vid.onloadeddata = () => res();
      });
      if (cancelled) return;
      setStatus("ready");

      // ④ 실시간 감지 루프
      const loop = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || v.readyState < 2) { animId = requestAnimationFrame(loop); return; }

        const sz = { width: v.videoWidth, height: v.videoHeight };
        faceapi.matchDimensions(c, sz);
        frameRef.current++;

        try {
          const results = await faceapi
            .detectAllFaces(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceLandmarks(true)
            .withFaceDescriptors();          // ← 128차원 벡터 추출

          if (cancelled) return;

          const ctx = c.getContext("2d")!;
          ctx.clearRect(0, 0, c.width, c.height);

          const resized = faceapi.resizeResults(results, sz);
          const det     = resized.length > 0;

          setDetected(prev => {
            if (prev !== det) cbDetect.current?.(det);
            return det;
          });

          if (det && resized[0]) {
            cbDesc.current?.(resized[0].descriptor);
            drawAll(
              ctx,
              resized[0].detection.box,
              resized[0].landmarks.positions,
              frameRef.current,
              particles.current,
              matchRef.current
            );
          } else {
            cbDesc.current?.(null);
          }
        } catch { /* 프레임 오류 무시 */ }

        animId = requestAnimationFrame(loop);
      };

      loop();
    };

    run().catch(console.error);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] bg-[#060d1f] rounded-2xl overflow-hidden border border-blue-900/30">
      {/* 카메라 피드 (셀피 좌우반전) */}
      <video
        ref={videoRef} autoPlay muted playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      {/* 얼굴 감지 오버레이 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* 모델/카메라 로딩 오버레이 */}
      {status !== "ready" && (
        <div className="absolute inset-0 bg-[#060d1f] flex flex-col items-center justify-center gap-3 z-20">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">
            {status === "models" ? "AI 모델 로딩 중..." : "카메라 연결 중..."}
          </p>
          {status === "models" && (
            <p className="text-slate-600 text-xs">얼굴 인식 모델 포함 (~10MB)</p>
          )}
        </div>
      )}

      {/* 감지 상태 배지 */}
      {status === "ready" && (
        <div className={`absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm transition-all duration-300 ${
          detected
            ? "bg-blue-500/20 border border-blue-400/40 text-blue-300"
            : "bg-black/60 border border-white/10 text-slate-400"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${detected ? "bg-blue-400 animate-pulse" : "bg-slate-500"}`} />
          {detected ? "얼굴 감지됨" : "얼굴을 화면에 맞춰주세요"}
        </div>
      )}

      {/* 얼굴 미감지 시 가이드 타원 */}
      {status === "ready" && !detected && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-36 h-44 rounded-full border-2 border-dashed border-blue-500/20 animate-pulse" />
        </div>
      )}
    </div>
  );
}
