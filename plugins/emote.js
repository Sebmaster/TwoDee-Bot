var fs = require('fs');
var utils = require('../utils');

module.exports = function (client) {

	var savedEmotes = JSON.parse(fs.readFileSync(__dirname + '/.emotes', { encoding: 'utf8' }));

	var emotes = {
		// the first column is probability weights
		// the second column is the emote message
		//  can contain '{0}' - the target of the emote
		//  and '{1}' - the initiator
		// the third column is the text for the count report command
		//  omit it or give it a value that evaluates to false to not record it

		pat: [
			[20, 'pats {0}\'s head.', 'regular pat(s)'],
			[10, 'gently pats {0}.', 'gentle pat(s)'],
			[ 4, 'sensually pats {0}.', 'sensual pat(s)'],
			[ 1, 'gropes {0}\'s firm buttocks.', 'grope(s)']
		],
		pet: [
			[1, 'pets {0}.', 'pet(s)'],
			[1, 'gives a catgirl to {0}.', 'catgirl(s)']
		],

		hug: [
			[50, 'hugs {0}.', 'hug(s)'],
			[ 1, 'hugs {0} and tries to cop a feel.'],
		],

		thank: [
			[1, 'thanks {0} on behalf of {1}.', 'thanks'],
			// Refactor so that we can get custom messages?
			// For example: "{0} has been thanked {1} times."
		],
	};

	for (var p in emotes) {
		savedEmotes[p] = savedEmotes[p] || {};
	}

	var format = utils.format;
	var random = utils.random;

	function isValidName(msg) {
		// msg is a string and expected to be the name of the target of the pat
		// TODO: output is true iff msg is a valid IRC name
		// maybe also check if the target is online ATM

		return true;
	}

	var totalWeight = {};
	for (var p in emotes) {
		totalWeight[p] = 0;
		for (i = 0; i < emotes[p].length; i++) {
			totalWeight[p] += emotes[p][i][0];
		}
	}

	var commands = {};

	for (var p in emotes) {
		commands[p] = (function (p) {
			return function (from, channel, message) {
				if (channel === client.nick) return; // don't care about PMs

				if (!message) return;

				if (!isValidName(message)) {
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}

				var rnd = random(totalWeight[p]);
				var i;
				for (i = 0; rnd >= emotes[p][i][0]; i++) {
					rnd -= emotes[p][i][0];
				}

				var emote = emotes[p][i];
				if (emote[2]) {
					var tar = message.toLowerCase();

					if (!savedEmotes[p][tar])
						savedEmotes[p][tar] = {};

					if (savedEmotes[p][tar][i])
						savedEmotes[p][tar][i]++;
					else
						savedEmotes[p][tar][i] = 1;
				}

				client.action(channel, format(emote[1], message, from));
			};
		})(p),

		commands[p + 's'] = (function (p) {
			return function (from, channel, message) {
				if (channel === client.nick) { // respond to PMs because why not
					channel = from;
				}

				if (!message) {
					message = from;
				}

				if (!isValidName(message)) {
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}

				var tar = message.toLowerCase();
				if (!savedEmotes[p][tar]) {
					client.say(channel, message + ' hasn\'t received any ' + p + 's yet ;___;');
					return;
				}

				var rec = [];
				for (var k in savedEmotes[p][tar]) {
					rec.push(savedEmotes[p][tar][k] + ' ' + emotes[p][k][2]);
				}

				client.say(channel, message + ' has received ' + rec.join(', ') + '.');
			}
		})(p)
	}

	return {
		commands: commands,
		save: function () {
			fs.writeFileSync(__dirname + '/.emotes', JSON.stringify(savedEmotes));
		}
	};
};
