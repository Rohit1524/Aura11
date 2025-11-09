import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-business.jpg";

interface HeroProps {
  onStartChat: () => void;
}

export const Hero = ({ onStartChat }: HeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Business Solutions
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Your Intelligent{" "}
              <span className="bg-gradient-accent bg-clip-text text-transparent">
                Business Assistant
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Streamline your daily operations with AI that understands your business needs. 
              From planning to execution, get instant insights and actionable strategies.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={onStartChat}
                className="group"
              >
                Start Conversation
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
            
            <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div>
                <div className="text-3xl font-bold text-foreground">Instant</div>
                <div className="text-sm text-muted-foreground">Responses</div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div>
                <div className="text-3xl font-bold text-foreground">Smart</div>
                <div className="text-sm text-muted-foreground">Analysis</div>
              </div>
            </div>
          </div>
          
          <div className="relative lg:block hidden">
            <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-20 rounded-full"></div>
            <img 
              src={heroImage} 
              alt="Modern business workspace with analytics dashboard" 
              className="relative rounded-2xl shadow-elegant w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
