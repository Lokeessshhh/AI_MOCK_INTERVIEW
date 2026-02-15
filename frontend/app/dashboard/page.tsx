'use client';

import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import { 
  Plus, Search, Brain, Calendar, Clock, BarChart3, 
  ArrowRight, Trash2, TrendingUp, Sparkles, 
  LayoutDashboard, BookOpen, ChevronRight,
  Zap, Target, Award, Users, SearchIcon
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, useDeferredValue, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { interviewAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const fetchInterviews = useCallback(async () => {
    try {
      const data = await interviewAPI.list(user?.id || "");
      setInterviews(data);
    } catch (err) {
      console.error("Error fetching interviews:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchInterviews();
    }
  }, [user, fetchInterviews]);

  useEffect(() => {
    router.prefetch('/interviews/new');
    router.prefetch('/dashboard');
  }, [router]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Confirm deletion of this simulation session?")) return;

    // Optimistic UI update for snappier feel
    let removed: any | undefined;
    setInterviews((prev) => {
      removed = prev.find((i) => i.id === id);
      return prev.filter((i) => i.id !== id);
    });
    try {
      await interviewAPI.delete(id.toString());
    } catch (err) {
      console.error("Error deleting interview:", err);
      // Rollback on failure
      if (removed) {
        setInterviews((prev) => [removed, ...prev]);
      }
    }
  }, []);

  const filteredInterviews = useMemo(() => {
    const q = deferredSearchTerm.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter((i) => (i.job_title || '').toLowerCase().includes(q));
  }, [interviews, deferredSearchTerm]);

  const stats = [
    { 
      label: "Total Simulations", 
      value: interviews.length, 
      icon: LayoutDashboard, 
      color: "text-blue-600", 
      bg: "bg-blue-50/50",
      description: "Interviews attempted",
      trend: "+12%"
    },
    { 
      label: "Avg. Proficiency", 
      value: (() => {
        const scoredInterviews = interviews.filter((i: any) => typeof i.ai_final_score === 'number' && i.ai_final_score > 0);
        const count = scoredInterviews.length;
        const avg = count > 0 ? scoredInterviews.reduce((acc: number, i: any) => acc + i.ai_final_score, 0) / count : 0;
        return `${avg.toFixed(1)}/10`;
      })(), 
      icon: TrendingUp, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50/50",
      description: "Across scored sessions",
      trend: "Top 5%"
    },
    { 
      label: "Ready for Hire", 
      value: "84%", 
      icon: Award, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50/50",
      description: "AI Match Score",
      trend: "Steady"
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFBFC] selection:bg-blue-100 font-sans pb-20">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/interviews/new" className="hidden sm:block">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-full px-8 h-9 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                New Interview
              </Button>
            </Link>
            <Link href="/interviews/new" className="sm:hidden">
              <Button className="w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </Button>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8 rounded-full border border-slate-200" } }} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 relative z-10">
        {/* Welcome Section */}
        <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 text-center lg:text-left items-center lg:items-end">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Welcome back, <span className="text-blue-600">{user?.firstName || 'Explorer'}</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Your career intelligence engine is primed and ready.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 sm:gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm w-fit"
          >
            <div className="flex -space-x-2 overflow-hidden px-1 sm:px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="inline-block h-6 w-6 sm:h-8 sm:w-8 rounded-full ring-2 ring-white bg-slate-100" />
              ))}
            </div>
            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-2 sm:pr-4">
              42+ Others practicing now
            </p>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="p-5 sm:p-6 border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all bg-white/50 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <stat.icon className="w-16 h-16 sm:w-24 sm:h-24 rotate-12" />
                </div>
                <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0 shadow-inner`}>
                    <stat.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
                      <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-transparent bg-blue-50 text-blue-600 py-0 px-1 sm:px-1.5 h-3.5 sm:h-4">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.description}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sessions Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left items-center sm:items-center">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Sessions</h3>
            <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search by job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing Intelligence...</p>
              </div>
            ) : filteredInterviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredInterviews.map((interview, i) => (
                  <motion.div 
                    key={interview.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-5 border-slate-200/60 hover:border-blue-200/80 transition-all shadow-sm hover:shadow-md group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4 sm:gap-5">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-lg sm:text-xl font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shrink-0">
                            {interview.job_title[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors truncate">{interview.job_title}</h4>
                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 sm:gap-x-4">
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                                {new Date(interview.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-transparent text-[8px] sm:text-[10px] font-bold uppercase px-1.5 sm:px-2 py-0.5">
                                {interview.difficulty}
                              </Badge>
                              <Badge className={`text-[8px] sm:text-[10px] font-bold uppercase px-1.5 sm:px-2 py-0.5 ${
                                interview.status === 'completed' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-blue-50 text-blue-600 border-blue-100'
                              }`} variant="outline">
                                {interview.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-10 mt-2 sm:mt-0">
                          <div className="flex flex-col items-start sm:items-end shrink-0">
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 sm:mb-1">Performance</span>
                            <span className={`text-xl sm:text-2xl font-bold tabular-nums ${
                              (interview.ai_final_score ?? 0) >= 7 ? 'text-emerald-600' : (interview.ai_final_score ?? 0) >= 4 ? 'text-blue-600' : 'text-slate-400'
                            }`}>
                              {typeof interview.ai_final_score === 'number' && interview.ai_final_score > 0 
                                ? interview.ai_final_score.toFixed(1)
                                : '—'}
                              <span className="text-[10px] sm:text-xs text-slate-300 font-medium ml-1">/10</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Link href={interview.status === 'completed' ? `/interviews/${interview.id}/results` : `/interviews/${interview.id}`} className="flex-1 sm:flex-none">
                              <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold text-[9px] sm:text-[11px] uppercase tracking-wider h-10 sm:h-11 px-4 sm:px-6 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                                {interview.status === 'completed' ? 'Results' : 'Continue'}
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDelete(interview.id)}
                              className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-24 rounded-[3rem] bg-white border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                  <Plus className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No interviews found</h3>
                <p className="text-slate-500 text-sm max-w-xs mb-8">Start your journey by creating your first personalized interview simulation.</p>
                <Link href="/interviews/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 transition-all active:scale-95">
                    Create Simulation
                  </Button>
                </Link>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
