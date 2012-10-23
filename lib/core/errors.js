"use strict";
var inherits = require('util').inherits;


var NoError = function (name, message, raw) {
	Error.call(this, message + (raw ? '\nraw: ' + raw : ''));
	this.name = name;
	this.raw = raw;
};

inherits(NoError, Error);

var NoConnectionError = function (err, res) {
	Error.call(this, err.message + '\nstatus: ' + res.status + (err ? '\nraw' + JSON.stringify(err): ''));
	this.name = 'ProviderConnectionError';
	this.status = res.status;
	this.raw = err;
};

inherits(NoConnectionError, Error);


module.exports = {
	NoError: NoError,
	NoConnectionError: NoConnectionError
};
