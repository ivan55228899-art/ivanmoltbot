const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 設定 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

const app = express();

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
    // 1. 顯示載入動畫 (如果需要的話，可選)
    // await client.showLoadingAnimation(event.chatId); 

    // 2. 呼叫 Gemini
    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: "你現在是一個有用的 AI 助手。請用繁體中文回答。" }],
            },
            {
                role: "model",
                parts: [{ text: "好的，我會用繁體中文為您服務。" }],
            },
        ],
    });
    
    const result = await chat.sendMessage(event.message.text);
    const responseText = result.response.text();

    // 3. 回覆使用者
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: responseText
    });

  } catch (error) {
    console.error('Gemini Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，我現在有點累（AI 連線錯誤），請稍後再試。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
