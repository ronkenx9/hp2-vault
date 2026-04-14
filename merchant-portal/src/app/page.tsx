"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { HP2_PRESET } from "@/components/Hyperspeed";

const Hyperspeed = dynamic(() => import("@/components/Hyperspeed"), { ssr: false });

export default function LandingPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <div className="relative min-h-screen bg-[#080810] overflow-hidden">

            {/* ── Full-Screen Hyperspeed Background ── */}
            <div className="absolute inset-0 z-0">
                <Hyperspeed effectOptions={HP2_PRESET} />
                <div className="absolute inset-0 bg-gradient-to-b from-[#080810]/70 via-transparent to-[#080810]" />
            </div>

            {/* ── Scroll Progress (Left Edge) ── */}
            <div className="fixed top-0 left-0 w-[2px] h-screen bg-white/[0.06] z-50">
                <div className="w-full h-[30%] bg-[#D4A017]" />
            </div>

            {/* ── Navigation ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-[#D4A017]/40 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#D4A017]" />
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-white/60">HP2-Vault</span>
                </div>
                <div className="flex items-center gap-10">
                    {["Protocol", "Technology", "Docs"].map(item => (
                        <a key={item} href="#" className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-[#D4A017] transition-colors duration-300">
                            {item}
                        </a>
                    ))}
                    <Link href="/dashboard" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#D4A017] border border-[#D4A017]/30 px-5 py-2 hover:bg-[#D4A017] hover:text-black transition-all duration-300">
                        Console
                    </Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <main className="relative z-10 min-h-screen flex">

                {/* Left Column — Editorial Text */}
                <div className="flex-1 flex flex-col justify-end px-12 pb-24">

                    {/* Tag */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-2 bg-[#D4A017] animate-pulse" />
                        <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/30">HashKey Horizon · PayFi Track</span>
                    </div>

                    {/* Headline — Serif, raw, editorial */}
                    <h1 className="font-display text-[4.5rem] leading-[0.92] text-white tracking-tight max-w-2xl">
                        Yield-bearing escrow,
                        <br />
                        <span className="text-[#D4A017] glow-text">guarded by AI.</span>
                    </h1>

                    {/* Subtext */}
                    <p className="mt-8 text-base text-white/35 max-w-md leading-relaxed font-light">
                        <span className="text-[#D4A017] font-mono text-[10px] tracking-widest uppercase mr-2">[Hold to Accelerate]</span>
                        HP2-Vault locks merchant capital in yield-generating escrow
                        while an autonomous AI jury resolves disputes through on-chain consensus.
                    </p>

                    {/* Actions — minimal, brutalist */}
                    <div className="mt-12 flex items-center gap-6">
                        <Link href="/dashboard" className="group flex items-center gap-3 border border-white/10 px-8 py-4 hover:border-[#D4A017]/50 transition-all duration-500">
                            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/70 group-hover:text-[#D4A017] transition-colors">Access Console</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#D4A017] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                        <a href="#" className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
                            Ecosystem Narrative →
                        </a>
                    </div>
                </div>

                {/* Right Column — Stats Strip */}
                <div className="hidden lg:flex w-[280px] flex-col justify-end pb-24 pr-12 gap-12 text-right">
                    {[
                        { label: "TVL Protected", value: "$2.4M", change: "+12.4%" },
                        { label: "Jury Uptime", value: "99.98%", change: "5 Nodes" },
                        { label: "Yield APY", value: "8.5%", change: "Real-time" },
                    ].map(stat => (
                        <div key={stat.label} className="group">
                            <p className="font-mono text-[8px] tracking-[0.3em] uppercase text-white/20 mb-1">{stat.label}</p>
                            <p className="font-display text-2xl text-white/80 group-hover:text-[#D4A017] transition-colors">{stat.value}</p>
                            <p className="font-mono text-[9px] text-[#3DB87A]/60 mt-1">{stat.change}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── Bottom Bar ── */}
            <footer className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-12 py-4 border-t border-white/[0.03] bg-[#080810]/60 backdrop-blur-sm">
                <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-white/15">
                    Verdict Engine v1.0 · Chain ID: 133
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3DB87A] animate-pulse" />
                    <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-white/15">
                        Protocol Active
                    </span>
                </div>
            </footer>
        </div>
    );
}
