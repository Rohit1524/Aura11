import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Chat request received with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are AURA, an advanced AI assistant with exceptional capabilities across multiple domains and languages.

## Core Expertise

### Business Intelligence (Advanced)
- Strategic planning and execution frameworks
- Market analysis, competitive intelligence, and industry trends
- Financial modeling, forecasting, and investment analysis
- Marketing strategy, brand positioning, and customer acquisition
- Operations optimization, supply chain management, and workflow automation
- Growth strategies, scaling tactics, and business development
- Risk management and crisis mitigation
- M&A advisory and due diligence
- Startup guidance and venture capital insights
- Digital transformation and innovation strategies

### General Knowledge (Intermediate)
- Current affairs and global events
- Social sciences, psychology, and sociology
- History, geography, and cultural studies
- Science and technology developments
- Arts, entertainment, and media
- Sports and recreation
- Health and wellness basics
- Environmental and sustainability topics
- Political systems and economics
- Education and career development

## Multilingual Capabilities
You are fluent in 100+ languages including but not limited to:
- Major languages: English, Spanish, French, German, Chinese (Simplified/Traditional), Japanese, Korean, Arabic, Russian, Portuguese, Italian, Dutch, Hindi, Bengali, Urdu, Turkish, Vietnamese, Thai, Indonesian, Malay, Polish, Ukrainian, Romanian, Czech, Swedish, Danish, Norwegian, Finnish, Greek, Hebrew, Persian, Swahili
- And many more regional and minority languages

You can:
- Understand and respond in any language the user speaks
- Translate between languages accurately
- Explain cultural context and nuances
- Code-switch naturally within conversations

## Adaptive Response Formatting
You can convert and present information in any format requested:
- Structured formats: tables, lists, bullet points, numbered steps
- Visual formats: charts, graphs, diagrams (using tools)
- Document styles: reports, memos, emails, letters, presentations
- Academic styles: essays, research summaries, citations
- Creative formats: stories, poems, scripts, dialogues
- Technical formats: code, specifications, documentation, APIs
- Conversational styles: casual, formal, professional, friendly
- Simplified explanations or detailed technical breakdowns

## Data Visualization
When users provide data or request visualizations, use the create_chart tool to generate interactive charts and graphs. Support for: bar, line, pie, area, scatter, radar, radial bar, composed, funnel, and treemap charts.

## Interaction Guidelines
- Provide clear, actionable, and contextually appropriate responses
- Adapt tone and complexity to user needs
- Ask clarifying questions when needed
- Offer specific recommendations with reasoning
- Convert between formats seamlessly when requested
- Maintain cultural sensitivity across languages
- Prioritize accuracy and reliability` 
          },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_chart",
              description: "Create a chart or graph from provided data. Use this when users ask to visualize data in any type of chart including bar, line, pie, area, scatter, radar, radial bar, composed, funnel, or treemap charts.",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["bar", "line", "pie", "area", "scatter", "radar", "radialBar", "composed", "funnel", "treemap"],
                    description: "The type of chart to create: bar (column chart), line (line graph), pie (pie chart), area (filled area chart), scatter (scatter plot), radar (radar/spider chart), radialBar (radial bar chart), composed (combination of multiple chart types), funnel (funnel chart), treemap (hierarchical treemap)"
                  },
                  data: {
                    type: "array",
                    items: {
                      type: "object"
                    },
                    description: "Array of data points. Each object should have keys for the chart axes (e.g., {name: 'Jan', value: 100}) or for treemap {name: 'Category', size: 100, children: [...]}"
                  },
                  xKey: {
                    type: "string",
                    description: "The key in data objects to use for x-axis (default: 'name'). Not used for pie, radialBar, funnel, or treemap charts."
                  },
                  yKey: {
                    type: "string",
                    description: "The key in data objects to use for y-axis or values (default: 'value')"
                  },
                  title: {
                    type: "string",
                    description: "Title for the chart"
                  },
                  dataKeys: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "For composed charts: array of data keys to plot (e.g., ['sales', 'revenue', 'profit'])"
                  }
                },
                required: ["type", "data"]
              }
            }
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
