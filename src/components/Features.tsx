import { Card } from "@/components/ui/card";
import { 
  Brain, 
  TrendingUp, 
  FileText, 
  Target, 
  MessageSquare, 
  Zap 
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Smart Business Insights",
    description: "Get AI-powered analysis of your business operations and market trends for informed decision-making."
  },
  {
    icon: TrendingUp,
    title: "Growth Strategies",
    description: "Receive personalized recommendations to scale your business and increase revenue streams."
  },
  {
    icon: FileText,
    title: "Business Planning",
    description: "Create comprehensive business plans, financial projections, and strategic roadmaps instantly."
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set and monitor business objectives with intelligent progress tracking and milestone suggestions."
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Interact naturally with your AI assistant, asking questions just like you would a business consultant."
  },
  {
    icon: Zap,
    title: "Instant Automation",
    description: "Automate routine tasks and workflows to focus on what matters most - growing your business."
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Everything Your Business Needs
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help you manage, grow, and optimize your business operations
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-8 hover:shadow-elegant transition-all duration-300 border-border bg-card group cursor-pointer"
            >
              <div className="mb-6 w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-card-foreground">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
