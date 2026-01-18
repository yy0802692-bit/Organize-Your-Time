
import React, { useState } from 'react';
import { getYahyaChatResponse } from '../services/geminiService';

interface YahyaBuddyPageProps {
  yahyaAvatar: string | null;
  yahyaMood: 'happy' | 'sad' | 'neutral';
  isGeneratingYahya: boolean;
  yahyaLastResponse: string | null;
  setYahyaLastResponse: (res: string) => void;
  lang: string;
  theme: 'light' | 'dark';
  isRtl: boolean;
  t: any;
}

const YahyaBuddyPage: React.FC<YahyaBuddyPageProps> = ({ 
  yahyaAvatar, 
  yahyaMood, 
  isGeneratingYahya, 
  yahyaLastResponse, 
  setYahyaLastResponse,
  lang,
  theme,
  isRtl,
  t
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const isDark = theme === 'dark';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking) return;
    const msg = chatInput;
    setChatInput('');
    setIsThinking(true);
    
    const responseText = await getYahyaChatResponse(msg, yahyaMood, lang);
    setYahyaLastResponse(responseText);
    setIsThinking(false);
  };

  const getDefaultMessage = () => {
    if (yahyaMood === 'happy') return t.yahyaSuccess;
    if (yahyaMood === 'sad') return t.yahyaFailure;
    return t.yahyaIdle;
  };

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <section className="glass p-10 rounded-[4rem] mb-10 flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute top-8 right-8">
           <div className={`w-3.5 h-3.5 rounded-full ${yahyaMood === 'happy' ? 'bg-emerald-400' : yahyaMood === 'sad' ? 'bg-rose-400' : 'bg-violet-500'} active-pulse shadow-lg`}></div>
        </div>
        
        <div className="w-44 h-44 md:w-56 md:h-56 rounded-[3.5rem] overflow-hidden border-8 border-violet-500/10 bg-slate-900/40 flex items-center justify-center shadow-2xl mb-8 transition-all duration-700 group-hover:scale-[1.03] group-hover:rotate-1">
           {isGeneratingYahya ? (
             <div className="animate-spin text-violet-500"><svg className="w-14 h-14" fill="none" viewBox="0 0 24 24"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>
           ) : yahyaAvatar ? (
             <img src={yahyaAvatar} alt="Yahya" className="w-full h-full object-cover" />
           ) : (
             <span className="text-8xl">🧑🏾‍🦱</span>
           )}
        </div>

        <h2 className={`text-4xl font-handwriting tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.yahyaTitle.split(':')[1].trim()}</h2>
        <div className="mt-4 flex gap-3">
           <span className="text-[10px] bg-violet-500/10 text-violet-500 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-violet-500/10">Wise Guide</span>
           <span className="text-[10px] bg-slate-500/10 text-slate-500 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-slate-500/10">Mentor</span>
        </div>
      </section>

      <section className="space-y-8">
        <div className={`flex flex-col gap-6 ${isRtl ? 'items-end' : 'items-start'}`}>
          <div className={`p-7 rounded-[2.5rem] max-w-[90%] border shadow-2xl transition-all duration-500 ${isDark ? 'bg-violet-600/5 border-white/5 text-slate-100' : 'bg-white border-slate-100 text-slate-900'} ${isRtl ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
            <p className="text-xl font-handwriting italic leading-relaxed">
               {yahyaLastResponse || getDefaultMessage()}
            </p>
            {isThinking && (
              <div className="flex gap-2 mt-5">
                 <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce"></div>
                 <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSend} className={`flex gap-4 glass p-3 rounded-[3rem] border border-white/5 shadow-inner ${isRtl ? 'flex-row-reverse' : ''}`}>
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t.askYahya}
            disabled={isThinking}
            className={`flex-1 bg-transparent px-8 py-5 outline-none font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'} placeholder:opacity-40`}
          />
          <button 
            type="submit"
            disabled={isThinking || !chatInput.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl shadow-violet-600/20 active:scale-90"
          >
            <svg className={`w-8 h-8 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>
      </section>
    </div>
  );
};

export default YahyaBuddyPage;
