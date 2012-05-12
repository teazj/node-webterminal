var util = require('./util');

var LF = '\n';

var graphics = {
	'`': '\u25C6',
	'a': '\u2592',
	'b': '\u2409',
	'c': '\u240C',
	'd': '\u240D',
	'e': '\u240A',
	'f': '\u00B0',
	'g': '\u00B1',
	'h': '\u2424',
	'i': '\u240B',
	'j': '\u2518',
	'k': '\u2510',
	'l': '\u250C',
	'm': '\u2514',
	'n': '\u253C',
	'o': '\u23BA',
	'p': '\u23BB',
	'q': '\u2500',
	'r': '\u23BC',
	's': '\u23BD',
	't': '\u251C',
	'u': '\u2524',
	'v': '\u2534',
	'w': '\u252C',
	'x': '\u2502',
	'y': '\u2264',
	'z': '\u2265',
	'{': '\u03C0',
	'|': '\u2260',
	'}': '\u00A3',
	'~': '\u00B7',
};

function TermBuffer(width, height, defaultAttr, cursor) {
	this.width = width;
	this.height = height;

	this.wraparound = true;
	this.showCursor = true;
	this.insertMode = false;
	this.crlf = true;
	this.appCursor = false;

	this.scrollArea = [0, height - 1];
	this.scrollBack = [];
	this.buffer = []
	this.oldBuffer = [];
	this.cursor = {x:0, y:0};
	this.tabs = []

	this.defaultAttr = util.extend({
		fg: 15,
		bg: 0,
		bold: false,
		underline: false,
		blink: false,
		inverse: false,
		graphics: false,
		doubletop: false,
		doublebottom: false,
		doublewidth: false
	}, defaultAttr);
	this.attrCommited = true;
	this.attr = this.defaultAttr;
}

