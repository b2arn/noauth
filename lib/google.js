"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;


var Google = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Google, OAuth);

Google.prototype.providerInfo = {
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://accounts.google.com/o/oauth2/token'
};

Google.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};


module.exports = Google;
