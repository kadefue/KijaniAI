import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Globe2 } from 'lucide-react';
import { api } from '../../api/client';
import { Parcel } from '../../types';

interface GemmaCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: Parcel | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const GemmaCopilotDrawer: React.FC<GemmaCopilotDrawerProps> = ({
  isOpen,
  onClose,
  parcel,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm Kijani Copilot, powered by Gemma 4. I provide live agronomic, irrigation, and water intelligence across Tanzania in both English and Kiswahili. How can I assist your field operations today?",
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.chatCopilot(newMessages, parcel?.id, language);
      setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Apologies, I encountered an issue communicating with the copilot engine.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = language === 'sw'
    ? [
        'Mashamba yapi yanahitaji maji leo?',
        'Kwa nini Mlandizi ina upungufu wa unyevu?',
        'Maji ya Bwawa la Mindu yanafaa kwa drip?',
        'Je, ninaweza kutoa cheti cha carbon leo?'
      ]
    : [
        'Which fields need irrigation today?',
        'Why is Mlandizi Block 2 under water stress?',
        'Evaluate Mindu Reservoir drip clogging hazard',
        'What is the decadal CWRI failure risk?'
      ];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Gemma 4 Copilot</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Ollama Local LLM
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Bilingual English / Kiswahili Agronomy Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
            title="Toggle English / Kiswahili"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
          </button>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs leading-relaxed ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center text-xs text-cyan-400 animate-pulse">
            <Bot className="w-4 h-4" />
            <span>Gemma 4 synthesizing satellite context & agronomic models...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-wrap gap-1.5">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition truncate max-w-xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === 'sw' ? 'Uliza swali kuhusu umwagiliaji, ubora wa maji, au hewa ya ukaa...' : 'Ask about irrigation schedules, water quality, or carbon stocks...'}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white flex items-center justify-center transition shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
