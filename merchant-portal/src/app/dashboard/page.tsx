"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  Gavel,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Bell,
  Cpu,
  Fingerprint,
  Zap,
  Terminal as TerminalIcon,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { HP2_PRESET } from "@/components/Hyperspeed";
import { useVaults } from "@/hooks/useVaults";

const Hyperspeed = dynamic(() => import("@/components/Hyperspeed"), { ssr: false });

// --- Components ---

const CyberStat = ({ title, value, subtext, icon: Icon, glow }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="cyber-panel p-5 group flex flex-col gap-2"
  >
    <div className="flex items-center justify-between">
      <Icon className={cn("w-5 h-5", glow ? "text-primary glow-text" : "text-slate-500")} />
      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Live Data</span>
    </div>
    <div>
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white tracking-tighter glow-text">{value}</h3>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <div className={cn("w-1 h-1 rounded-full animate-pulse", glow ? "bg-primary" : "bg-slate-700")} />
      <p className="text-[10px] font-mono text-slate-400 capitalize">{subtext}</p>
    </div>
  </motion.div>
);

const JuryTerminal = () => {
  const [logs, setLogs] = useState([
    "Initializing Jury Consensus Engine...",
    "Scanning Delivery Proofs for Cart ID: ORD-2024...",
    "Agent 0x7B (Verdict-AI) casting VOTE: APPROVE",
    "Evidence verified: Carrier Signed (Track: #88219)",
    "Waiting for 3/5 Majority Signature..."
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newLogs = [
        `Syncing Block #${Math.floor(Math.random() * 1000) + 9000}...`,
        `Epoch delta: ${Math.random().toFixed(4)}ms`,
        `AI Juor #${Math.floor(Math.random() * 5) + 1} analyzing SLA: Delivery Delay < 24h`,
        `Consensus weight: 88.2%`
      ];
      setLogs(prev => [...prev.slice(-12), newLogs[Math.floor(Math.random() * newLogs.length)]]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-panel border-l-0 bg-black/80 h-full flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">Dispute Terminal</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
      </div>
      <div className="p-4 font-mono text-[10px] leading-relaxed overflow-hidden flex-1">
        {logs.map((log, i) => (
          <div key={i} className={cn(
            "mb-1",
            log.includes("VOTE") ? "text-primary" :
              log.includes("Block") ? "text-slate-500" : "text-slate-300"
          )}>
            <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
            {log}
          </div>
        ))}
        <div className="animate-pulse text-primary mt-2">_</div>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function MerchantConsole() {
  const [activeTab, setActiveTab] = useState("vaults");
  const [mounted, setMounted] = useState(false);
  const { vaults, loading, yieldRate } = useVaults("0x3f...921F");

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col selection:bg-primary/30">
      <div className="noise-overlay" />

      {/* Top Navbar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
              <Zap className="w-4 h-4 text-black font-bold" />
            </div>
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-white">HP2-Vault</span>
          </div>
          <nav className="flex gap-6">
            {["Dashboard", "Analytics", "Settlements"].map(item => (
              <button key={item}
                className={cn(
                  "text-[10px] uppercase font-mono tracking-widest transition-colors",
                  item === "Dashboard" ? "text-primary" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-500">
            <Activity className="w-4 h-4" />
            <div className="h-4 w-[1px] bg-white/10" />
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3 px-3 py-1 bg-white/[0.03] border border-white/5 font-mono text-[10px]">
            <Wallet className="w-3.3 text-primary" />
            <span className="text-slate-300 uppercase">0x3f...921F</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Stats Column (3/12) */}
        <div className="col-span-12 lg:col-span-3 border-r border-white/5 p-6 flex flex-col gap-6 bg-black/20">
          <CyberStat
            title="Total Protected Val"
            value="$2,450,192"
            subtext="HashKey PayFi Volume"
            icon={ShieldCheck}
            glow
          />
          <CyberStat
            title="Accrued Ecosystem Yield"
            value={`+$${(yieldRate || 12450.21).toLocaleString()}`}
            subtext={`${(8.5).toFixed(1)}% Real-time APY`}
            icon={TrendingUp}
            glow
          />
          <CyberStat
            title="Consensus Reliability"
            value="99.98%"
            subtext="Jury Node Uptime"
            icon={Fingerprint}
          />

          <div className="mt-auto space-y-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between uppercase font-mono text-[9px] text-slate-500 tracking-widest">
                <span>Network Status</span>
                <span className="text-green-500">Stable</span>
              </div>
              <div className="h-24 w-full flex items-end gap-1 px-1">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${20 + Math.random() * 80}%` }}
                    transition={{ repeat: Infinity, duration: 1 + Math.random(), repeatType: 'reverse' }}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors"
                  />
                ))}
              </div>
              <p className="text-[9px] font-mono text-center text-slate-600">ID: 133 · VERDICT-V1.0.2</p>
            </div>
          </div>
        </div>

        {/* Center Main Feed (6/12) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col">
          {/* Hero Interaction Zone */}
          <div className="relative h-64 border-b border-white/5 overflow-hidden group">
            <Hyperspeed effectOptions={HP2_PRESET} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-black/20" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Engine Online</span>
                </div>
                <h1 className="text-4xl font-extrabold text-white tracking-tighter glow-text">COMMAND CENTER</h1>
              </motion.div>
            </div>
            <div className="absolute top-8 right-8">
              <button className="cyber-button">Initialize Vault +</button>
            </div>
          </div>

          {/* Unit List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 cyber-grid capitalize">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LayoutDashboard className="w-3.5 h-3.5" /> Deployment Units
              </h2>
              <span className="text-[10px] font-mono text-slate-600">{vaults.length} Units Active</span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center border border-white/5 bg-black/40">
                <span className="text-xs font-mono text-slate-500 animate-pulse uppercase tracking-widest">Accessing Blockchain Cache...</span>
              </div>
            ) : (
              vaults.map((vault: any) => (
                <motion.div
                  key={vault.id}
                  layoutId={vault.id}
                  className="cyber-panel p-0 hover:bg-white/[0.02] cursor-pointer group"
                >
                  <div className="flex h-20">
                    <div className={cn(
                      "w-1 transition-all group-hover:w-2",
                      vault.status === 'disputed' ? "bg-red-500" :
                        vault.status === 'released' ? "bg-primary" : "bg-blue-500"
                    )} />
                    <div className="flex-1 p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-white font-bold tracking-tight text-sm uppercase">{vault.id}</span>
                        <span className="text-[10px] font-mono text-slate-500 tracking-tighter truncate w-32">{vault.paymentRef}</span>
                      </div>
                      <div className="text-center px-4">
                        <div className="text-xs font-bold text-white px-2">${vault.amount.toLocaleString()}</div>
                        <div className="text-[9px] font-mono text-slate-500">{vault.coin}</div>
                      </div>
                      <div className="flex-1 flex flex-col items-end gap-1">
                        <div className={cn(
                          "text-[9px] px-2 py-0.5 border font-mono uppercase tracking-widest",
                          vault.status === 'disputed' ? "text-red-500 border-red-500/20 bg-red-500/5" :
                            vault.status === 'released' ? "text-primary border-primary/20 bg-primary/5" : "text-blue-400 border-blue-400/20 bg-blue-400/5"
                        )}>
                          {vault.status}
                        </div>
                        <span className="text-[10px] text-accent font-bold">+$ {Number(vault.yieldAccrued).toFixed(4)}</span>
                      </div>
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Console Column (3/12) */}
        <div className="col-span-12 lg:col-span-3 border-l border-white/5 bg-black z-10 flex flex-col">
          <JuryTerminal />

          <div className="p-6 border-t border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Gavel className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Active Arbitration</span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className="text-slate-500">Case #9921</span>
                  <span className="text-primary tracking-widest">72h Left</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} className="h-full bg-primary" />
                </div>
              </div>
            </div>
            <button className="w-full py-3 mt-2 border border-white/5 text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              Security Audit v1.0.4
            </button>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-black px-6 flex items-center justify-between z-50">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Node 0x1A: Syncing</span>
          </div>
          <span className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.2em] hidden md:block">Latency: 12ms</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">HashKey Horizon v2.0</span>
        </div>
      </footer>
    </div>
  );
}
