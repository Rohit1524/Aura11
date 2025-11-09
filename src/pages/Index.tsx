import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  const scrollToChat = () => {
    document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <Hero onStartChat={scrollToChat} />
      <Features />
      <ChatInterface />
    </div>
  );
};

export default Index;
