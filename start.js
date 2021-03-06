// Author: Nikhil Jha
// License: MIT

// Not the Onion?
// Can you tell if an article is from the Onion, or is it real?

// Init Dependencies
var TelegramBot = require('node-telegram-bot-api');
var FeedParser = require('feedparser')
  , request = require('request');
var jsonfile = require('jsonfile')
var file = 'articles.arbtxt'
const fs = require('fs');

// Clear Article Cache
fs.writeFile(file, '', function (err) {
      if (err) return console.log(err);
});

// Grab the RSS feed
var FeedParser = require('feedparser')
  , request = require('request');
var req = request('https://www.reddit.com/r/theonion+nottheonion/hot/.rss')
  , feedparser = new FeedParser();
req.on('error', function (error) {
});
req.on('response', function (res) {
  var stream = this;
  if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
  stream.pipe(feedparser);
});
feedparser.on('error', function(error) {
});
feedparser.on('readable', function() {
  var stream = this
    , meta = this.meta
    , item;
  while (item = stream.read()) {
    fs.appendFile(file, item.title + '`' + item.categories[0] + '\n', function (err) {
          if (err) return console.log(err);
      });
  }
});

// Create User Database
var levelup = require('levelup')
var db = levelup('./mydb')

// Let's pretend some guy from TG already asked for a title.
var token = fs.readFileSync('telegram.token', 'utf-8');
token = token.split('\n')[0]

// Setup polling
var bot = new TelegramBot(token, {polling: true});

// Matches /start
bot.onText(/\/start(.*)/, function (msg, match) {
  // Setup Keyboard
  var opts = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['Onion'],
          ['Not the Onion']]
      })
    };

  // Send them a new one
  var text = fs.readFileSync(file, 'utf-8')
  var lines = text.split('\n');
  var fromId = msg.from.id;
  var resp = lines[Math.floor(Math.random()*lines.length)];
  db.put(fromId + 't', resp.split('`')[1], function (err) {
    if (err) return console.log('Ooops!', err) // some kind of I/O error
  })
  bot.sendMessage(fromId, resp.split('`')[0], opts);
});

// Matches
bot.onText(/(Not the )?Onion/, function (msg, match) {
  // Setup keyboard
  var opts = {
      reply_markup: JSON.stringify({
        keyboard: [
          ['Onion'],
          ['Not the Onion']]
      })
    };

  // Check what user Said
  if (msg.text === 'Not the Onion') {
    console.log(msg.text)
    var onion = 'nottheonion'
  } else {
    console.log(msg.text)
    var onion = 'TheOnion'
  }

  // Check if they were right
  // If so, give them a point
  db.get(msg.from.id + 't', function (err, value) {
    if (err) return console.log('Ooops!', err)
    var text = fs.readFileSync(file, 'utf-8')
    var lines = text.split('\n');
    var fromId = msg.from.id;
    var resp = lines[Math.floor(Math.random()*lines.length)];
    console.log(value);
    console.log(onion);
    if (value == onion) {
      db.put(msg.from.id + 's', 1, function (err) {
        if (err) return console.log('oh nose', err);
        db.put(fromId + 't', resp.split('`')[1], function (err) {
          if (err) return console.log('Ooops!', err) // some kind of I/O error
        })
        bot.sendMessage(fromId, 'Correct!', opts);
        bot.sendMessage(fromId, resp.split('`')[0], opts);
      })
    } else {
      db.put(fromId + 't', resp.split('`')[1], function (err) {
        if (err) return console.log('Ooops!', err) // some kind of I/O error
      })
      bot.sendMessage(fromId, 'Incorrect!', opts);
      bot.sendMessage(fromId, resp.split('`')[0], opts);
    }
  })
});
