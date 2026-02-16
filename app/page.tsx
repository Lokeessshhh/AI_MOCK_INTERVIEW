'use client';

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { Brain, ArrowRight, Star, Sparkles, MessageSquare, Zap, Globe2, ChevronRight, PlayCircle, ShieldCheck, BarChart3, Target, Users, Layout, FileUp, ClipboardCheck, History, PieChart, MousePointer2, Activity } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { healthAPI } from "@/lib/api";

const FloatingElement = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    animate={{ 
      y: [0, -12, 0],
      rotate: [-1, 1, -1]
    }}
    transition={{ 
      duration: 5, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Home() {
  const { isSignedIn } = useUser();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Wake up backend on page load
    healthAPI.check().then((isOnline) => {
      setBackendStatus(isOnline ? 'online' : 'offline');
    });
  }, []);

  const checkBackend = () => {
    setBackendStatus('checking');
    healthAPI.check().then((isOnline) => {
      setBackendStatus(isOnline ? 'online' : 'offline');
    });
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-600 overflow-x-hidden text-slate-900">
      {/* 3D Decorative Elements (SVG/CSS) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[5%] w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-[10%] left-[5%] w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="fixed top-0 w-full z-50 glass-nav h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg blue-gradient flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 uppercase tracking-tighter">PrepAI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="#students" className="hover:text-blue-600 transition-colors">Students</a>
            <a href="#interviewers" className="hover:text-blue-600 transition-colors">Interviewers</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Capabilities</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Status Indicator */}
            <button
              onClick={checkBackend}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-blue-600 transition-colors bg-white/50 backdrop-blur-sm"
              title="Click to check backend status"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                backendStatus === 'offline' ? 'bg-rose-500 shadow-sm shadow-rose-500/50' :
                'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-[10px] font-medium text-slate-600">
                {backendStatus === 'online' ? 'Backend Online' :
                 backendStatus === 'offline' ? 'Backend Offline' :
                 'Waking...'}
              </span>
            </button>

            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors px-3">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-2 rounded-lg blue-gradient text-white text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                    Get Started
                  </button>
                </SignUpButton>
              </>
            ) : (
              <Link href="/dashboard">
                <Button size="sm" className="rounded-lg blue-gradient text-white font-bold uppercase tracking-widest text-[10px] px-5 h-9">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 scroll-smooth">
        {/* Compact Hero Section */}
        <section className="pt-32 pb-32 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
            <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-left relative z-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 backdrop-blur-sm border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Gen Interview Intelligence</span>
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                  Ace your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Career Tech.</span>
                </h1>
                <p className="max-w-md text-slate-500 text-base sm:text-lg leading-relaxed mb-10 font-medium">
                  Hyper-realistic AI simulations for students and powerful screening tools for interviewers. One platform, total career mastery.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5">
                  <Link href={isSignedIn ? "/dashboard" : "/sign-up"} className="w-full sm:w-auto">
                    <button className="w-full px-8 py-4 rounded-2xl blue-gradient text-white text-[13px] font-bold uppercase tracking-widest hover:shadow-2xl hover:shadow-blue-500/40 transition-all active:scale-[0.98] group flex items-center justify-center gap-3">
                      {isSignedIn ? "Go to Dashboard" : "Start Mock Interview"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                  <Link href="/interviewer" className="w-full sm:w-auto">
                    <button className="w-full px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[13px] font-bold uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group">
                      Interviewer Portal
                      <MousePointer2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                    </button>
                  </Link>
                </div>
                
                <div className="mt-12 flex items-center gap-8 border-t border-slate-100 pt-8">
                  <div>
                    <p className="text-2xl font-black text-slate-900">10k+</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulations</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div>
                    <p className="text-2xl font-black text-slate-900">98%</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Accuracy</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="relative hidden lg:block"
              >
                <div className="relative z-10">
                  {/* Decorative Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 blur-3xl rounded-[2.5rem] -z-10" />
                  
                  {/* Terminal/IDE Style Window */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
                        <Brain className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Interview Engine</span>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="h-2 w-48 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                            />
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-400 pl-11">Analyzing candidate response for technical depth...</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Technical Score</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-white leading-none">8.4</span>
                            <span className="text-[10px] font-bold text-emerald-500 mb-0.5">/ 10</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confidence</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-white leading-none">92</span>
                            <span className="text-[10px] font-bold text-blue-500 mb-0.5">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Insights</p>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          "Candidate demonstrated strong mastery of distributed systems and scalability patterns. Excellent delivery pace."
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Floating Elements for extra depth */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-10 -right-6 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xl z-20 hidden xl:block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Integrity Check</p>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Verified Session</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-8 -left-10 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xl z-20 hidden xl:block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Market Rank</p>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Top 5% Global</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="students" className="py-32 px-6 bg-slate-50/50 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="order-2 lg:order-1 grid grid-cols-2 gap-6">
                {[
                  { icon: Layout, title: "AI Dashboard", desc: "Track every interview session, score trends, and progress in one sleek console.", color: "blue" },
                  { icon: FileUp, title: "Resume Sync", desc: "Upload your resume and get tailored questions specific to your actual experience.", color: "indigo" },
                  { icon: History, title: "Review Vault", desc: "Revisit every past answer with AI solution paths and improvement strategies.", color: "emerald" },
                  { icon: Target, title: "Live Simulation", desc: "Full-screen environment with face detection and integrity monitoring.", color: "rose" },
                ].map((f, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -8, rotateZ: 1 }}
                    className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-${f.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-7 h-7 text-${f.color}-600`} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">{f.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed font-medium">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
              <div className="order-1 lg:order-2">
                <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px] px-4 py-1.5 mb-6 rounded-full">
                  For Students
                </Badge>
                <h2 className="text-5xl font-black text-slate-900 leading-tight tracking-tight mb-8">
                  Your AI Career <br />
                  <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">Co-Pilot.</span>
                </h2>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10 max-w-lg">
                  Don't just practice. Train with an engine that understands your resume, evaluates your body language, and provides a full roadmap to perfection.
                </p>
                <Link href="/interviews/new">
                  <Button className="h-14 rounded-2xl px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest">
                    Start New Simulation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="interviewers" className="py-32 px-6 bg-white relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-100 text-indigo-600 font-bold uppercase tracking-[0.3em] text-[10px] px-4 py-1.5 mb-6 rounded-full">
                  For Interviewers
                </Badge>
                <h2 className="text-5xl font-black text-slate-900 leading-tight tracking-tight mb-8">
                  Screen Smarter, <br />
                  <span className="text-indigo-600">Hire Faster.</span>
                </h2>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10 max-w-lg">
                  Deploy customized AI screening links. Extract job requirements from PDFs and get structured candidate analytics automatically.
                </p>
                <div className="space-y-6 mb-12">
                  {[
                    { icon: ClipboardCheck, title: "Shareable Screening Links", desc: "One link, multiple attempts. Gated with secure student login." },
                    { icon: PieChart, title: "Deep Candidate Analytics", desc: "Review AI scores, transcripts, and hire recommendations at a glance." },
                    { icon: FileUp, title: "PDF JD Intelligence", desc: "Upload a Job Description PDF and let AI build the interview protocol." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                        <item.icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-slate-500 text-xs font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/interviewer">
                  <Button className="h-14 rounded-2xl px-10 blue-gradient text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20">
                    Enter Console
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-600/5 rounded-[4rem] -rotate-3 scale-105" />
                <div className="relative bg-slate-900 rounded-[3.5rem] p-8 border border-slate-800 shadow-[0_50px_100px_-20px_rgba(79,70,229,0.2)] overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Users className="w-48 h-48 text-indigo-400" />
                  </div>
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <h3 className="text-white font-bold tracking-tight">Recent Attempts</h3>
                      <Badge className="bg-indigo-500 text-white border-0 font-bold text-[8px] tracking-[0.2em]">LIVE</Badge>
                    </div>
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center font-bold text-white text-xs">
                            {["JS", "AK", "RM"][i]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white tracking-tight">{["John Smith", "Alice Kim", "Ryan Mo"][i]}</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Frontend Lead</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-indigo-400">{[8.2, 9.1, 7.5][i]}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compact Feature Grid */}
        <section id="features" className="py-20 px-6 bg-slate-50/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-[9px] font-bold uppercase tracking-[0.4em] text-blue-600 mb-2">Capabilities</h2>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Precision Training Engine</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  icon: MessageSquare, 
                  title: "Smart Dialogue", 
                  desc: "Natural conversation flow with advanced LLM reasoning.",
                  color: "text-blue-600",
                  bg: "bg-blue-50"
                },
                { 
                  icon: Zap, 
                  title: "Real-time Feedback", 
                  desc: "Instant metrics on delivery, tone, and technical depth.",
                  color: "text-indigo-600",
                  bg: "bg-indigo-50"
                },
                { 
                  icon: Globe2, 
                  title: "Global Standards", 
                  desc: "Trained on thousands of elite tech interview patterns.",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50"
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="glass-card rounded-[2rem] p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed font-medium">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-slate-100 px-6 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md blue-gradient flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 uppercase tracking-tighter">PrepAI</span>
            </div>
            
            <div className="flex gap-8 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
            
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} PrepAI
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
