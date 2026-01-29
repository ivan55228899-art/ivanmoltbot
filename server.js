const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch'); // ★ 加回這行，保證有 fetch 可用

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

app.post('/callback', line.middleware(config), async (req, res) => {
  try {
    const result = await Promise.all(req.body.events.map(handleEvent));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.post('/', line.middleware(config), async (req, res) => {
  try {
    const result = await Promise.all(req.body.events.map(handleEvent));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.get('/', (req, res) => {
  res.send('LINE Bot (Direct Fetch v2) is running!');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);
  
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: event.message.text }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data, null, 2));
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `AI 連線錯誤: ${data.error?.message || '未知錯誤'}`
      });
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
       return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'AI 沒有回應內容。'
      });
    }

    const aiText = data.candidates[0].content.parts[0].text;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiText
    });

  } catch (error) {
    console.error('Network Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統發生錯誤。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
