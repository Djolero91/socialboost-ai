// netlify/functions/generate.js
export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      topic = "",
      goal = "Prodaja",
      platform = "Instagram",
      tone = "Zabavan",
      posts = 5,
      lang = "sr",
      model = "llama-3.1-70b-versatile" // Groq modeli: llama-3.1-70b-versatile, 8b, 405b (ako je dostupan)
    } = body;

    if (!process.env.GROQ_API_KEY) {
      return json(500, { error: "GROQ_API_KEY nije postavljen u Netlify Environment variables." });
    }

    const prompt = `
Praviš kalendar objava za društvene mreže.
Ulaz:
- Tema/Niša: ${topic}
- Cilj: ${goal}
- Platforma: ${platform}
- Ton: ${tone}
- Jezik (ISO skraćenica): ${lang}
- Broj objava: ${posts}

Zadatak:
Napravi ${posts} konkretnih objava (short-form copy) za ${platform} na jeziku '${lang}' i drži se tona '${tone}'.
Za svaku objavu vrati JSON objekat sa poljima:
  "title", "post", "hashtags" (niz), "cta" (kratak poziv na akciju).
Bez dodatnog teksta — samo validan JSON niz.
`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "Ti si stručnjak za social media copy. Odgovaraj isključivo u traženom jeziku. Kada se traži JSON, vrati samo čisti JSON niz."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return json(res.status, { error: `Groq API error: ${errText}` });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "[]";

    // pokušaj da parsiraš JSON iz odgovora
    let items;
    try {
      items = JSON.parse(raw);
    } catch {
      // fallback: ukloni code fence ako ga ima
      const cleaned = raw.replace(/^```json/i, "").replace(/```$/i, "").trim();
      items = JSON.parse(cleaned);
    }

    return json(200, { items });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(obj),
  };
}
