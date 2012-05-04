var sgr = require('./sgr').sgr;

var CSI_PATTERN = /^\[([?]?)([0-9;]*)([@A-Za-z`])/;

exports.csi = function(data, terminal) {
	var match = CSI_PATTERN.exec(data);
	if(match === null)
		return 0;
	var args = match[2] === "" ? [] : match[2].split(';');
	args.unshift(terminal, terminal.getBuffer(), match[1])
	if(commands[match[3]])
		commands[match[3]].apply(terminal, args);
	else {
		console.log("Unknown CSI-command '"+match[0]+"'");
		return -1;
	}
	return match[0].length;
}

var commands = {
	'A': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.mvCur(0, -n);
	},
	'B': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.mvCur(0, n);
	},
	'C': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.mvCur(n, 0);
	},
	'D': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		terminal.mvCur(-n, 0);
	},
	'E': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.mvCur(0, n).setCur({x: 0});
	},
	'F': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.mvCur(0, -n).setCur({x: 0});
	},
	'G': function(terminal, buffer, mod, n) {
		n = n === undefined ? 0 : n - 1;
		buffer.setCur({x: n});
	},
	'H': function(terminal, buffer, mod, n, m) {
		n = n === undefined ? 0 : n - 1;
		m = m === undefined ? 0 : m - 1;
		buffer.setCur({y: n, x: m});
	},
	'J': function(terminal, buffer, mod, n) {
		buffer.eraseData(n);
	},
	'K': function(terminal, buffer, mod, n) {
		buffer.eraseLine(n);
	},
	'S': function(terminal, buffer, mod, n) {
		terminal.scroll(-n);
	},
	'T': function(terminal, buffer, mod, n) {
		terminal.scroll(n);
	},
	'f': function(terminal, buffer, mod, n) {
		commands.H(terminal, n);
	},
	'm': function(terminal, buffer) {
		sgr(terminal, Array.prototype.slice.call(arguments, 3));
	},
	'q': function(terminal, buffer, mod, n) {
		terminal.setLed(n);
	},
	'r': function(terminal, buffer, mod, n, m) {
		buffer.setScrollArea(n-1, m-1);
	},
	's': function(terminal, buffer) {
		terminal.curSave();
	},
	'u': function(terminal, buffer) {
		terminal.curRest();
	},
	'l': function(terminal, buffer) {
		terminal.showCursor = false;
	},
	'h': function(terminal, buffer) {
		terminal.showCursor = true;
	}
}
