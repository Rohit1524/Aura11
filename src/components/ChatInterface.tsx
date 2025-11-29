import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, History, Trash2, Plus, Copy, RotateCw, Check } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  RadarChart,
  RadialBarChart,
  ComposedChart,
  FunnelChart,
  Treemap,
  Bar,
  Line,
  Pie,
  Area,
  Scatter,
  Radar,
  RadialBar,
  Funnel,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
} from "recharts";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  chartData?: {
    type: "bar" | "line" | "pie" | "area" | "scatter" | "radar" | "radialBar" | "composed" | "funnel" | "treemap";
    data: any[];
    xKey?: string;
    yKey?: string;
    title?: string;
    dataKeys?: string[];
  };
}

interface Conversation {
  id: string;
  device_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let storedDeviceId = localStorage.getItem("aura_device_id");
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem("aura_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);
    loadConversations(storedDeviceId);
    
    const cleanup = async () => {
      try {
        await supabase.rpc('delete_old_conversations');
      } catch (error) {
        console.error('Error cleaning up old conversations:', error);
      }
    };
    cleanup();
  }, []);

  const loadConversations = async (devId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('device_id', devId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        chartData: msg.chart_data as any
      })));
      setCurrentConversationId(conversationId);
    }
  };

  const saveMessage = async (conversationId: string, message: Message) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        chart_data: message.chartData || null
      });

    if (error) {
      console.error('Error saving message:', error);
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const createNewConversation = async () => {
    if (!deviceId) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        device_id: deviceId,
        title: 'New Conversation'
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversationId(data.id);
      setMessages([]);
      await loadConversations(deviceId);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (!error) {
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
      await loadConversations(deviceId);
      toast.success("Conversation deleted");
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  const regenerateResponse = async (messageIndex: number) => {
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== "user") return;

    setMessages((prev) => prev.slice(0, messageIndex));
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messages.slice(0, messageIndex),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let currentChartData = null;

      while (true) {
        const { done, value } = (await reader?.read()) || {};
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                assistantMessage += parsed.choices[0].delta.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = assistantMessage;
                  } else {
                    newMessages.push({
                      role: "assistant",
                      content: assistantMessage,
                    });
                  }
                  return newMessages;
                });
              }

              if (parsed.choices?.[0]?.delta?.tool_calls) {
                const toolCall = parsed.choices[0].delta.tool_calls[0];
                if (toolCall?.function?.name === "create_chart") {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    currentChartData = args;
                  } catch (e) {
                    console.error("Error parsing chart data:", e);
                  }
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }

      if (currentChartData) {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.chartData = currentChartData;
          }
          return newMessages;
        });
      }

      const finalMessage = {
        role: "assistant" as const,
        content: assistantMessage,
        chartData: currentChartData,
      };

      if (currentConversationId) {
        await saveMessage(currentConversationId, finalMessage);
      }
    } catch (error) {
      console.error("Error regenerating response:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = (chartData: Message['chartData']) => {
    if (!chartData) return null;

    const { type, data, xKey = 'name', yKey = 'value', title, dataKeys } = chartData;

    const commonProps = {
      width: '100%',
      height: 300,
      data,
    };

    return (
      <div className="my-4 p-4 bg-card rounded-lg border">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={300}>
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill={COLORS[0]} />
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke={COLORS[0]} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={yKey} stroke={COLORS[0]} fill={COLORS[0]} />
            </AreaChart>
          ) : type === 'scatter' ? (
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey={xKey} />
              <YAxis dataKey={yKey} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data" data={data} fill={COLORS[0]} />
            </ScatterChart>
          ) : type === 'radar' ? (
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Radar name="Data" dataKey={yKey} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          ) : type === 'radialBar' ? (
            <RadialBarChart innerRadius="10%" outerRadius="80%" data={data}>
              <RadialBar label={{ position: 'insideStart', fill: '#fff' }} background dataKey={yKey} />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          ) : type === 'composed' && dataKeys ? (
            <ComposedChart data={data}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
              ))}
            </ComposedChart>
          ) : type === 'funnel' ? (
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey={yKey} data={data}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          ) : type === 'treemap' ? (
            <Treemap data={data} dataKey="size" stroke="#fff" fill={COLORS[0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Treemap>
          ) : null}
        </ResponsiveContainer>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let convId = currentConversationId;
    if (!convId && deviceId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          device_id: deviceId,
          title: input.slice(0, 50)
        })
        .select()
        .single();

      if (!error && data) {
        convId = data.id;
        setCurrentConversationId(data.id);
        await loadConversations(deviceId);
      }
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (convId) {
      await saveMessage(convId, userMessage);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let currentChartData = null;

      while (true) {
        const { done, value } = (await reader?.read()) || {};
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.choices?.[0]?.delta?.content) {
                assistantMessage += parsed.choices[0].delta.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = assistantMessage;
                  } else {
                    newMessages.push({
                      role: "assistant",
                      content: assistantMessage,
                    });
                  }
                  return newMessages;
                });
              }

              if (parsed.choices?.[0]?.delta?.tool_calls) {
                const toolCall = parsed.choices[0].delta.tool_calls[0];
                if (toolCall?.function?.name === "create_chart") {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    currentChartData = args;
                  } catch (e) {
                    console.error("Error parsing chart data:", e);
                  }
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }

      if (currentChartData) {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.chartData = currentChartData;
          }
          return newMessages;
        });
      }

      const finalMessage = {
        role: "assistant" as const,
        content: assistantMessage,
        chartData: currentChartData,
      };

      if (convId) {
        await saveMessage(convId, finalMessage);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <h1 className="text-lg font-semibold">AURA</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={createNewConversation} variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-80">
                <SheetHeader>
                  <SheetTitle>Chat History</SheetTitle>
                  <SheetDescription>
                    Last 45 days of conversations
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  <div className="space-y-2 pr-4">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                          currentConversationId === conv.id ? "bg-accent border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => loadConversation(conv.id)}
                          >
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
                <span className="text-primary-foreground font-bold text-2xl">A</span>
              </div>
              <h2 className="text-3xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                I'm AURA, your advanced AI assistant. I excel in business intelligence, general knowledge, and speak 100+ languages. I can help with analysis, planning, conversation in any language, and format responses exactly how you need them.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 text-left flex flex-col items-start gap-1"
                  onClick={() => {
                    setInput("Create a business strategy for expanding into international markets");
                    document.querySelector<HTMLInputElement>('input[placeholder="Message AURA..."]')?.focus();
                  }}
                >
                  <span className="font-semibold text-sm">Business Strategy</span>
                  <span className="text-xs text-muted-foreground">Expand to international markets</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 text-left flex flex-col items-start gap-1"
                  onClick={() => {
                    setInput("Analyze this quarter's sales data and create a visualization");
                    document.querySelector<HTMLInputElement>('input[placeholder="Message AURA..."]')?.focus();
                  }}
                >
                  <span className="font-semibold text-sm">Data Analysis</span>
                  <span className="text-xs text-muted-foreground">Visualize sales trends</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 text-left flex flex-col items-start gap-1"
                  onClick={() => {
                    setInput("Explain blockchain technology in simple terms");
                    document.querySelector<HTMLInputElement>('input[placeholder="Message AURA..."]')?.focus();
                  }}
                >
                  <span className="font-semibold text-sm">Tech Explained</span>
                  <span className="text-xs text-muted-foreground">Simplify complex concepts</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 text-left flex flex-col items-start gap-1"
                  onClick={() => {
                    setInput("Translate my presentation to Spanish with cultural adaptations");
                    document.querySelector<HTMLInputElement>('input[placeholder="Message AURA..."]')?.focus();
                  }}
                >
                  <span className="font-semibold text-sm">Multilingual</span>
                  <span className="text-xs text-muted-foreground">100+ languages supported</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className="group">
                  <div className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-primary-foreground font-bold text-sm">A</span>
                      </div>
                    )}
                    <div className={`flex-1 space-y-2 ${message.role === "user" ? "max-w-[80%]" : ""}`}>
                      {message.role === "user" ? (
                        <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 ml-auto w-fit">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || "");
                                return !inline && match ? (
                                  <div className="relative group/code">
                                    <SyntaxHighlighter
                                      {...props}
                                      style={oneDark}
                                      language={match[1]}
                                      PreTag="div"
                                      className="rounded-lg !bg-zinc-950 !my-2"
                                    >
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover/code:opacity-100 transition-opacity"
                                      onClick={() => copyToClipboard(String(children), index * 1000 + 1)}
                                    >
                                      {copiedIndex === index * 1000 + 1 ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <code {...props} className={`${className} bg-muted px-1 py-0.5 rounded text-sm`}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      {message.chartData && (
                        <div className="my-4">
                          {renderChart(message.chartData)}
                        </div>
                      )}
                      {message.role === "assistant" && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateResponse(index)}
                            disabled={isLoading}
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-foreground font-medium text-sm">You</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">A</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground text-sm">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AURA..."
              disabled={isLoading}
              className="pr-12 h-12 rounded-2xl border-2 focus-visible:ring-0 focus-visible:border-primary"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            AURA can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
};
