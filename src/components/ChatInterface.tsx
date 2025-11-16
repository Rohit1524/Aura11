import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Image as ImageIcon, X, Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import auraIcon from "@/assets/aura-icon.png";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm AURA, your intelligent business assistant. I can help you with business planning, strategies, market analysis, financial insights, and more. You can also upload images of documents, charts, or diagrams for me to analyze. How can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const imageToSend = selectedImage;
    
    setInput("");
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const newUserMessage: Message = {
      role: "user",
      content: userMessage || "Please analyze this image",
      image: imageToSend || undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const messagePayload = imageToSend
        ? {
            role: "user",
            content: [
              { type: "text", text: userMessage || "Please analyze this image" },
              { 
                type: "image_url", 
                image_url: { url: imageToSend }
              }
            ]
          }
        : { role: "user", content: userMessage };

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.image 
                ? [
                    { type: "text", text: msg.content },
                    { type: "image_url", image_url: { url: msg.image } }
                  ]
                : msg.content
            })),
            messagePayload
          ]
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response from AURA");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let textBuffer = "";
      let streamDone = false;

      // Add placeholder message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            // Speak the complete response
            if (assistantMessage) {
              speakText(assistantMessage);
            }
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              setMessages(prev => 
                prev.map((m, i) => 
                  i === prev.length - 1 
                    ? { ...m, content: assistantMessage } 
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              setMessages(prev => 
                prev.map((m, i) => 
                  i === prev.length - 1 
                    ? { ...m, content: assistantMessage } 
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Speak final message if not already spoken
      if (assistantMessage && !isSpeaking) {
        speakText(assistantMessage);
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response. Please try again.",
        variant: "destructive"
      });
      // Remove the placeholder message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <section id="chat" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-neon relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Chat with AURA</h2>
          <p className="text-muted-foreground">Your intelligent business companion with voice interaction</p>
        </div>

        <Card className="overflow-hidden shadow-neon border-primary/20 animate-glow-pulse">
          <div className="h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  } animate-fade-in`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                    message.role === "user" 
                      ? "bg-accent" 
                      : "bg-gradient-primary p-0.5"
                  }`}>
                    {message.role === "user" ? (
                      <div className="w-full h-full bg-accent rounded-full flex items-center justify-center">
                        <span className="text-accent-foreground font-semibold text-sm">You</span>
                      </div>
                    ) : (
                      <img 
                        src={auraIcon} 
                        alt="AURA" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                  </div>
                  
                   <div className={`flex-1 max-w-[80%] ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gradient-accent text-foreground shadow-glow"
                        : "bg-secondary/80 backdrop-blur-sm text-foreground border border-primary/20"
                    }`}>
                      {message.image && (
                        <img 
                          src={message.image} 
                          alt="Uploaded" 
                          className="max-w-full max-h-64 rounded-lg mb-2"
                        />
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center p-0.5">
                    <img 
                      src={auraIcon} 
                      alt="AURA" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-4 rounded-2xl bg-secondary">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-6 bg-card">
              {selectedImage && (
                <div className="mb-4 relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="max-h-32 rounded-lg"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="lg"
                  disabled={isLoading}
                  className="flex-shrink-0 border-primary/30 hover:border-primary/50 hover:shadow-glow"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>

                <Button
                  onClick={toggleListening}
                  variant={isListening ? "default" : "outline"}
                  size="lg"
                  disabled={isLoading}
                  className={`flex-shrink-0 ${isListening ? 'animate-glow-pulse' : 'border-primary/30 hover:border-primary/50'}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {isSpeaking && (
                  <Button
                    onClick={stopSpeaking}
                    variant="outline"
                    size="lg"
                    className="flex-shrink-0 border-accent/30 hover:border-accent/50 animate-glow-pulse"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                )}
                
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask AURA anything or use voice..."
                  className="flex-1 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50"
                  disabled={isLoading || isListening}
                />
                
                <Button 
                  onClick={sendMessage}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
