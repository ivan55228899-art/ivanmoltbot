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

// ★ 改用 gemini-1.5-flash，這是目前 Google 最推薦且支援度最高的模型
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
  res.send('LINE Gemini Bot (Flash) is running!');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);

  try {
    const result = await model.generateContent(event.message.text);
    const response = await result.response;
    const text = response.text();

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: text
    });

  } catch (error) {
    console.error('Gemini Error:', error);
    // 這裡我們把錯誤印出來給你看，如果再錯就知道原因了
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'AI 連線失敗，請檢查 Render Logs。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
