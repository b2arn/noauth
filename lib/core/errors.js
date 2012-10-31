"use strict";
var inherits = require('util').inherits;


var NoError = function (name, message, raw) {
	Error.call(this);
	this.message = message + '\nraw: ' + (raw && raw.constructor === Object? JSON.stringify(raw) : raw);
	this.name = name;
	this.raw = raw;
};

inherits(NoError, Error);

var NoConnectionError = function (err) {
	Error.call(this);
	this.message = err.message + (err ? '\nraw' + JSON.stringify(err): '');
	this.name = 'ProviderConnectionError';
	this.raw = err;
};

inherits(NoConnectionError, Error);

var NoOtherError = function (statusCode, body) {
	Error.call(this);
	this.message = 'Error with statusCode = ' + statusCode + ' and body: ' + body;
	this.name = 'OtherError';
	this.statusCode = statusCode;
	this.raw = body;
};

inherits(NoOtherError, Error);

var NoInputError = function (key, reason) {
	Error.call(this);
	this.message = 'Error in key ' + key + ', reason: ' + reason;
	this.name = 'InputError';
	this.key = key;
	this.reason = reason;
};

inherits(NoInputError, Error);


module.exports = {
	NoError: NoError,
	NoConnectionError: NoConnectionError,
	NoOtherError: NoOtherError,
	NoInputError: NoInputError
};
