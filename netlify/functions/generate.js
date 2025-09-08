// Netlify Function: /api/generate  (Groq + 5 jezika, Groq je primarni)
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SUPPORTED_LANGS = {
  sr: "Serbian",
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
};

export async function handler(event) {
  try {
    // Bezbedno parsiranje tela
    let req = {};
    try { req = JSON.parse(event.body || "{}"); } catch {}

    const count = Math.min(Math.max(Number(req.count) || 5, 1), 50);
    const topic = (req.topic || "lokalni kafić").toString();
    const tone  = (req.tone  || "zabavan").toString();
    const goal  = (req.goal  || "prodaja").toString();

    // Jezik (default sr)
    const lang = (req.language || "sr").toString().toLowerCase();
    const languageName = SUPPORTED_LANGS[lang] || SUPPORTED_LANGS.sr;

    // Model na Groq-u
    const model = (req.model || "llama-3.1-70b-versatile").toString();

    if (!process.env.GROQ_API_KEY) {
      return json(500, { error: "GROQ_API_KEY nije postavljen u Netlify Environment variables." });
    }

    const userPrompt = `
Write ${count} short Instagram/TikTok posts for topic: "${topic}".
Tone: ${tone}. Goal: ${goal}. Language: ${languageName}.
Each post must be separated with a line '---'.
Keep posts concise, punchy, and platform-ready. Avoid filler text.
`.trim();

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are an expert social media copywriter." },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8
      })
    });

    const bodyText = await r.text();
    if (!r.ok) return json(r.status, { error: `Groq API ${r.status}: ${bodyText}` });

    let data = {};
    try { data = JSON.parse(bodyText); } catch { return json(500, { error: "Nevalidan JSON odgovor." }); }

    const raw = data?.choices?.[0]?.message?.content || "";
    const posts = splitPosts(raw);

    return json(200, { ok: true, vendor: "groq", language: lang, posts });
  } catch (e) {
    return json(500, { error: String(e) });
  }
}

function splitPosts(raw) {
  const arr = raw.split(/(?:^|\n)---+\n?/g).map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : [raw.trim()];
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(obj)
  };
}
