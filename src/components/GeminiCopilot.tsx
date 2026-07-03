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

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/^\s*[-•*]\s+(.*)$/gm, "<li class='ml-3 list-disc my-0.5'>$1</li>");
    html = html.replace(/`(.*?)`/g, "<code class='bg-zinc-100 px-1 py-0.5 rounded text-[10px] font-mono'>$1</code>");
    html = html.replace(/\n/g, "<br />");
    return <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm leading-relaxed" />;
  };

  const handleSend = async (e: React.FormEvent) => {
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
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const historyPayload = updatedMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text
      }));

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsgText,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error("Response body is not readable.");
      }

      setIsTyping(false);

      // Create an empty gemini message to append chunks to
      setMessages(prev => [
        ...prev,
        {
          sender: 'gemini',
          text: "",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      let geminiMsgText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'FINAL_RESPONSE') {
                geminiMsgText += parsed.content;
                setMessages(prev => {
                  const copy = [...prev];
                  if (copy.length > 0) {
                    const last = copy[copy.length - 1];
                    last.text = geminiMsgText;
                    
                    const extracted = geminiMsgText.match(/LN-2026-\d{3}/g);
                    if (extracted) {
                      const uniqueIds = Array.from(new Set(extracted));
                      last.links = uniqueIds.map(id => {
                        const loan = mockLoans.find(l => l.id === id);
                        return {
                          text: loan ? `Inspect ${loan.borrowerName}` : `Inspect Loan ${id}`,
                          action: "inspect",
                          loanId: id
                        };
                      });
                    }
                  }
                  return copy;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE line:", line, e);
            }
          }
        }
      }

      if (buffer.trim().startsWith('data:')) {
        const dataStr = buffer.trim().slice(5).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'FINAL_RESPONSE') {
              geminiMsgText += parsed.content;
              setMessages(prev => {
                const copy = [...prev];
                if (copy.length > 0) {
                  const last = copy[copy.length - 1];
                  last.text = geminiMsgText;
                  
                  const extracted = geminiMsgText.match(/LN-2026-\d{3}/g);
                  if (extracted) {
                    const uniqueIds = Array.from(new Set(extracted));
                    last.links = uniqueIds.map(id => {
                      const loan = mockLoans.find(l => l.id === id);
                      return {
                        text: loan ? `Inspect ${loan.borrowerName}` : `Inspect Loan ${id}`,
                        action: "inspect",
                        loanId: id
                      };
                    });
                  }
                }
                return copy;
              });
            }
          } catch (e) {
            // ignore
          }
        }
      }

    } catch (err: any) {
      console.error("Error fetching Gemini response:", err);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'gemini',
          text: `⚠️ **Failed to connect to Risk Copilot backend.**\n\nEnsure that the local FastAPI server is running on port 8000.\n\n*Error details: ${err.message || err}*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
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
                  {isGemini ? renderMarkdown(msg.text) : <p className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</p>}
                  
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
