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

const _roll = function(number) {
  const result = [];
  for (let i = 0; i < number; i++) {
    result.push(rollDie());
  }
  return result;
}

const roll = function(number, explode) {
  let result = []
  _roll(number).map(r => result.push([r]));
  if (explode) {
    let i = 0;
    while((i = result.findIndex(r => r.every(ex => ex === 6))) > -1) {
      result[i].push(rollDie());
    }
  }
  return result;
}

const doRoll = function(number, explode) {
  const result = roll(number, explode);

  const dice = number !== 1 ? "dice" : "die";
  let resultString = '[ ';
  result.forEach((rolls, i) => {
    rolls.forEach((r, j) => {
      resultString += j === 0 ? r : `→${r}`
    })
    resultString += i === result.length -1 ? ' ]' : ', '
  })
  const rollString = `rolling ${number}${explode ? ' exploding ' : ' '}${dice}: ${resultString}`;
  const hits = result.reduce((acc, rolls) => acc + rolls.reduce((acc, r) => acc + (r >= 5 ? 1 : 0), 0), 0);
  const hitString = hits !== 1 ? `${hits} hits` : `${hits} hit`;
  const failures = result.filter(r => r[0] === 1).length;

  const strings = [rollString, hitString];
  if (failures > (result.length / 2)) {
    strings.push(`Glitched! ${failures} failures out of ${result.length}`);
    if (hits === 0) strings.push(`CRITICAL GLITCH!`)
  }

  return strings.join("\n");
}

const parseCommand = function(msg) {
  const match = msg.match(/\/(r|roll)\s*(\d+)\s*(x|explode)?/i);
  return match ? {
    command: match[1],
    number: parseInt(match[2]),
    explode: !!match[3],
  } : false;
}

const parseQuery = function(msg) {
  const match = msg.match(/\s*(\d+)\s*(x|explode)?/i);
  return match ? {
    number: parseInt(match[1]),
    explode: !!match[2],
  } : false;
}
const commandError = function(input) {
  return `Didn't understand command: "${input}".
   Please enter /r or /roll followed by the number of dice. 
   Optionally add an 'x' or 'explode' behind the number for exploding dice.
   Example: /r 12x`
}

const inlineQueryError = function(input) {
  return `Didn't understand query: "${input}".
   Please enter @srrollbot followed by the number of dice and click the suggestion.
   Optionally add an 'x' or 'explode' behind the number for exploding dice.
   Example: @srrollbot 12x`
}

const bot = new Slimbot(TELEGRAM_BOT_TOKEN);

bot.on('message', message => {
  let response = commandError(message.text);
  const command = parseCommand(message.text);
  if (command) {
    response = doRoll(command.number, command.explode);
  }

  bot.sendMessage(message.chat.id, response);
});

bot.on('inline_query', query => {
  if (query.query === "") return;
  let response = inlineQueryError(query.query);
  const command = parseQuery(query.query);
  let title = response
  if (!isNaN(command.number)) {
    title = `roll ${command.number}${command.explode ? ' exploding ' : ''}d6`;
    const result = doRoll(command.number, command.explode);
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
