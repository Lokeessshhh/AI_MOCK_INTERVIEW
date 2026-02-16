'use client';

import { motion } from "framer-motion";
import { Brain, Target, Zap, ChevronRight, Lock, BookOpen, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const paths = [
  {
    id: 1,
    title: "System Architecture Elite",
    desc: "Master large-scale distributed systems and high-availability design patterns.",
    level: "Advanced",
    duration: "12h",
    modules: 8,
    locked: false,
    color: "bg-blue-50 border-blue-100 text-blue-600"
  },
  {
    id: 2,
    title: "Executive Behavioral",
    desc: "Psychology-based response strategies for high-stakes leadership roles.",
    level: "Intermediate",
    duration: "6h",
    modules: 5,
    locked: true,
    color: "bg-indigo-50 border-indigo-100 text-indigo-600"
  }
];

export default function LearningPathsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 overflow-x-hidden relative flex flex-col font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 glass-nav h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg blue-gradient flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Learning Paths</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900 px-4 text-[10px] font-bold uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 pt-24 pb-20 px-6 max-w-5xl mx-auto w-full">
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-widest mb-4">
            <Target className="w-2.5 h-2.5" />
            <span>Skill Acquisition</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight italic mb-2">
            Skill <span className="text-blue-600">Trajectories</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Engineered curricula for rapid subject matter authority.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paths.map((path, i) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 hover:border-blue-200 transition-all shadow-sm group relative overflow-hidden"
            >
              <div className={`w-12 h-12 rounded-xl ${path.color.split(' ')[0]} ${path.color.split(' ')[1]} flex items-center justify-center mb-6`}>
                <Zap className={`w-6 h-6 ${path.color.split(' ')[2]}`} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[8px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-400 font-bold uppercase tracking-widest">{path.level}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock className="w-2.5 h-2.5" /> {path.duration}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight italic">{path.title}</h3>
                <p className="text-slate-500 text-[10px] font-medium leading-relaxed uppercase tracking-widest">{path.desc}</p>
                <div className="pt-4">
                  {path.locked ? (
                    <Button disabled className="w-full rounded-xl bg-slate-50 text-slate-300 border-slate-100 text-[9px] font-bold uppercase tracking-widest py-5 h-auto">
                      <Lock className="w-3 h-3 mr-2" /> Protocol Locked
                    </Button>
                  ) : (
                    <Button className="w-full rounded-xl blue-gradient text-white text-[9px] font-bold uppercase tracking-widest py-5 h-auto shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                      Initialize Path <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
