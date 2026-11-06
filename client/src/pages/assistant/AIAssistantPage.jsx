import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  BarChart3,
  Check
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui/index.js';
import {
  useAIQueryMutation,
  useAISuggestionsQuery,
  useAIUsageQuery
} from '../../features/ai/index.js';

export const AIAssistantPage = () => {
  const [inputQuery, setInputQuery] = useState('');
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: `### 👋 Welcome to OpsPilot AI Business Assistant\n\nI am your **natural-language business intelligence copilot**. I synthesize real-time data across your projects, work orders, tasks, inventory, and financial summaries through strict read-only queries.\n\nAsk any question about your operational status or click one of the suggested cards below to begin.`,
      provider: 'opspilot-built-in',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Which projects are overdue?',
        'How many tasks were completed this month?',
        'Which inventory items are below minimum stock?',
        'What are the pending service requests?',
        "Summarize this month's business performance"
      ]
    }
  ]);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: suggestions, isLoading: suggestionsLoading } = useAISuggestionsQuery();
  const { data: usageData, refetch: refetchUsage } = useAIUsageQuery();
  const queryMutation = useAIQueryMutation();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, queryMutation.isPending]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const query = inputQuery.trim();
    if (!query || queryMutation.isPending) return;

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
          refetchUsage();
        },
        onError: (err) => {
          setMessages([
            ...newMessages,
            {
              id: `assistant-err-${Date.now()}`,
              role: 'assistant',
              isError: true,
              text: `⚠️ **Unable to process query:** ${
                err.apiMessage || err.message || 'An error occurred during read-only data evaluation.'
              }\n\nPlease try rephrasing your question or selecting one of the suggested prompts.`,
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

  const handleQuickRunPrompt = (promptText) => {
    setInputQuery(promptText);
    // submit immediately
    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(newMessages);
    setInputQuery('');

    queryMutation.mutate(
      { query: promptText },
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
          refetchUsage();
        },
        onError: (err) => {
          setMessages([
            ...newMessages,
            {
              id: `assistant-err-${Date.now()}`,
              role: 'assistant',
              isError: true,
              text: `⚠️ **Unable to process query:** ${
                err.apiMessage || err.message || 'An error occurred.'
              }`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    );
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        text: `### 🔄 Session Cleared\n\nAsk any question about your operational status or select a prompt below.`,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-slate-900/5 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/40 p-6 rounded-3xl border border-indigo-200/60 dark:border-indigo-800/50 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Business Assistant
              </h1>
              <Badge variant="primary" size="sm" className="font-mono text-[10px] uppercase">
                Read-Only Tools
              </Badge>
              <Badge variant="success" size="sm" className="font-mono text-[10px] uppercase">
                Zero Direct SQL
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ask natural-language questions to analyze projects, team task velocities, low-stock inventory, open customer service tickets, and executive monthly summaries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTelemetryModal(true)}
            className="text-xs"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
            Telemetry & Audit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChat}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Suggested Quick Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            title: 'Overdue Projects',
            icon: Clock,
            color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
            prompt: 'Which projects are overdue?'
          },
          {
            title: 'Completed Tasks',
            icon: CheckCircle2,
            color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
            prompt: 'How many tasks were completed this month?'
          },
          {
            title: 'Low Stock Items',
            icon: Package,
            color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
            prompt: 'Which inventory items are below minimum stock?'
          },
          {
            title: 'Pending Requests',
            icon: AlertTriangle,
            color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
            prompt: 'What are the pending service requests?'
          },
          {
            title: 'Monthly Summary',
            icon: TrendingUp,
            color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
            prompt: "Summarize this month's business performance"
          }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickRunPrompt(item.prompt)}
              disabled={queryMutation.isPending}
              className="group p-3.5 text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {item.prompt}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Chat Workspace */}
      <Card className="p-0 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm min-h-[540px]">
        {/* Chat Security Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Tenant Sandboxed Analytics Engine
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400">
              (Permission-scoped, read-only data access)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono text-slate-400">
              Rate limit: 30 queries / min
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white/50 dark:bg-slate-900/50 min-h-[380px] max-h-[620px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-3 transition-all ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/10'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                    : 'bg-slate-50 dark:bg-slate-850/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-xs'
                }`}
              >
                {/* Text Content */}
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                  {msg.text}
                </div>

                {/* Structured Data Visualizer (if returned by backend read-only tool) */}
                {msg.data && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    {/* Overdue Projects breakdown */}
                    {msg.intent === 'OVERDUE_PROJECTS' && msg.data.overdue_projects && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Overdue Projects ({msg.data.total_overdue})
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 overflow-hidden">
                          {msg.data.overdue_projects.map((proj) => (
                            <div key={proj.id} className="p-2.5 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {proj.name}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Client: {proj.client || 'N/A'} • End Date: {proj.target_end_date || 'N/A'}
                                </div>
                              </div>
                              <Badge variant="danger" size="sm" className="font-mono text-[10px]">
                                {proj.days_overdue}d overdue
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low Stock Items breakdown */}
                    {msg.intent === 'LOW_STOCK_INVENTORY' && msg.data.low_stock_items && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Critical Inventory ({msg.data.total_critical_items})
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 overflow-hidden">
                          {msg.data.low_stock_items.map((item) => (
                            <div key={item.id} className="p-2.5 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {item.name}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  SKU: {item.sku || 'N/A'} • Min Required: {item.min_quantity}
                                </div>
                              </div>
                              <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                                {item.quantity} in stock
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Service Requests breakdown */}
                    {msg.intent === 'PENDING_SERVICE_REQUESTS' && msg.data.pending_requests && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Open Service Requests ({msg.data.total_pending})
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 overflow-hidden">
                          {msg.data.pending_requests.map((req) => (
                            <div key={req.id} className="p-2.5 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {req.title}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Status: {req.status} • Requester: {req.customer_name || 'Customer'}
                                </div>
                              </div>
                              <Badge
                                variant={req.priority === 'urgent' ? 'danger' : 'secondary'}
                                size="sm"
                                className="font-mono text-[10px] uppercase"
                              >
                                {req.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monthly Performance KPI Grid */}
                    {msg.intent === 'PERFORMANCE_SUMMARY' && msg.data.kpis && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 text-center">
                          <div className="text-[10px] text-slate-500">Tasks Done</div>
                          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {msg.data.kpis.tasks_completed_this_month}
                          </div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 text-center">
                          <div className="text-[10px] text-slate-500">Active Proj.</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {msg.data.kpis.active_projects}
                          </div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 text-center">
                          <div className="text-[10px] text-slate-500">Invoiced</div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ${Number(msg.data.kpis.invoiced_amount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 text-center">
                          <div className="text-[10px] text-slate-500">Expenses</div>
                          <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            ${Number(msg.data.kpis.approved_expenses || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested follow-up actions */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-750/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Recommended Next Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(action)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          <span>{action}</span>
                          <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message footer metadata */}
                <div className="flex items-center justify-between text-[9px] opacity-60 pt-1">
                  <span>{msg.timestamp}</span>
                  {msg.provider && (
                    <span className="font-mono">
                      Engine: {msg.provider} {msg.durationMs ? `(${msg.durationMs}ms)` : ''}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Pending indicator */}
          {queryMutation.isPending && (
            <div className="flex gap-3.5 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-4 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs text-slate-500 italic">
                  Calling tenant-scoped read-only tool functions...
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask OpsPilot (e.g., Which projects are overdue? How many tasks were completed this month?)..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={queryMutation.isPending}
              className="flex-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputQuery.trim() || queryMutation.isPending}
              loading={queryMutation.isPending}
              className="h-11 px-5 rounded-xl shrink-0"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>Ask</span>
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-2">
            <span>Powered by secure read-only analytics tools • No direct DB execution</span>
            <span>Rate limit: 30 requests / minute per manager</span>
          </div>
        </form>
      </Card>

      {/* Telemetry & Audit Modal */}
      {showTelemetryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  AI Usage & Security Telemetry
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTelemetryModal(false)}
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Total Queries (Month)</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {usageData?.total_queries || 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Avg Latency</div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {usageData?.average_duration_ms || 0} ms
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                Intent Breakdown
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.entries(usageData?.intent_breakdown || {}).length === 0 ? (
                  <div className="text-slate-400 italic">No queries executed yet in this session</div>
                ) : (
                  Object.entries(usageData?.intent_breakdown || {}).map(([intent, count]) => (
                    <div key={intent} className="flex justify-between items-center py-1 px-2.5 rounded bg-slate-50 dark:bg-slate-850">
                      <span className="text-slate-700 dark:text-slate-300">{intent}</span>
                      <Badge variant="secondary" size="sm">{count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Zero Direct SQL Invariant Enforced
              </div>
              <p className="leading-relaxed">
                All AI queries are parsed by intent and routed directly to pre-compiled, parameter-checked, tenant-isolated functions. External LLMs never interact with the database handle directly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPage;
