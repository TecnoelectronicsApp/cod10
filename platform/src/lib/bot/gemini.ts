const DEFAULT_SYSTEM_PROMPT = `Eres el asistente virtual de ventas de Codigo 10 (Cod10), una tienda de delivery.
Responde en español de forma amable, clara y concisa por WhatsApp.
Usa SOLO la información del menú, precios y métodos de pago proporcionada — no inventes productos ni precios.
Si el cliente pregunta por un producto que no existe, indícalo amablemente y ofrece alternativas del menú.
Si pregunta cómo pagar, explica los métodos disponibles (Pagomóvil, efectivo, punto de venta, etc.) con los datos exactos.
Muestra precios en USD y en Bs si la tasa BCV está disponible.
Invita al cliente a pedir en ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app'} para checkout completo.
Si tienes el link de acceso rápido del cliente (con su teléfono), envíalo — entra sin escribir datos.
Mantén respuestas cortas (máximo 3 párrafos). Usa emojis con moderación.`;

export async function generateGeminiReply(
  catalogContext: string,
  userMessage: string,
  systemPrompt?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const prompt = systemPrompt ?? process.env.GEMINI_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
  const fullSystem = `${prompt}\n\n${catalogContext}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: fullSystem }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}
