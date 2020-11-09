const Slimbot = require("slimbot");

const { TELEGRAM_BOT_TOKEN } = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error(
    "Seems like you forgot to pass Telegram Bot Token. I can not proceed..."
  );
  process.exit(1);
}

const rollDie = function() {
  return 1 + Math.floor(Math.random() * 6);
}

const roll = function(number) {
  let result = [];
  for (let i = 0; i < number; i++) {
    result.push(rollDie());
  }
  return result;
}

const doRoll = function(number) {  
  const result = roll(number);
  
  const dice = number !== 1 ? "dice" : "die";
  const rollString = `rolling ${number} ${dice}: [${result.join(", ")}]`;
  const hits = result.filter(d => d > 4).length;
  const hitString = hits !== 1 ? `${hits} hits` : `${hits} hit`;
  const failures = result.filter(d => d === 1).length;
  
  const strings = [rollString, hitString];
  if (failures > (result.length / 2)) {
    strings.push(`Glitched! ${failures} failures out of ${result.length}`);
    if (hits === 0) strings.push(`CRITICAL GLITCH!`)
  };

  return strings.join("\n");
}

const bot = new Slimbot(TELEGRAM_BOT_TOKEN);


bot.on('message', message => {
  const msg = message.text.toLowerCase();
  if (msg.startsWith('/roll') || msg.startsWith('/r')) {    
    const number = parseInt(message.text.replace('/roll', "").replace('/r', ''));
    if (isNaN(number)) {
      return;
    }
    const result = doRoll(number);
    bot.sendMessage(message.chat.id, result);
  }
});

bot.on('inline_query', query => {
  const number = parseInt(query.query);
  if (isNaN(number)) {
    return;
  }
  
  const result = doRoll(query.query);
  let results = JSON.stringify([{
    'id': 'roll',
    'type': 'article',
    'title': `roll ${number}d6`,
    'input_message_content': {
      'message_text': `@srrollbot\n${result}`,
      'disable_web_page_preview': true
    }
  }, ]);

  bot.answerInlineQuery(query.id, results, {'cache_time': 0});
});

bot.startPolling();