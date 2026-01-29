const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ★★★ 關鍵修改：使用 gemini-pro，它是目前最穩定的模型名稱 ★★★
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.post('/', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.get('/', (req, res) => {
  res.send('LINE Gemini Bot is running!');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);

  try {
    // 呼叫 Gemini
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
      text: '抱歉，AI 暫時無法回應。請檢查 Log。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
