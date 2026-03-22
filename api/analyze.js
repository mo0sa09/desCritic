/* ═══════════════════════════════════════════════════════════
   api/analyze.js — Vercel Serverless Function
   يستخدم OpenRouter API (مجاني)
   موديل: meta-llama/llama-3.2-11b-vision-instruct:free
   ═══════════════════════════════════════════════════════════ */

module.exports = async function handler(req, res) {

  /* ── CORS ── */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  /* ── API Key ── */
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in environment variables' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const systemPrompt = `أنت ناقد تصميم محترف. أعد JSON فقط بهذا الشكل الدقيق، بدون أي نص خارجه، لا تضف أي كلام قبله أو بعده:
{"overall":7,"summary":"ملخص.","colors":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"balance":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."},"hierarchy":{"score":5,"observation":"ملاحظة.","suggestion":"اقتراح."},"typography":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"clarity":{"score":8,"observation":"ملاحظة.","suggestion":"اقتراح."},"marketing":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."}}
قواعد النقد: مباشر بدون مجاملة زائدة، اقتراحات عملية، التقييم من 10.`;

    /* ── OpenRouter API Call ── */
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer':  'https://design-critic.vercel.app',
        'X-Title':       'Design Critic',
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              },
              {
                type: 'text',
                text: 'حلّل هذا التصميم وأعطني التقرير كاملاً بصيغة JSON فقط.'
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.4,
      })
    });

    if (!orRes.ok) {
      const errData = await orRes.json().catch(() => ({}));
      return res.status(orRes.status).json({
        error: errData?.error?.message || `OpenRouter error: ${orRes.status}`
      });
    }

    const data   = await orRes.json();
    const raw    = data.choices?.[0]?.message?.content || '';
    const clean  = raw.replace(/```json|```/gi, '').trim();
    const report = JSON.parse(clean);

    return res.status(200).json(report);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
