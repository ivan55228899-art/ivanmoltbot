const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 建立 Express App
const app = express();

// 初始化 Gemini (確保有 API KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 改用最新的 Flash 模型，速度快且便宜
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 處理 Webhook (POST /callback)
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 根目錄Fallback (防止誤連)
app.post('/', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 健康檢查
app.get('/', (req, res) => {
  res.send('LINE Gemini Bot (Flash) is running!');
});

// 事件處理主程式
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);

  try {
    // 這裡我們直接把使用者的訊息傳給 Gemini
    // 如果想要有「記憶」功能，需要更複雜的資料庫，目前先做單次問答
    const result = await model.generateContent(event.message.text);
    const responseText = result.response.text();

    // 回覆 LINE
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: responseText
    });

  } catch (error) {
    console.error('Gemini Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，AI 目前有點忙碌，請稍後再試。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
