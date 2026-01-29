const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch'); // Render 的 Node 環境通常內建 fetch，但為了保險我們用原生 fetch

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
  res.send('LINE Bot (Direct Fetch) is running!');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);
  
  // 使用您設定的 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  // 我們直接指定 API 網址，不做任何縮寫
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: event.message.text
          }]
        }]
      })
    });

    const data = await response.json();

    // 如果 Google 回傳錯誤，印出來看
    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data, null, 2));
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `AI 連線錯誤: ${data.error?.message || '未知錯誤'}`
      });
    }

    // 取得 AI 回覆
    const aiText = data.candidates[0].content.parts[0].text;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiText
    });

  } catch (error) {
    console.error('Network Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統錯誤，請稍後再試。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
