/* ═══════════════════════════════════════════════════════════
   api/analyze.js — Vercel Serverless Function
   يستخدم Google Gemini API مباشرة
   ═══════════════════════════════════════════════════════════ */

module.exports = async function handler(req, res) {

  /* ── CORS ── */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  /* ── API Key ── */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const prompt = `أنت ناقد تصميم محترف. أعد JSON فقط بهذا الشكل الدقيق، بدون أي نص خارجه:
{"overall":7,"summary":"ملخص.","colors":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"balance":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."},"hierarchy":{"score":5,"observation":"ملاحظة.","suggestion":"اقتراح."},"typography":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"clarity":{"score":8,"observation":"ملاحظة.","suggestion":"اقتراح."},"marketing":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."}}
قواعد النقد: مباشر بدون مجاملة زائدة، اقتراحات عملية، التقييم من 10.`;

    /* ── Gemini API Call ── */
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      return res.status(geminiRes.status).json({
        error: errData?.error?.message || `Gemini error: ${geminiRes.status}`
      });
    }

    const data   = await geminiRes.json();
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean  = raw.replace(/```json|```/gi, '').trim();
    const report = JSON.parse(clean);

    return res.status(200).json(report);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
