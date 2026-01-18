
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onStart: (id: string) => void;
  onTimeUp: (id: string) => void;
  theme: 'light' | 'dark';
  t: any;
  lang: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStart, onTimeUp, theme, t, lang }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    let interval: number;
    if (task.status === TaskStatus.ACTIVE && task.startTime) {
      const targetTime = task.startTime + task.durationMinutes * 60 * 1000;
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
        setTimeLeft(diff);
        
        if (diff <= 0) {
          clearInterval(interval);
          onTimeUp(task.id);
        }
      };

      updateTimer();
      interval = window.setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(task.durationMinutes * 60);
    }
    return () => clearInterval(interval);
  }, [task.status, task.startTime, task.durationMinutes, task.id, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    switch (task.status) {
      case TaskStatus.ACTIVE: return { label: t.inProgress, color: 'text-violet-500', bg: 'bg-violet-500/10' };
      case TaskStatus.COMPLETED: return { label: t.verified, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case TaskStatus.FAILED: return { label: t.failed, color: 'text-rose-400', bg: 'bg-rose-400/10' };
      case TaskStatus.VERIFYING: return { label: t.analysing, color: 'text-amber-400', bg: 'bg-amber-400/10' };
      default: return { label: t.commence, color: 'text-slate-400', bg: 'bg-slate-400/10' };
    }
  };

  const status = getStatusInfo();
  const isDark = theme === 'dark';
  const isRtl = lang === 'ar';

  return (
    <div className={`group glass p-7 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 ${task.status === TaskStatus.ACTIVE ? 'scale-[1.02] shadow-2xl shadow-violet-500/10' : ''}`}>
      <div className="flex justify-between items-start gap-6 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            {task.scheduledDate && (
              <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/10`}>
                🗓 {task.scheduledDate}
              </span>
            )}
            {task.status === TaskStatus.ACTIVE && (
              <div className="w-2 h-2 rounded-full bg-violet-500 active-pulse"></div>
            )}
          </div>
          <h3 className={`text-xl font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'} group-hover:text-violet-500`}>
            {task.title}
          </h3>
          <p className={`text-sm mt-2 line-clamp-2 leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {task.description}
          </p>
        </div>
        
        <div className={`${isRtl ? 'text-left items-start' : 'text-right items-end'} flex flex-col`}>
          <div className={`timer-font text-3xl font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {formatTime(timeLeft)}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-2 opacity-60">
            {t.countdown}
          </p>
        </div>
      </div>

      <div className="mt-2">
        {task.status === TaskStatus.PENDING && (
          <button
            onClick={() => onStart(task.id)}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-violet-600/10 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {t.commence}
          </button>
        )}
        
        {task.status === TaskStatus.ACTIVE && (
          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <div 
              className="h-full bg-violet-500 transition-all duration-1000"
              style={{ 
                width: `${(timeLeft / (task.durationMinutes * 60)) * 100}%`,
                float: isRtl ? 'right' : 'left'
              }}
            />
          </div>
        )}

        {(task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) && (
          <div className={`p-5 rounded-2xl border ${task.status === TaskStatus.COMPLETED ? (isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/50 border-emerald-100') : (isDark ? 'bg-rose-400/5 border-rose-400/10' : 'bg-rose-50/50 border-rose-100')}`}>
            <div className={`flex items-center justify-between font-bold text-sm mb-3 ${isRtl ? 'flex-row-reverse' : ''} ${task.status === TaskStatus.COMPLETED ? 'text-emerald-500' : 'text-rose-400'}`}>
              <span className="flex items-center gap-2">
                {task.status === TaskStatus.COMPLETED ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                )}
                {task.status === TaskStatus.COMPLETED ? t.success : t.failed}
              </span>
              <span className={`px-3 py-1 rounded-xl text-[10px] tracking-tight ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-500/10' : 'bg-rose-400/10'}`}>
                {task.pointsEarned > 0 ? '+' : ''}{task.pointsEarned} {t.points}
              </span>
            </div>
            <p className={`text-sm italic leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              "{task.aiFeedback}"
            </p>
          </div>
        )}

        {task.status === TaskStatus.VERIFYING && (
          <div className="flex flex-col items-center gap-4 py-3">
            <div className="flex items-center gap-3 text-amber-400 font-bold">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm tracking-wide">{t.auditing}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
