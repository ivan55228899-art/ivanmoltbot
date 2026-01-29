const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch');

const app = express();

// 1. 啟動時自我檢查：確認鑰匙都在嗎？
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 如果沒抓到變數，先不要讓程式掛掉，而是印出警告
if (!config.channelAccessToken || !config.channelSecret) {
  console.error("【嚴重錯誤】------------------------------------------------");
  console.error(" 找不到 LINE 的設定檔！請檢查 Render 的 Environment Variables");
  console.error(` - Access Token: ${config.channelAccessToken ? '有抓到' : '❌ 遺失'}`);
  console.error(` - Secret:       ${config.channelSecret ? '有抓到' : '❌ 遺失'}`);
  console.error("-----------------------------------------------------------");
  // 為了防止 SDK 報錯，我們先給它假資料，讓伺服器至少能啟動報平安
  config.channelAccessToken = 'MISSING';
  config.channelSecret = 'MISSING';
}

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
  if (config.channelAccessToken === 'MISSING') {
    res.send('❌ 錯誤：找不到環境變數 (Env Vars)。請看 Render Logs。');
  } else {
    res.send('✅ LINE Bot 正常運作中！');
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
     return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ 錯誤：找不到 GEMINI_API_KEY，請去 Render 設定。'
      });
  }

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
        text: 'AI 沒有回應。'
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
