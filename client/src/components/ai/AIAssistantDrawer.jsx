import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  FileText,
  RotateCcw,
  Zap,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Badge, Button } from '../ui/index.js';
import {
  useAIQueryMutation,
  useAISuggestionsQuery,
  useAIUsageQuery
} from '../../features/ai/index.js';

export const AIAssistantDrawer = ({ isOpen, onClose }) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: `### 👋 Welcome to OpsPilot AI Assistant\n\nI am your **read-only business operations assistant**. I query verified operational databases to answer questions on project deadlines, workforce tasks, low-stock inventory, customer requests, and executive KPIs.\n\n_Security Notice: All queries execute in a strictly sandboxed read-only analytics layer. No SQL execution or state alterations are permitted._`,
      provider: 'opspilot-built-in',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Which projects are overdue?',
        'How many tasks were completed this month?',
        'Which inventory items are below minimum stock?',
        "Summarize this month's business performance"
      ]
    }
  ]);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: suggestions } = useAISuggestionsQuery({ enabled: isOpen });
  const { data: usageData } = useAIUsageQuery({ enabled: isOpen });
  const queryMutation = useAIQueryMutation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, queryMutation.isPending]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const query = inputQuery.trim();
    if (!query || queryMutation.isPending) return;

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(newMessages);
    setInputQuery('');

    // Execute query mutation
    queryMutation.mutate(
      { query },
      {
        onSuccess: (data) => {
          setMessages([
            ...newMessages,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: data.answer,
              data: data.data,
              intent: data.intent,
              provider: data.provider,
              suggestedActions: data.suggested_actions,
              durationMs: data.duration_ms,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        },
        onError: (err) => {
          setMessages([
            ...newMessages,
            {
              id: `assistant-err-${Date.now()}`,
              role: 'assistant',
              isError: true,
              text: `⚠️ **Error Processing Query:** ${
                err.apiMessage || err.message || 'An unexpected error occurred while querying analytics data.'
              }\n\nPlease verify your network connection or try rephrasing your question.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    );
  };

  const handleSelectSuggestion = (promptText) => {
    setInputQuery(promptText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        text: `### 🔄 Session Cleared\n\nHow can I assist your operations management today? Select a suggested prompt below or type your question.`,
        provider: 'opspilot-built-in',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Which projects are overdue?',
          'How many tasks were completed this month?',
          'Which inventory items are below minimum stock?'
        ]
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  OpsPilot AI Assistant
                </h2>
                <Badge variant="primary" size="sm" className="text-[9px] uppercase font-mono py-0">
                  Read-Only Sandbox
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400">
                Natural-language business intelligence & KPI synthesizer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Sandbox Invariant Ribbon */}
        <div className="px-5 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-300">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-indigo-500" />
            <span>Strict tenant boundary: zero raw SQL execution</span>
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            {usageData?.total_queries || 0} queries this month
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 transition-all ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/10'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                    : 'bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}
              >
                {/* Message Body with Markdown formatting */}
                <div className="prose prose-xs dark:prose-invert max-w-none space-y-1.5 leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Suggested follow-up actions pills */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-750/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Suggested Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(action)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          <span>{action}</span>
                          <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[9px] opacity-70 pt-1">
                  <span>{msg.timestamp}</span>
                  {msg.provider && (
                    <span className="font-mono">
                      {msg.provider} {msg.durationMs ? `(${msg.durationMs}ms)` : ''}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Loading Animation */}
          {queryMutation.isPending && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-3.5 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  Executing read-only analytics query...
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Queries Bar */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Suggestions:
            </span>
            {(suggestions || []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSuggestion(s.prompt)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-400 dark:hover:border-indigo-600 transition shrink-0"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask OpsPilot (e.g., Which projects are overdue?)..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={queryMutation.isPending}
              className="flex-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!inputQuery.trim() || queryMutation.isPending}
              loading={queryMutation.isPending}
              className="h-9 px-3 rounded-xl shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 pt-1.5">
            <span>Press Enter to send • 30 req/min rate limit</span>
            <span>Optional AI Provider Enabled</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantDrawer;
