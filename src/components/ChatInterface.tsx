import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Image as ImageIcon, X, Mic, MicOff, Volume2, VolumeX, Pencil, History, Plus, Trash2, Check } from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, FunnelChart, Funnel, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import auraIcon from "@/assets/aura-icon.png";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm AURA, your intelligent business assistant. I can help you with business planning, strategies, market analysis, financial insights, and more. I can also create various types of charts and graphs from your data. You can upload images of documents, charts, or diagrams for me to analyze. How can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize device ID and load conversations
  useEffect(() => {
    let storedDeviceId = localStorage.getItem("aura_device_id");
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem("aura_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);
    loadConversations(storedDeviceId);
    
    // Clean up old conversations periodically
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
    
    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }
    
    setConversations(data || []);
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive"
      });
      return;
    }
    
    const loadedMessages: Message[] = data.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      chartData: msg.chart_data ? msg.chart_data as any : undefined
    }));
    
    setMessages(loadedMessages);
    setCurrentConversationId(conversationId);
    setIsHistoryOpen(false);
  };

  const saveMessage = async (message: Message) => {
    if (!currentConversationId) {
      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          device_id: deviceId,
          title: input.substring(0, 50) || 'New Conversation'
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        return;
      }
      
      setCurrentConversationId(conversation.id);
      loadConversations(deviceId);
      
      // Save message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: message.role,
          content: message.content,
          chart_data: message.chartData
        });
      
      if (msgError) console.error('Error saving message:', msgError);
    } else {
      // Save to existing conversation
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: message.role,
          content: message.content,
          chart_data: message.chartData
        });
      
      if (error) console.error('Error saving message:', error);
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
    }
  };

  const createNewConversation = () => {
    setMessages([{
      role: "assistant",
      content: "Hello! I'm AURA, your intelligent business assistant. How can I assist you today?"
    }]);
    setCurrentConversationId(null);
    setIsHistoryOpen(false);
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
    if (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
      return;
    }
    
    if (currentConversationId === conversationId) {
      createNewConversation();
    }
    
    loadConversations(deviceId);
    toast({
      title: "Success",
      description: "Conversation deleted"
    });
  };

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Error",
          description: "Failed to recognize speech. Please try again.",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [toast]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 20MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string, messageIndex: number) => {
    if (speakingMessageIndex === messageIndex) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingMessageIndex(null);
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeakingMessageIndex(messageIndex);
  };

  const startEdit = (index: number, content: string) => {
    setEditingMessageIndex(index);
    setEditedContent(content);
  };

  const cancelEdit = () => {
    setEditingMessageIndex(null);
    setEditedContent("");
  };

  const saveEdit = async (index: number) => {
    if (editedContent.trim() === "") {
      cancelEdit();
      return;
    }
    
    const updatedMessages = [...messages];
    updatedMessages[index].content = editedContent;
    setMessages(updatedMessages);
    setEditingMessageIndex(null);
    setEditedContent("");
    
    // Resend the edited message
    await handleSendMessage(editedContent);
  };

  const renderChart = (chartData: Message['chartData']) => {
    if (!chartData) return null;

    const { type, data, xKey = 'name', yKey = 'value', title, dataKeys } = chartData;

    return (
      <div className="mt-4 w-full">
        {title && <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>}
        <ResponsiveContainer width="100%" height={400}>
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey={yKey} fill="hsl(var(--chart-1))" />
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="hsl(var(--chart-2))" strokeWidth={2} />
            </LineChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Area type="monotone" dataKey={yKey} stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
            </AreaChart>
          ) : type === 'scatter' ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <YAxis dataKey={yKey} stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Scatter data={data} fill="hsl(var(--chart-4))" />
            </ScatterChart>
          ) : type === 'radar' ? (
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <PolarRadiusAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Radar dataKey={yKey} stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.6} />
            </RadarChart>
          ) : type === 'radialBar' ? (
            <RadialBarChart innerRadius="10%" outerRadius="80%" data={data}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <RadialBar dataKey={yKey} angleAxisId={0}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </RadialBar>
            </RadialBarChart>
          ) : type === 'funnel' ? (
            <FunnelChart>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Funnel dataKey={yKey} data={data}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          ) : type === 'treemap' ? (
            <Treemap data={data} dataKey="size" stroke="hsl(var(--background))" fill="hsl(var(--chart-1))">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Treemap>
          ) : type === 'composed' && dataKeys ? (
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              {dataKeys.map((key, index) => (
                index % 2 === 0 ? (
                  <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                ) : (
                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                )
              ))}
            </ComposedChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={120} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    );
  };

  const handleSendMessage = async (messageText: string = input) => {
    const trimmedInput = messageText.trim();
    if (trimmedInput === "" && !selectedImage) return;

    const userMessage: Message = {
      role: "user",
      content: trimmedInput || "Analyze this image",
      image: selectedImage || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    await saveMessage(userMessage);
    setInput("");
    setIsLoading(true);
    removeImage();

    try {
      const messagesForAPI = newMessages.map(msg => {
        const apiMessage: any = {
          role: msg.role,
          content: msg.content
        };
        
        if (msg.image) {
          apiMessage.content = [
            { type: "text", text: msg.content },
            {
              type: "image_url",
              image_url: {
                url: msg.image
              }
            }
          ];
        }
        
        return apiMessage;
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: messagesForAPI }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let toolCall: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  accumulatedContent += delta.content;
                  setMessages([...newMessages, {
                    role: "assistant",
                    content: accumulatedContent
                  }]);
                }

                if (delta?.tool_calls) {
                  const tc = delta.tool_calls[0];
                  if (!toolCall) {
                    toolCall = {
                      id: tc.id,
                      type: tc.type,
                      function: { name: tc.function?.name || '', arguments: '' }
                    };
                  }
                  if (tc.function?.arguments) {
                    toolCall.function.arguments += tc.function.arguments;
                  }
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }

      let finalMessage: Message = {
        role: "assistant",
        content: accumulatedContent
      };

      if (toolCall && toolCall.function.name === 'create_chart') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          finalMessage.chartData = args;
        } catch (e) {
          console.error('Error parsing tool call arguments:', e);
        }
      }

      setMessages([...newMessages, finalMessage]);
      await saveMessage(finalMessage);
      
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Chat with AURA</h2>
        <div className="flex gap-2">
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="card-3d">
                <History className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Conversation History</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={createNewConversation} className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  New Conversation
                </Button>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="flex flex-col gap-2 pr-4">
                    {conversations.map((conv) => (
                      <div key={conv.id} className="flex gap-2">
                        <Button
                          variant={currentConversationId === conv.id ? "default" : "ghost"}
                          onClick={() => loadConversation(conv.id)}
                          className="flex-1 justify-start text-left overflow-hidden"
                        >
                          <div className="truncate">{conv.title}</div>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteConversation(conv.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`p-4 max-w-[80%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground card-3d"
                  : "bg-muted card-3d-message"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <img src={auraIcon} alt="AURA" className="w-6 h-6 rounded-full" />
                  <span className="font-semibold text-foreground">AURA</span>
                </div>
              )}
              {editingMessageIndex === index ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(index)}>
                      <Check className="h-4 w-4 mr-1" />
                      Save & Resend
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Uploaded"
                      className="mt-2 rounded-lg max-w-full h-auto"
                    />
                  )}
                  {renderChart(message.chartData)}
                  {message.role === "user" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(index, message.content)}
                      className="mt-2"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {message.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakText(message.content, index)}
                      className="mt-2"
                    >
                      {speakingMessageIndex === index ? (
                        <VolumeX className="h-4 w-4 mr-1" />
                      ) : (
                        <Volume2 className="h-4 w-4 mr-1" />
                      )}
                      {speakingMessageIndex === index ? "Stop" : "Listen"}
                    </Button>
                  )}
                </>
              )}
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-muted card-3d-message">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-foreground">AURA is thinking...</span>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedImage && (
        <div className="mb-4">
          <Card className="p-2 inline-flex items-center gap-2">
            <img src={selectedImage} alt="Selected" className="w-20 h-20 object-cover rounded" />
            <Button variant="ghost" size="icon" onClick={removeImage}>
              <X className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="card-3d shrink-0"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleListening}
          className={`card-3d shrink-0 ${isListening ? 'bg-destructive text-destructive-foreground' : ''}`}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none min-h-[60px] max-h-[200px]"
          rows={2}
        />
        <Button 
          onClick={() => handleSendMessage()} 
          disabled={isLoading || (input.trim() === "" && !selectedImage)}
          className="card-3d animate-float-3d shrink-0"
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};