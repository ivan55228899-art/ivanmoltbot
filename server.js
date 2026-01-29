const express = require('express');
const line = require('@line/bot-sdk');
// 刪除了 const fetch = ... 因為 Node.js 18 以上已經內建 fetch 了

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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    // 使用 Node.js 內建的 fetch
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

    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data, null, 2));
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `AI 連線錯誤: ${data.error?.message || '未知錯誤'}`
      });
    }

    // 檢查是否有回傳內容
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
       return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'AI 沒有回傳任何內容，可能被安全過濾器擋住了。'
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
      text: '系統錯誤，請檢查 Log。'
    });
  }
}

const port = process.env.PORT || 3000;
