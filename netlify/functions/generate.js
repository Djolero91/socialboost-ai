// Serverless funkcija za Netlify (Groq API)
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { niche, tone, goal, platform, count = 12, model = 'llama-3.1-8b-instant', lang = 'sr' } = JSON.parse(event.body || '{}');

    // Bezbedno čitanje ključa iz okruženja
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'GROQ_API_KEY is not set.' };
    }

    // Prompt – tražimo STROGO JSON bez teksta okolo
    const system = `You are a helpful social media copywriter. 
Return ONLY valid JSON with the shape:
{"items":[{"title":"","body":"","hashtags":["","#"],"cta":""}, ...]} 
Do not include backticks or extra text. 
Language: ${lang}. 
Write for platform: ${platform}. Tone: ${tone}. Goal: ${goal}. 
Keep each post concise and catchy.`;

    const user = `Niche/topic: ${niche || 'generic brand'}. 
Generate ${Math.max(3, Math.min(50, parseInt(count || 12)))} short posts. 
Hashtags should be relevant and diverse.`;

    // Groq Chat Completions endpoint (OpenAI-kompatibilan)
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model, // npr: "llama-3.1-8b-instant" ili "llama-3.1-70b-versatile"
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      return { statusCode: resp.status, body: `Groq API error: ${t}` };
    }

    const data = await resp.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
