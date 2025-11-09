import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI business assistant. How can I help you today? Ask me anything about business planning, strategies, or daily operations."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // TODO: Replace with actual AI API call
      // For now, simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = generateMockResponse(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
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
    <section id="chat" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Start Your Conversation</h2>
          <p className="text-muted-foreground">Ask me anything about your business</p>
        </div>

        <Card className="overflow-hidden shadow-elegant">
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
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.role === "user" 
                      ? "bg-accent" 
                      : "bg-gradient-primary"
                  }`}>
                    {message.role === "user" ? (
                      <User className="w-5 h-5 text-accent-foreground" />
                    ) : (
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>
                  
                  <div className={`flex-1 max-w-[80%] ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
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
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-background"
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="lg"
                  variant="default"
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

// Mock response generator (will be replaced with actual AI)
function generateMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes("business plan") || lowerMessage.includes("planning")) {
    return "A solid business plan is essential for success. Here are the key components:\n\n1. Executive Summary - Overview of your business\n2. Market Analysis - Understanding your target market\n3. Organization Structure - Your team and management\n4. Product/Service Line - What you're offering\n5. Marketing Strategy - How you'll reach customers\n6. Financial Projections - Revenue and expense forecasts\n\nWould you like me to help you develop any specific section?";
  }
  
  if (lowerMessage.includes("marketing") || lowerMessage.includes("customer")) {
    return "For effective marketing, focus on:\n\n• Identifying your target audience\n• Creating compelling value propositions\n• Leveraging digital channels (social media, email, content)\n• Building strong customer relationships\n• Measuring and optimizing campaign performance\n\nWhat aspect of marketing would you like to explore further?";
  }
  
  if (lowerMessage.includes("finance") || lowerMessage.includes("money") || lowerMessage.includes("revenue")) {
    return "Financial management is crucial for business health. Key areas to focus on:\n\n• Cash flow monitoring and forecasting\n• Budgeting and expense control\n• Revenue diversification\n• Profit margin optimization\n• Financial reporting and analysis\n\nWhat specific financial challenge can I help you with?";
  }
  
  return "That's a great question! I can help you with business planning, marketing strategies, financial management, operations, and much more. Could you provide more details about what specific aspect you'd like assistance with?";
}
