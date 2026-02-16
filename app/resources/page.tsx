'use client';

import { motion } from "framer-motion";
import { Brain, BookOpen, Download, Star, Search, Filter, PlayCircle, FileText, Globe2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const resources = [
  {
    id: 1,
    type: "Guide",
    title: "System Blueprint",
    desc: "Manual on scaling architectures.",
    tags: ["Scale"],
    rating: 4.9,
    downloads: "12k",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    id: 2,
    type: "Case Study",
    title: "Stream Analysis",
    desc: "CDN and microservices deep dive.",
    tags: ["Cloud"],
    rating: 4.8,
    downloads: "8k",
    icon: Globe2,
    color: "text-indigo-600",
    bg: "bg-indigo-50"
  }
];

export default function ResourceHubPage() {
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
            <span className="text-sm font-bold tracking-tight">Resource Hub</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900 px-4 text-[10px] font-bold uppercase tracking-widest">
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 pt-24 pb-20 px-6 max-w-5xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-widest mb-4">
              <BookOpen className="w-2.5 h-2.5" />
              <span>Intel Repository</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight italic mb-2">
              Knowledge <span className="text-blue-600">Assets</span>
            </h1>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Query..." className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-900 focus:outline-none focus:border-blue-300 w-48 shadow-sm" />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res, i) => (
            <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl border border-slate-200 p-6 group hover:border-blue-200 transition-all shadow-sm flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-10 h-10 rounded-xl ${res.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <res.icon className={`w-5 h-5 ${res.color}`} />
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 text-blue-600 fill-current" />
                  <span className="text-[10px] font-bold text-slate-900">{res.rating}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight italic">{res.title}</h3>
                <p className="text-slate-500 text-[10px] font-medium leading-relaxed uppercase tracking-widest">{res.desc}</p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{res.downloads} ACCESSES</span>
                <Button size="sm" className="rounded-lg blue-gradient text-white font-bold uppercase tracking-widest text-[9px] px-4 h-8 shadow-md shadow-blue-500/10">Acquire</Button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
