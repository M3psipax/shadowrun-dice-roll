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
  }

  return strings.join("\n");
}

const isCommand = function(msg) {
  const match = msg.match(/\/(r|roll)(\s*)(\d+)/i);
  return (match && match[3]) || false;
}

const isQuery = function(msg) {
  const match = msg.match(/(\s*)(\d+)/i);
  return (match && match[2]) || false;
}
const commandError = function(input) {
  return `Didn't understand command: "${input}". Please enter /r or /roll followed by the number of dice. Example: /r 12`
}

const inlineQueryError = function(input) {
  return `Didn't understand query: "${input}". Please enter @srrollbot followed by the number of dice and click the suggestion. Example: @srrollbot 12`
}

const bot = new Slimbot(TELEGRAM_BOT_TOKEN);

bot.on('message', message => {
  let response = commandError(message.text);
  const diceNumber = isCommand(message.text);
  if (diceNumber) {
    const number = parseInt(diceNumber);
    if (isNaN(number)) {
      return;
    }
    response = doRoll(number);
  }

  bot.sendMessage(message.chat.id, response);
});

bot.on('inline_query', query => {
  if (query.query === "") return;
  let response = inlineQueryError(query.query);
  const diceNumber = isQuery(query.query);
  const number = parseInt(diceNumber);
  let title = response
  if (!isNaN(number)) {
    title = `roll ${number}d6`;
    const result = doRoll(number);
    response = `@srrollbot\n${result}`
  }

  let results = JSON.stringify([{
    'id': 'roll',
    'type': 'article',
    'title': title,
    'input_message_content': {
      'message_text': response,
      'disable_web_page_preview': true
    }
  }, ]);

  bot.answerInlineQuery(query.id, results, {'cache_time': 0});
});

bot.startPolling();
