export async function handler(event) {
  try {
    const req = JSON.parse(event.body || "{}");

    const prompt =
`Napiši ${req.count || 5} Instagram objava za nišu/temu: ${req.topic || "lokalni kafić"}.
Ton: ${req.tone || "zabavan"}.
Cilj: ${req.goal || "prodaja"}.
Svaku objavu odvoji sa "---".`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: req.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ti si stručnjak za social media copywriting." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      })
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "Nema sadržaja.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ posts: text })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(e) })
    };
  }
}
