import React, { useEffect, useRef, useState } from "react";
import {
  Play,RotateCcw,CheckCircle,Clipboard,Loader2,Sparkles,Zap,Moon,Sun,
}
from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { dracula } from "@uiw/codemirror-theme-dracula";

export default function App() {
  const [aiReady, setAiReady] = useState(false);
  const [inputCode, setInputCode] = useState(
    `function helloWorld(){\n  console.log("Hello, world!");\n}`
  );
  const [outputCode, setOutputCode] = useState("");
  const [targetLang, setTargetLang] = useState("Python");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [galaxy, setGalaxy] = useState(true);
  const audioCtxRef = useRef(null);
  const starCanvasRef = useRef(null);
  const animRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // check AI readiness
  useEffect(() => {
    if (window.puter?.ai?.chat) {
      setAiReady(true);
    } else {
      checkIntervalRef.current = setInterval(() => {
        if (window.puter?.ai?.chat) {
          setAiReady(true);
          clearInterval(checkIntervalRef.current);
        }
      }, 300);
    }
    return () => clearInterval(checkIntervalRef.current);
  }, []);

  // Initialize audio context
  function ensureAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  // Sounds
  function playChime(type = "success") {
    try {
      const ctx = ensureAudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type === "success" ? "sine" : "triangle";
      o.frequency.setValueAtTime(
        type === "success" ? 880 : 220,
        ctx.currentTime
      );
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.9);
    } catch {}
  }

  function playWhoosh() {
    try {
      const ctx = ensureAudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  // Starfield / galaxy
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let stars = [];
    const STAR_COUNT = Math.max(50, Math.floor((w * h) / 5000));

    function initStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 1.2,
          r: Math.random() * 1.4 + 0.2,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
        });
      }
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      initStars();
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(8,4,24,0.5)");
      g.addColorStop(0.5, "rgba(20,6,60,0.2)");
      g.addColorStop(1, "rgba(10,8,30,0.5)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx * s.z * 1.2;
        s.y += s.vy * s.z * 1.2;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        if (s.y > h) s.y = 0;
        const alpha = 0.6 * s.z + Math.sin(Date.now() / 500 + s.x) * 0.2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.max(
          0.15,
          Math.min(1, alpha)
        )})`;
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(frame);
    }

    initStars();
    frame();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [galaxy]);

  // Safe AI call
  async function safeAiConvert(prompt) {
    if (!window.puter?.ai?.chat) throw new Error("AI engine unavailable.");
    const res = await window.puter.ai.chat(prompt);
    return typeof res === "string" ? res : res?.message?.content || "";
  }

  // Convert handler
  const handleConvert = async () => {
    ensureAudioCtx();
    playWhoosh();
    if (!inputCode.trim()) {
      setFeedback("⚠️ Please enter some code.");
      return;
    }
    if (!aiReady) {
      setFeedback("⚡ AI not ready.");
      return;
    }

    setLoading(true);
    setFeedback("");
    setOutputCode("");

    try {
      const prompt = `Convert the following code into ${targetLang}. Only return code.\n\nCode:\n${inputCode}`;
      const reply = await safeAiConvert(prompt);
      if (!reply.trim()) throw new Error("Empty AI response.");
      setOutputCode(reply.trim());
      setFeedback("✅ Conversion successful!");
      playChime("success");
    } catch (err) {
      console.error(err);
      setFeedback(`❌ Error: ${err.message}`);
      playChime("error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputCode(`function helloWorld(){\n  console.log("Hello, world!");\n}`);
    setOutputCode("");
    setFeedback("");
  };
  const handleCopy = async () => {
    try {
      if (!outputCode) {
        setFeedback("⚠️ Nothing to copy.");
        return;
      }
      await navigator.clipboard.writeText(outputCode);
      setFeedback("📄 Copied!");
      playChime("success");
    } catch {
      setFeedback("❌ Copy failed.");
    }
  };

  const glow = "ring-2 ring-offset-2 ring-[#7c3aed]/30";

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        galaxy ? "text-white" : "text-slate-900"
      }`}
    >
      {/* Galaxy canvas */}
      <canvas
        ref={starCanvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: galaxy ? 0 : -1,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          transition: "opacity .6s ease",
          opacity: galaxy ? 1 : 0,
        }}
      />

      {/* Gradient backdrop */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: galaxy
            ? "radial-gradient(ellipse at 10% 10%, rgba(63,94,251,0.12), transparent 10%), radial-gradient(ellipse at 90% 80%, rgba(131,58,180,0.08), transparent 10%), linear-gradient(120deg, #050019 0%, #120025 50%, #04021a 100%)"
            : "linear-gradient(120deg,#0f172a 0%, #020617 100%)",
          transition: "all .6s ease",
        }}
      />

      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 ${glow}`}
        >
          <Sparkles className="w-5 h-5 text-pink-300" />
          <span className="font-bold text-lg tracking-tight">ByteConvert</span>
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/6">
            alpha
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setGalaxy((g) => !g);
              playChime("success");
            }}
            title="Toggle Coding Galaxy Mode"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-shadow"
          >
            {galaxy ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
            <span className="text-sm">{galaxy ? "Galaxy" : "Studio"}</span>
          </button>
          <button
            onClick={() => {
              setTimeout(
                () => alert("Sign in not implemented in Development Mode"),
                50
              );
              playChime("success");
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#7c3aed]/60 to-[#06b6d4]/40 hover:scale-105 transition-transform"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 pb-24 relative z-20">
        <section className="text-center mb-8">
          <h1
            className="text-5xl sm:text-6xl font-extrabold leading-tight drop-shadow-xl"
            style={{
              WebkitTextStroke: galaxy ? "0.5px rgba(255,255,255,0.03)" : "0",
            }}
          >
            <span
              style={{
                background: "linear-gradient(90deg,#8b5cf6,#06b6d4,#f472b6)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              AI Code Converter
            </span>
          </h1>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">
            Convert your code seamlessly between languages—fast, accurate, and
            ready for any project
          </p>
        </section>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white/6 backdrop-blur-md border border-white/10 text-white shadow-lg"
          >
            {["Python", "Java", "C++", "Go", "Rust", "TypeScript"].map((l) => (
              <option key={l} value={l} className="text-black">
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={handleConvert}
            disabled={loading}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] shadow-2xl active:scale-95 transition-transform disabled:opacity-60 ${
              loading ? "loading-wobble" : ""
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Play />}
            {loading ? "Converting..." : "Convert"}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-gradient-to-r from-[#ff6b6b] to-[#ff9a6b] shadow-lg active:scale-95 transition-transform"
          >
            <RotateCcw />
            <span>Reset</span>
          </button>
        </div>

        {/* Editors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            className={`rounded-2xl overflow-hidden ${glow} border border-white/10 shadow-2xl bg-white/5`}
          >
            <div className="px-4 py-3 bg-white/5 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Input</span>
                <span className="text-xs text-slate-300">— write code</span>
              </div>
              <div className="text-xs text-slate-300">JS (editable)</div>
            </div>
            <CodeMirror
              value={inputCode}
              height="420px"
              extensions={[javascript({ jsx: true })]}
              theme={dracula}
              onChange={(val) => setInputCode(val)}
            />
          </div>

          <div
            className={`rounded-2xl overflow-hidden ${glow} border border-white/10 shadow-2xl bg-white/5`}
          >
            <div className="px-4 py-3 bg-white/5 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400" />
                <span className="font-semibold">Output ({targetLang})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!outputCode}
                  className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                >
                  <Clipboard className="w-4 h-4 inline" /> Copy
                </button>
              </div>
            </div>
            <CodeMirror
              value={outputCode}
              height="420px"
              extensions={[javascript({ jsx: true })]}
              theme={dracula}
              editable={false}
            />
          </div>
        </div>

        {/* Feedback */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div
            className={`px-4 py-3 rounded-2xl ${
              feedback.includes("✅") ? "bg-emerald-900/30" : "bg-rose-900/20"
            } border border-white/8 text-sm`}
          >
            {feedback ||
              (aiReady
                ? "AI is ready — launch conversion!"
                : "Initializing AI...")}
          </div>
          <div className="text-sm text-slate-300 flex items-center gap-3">
            <Zap className="w-4 h-4" /> Pro tip: Toggle Galaxy Mode for
            late-night ambiance.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-6 left-6 right-6 flex justify-end items-center pointer-events-none z-20">
      </footer>

      {/* Inline styles */}
      <style>{`
        @keyframes glowPulse {0% { box-shadow: 0 0 10px rgba(124,58,237,0.12),0 4px 20px rgba(6,182,212,0.06); }50% { box-shadow: 0 0 28px rgba(124,58,237,0.18),0 6px 30px rgba(6,182,212,0.09); }100% { box-shadow: 0 0 10px rgba(124,58,237,0.12),0 4px 20px rgba(6,182,212,0.06); } }
        .ring-2 { animation: glowPulse 3.6s ease-in-out infinite; }
        .loading-wobble { transform-origin: center; animation: wobble 1s linear infinite; }
        @keyframes wobble { 0% { transform: translateY(0); }50% { transform: translateY(-3px) rotate(-0.6deg); }100% { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
