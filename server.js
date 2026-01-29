require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

const handleCallback = (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling events:', err);
      res.status(500).end();
    });
};

app.post('/callback', line.middleware(config), handleCallback);
app.post('/', line.middleware(config), handleCallback);

app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const client = new line.Client(config);
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: event.message.text
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
