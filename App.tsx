
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Task, TaskStatus, UserStats } from './types';
import TaskCard from './components/TaskCard';
import YahyaBuddyPage from './components/YahyaBuddyPage';
import { verifyTaskCompletion, generateYahyaAvatar, getYahyaChatResponse } from './services/geminiService';
import { Language, translations } from './translations';

interface PrayerTimesData {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

type Tab = 'tasks' | 'yahya';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<UserStats>({ points: 0, completedCount: 0, failedCount: 0 });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeProofTask, setActiveProofTask] = useState<Task | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<Language>('en');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // New State for scheduling
  const [isScheduling, setIsScheduling] = useState(false);

  // Yahya Character State
  const [yahyaAvatar, setYahyaAvatar] = useState<string | null>(null);
  const [yahyaMood, setYahyaMood] = useState<'happy' | 'sad' | 'neutral'>('neutral');
  const [isGeneratingYahya, setIsGeneratingYahya] = useState(false);
  const [yahyaLastResponse, setYahyaLastResponse] = useState<string | null>(null);
  
  // Audio Refs for specific alerts
  const audioRefs = useRef<{
    success: HTMLAudioElement;
    prayer: HTMLAudioElement;
    timeUp: HTMLAudioElement;
  } | null>(null);

  const lastAlarmRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playSound = useCallback((key: 'success' | 'prayer' | 'timeUp') => {
    if (!audioRefs.current || !audioRefs.current[key]) return;
    const sound = audioRefs.current[key];
    sound.volume = 0.5;
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Browsers often block autoplay until user interaction
    });
  }, []);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Initialize Audio with clean, specific sounds
    audioRefs.current = {
      success: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
      prayer: new Audio('https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3'),
      timeUp: new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3')
    };

    const savedTheme = localStorage.getItem('fp_theme') as 'light' | 'dark' | null;
    const savedLang = localStorage.getItem('fp_lang') as Language | null;
    const savedYahya = localStorage.getItem('fp_yahya_avatar');
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme + '-mode';
    }
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    }
    if (savedYahya) setYahyaAvatar(savedYahya);

    const savedTasks = localStorage.getItem('fp_tasks');
    const savedStats = localStorage.getItem('fp_stats');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedStats) setStats(JSON.parse(savedStats));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`)
          .then(res => res.json())
          .then(data => {
            if (data?.data?.timings) {
              const { Fajr, Dhuhr, Asr, Maghrib, Isha } = data.data.timings;
              setPrayerTimes({ Fajr, Dhuhr, Asr, Maghrib, Isha });
            }
          })
          .catch(err => console.error("Prayer times fetch error:", err));
      }, (err) => console.warn("Geolocation access denied:", err));
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for scheduled reminders
  useEffect(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    const dueTasks = tasks.filter(t => t.scheduledDate === todayStr && !t.notified);
    
    if (dueTasks.length > 0) {
      dueTasks.forEach(task => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(translations[lang].reminderAlert, {
            body: translations[lang].reminderBody.replace('{title}', task.title),
            icon: '/favicon.ico'
          });
        }
        playSound('timeUp');
      });

      setTasks(prev => prev.map(t => 
        t.scheduledDate === todayStr ? { ...t, notified: true } : t
      ));
    }
  }, [currentTime, tasks, lang, playSound]);

  useEffect(() => {
    if (!yahyaAvatar && !isGeneratingYahya) {
      const fetchYahya = async () => {
        setIsGeneratingYahya(true);
        const avatar = await generateYahyaAvatar('neutral');
        if (avatar) {
          setYahyaAvatar(avatar);
          localStorage.setItem('fp_yahya_avatar', avatar);
        }
        setIsGeneratingYahya(false);
      };
      fetchYahya();
    }
  }, [yahyaAvatar, isGeneratingYahya]);

  useEffect(() => {
    localStorage.setItem('fp_tasks', JSON.stringify(tasks));
    localStorage.setItem('fp_stats', JSON.stringify(stats));
  }, [tasks, stats]);

  useEffect(() => {
    if (!prayerTimes) return;
    const currentHHMM = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    Object.entries(prayerTimes).forEach(([name, time]) => {
      if (time === currentHHMM && lastAlarmRef.current !== name) {
        playSound('prayer');
        lastAlarmRef.current = name;
        setTimeout(() => { lastAlarmRef.current = null; }, 61000);
      }
    });
  }, [currentTime, prayerTimes, playSound]);

  const changeTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('fp_theme', newTheme);
    document.body.className = newTheme + '-mode';
  };

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('fp_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const addTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const scheduledDate = formData.get('scheduledDate') as string;

    if (!title.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      durationMinutes: Number(formData.get('duration')) || 25,
      status: TaskStatus.PENDING,
      scheduledDate: isScheduling ? scheduledDate : undefined
    };
    setTasks(prev => [newTask, ...prev]);
    setIsAddingTask(false);
    setIsScheduling(false);
  };

  const startTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: TaskStatus.ACTIVE, startTime: Date.now() } : t
    ));
    setYahyaMood('neutral');
    setYahyaLastResponse(null);
  };

  const handleTimeUp = useCallback((id: string) => {
    playSound('timeUp');
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task && task.status === TaskStatus.ACTIVE) {
        setActiveProofTask(task);
        return prev.map(t => t.id === id ? { ...t, status: TaskStatus.VERIFYING } : t);
      }
      return prev;
    });
  }, [playSound]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProofTask) return;
    const taskSnapshot = { ...activeProofTask };
    const reader = new FileReader();
    reader.onload = async (event) => {
      const resultData = event.target?.result;
      if (typeof resultData !== 'string') return;
      const base64 = resultData;
      const taskId = taskSnapshot.id;
      setActiveProofTask(null);
      
      const result = await verifyTaskCompletion(taskSnapshot.title, taskSnapshot.description, base64);
      
      if (result.isSuccessful) playSound('success');

      const nextMood = result.isSuccessful ? 'happy' : 'sad';
      setYahyaMood(nextMood);
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: result.isSuccessful ? TaskStatus.COMPLETED : TaskStatus.FAILED,
          pointsEarned: result.pointsAdjustment,
          aiFeedback: result.explanation,
          proofImageUrl: base64
        } : t
      ));
      setStats(prev => ({
        points: prev.points + result.pointsAdjustment,
        completedCount: prev.completedCount + (result.isSuccessful ? 1 : 0),
        failedCount: prev.failedCount + (result.isSuccessful ? 0 : 1)
      }));
      const newAvatar = await generateYahyaAvatar(nextMood);
      if (newAvatar) {
        setYahyaAvatar(newAvatar);
        localStorage.setItem('fp_yahya_avatar', newAvatar);
      }
    };
    reader.readAsDataURL(file);
  };

  const isDark = theme === 'dark';
  const isRtl = lang === 'ar';
  const t = translations[lang];

  const groupedTasks = useMemo(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    return {
      today: tasks.filter(t => !t.scheduledDate || t.scheduledDate === todayStr),
      upcoming: tasks.filter(t => t.scheduledDate && t.scheduledDate > todayStr)
    };
  }, [tasks, currentTime]);

  const nextPrayerInfo = useMemo(() => {
    if (!prayerTimes) return null;
    const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const sorted = (Object.entries(prayerTimes) as [string, string][]).map(([name, time]) => {
      const [h, m] = time.split(':').map(Number);
      return { name, total: h * 60 + m, time };
    }).sort((a, b) => a.total - b.total);
    return sorted.find(p => p.total > currentTotalMinutes) || sorted[0];
  }, [prayerTimes, currentTime]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-16 pb-48 transition-all duration-700">
      <header className="flex items-center justify-between mb-12">
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-600/25 border border-white/10">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className={`text-4xl font-handwriting tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.appTitle}</h1>
          </div>
          <p className="text-slate-500 font-semibold text-sm opacity-80 pl-2">{t.appSubtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-3.5 rounded-2xl glass transition-all active:scale-90 ${isDark ? 'text-slate-400 hover:text-violet-400' : 'text-slate-500 hover:text-violet-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>

          <div className="glass px-5 py-2.5 rounded-2xl border-white/5 shadow-xl flex items-center gap-3">
            <p className="text-xl font-black text-violet-500">⭐ {stats.points}</p>
          </div>
        </div>
      </header>

      {activeTab === 'tasks' ? (
        <div className="animate-in slide-in-from-bottom-6 duration-700">
          <section className="grid grid-cols-2 gap-6 mb-16">
            <div className="glass p-6 rounded-[2.5rem] relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 transition-transform group-hover:scale-110"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{t.completed}</p>
              <p className={`text-4xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.completedCount}</p>
            </div>
            <div className="glass p-6 rounded-[2.5rem] relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-rose-400/10 flex items-center justify-center text-rose-400 mb-4 transition-transform group-hover:scale-110"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{t.unfinished}</p>
              <p className={`text-4xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.failedCount}</p>
            </div>
          </section>

          <div className="space-y-12">
            {/* Today's Section */}
            <div className="space-y-6">
              <div className={`flex justify-between items-center px-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.today} <span className="text-slate-500 text-sm font-bold opacity-60">/ {groupedTasks.today.length}</span>
                </h2>
              </div>
              <div className="space-y-6">
                {groupedTasks.today.length === 0 ? (
                  <div className="text-center py-12 glass rounded-[3rem] border-dashed border-2 opacity-60">
                    <p className="text-slate-500 font-medium">{t.emptyTasksDesc}</p>
                  </div>
                ) : (
                  groupedTasks.today.map(task => <TaskCard key={task.id} task={task} onStart={startTask} onTimeUp={handleTimeUp} theme={theme} t={t} lang={lang} />)
                )}
              </div>
            </div>

            {/* Future Section */}
            {groupedTasks.upcoming.length > 0 && (
              <div className="space-y-6">
                <div className={`flex justify-between items-center px-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t.future} <span className="text-slate-500 text-sm font-bold opacity-60">/ {groupedTasks.upcoming.length}</span>
                  </h2>
                </div>
                <div className="space-y-6 opacity-80">
                  {groupedTasks.upcoming.map(task => <TaskCard key={task.id} task={task} onStart={startTask} onTimeUp={handleTimeUp} theme={theme} t={t} lang={lang} />)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-20 space-y-6">
            <h2 className={`text-2xl font-black tracking-tight px-2 ${isDark ? 'text-white' : 'text-slate-900'} ${isRtl ? 'text-right' : 'text-left'}`}>{t.prayerTimes}</h2>
            <div className="grid grid-cols-5 gap-3 md:gap-5">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((pName) => {
                const timeStr = prayerTimes ? (prayerTimes as any)[pName] : '--:--';
                const isActive = nextPrayerInfo?.name === pName;
                return (
                  <div key={pName} className={`glass p-4 rounded-[2rem] transition-all duration-500 flex flex-col items-center justify-center border-2 ${isActive ? 'border-violet-500 scale-105 shadow-2xl shadow-violet-500/10 bg-violet-500/5' : 'border-transparent opacity-50'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{t[pName.toLowerCase() as keyof typeof t]}</p>
                    <p className={`timer-font text-base md:text-xl font-bold ${isActive ? 'text-violet-500' : (isDark ? 'text-slate-100' : 'text-slate-800')}`}>{timeStr}</p>
                    {isActive && <div className="mt-2 px-2 py-0.5 bg-violet-500 text-[8px] font-black rounded-lg text-white uppercase tracking-tighter">{t.nextPrayer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <YahyaBuddyPage 
          yahyaAvatar={yahyaAvatar}
          yahyaMood={yahyaMood}
          isGeneratingYahya={isGeneratingYahya}
          yahyaLastResponse={yahyaLastResponse}
          setYahyaLastResponse={setYahyaLastResponse}
          lang={lang}
          theme={theme}
          isRtl={isRtl}
          t={t}
        />
      )}

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-sm:w-full glass rounded-[3rem] p-2 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-40 border border-white/10">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-4 flex items-center justify-center gap-3 rounded-[2.5rem] transition-all duration-500 ${activeTab === 'tasks' ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/30' : 'text-slate-500 hover:text-violet-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          {activeTab === 'tasks' && <span className="text-sm font-black tracking-tight">{t.tasks}</span>}
        </button>
        
        <button 
          onClick={() => setIsAddingTask(true)}
          className="w-16 h-16 bg-violet-600 hover:bg-violet-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-violet-600/40 transition-all duration-300 hover:scale-110 active:scale-90 group mx-2"
        >
          <svg className="w-9 h-9 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
        </button>

        <button 
          onClick={() => setActiveTab('yahya')}
          className={`flex-1 py-4 flex items-center justify-center gap-3 rounded-[2.5rem] transition-all duration-500 ${activeTab === 'yahya' ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/30' : 'text-slate-500 hover:text-violet-400'}`}
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            {activeTab !== 'yahya' && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse"></div>}
          </div>
          {activeTab === 'yahya' && <span className="text-sm font-black tracking-tight">{t.yahyaTitle.split(':')[1].trim()}</span>}
        </button>
      </nav>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 glass-dark animate-in fade-in duration-500">
          <div className={`${isDark ? 'bg-slate-900/95 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'} w-full max-w-lg rounded-[3rem] p-10 border shadow-2xl relative`}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black tracking-tight">{t.settings}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-rose-400 transition-colors">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-4">{t.selectLanguage}</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['en', 'fr', 'ar'].map((l) => (
                    <button key={l} onClick={() => changeLang(l as Language)} className={`p-4 rounded-xl border transition-all duration-300 text-center ${lang === l ? 'border-violet-500 bg-violet-500/10' : (isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50')}`}>
                      <span className={`block text-sm font-bold ${lang === l ? 'text-violet-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'العربية'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-4">{t.appearance}</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => changeTheme('light')} className={`flex items-center gap-4 p-5 rounded-xl border transition-all duration-300 ${theme === 'light' ? 'border-violet-500 bg-violet-500/10' : (isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50')}`}>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg></div>
                    <span className="font-bold">Light</span>
                  </button>
                  <button onClick={() => changeTheme('dark')} className={`flex items-center gap-4 p-5 rounded-xl border transition-all duration-300 ${theme === 'dark' ? 'border-violet-500 bg-violet-500/10' : (isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50')}`}>
                    <div className="w-10 h-10 rounded-xl bg-violet-900/40 flex items-center justify-center text-violet-400"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg></div>
                    <span className="font-bold">Dark</span>
                  </button>
                </div>
              </section>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-10 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-violet-600/20 active:scale-95">{t.saveChanges}</button>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-dark animate-in zoom-in-95 duration-300">
          <div className={`${isDark ? 'bg-slate-900/95 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'} w-full max-w-lg rounded-[3rem] p-10 border shadow-2xl relative ${isRtl ? 'text-right' : 'text-left'}`}>
            <h2 className="text-3xl font-black mb-8 tracking-tight">{t.addNewTask}</h2>
            <form onSubmit={addTask} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">{t.taskTitle}</label>
                <input required name="title" className="w-full px-6 py-4.5 rounded-[1.5rem] border bg-transparent focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">{t.taskDesc}</label>
                <textarea required name="description" placeholder={t.taskDescPlaceholder} rows={3} className="w-full px-6 py-4.5 rounded-[1.5rem] border bg-transparent focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all resize-none" />
              </div>
              
              <div className="flex items-center justify-between px-2 bg-violet-500/5 p-4 rounded-2xl border border-violet-500/10">
                <label className="text-sm font-bold text-slate-500 font-handwriting">{t.schedule}</label>
                <button 
                  type="button" 
                  onClick={() => setIsScheduling(!isScheduling)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isScheduling ? 'bg-violet-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isScheduling ? (isRtl ? 'right-7' : 'left-7') : (isRtl ? 'right-1' : 'left-1')}`} />
                </button>
              </div>

              {isScheduling && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">{t.selectDay}</label>
                  <input 
                    type="date" 
                    name="scheduledDate" 
                    required={isScheduling}
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-6 py-4.5 rounded-[1.5rem] border bg-transparent focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all text-slate-400" 
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">{t.timeLimit}</label>
                <div className={`flex items-center gap-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <input required name="duration" type="number" defaultValue={25} min={1} className="flex-1 px-6 py-4.5 rounded-[1.5rem] border bg-transparent focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all" />
                    <span className="text-slate-500 font-bold tracking-tight">{t.min}</span>
                </div>
              </div>

              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsAddingTask(false)} className="flex-1 py-4.5 font-bold text-slate-500 hover:text-rose-400 transition-colors">{t.dismiss}</button>
                <button type="submit" className="flex-[2] py-4.5 font-black text-white bg-violet-600 rounded-[1.5rem] shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all active:scale-95">{t.launch}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Submission Modal */}
      {activeProofTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-dark animate-in fade-in duration-500">
          <div className={`${isDark ? 'bg-slate-900/95 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'} w-full max-w-md rounded-[4rem] p-12 shadow-[0_30px_100px_rgba(0,0,0,0.3)] text-center border relative overflow-hidden`}>
            <div className="w-24 h-24 bg-violet-600/10 text-violet-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner active-pulse"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
            <h2 className="text-4xl font-black mb-4 tracking-tighter leading-tight">{t.proofRequired}</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">{t.proofDesc.replace('{title}', activeProofTask.title)}</p>
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all duration-300 active:scale-[0.97] bg-violet-600 text-white hover:bg-violet-500 flex items-center justify-center gap-4"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>{t.openCamera}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
