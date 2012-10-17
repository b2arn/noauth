"use strict";
var inherits = require('util').inherits;


var NoError = function (source, type, message, raw) {
	Error.call(this, message);
	this.source = source;
	this.errorType = type;
	this.raw = raw;
};

inherits(NoError, Error);


module.exports = NoError;
