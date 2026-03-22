export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const systemPrompt = `أنت ناقد تصميم محترف. أعد JSON فقط بهذا الشكل الدقيق، بدون أي نص خارجه:
{"overall":7,"summary":"ملخص.","colors":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"balance":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."},"hierarchy":{"score":5,"observation":"ملاحظة.","suggestion":"اقتراح."},"typography":{"score":6,"observation":"ملاحظة.","suggestion":"اقتراح."},"clarity":{"score":8,"observation":"ملاحظة.","suggestion":"اقتراح."},"marketing":{"score":7,"observation":"ملاحظة.","suggestion":"اقتراح."}}
قواعد النقد: مباشر بدون مجاملة زائدة، اقتراحات عملية، التقييم من 10.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text',  text: 'حلّل هذا التصميم.' }
          ]
        }]
      })
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: errData?.error?.message || `Anthropic error: ${anthropicRes.status}`
      });
    }

    const data   = await anthropicRes.json();
    const raw    = data.content.filter(x => x.type === 'text').map(x => x.text).join('');
    const report = JSON.parse(raw.replace(/```json|```/gi, '').trim());

    return res.status(200).json(report);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

**4.** اضغط **Commit changes**

**5.** Vercel يعمل Redeploy تلقائي — وبعدها يشتغل ✅

---

هيكل الـ repo المفروض يكون كذا:
```
repo/
├── index.html
├── style.css
├── app.js
├── vercel.json
└── api/
    └── analyze.js   ← الجديد
