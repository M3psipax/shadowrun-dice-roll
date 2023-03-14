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

const makeRollString = function(rollResult, rollOptions) {
  let resultString = '[ ';
  const combineChar = rollOptions.target > 6 ? '+' : '→';
  rollResult.forEach((rolls, i) => {
    rolls.forEach((r, j) => {
      resultString += j === 0 ? r : `${combineChar}${r}`
    })
    resultString += i === rollResult.length -1 ? ' ]' : ', '
  })
  return resultString;
}

const doRoll = function(rollOptions) {
  let wildString;
  let hits = 0;
  if (rollOptions.wild) {
    const wildOptions = {number: 1, explode: rollOptions.explode};
    const wildResult = roll(wildOptions);
    const wildRollString = makeRollString(wildResult, wildOptions);
    wildString = `Rolling wild die: ${wildRollString}`
    const wildResultBase = wildResult[0].shift();
    if (wildResultBase >= 5) {
      hits += 3; // successful wild die is worth 3 hits
      wildString += `\nWild die rolls ${wildResultBase} and is worth 3 hits!`
    } else if (wildResultBase === 1) {
      rollOptions.target = 6; // wild die failure nullifies all 5s on normal roll
      wildString += '\nWild die rolls 1 and nullifies all 5s!'
    }
    // exploding wild die has usual worth
    hits += wildResult[0].filter(r => r >= 5).length
    if (hits > 3) {
      wildString += `\nWild die explodes and adds another ${hits - 3 > 1 ? `${hits-3} hits` : 'hit'}!`
    }
    wildString += '\n';
  }

  const result = roll(rollOptions);

  const dice = rollOptions.number !== 1 ? "dice" : "die";

  const resultString = makeRollString(result, rollOptions);

  const rollString = `Rolling ${rollOptions.number}>${rollOptions.target}${rollOptions.explode ? ' exploding ' : ' '}${dice}: ${resultString}`;
  if (rollOptions.target > 6) { // older sr rules
    hits += result.reduce((acc, rolls) => acc + Math.floor((rolls.reduce((acc, r) => acc + r) / rollOptions.target)), 0);
  } else {
    hits += result.reduce((acc, rolls) => acc + rolls.reduce((acc, r) => acc + (r >= rollOptions.target ? 1 : 0), 0), 0);
  }
  const hitString = hits !== 1 ? `${hits} hits` : `${hits} hit`;
  const failures = result.filter(r => r[0] === 1).length;

  const strings = [wildString, rollString, hitString];
  if (failures > (result.length / 2)) {
    strings.push(`Glitched! ${failures} failures out of ${result.length}`);
    if (hits === 0) strings.push(`CRITICAL GLITCH!`)
  }

  const response = strings.join("\n");
  console.log(response);
  return response;
}

const helpCommandRegex = new RegExp(/\/(help)/);
const rollCommandRegex = new RegExp(/\/(r|roll)/);
const modifiersRegex = new RegExp(/\s*(?<number>\d+)(>(?<target>\d+))?\s*(?<explode>x)?\s*(?<wild>w)?/)

const buildRollOptions = function(match) {
  return {
    number: parseInt(match.groups.number),
    target: match.groups.target ? parseInt(match.groups.target) : 5,
    explode: !!match.groups.explode,
    wild: !!match.groups.wild
  }
}

const hasHelpCommand = function(msg) {
  const match = msg.match(new RegExp(helpCommandRegex.source, 'i'));
  return !!match;
}

const hasRollCommand = function(msg) {
  const match = msg.match(new RegExp(rollCommandRegex.source, 'i'));
  return !!match;
}

const parseCommand = function(msg) {
  msg = msg.replace('wx', 'xw');
  const match = msg.match(new RegExp(rollCommandRegex.source+modifiersRegex.source, 'i'));
  return match ? buildRollOptions(match) : false;
}

const parseQuery = function(msg) {
  msg = msg.replace('wx', 'xw');
  const match = msg.match(new RegExp(modifiersRegex.source, 'i'));
  return match ? buildRollOptions(match) : false;
}

const HELP_TEXT = `Please enter /r or /roll followed by the number of dice.
   
   For older Shadowrun versions, 
    you may add a target value like so: '>10'.
    
   Optionally add an 'x' for exploding dice or a 'w' for the wild die.
   /r [count]{>[target]}{x}{w}
   
   Examples: 
   - /r 12 ➜ roll 12 dice, hits are 5 and above
   - /r 12x ➜ roll 12 exploding dice, hits are 5 and above
   - /r 12w ➜ roll 12 dice and a wild die, hits are 5 and above
   - /r 12xw ➜ roll 12 exploding dice and an exploding wild die, hits are 5 and above
   - /r 12>10 ➜ roll 12 dice, hits are 10 and above`

const commandError = function(input) {
  return `Didn't understand command: "${input}".
   ${HELP_TEXT}`
}

const inlineQueryError = function(input) {
  return `Didn't understand query: "${input}".
   Please enter @srrollbot followed by the number of dice and click the suggestion.
   
   For older Shadowrun versions, 
    you may add a target value like so: '>10'.
    
   Optionally add an 'x' for exploding dice or a 'w' for the wild die.
   /r [count]{>[target]}{x}{w}
   
   Examples: 
   - /r 12 ➜ roll 12 dice, hits are 5 and above
   - /r 12x ➜ roll 12 exploding dice, hits are 5 and above
   - /r 12w ➜ roll 12 dice and a wild die, hits are 5 and above
   - /r 12xw ➜ roll 12 exploding dice and an exploding wild die, hits are 5 and above
   - /r 12>10 ➜ roll 12 dice, hits are 10 and above`
}

const TOO_MANY_DICE_ERROR = "I'm sorry, I don't have that many dice. ;)";

const bot = new Slimbot(TELEGRAM_BOT_TOKEN);

bot.on('message', message => {
  console.log('received message:', message.text);
  const hasHelp = hasHelpCommand(message.text);
  const hasRoll = hasRollCommand(message.text);

  if (message.chat.type === "private" || hasHelp || hasRoll) {
    if (!hasHelp && !hasRoll) {
      bot.sendMessage(message.chat.id, commandError(message.text));
      return;
    }

    if (hasHelp) {
      bot.sendMessage(message.chat.id, HELP_TEXT);
    }

    if (hasRoll) {
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
    }
  }
});

bot.on('inline_query', query => {
  if (query.query.length > 0) {
    console.log('received inline query:', query.query);
  }
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
          `roll ${rollOptions.number}${rollOptions.explode ? ' exploding ' : ''}d6${rollOptions.target !== 5 ? '>'+rollOptions.target : ''}${rollOptions.wild ? ' and wild die' : ''}`;
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

// stop previous instances
stop();
bot.startPolling();
console.log('started shadowrun dice roll bot');

function stop() {
  if (bot) {
    console.log('stopping bot');
    bot.stopPolling();
  }
}

process.on('SIGQUIT', stop);
process.on('SIGINT', stop);
