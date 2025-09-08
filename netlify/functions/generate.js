export async function handler(event) {
  try {
    // 1) Bezbedno parsiranje tela + podrazumevane vrednosti
    let req = {};
    try { req = JSON.parse(event.body || "{}"); } catch {}
    const count = Number(req.count) > 0 ? Number(req.count) : 5;
    const topic = (req.topic || "lokalni kafić").toString();
    const tone  = (req.tone  || "zabavan").toString();
    const goal  = (req.goal  || "prodaja").toString();
    const model = (req.model || "gpt-4o-mini").toString();

    // 2) Provera ključa (najčešći uzrok praznog odgovora)
    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: "OPENAI_API_KEY nije postavljen u Netlify Environment variables." });
    }

    // 3) Prompt
    const userPrompt =
`Napiši ${count} Instagram objava za nišu/temu: ${topic}.
Ton: ${tone}. Cilj: ${goal}.
Svaku objavu odvoji sa linijom '---'.
Kratko, jasno, bez heštegova na svakom redu.`

    // 4) Poziv prema OpenAI
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Ti si stručnjak za social media copywriting." },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8
      })
    });

    // Ako API vrati grešku, pročitaj tekst i prosledi ga
    if (!res.ok) {
      const errText = await res.text();
      return json(res.status, { error: `OpenAI error ${res.status}: ${errText}` });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // 5) Parsiranje u niz postova
    let posts = raw
      .split(/(?:^|\n)---+\n?/g)     // deli po '---'
      .map(s => s.trim())
      .filter(Boolean);

    // Ako je prazno, generiši fallback
    if (posts.length === 0) {
      posts = [`[Fallback] Tema: ${topic}. Ton: ${tone}. Cilj: ${goal}.`];
    }

    return json(200, { ok: true, posts });
  } catch (e) {
    return json(500, { error: String(e) });
  }
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
