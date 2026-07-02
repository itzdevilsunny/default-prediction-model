import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CornerDownLeft, Sparkles, AlertCircle } from 'lucide-react';
import { mockLoans } from '../data/mockLoans';

interface Message {
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  links?: Array<{ text: string; action: string; loanId?: string }>;
}

interface GeminiCopilotProps {
  onInspectLoan: (loanId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiCopilot: React.FC<GeminiCopilotProps> = ({ onInspectLoan, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'gemini',
      text: "Hi, I am your Gemini Risk Copilot. I can query our loan portfolio, summarize borrower risk factors, or explain model forecast details. Try asking:\n\n• 'Identify high default risks'\n• 'Explain risk factors for Zeta Manufacturing'\n• 'List loans affected by tariff policies'",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsgText = inputVal.trim();
    setInputVal('');
    
    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Mock Gemini processing
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "I parsed your query but couldn't find a matching portfolio analysis rule. Can you try asking about 'high default risks', 'Zeta Manufacturing', or 'tariff policies'?";
      let links: Message['links'] = [];

      const query = userMsgText.toLowerCase();

      if (query.includes('high') || query.includes('default') || query.includes('risk')) {
        replyText = "Based on our 12-month forward forecasting model, there are currently 5 borrowers classified as **High Risk** (probability of default > 70%). These profiles incorporate negative sentiment from call logs and economic sectors:\n\n1. **Zeta Manufacturing LLC** (91.2% PD) - Operating cash flow compression & tariffs.\n2. **Green Horizon Agriculture** (81.4% PD) - Crop losses & weather issues.\n3. **Elite Freight Logistics** (78.5% PD) - Lost major corporate contract.\n4. **Marcus Vance** (74.1% PD) - High card utilization & job transition.\n\nClick a profile below to load it into the Underwriting Console:";
        links = [
          { text: "Inspect Zeta Manufacturing", action: "inspect", loanId: "LN-2026-041" },
          { text: "Inspect Green Horizon Agriculture", action: "inspect", loanId: "LN-2026-204" },
          { text: "Inspect Elite Freight Logistics", action: "inspect", loanId: "LN-2026-112" }
        ];
      } else if (query.includes('zeta') || query.includes('manufacturing')) {
        const zeta = mockLoans.find(l => l.id === "LN-2026-041");
        if (zeta) {
          replyText = `**Zeta Manufacturing LLC (${zeta.id}) Risk Synthesis:**\n\n• **Structured Headwinds:** FICO score has degraded to **590**; DTI is high at **48.5%** with **3 missed payments** in the last 12 months.\n• **Unstructured Sentiment Analysis:** Call log text indicates high friction. Loan officer notes cite a **40% slowdown in inventory turnover** and management disputes.\n• **Macro/Sector Alerts:** Industrial sector contractions and tariff pressure (manufacturing index contracting for 3 quarters).\n\n**Recommendation:** Restructure the credit lines or secure additional asset collateral immediately.`;
          links = [
            { text: "Open Underwriter Console for Zeta", action: "inspect", loanId: "LN-2026-041" }
          ];
        }
      } else if (query.includes('tariff') || query.includes('sector') || query.includes('policy') || query.includes('news')) {
        replyText = "I found 3 SME & corporate loans whose default forecasts are heavily influenced by adverse sector headlines and macro tariff economic indexes:\n\n• **Zeta Manufacturing LLC** - Tariff index increases causing raw material inflation.\n• **Green Horizon Agriculture** - Export shipping disruptions & crop tariffs.\n• **Elite Freight Logistics** - Shipping logistics insurance spikes (+12%).\n\nWould you like to analyze these files?";
        links = [
          { text: "Review Zeta Manufacturing", action: "inspect", loanId: "LN-2026-041" },
          { text: "Review Green Horizon Agriculture", action: "inspect", loanId: "LN-2026-204" }
        ];
      }

      const geminiMsg: Message = {
        sender: 'gemini',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        links: links.length > 0 ? links : undefined
      };

      setMessages(prev => [...prev, geminiMsg]);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-zinc-200 bg-white flex flex-col h-[calc(100vh-65px)] sticky top-[65px] z-20">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <Bot className="h-4.5 w-4.5 text-brand-accent" />
          <span className="text-xs font-bold text-zinc-900 tracking-tight flex items-center gap-1">
            Gemini Risk Copilot
            <Sparkles className="h-3 w-3 text-brand-accent animate-pulse" />
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-900 font-semibold"
        >
          Close
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, i) => {
          const isGemini = msg.sender === 'gemini';
          return (
            <div key={i} className={`flex gap-2.5 ${isGemini ? '' : 'flex-row-reverse'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                isGemini ? 'bg-blue-50 text-brand-accent' : 'bg-zinc-950 text-white'
              }`}>
                {isGemini ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div className="space-y-2 max-w-[80%]">
                <div className={`p-3 rounded-lg border ${
                  isGemini ? 'bg-zinc-50/50 border-zinc-100 text-zinc-800' : 'bg-brand-accent text-white border-brand-accent'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</p>
                  
                  {/* Actions / Links */}
                  {msg.links && (
                    <div className="mt-3.5 space-y-2 border-t border-zinc-200/50 pt-2.5">
                      {msg.links.map((link, linkIdx) => (
                        <button
                          key={linkIdx}
                          onClick={() => link.loanId && onInspectLoan(link.loanId)}
                          className="w-full text-left font-bold text-[10px] text-brand-accent hover:underline flex items-center justify-between"
                        >
                          {link.text}
                          <span>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-[9px] text-zinc-400 block ${isGemini ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="h-6 w-6 rounded-full bg-blue-50 text-brand-accent flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-zinc-50/50 border border-zinc-100 p-3 rounded-lg max-w-[80%]">
              <div className="flex gap-1 items-center py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce delay-100"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef}></div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask Copilot about risk files..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isTyping}
            className="w-full bg-white border border-zinc-200 rounded-lg pl-3 pr-9 py-2 text-[11px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            title="Send Message"
            aria-label="Send Message"
            className="absolute right-1.5 p-1 text-zinc-400 hover:text-brand-accent disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[8px] text-zinc-400 mt-2 px-1">
          <span className="flex items-center gap-0.5">
            <AlertCircle className="h-2.5 w-2.5" />
            Press enter to query
          </span>
          <span className="flex items-center gap-0.5">
            <CornerDownLeft className="h-2 w-2" />
            V2.4 Powered by Gemini
          </span>
        </div>
      </form>
    </div>
  );
};
