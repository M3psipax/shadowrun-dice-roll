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

const roll = function(rollOptions) {
  let result = []
  _roll(rollOptions.number).map(r => result.push([r]));
  if (rollOptions.explode || rollOptions.target > 6) {
    let i = 0;
    while((i = result.findIndex(r => r.every(ex => ex === 6))) > -1) {
      result[i].push(rollDie());
    }
  }
  return result;
}

const doRoll = function(rollOptions) {
  const result = roll(rollOptions);

  const dice = rollOptions.number !== 1 ? "dice" : "die";
  let resultString = '[ ';
  const combineChar = rollOptions.target > 6 ? '+' : '→';
  result.forEach((rolls, i) => {
    rolls.forEach((r, j) => {
      resultString += j === 0 ? r : `${combineChar}${r}`
    })
    resultString += i === result.length -1 ? ' ]' : ', '
  })
  const rollString = `rolling ${rollOptions.number}${rollOptions.explode ? ' exploding ' : ' '}${dice}: ${resultString}`;
  let hits;
  if (rollOptions.target > 6) { // older sr rules
    hits = result.reduce((acc, rolls) => acc + Math.floor((rolls.reduce((acc, r) => acc + r) / rollOptions.target)), 0);
  } else {
    hits = result.reduce((acc, rolls) => acc + rolls.reduce((acc, r) => acc + (r >= rollOptions.target ? 1 : 0), 0), 0);
  }
  const hitString = hits !== 1 ? `${hits} hits` : `${hits} hit`;
  const failures = result.filter(r => r[0] === 1).length;

  const strings = [rollString, hitString];
  if (failures > (result.length / 2)) {
    strings.push(`Glitched! ${failures} failures out of ${result.length}`);
    if (hits === 0) strings.push(`CRITICAL GLITCH!`)
  }

  return strings.join("\n");
}

const rollCommandRegex = new RegExp(/\/(r|roll)/);
const modifiersRegex = new RegExp(/\s*(\d+)(>\d+)?\s*(((x|explode)|(w|wild))\s*){0,2}/)

const buildRollOptions = function(match) {
  return {
    number: parseInt(match[1]),
    target: match[2] ? parseInt(match[2].slice(1)) : 5,
    explode: !!match[5],
    wild: !!match[6]
  }
}

const parseCommand = function(msg) {
  const match = msg.match(new RegExp(rollCommandRegex.source+modifiersRegex.source, 'i'));
  return match ? (match.splice(1, 1, ), buildRollOptions(match)) : false;
}

const parseQuery = function(msg) {
  const match = msg.match(new RegExp(modifiersRegex.source, 'i'));
  return match ? buildRollOptions(match) : false;
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

const TOO_MANY_DICE_ERROR = "I'm sorry, I don't have that many dice. ;)";

const bot = new Slimbot(TELEGRAM_BOT_TOKEN);

bot.on('message', message => {
  let response = commandError(message.text);
  const rollOptions = parseCommand(message.text);
  if (rollOptions) {
    if (rollOptions.number > 1000) {
      response = TOO_MANY_DICE_ERROR;
    } else {
      response = doRoll(rollOptions);
    }
  }

  bot.sendMessage(message.chat.id, response);
});

bot.on('inline_query', query => {
  if (query.query === "") return;
  let response = inlineQueryError(query.query);
  const rollOptions = parseQuery(query.query);
  let title = response
  if (!isNaN(rollOptions.number)) {
    if (rollOptions.number > 1000) {
      title = TOO_MANY_DICE_ERROR;
      response = TOO_MANY_DICE_ERROR;
    } else {
      title =
          `roll ${rollOptions.number}${rollOptions.explode ? ' exploding ' : ''}d6${rollOptions.target !== 5 ? '>'+rollOptions.target : ''}`;
      const result = doRoll(rollOptions);
      response = `@srrollbot\n${result}`;
    }
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
