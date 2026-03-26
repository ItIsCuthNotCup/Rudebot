export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("Server misconfigured", { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Only allow models we expect
    const ALLOWED_MODELS = [
      "openai/gpt-4o-mini",
      "reka/reka-edge",
      "mistralai/mistral-small-creative",
      "x-ai/grok-4.1-fast",
    ];
    if (!ALLOWED_MODELS.includes(body.model)) {
      return new Response("Invalid model", { status: 400 });
    }

    // Cap tokens to prevent abuse
    body.max_tokens = Math.min(body.max_tokens || 60, 100);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rudebot-proxy.workers.dev",
        "X-Title": "RudeBot"
      },
      body: JSON.stringify(body)
    });

    const result = await response.text();

    return new Response(result, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
