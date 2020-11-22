# Shadowrun Dice Roll Bot

This is a Telegram Bot that can be used to make dice rolls according to
Shadowrun rules. Therefore it only rolls d6. The lead rules reference is SR6, 
but other versions are more or less supported. Its currently available under the username
 _srrollbot_ and thus can be added to your contacts here: https://t.me/srrollbot.

## How to use

Rolls are performed via the command `/r` or `/roll` followed by the number
of dice to roll. So a basic roll of 12 dice would look like this

```
/roll 12
```

The bot reply could look like this:

```
Rolling 12>5 dice: [ 1, 2, 3, 3, 3, 5, 6, 1, 4, 6, 6, 1 ]
4 hits
```
As you can see it shows the number of dice it rolled (12), the target value to achieve (>5)
and the result of each roll. It sums up all rolls that match or exceed the target value.

Glitches will be detected and warned about when the number of 1s in the roll is more than 
half of the number of dice rolled.
A critical glitch will be detected and warned about when a glitch happens and the number
of hits is 0.

## Inline Queries

Rolls can also be performed using inline queries without adding the bot. Just type the
bot's username instead of `/r` followed by the roll options. Then select the suggestion that
pops up.
Example:
`@srrollbot 12xw`

##Other supported commands

### Exploding rolls
```/r 12x```

On top of counting as a hit, every 6 is rerolled for the same target value again, 
possibly adding another hit.

### Wild die
```/r 12w```

Rolls the wild die before the normal roll. A wild die that achieves 5 or 6
counts as 3 hits. On the other hand, if the wild die rolls 1, it sets the target value
for the normal roll to 6.
Then performs the normal roll.

### Combining Exploding roll and Wild die
```/r 12xw```

Rolls wild die first and evaluates it. A wild die that rolls 6 explodes like a normal roll
with subsequent successes counting as 1 hit.
Then performs the exploding normal roll.

### Setting target value for older SR rules
```/r 12>9```

For older SR versions the target value may be added to the roll command. If it's higher than 6,
the dice will be automatically rerolled for every 6 that is rolled to try to achieve the target value.