TermBuffer.prototype = {
	write: function(data) {
		var c = this.cursor;

		for(var i = 0; i < data.length; i++) {
			if(data[i] === LF) {
				this.newLine(false);
			}
			else {
				if(this.insertMode && this.getLine().line[c.x])
					this.insertSpace(1);
				var c = this.editChar();
				if(typeof data[i] === 'string') {
					c.chr = this.attr.graphic ? (graphics[data[i]] || data[i]) : data[i];
					c.attr = this.attr;
					this.attrCommited = true;
				}
				else
					util.extend(c.chr, data[i]);

				this.mvCur(1, 0)
			}
		}
	},
	newLine: function(soft) {
		this.getLine().soft = soft;
		if(this.mvCur(0, 1) == false)
			this.insertLine(true);
		if(this.crlf)
			this.setCur({x:0})
		this.getLine();
	},
	editChar: function(action) {
		if(this.cursor.x == this.width) {
			if(this.wraparound)
				this.newLine(true);
			else
				this.setCur({x: this.width-1});
		}
			
		var line = this.getLine();
		line.changed = true;
			
		if(line.line[this.cursor.x])
			return line.line[this.cursor.x];
		else
			return line.line[this.cursor.x] = { chr: null, attr: {}};
	},
	clear: function() {
		Array.prototype.push.apply(this.scrollBack, this.buffer.splice(0));
	},
	eraseData: function(type, n) {
		n = n === undefined ? this.getLineNumber() : n;
		switch(type || 'toEnd') {
		case 'toEnd':
		case '0':
			this.buffer.splice(n+1);
			break;
		case 'toBegin':
		case '1':
			var args = [0, this.cursor.y-1, Array(this.cursor.y-1)];
			Array.prototype.splice.apply(this.buffer, args);
			break;
		case 'entire':
		case '2':
			return this.buffer.splice(0);
		}
		return this.eraseLine(type);
	},
	eraseLine: function(type) {
		var line = this.getLine();
		line.changed = true;
		switch(type || 'toEnd') {
		case '0':
		case 'toEnd':
			line.line.splice(this.cursor.x);
			break;
		case '1':
		case 'toBegin':
			var args = new Array(this.cursor.x+1);
			args.unshift(0, this.cursor.x+1);
			Array.prototype.splice.apply(line.line, args);
			while(line.line[line.line.length - 1] !== undefined)
				line.line.pop();
			break;
		case '2':
		case 'entire':
			line.line.splice(0);
			break;
		}
		return this;
	},
	getLineNumber: function(n) {
		if(n === undefined)
			n = this.cursor.y;
		return n;
	},
	getLine: function(n) {
		n = this.getLineNumber(n);
		if(n < 0)
			return null;
		return this.buffer[n] || ((this.buffer[n] = {line:[],attr:{}}));
	},
	insertSpace: function(cnt) {
		var line = this.getLine();
		line.changed = true;
		var c = this.cursor;
		delete line.line[c.x].attr.cursor;
		var after = line.line.splice(c.x);
		var spaces = [];
		this.attrCommited = true;
		while(cnt--) {
			spaces.push({chr:' ', attr: this.attr })
		}
		Array.prototype.push.apply(line.line, spaces);
		Array.prototype.push.apply(line.line, after);
		line.line.splice(this.width);
	},
	insertLine: function(insertAfter, n) {
		n = n === undefined ? this.getLineNumber() : n;
		if(insertAfter)
			n++;
		var after = this.buffer.splice(n);
		var newline = {line:[],attr:{}};
		this.buffer.push(newline);
		Array.prototype.push.apply(this.buffer, after);
		var oversize = this.buffer.length - this.height;
		if(oversize > 0) {
			var tail = this.buffer.splice(this.scrollArea[0], oversize);
			if(this.scrollArea[0] === 0)
				Array.prototype.push.apply(this.scrollBack, tail);
		}
	},
	setScrollArea: function(n, m) {
		if(n === undefined || m === undefined)
			this.scrollArea = [ 0, this.height - 1 ];
		else {
			this.scrollArea = [ Math.max(n, 0), Math.min(m, this.height - 1) ];
		}
	},
	deleteChar: function(n) {
		var line = this.getLine();
		line.line.splice(this.cursor.x, n);
		this.setCur(this.cursor);
	},
	eraseChar: function(cnt) {
		var line = this.getLine();
		var args = new Array(n);
		args.unshift(this.cursor.x, n);
		Array.prototype.splice.apply(line.line, args);
		this.setCur(this.cursor);
	},
	mvCur: function(x, y) {
		var obj = {x: this.cursor.x + x, y: this.cursor.y + y};
		return this.setCur(obj);
	},
	setTab: function() {
		this.tabs.push(this.cursor.x);
		this.tabs.sort();
	},
	clearTab: function(n) {
		switch(n || 'current') {
		case 'current':
		case 0:
			for(var i = this.tabs.length - 1; i >= 0; i--) {
				if(this.tabs[i] < this.cursor.x) {
					this.tabs.splice(i, 1);
					break;
				}
			}
			break;
		case 'all':
		case 3:
			this.tabs = [];
			break;
		}
	},
	mvTab: function(n) {
		var nx = this.cursor.x;
		var tabMax = this.tabs[this.tabs.length - 1] || 0;
		var positive = n > 0;
		n = Math.abs(n);
		while(n != 0 && nx > 0 && nx < this.width-1) {
			nx += positive ? 1 : -1;
			if(util.indexOf(this.tabs, nx) != -1 || (nx > tabMax && nx % 8 == 0))
				n--;
		}
		this.setCur({x: nx});
	},
	setCur: function(obj) {
		var inbounds = 0;
		var c = this.cursor;

		if(obj.x < 0)
			obj.x = 0;
		else if(obj.x > this.width)
			obj.x = this.width;
		else
			inbounds++

		if(obj.y < 0)
			obj.y = 0;
		else if(obj.y >= this.height)
			obj.y = this.height-1;
		else
			inbounds++

		if(obj.x !== undefined)
			this.cursor.x = obj.x;
		if(obj.y !== undefined)
			this.cursor.y = obj.y;

		return inbounds === 2;
	},
	dump: function(withScrollBack) {
		var ret = []
		if(withScrollBack)
			Array.prototype.push.apply(ret, this.scrollBack);
		Array.prototype.push.apply(ret, this.buffer);
		return ret;
	},
	toString: function(locateCursor) {
		var ret = []
		if(locateCursor) {
			ret.push(Array(this.cursor.x+2).join(' ') + 'v')
		}
		for(var i = 0; i < this.buffer.length; i++) {
			var line = []
			if(locateCursor) {
				line.push((this.buffer[i] && this.buffer[i].changed) ? "*" : " ")
				line.push(i == this.cursor.y ? ">" : " ")
			}
			if(this.buffer[i])
				for(var j = 0; j < this.buffer[i].line.length; j++) {
					line.push(this.buffer[i].line[j] ? (this.buffer[i].line[j].chr || ' ') : ' ');
				}
				while(line[line.length-1] === ' ') line.pop();
			ret.push(line.join(''));
		}
		if(locateCursor)
			ret.push(Array(this.cursor.x+2).join(' ') + '^');
		return ret.join(LF);
	},
	resize: function(width, height) {
		var old = this.scrollBack;
		Array.prototype.push.apply(old, this.buffer);
		var oldCursor = this.cursor;
		this.setCur(this.cursor = {x:0,y:0})
		this.height = height;
		this.width = width;
		this.scrollArea = [ 0, this.height - 1]
		this.buffer = [];
		this.oldBuffer = [];
		this.scrollBack = [];

		for(var i = 0; i < old.length; i++) {
			this.write(old[i])
			if(!old[i].soft)
				this.write(LF);
		}
		this.setCur(oldCursor);
	},
	chAttr: function(name, value) {
		if(name === 'reset') {
			this.attr = this.defaultAttr;
			this.attrCommited = true;
			return;
		}

		if(this.attrCommited == true) {
			this.attr = util.extend({}, this.attr);
			delete this.attr.str
		}
		this.attr[name] = value;
		this.attrCommited = false;
	},
	resetDiff: function() {
		for(var i = 0; i < this.buffer.length; i++) {
			if(this.buffer[i])
				delete this.buffer[i].changed;
		}
	}
}

exports.TermBuffer = TermBuffer
