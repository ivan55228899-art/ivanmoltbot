const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 我們改用最通用的 gemini-pro，搭配新的一把 Key
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
  res.send('LINE Bot (Gemini Pro) is ready.');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);

  try {
    // 這裡不做太複雜的設定，直接送出
    const result = await model.generateContent(event.message.text);
    const response = await result.response;
    const text = response.text();

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: text
    });

  } catch (error) {
    console.error('Gemini Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'AI 連線失敗。請確認 API Key 是否為 Google AI Studio 新建立的。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
