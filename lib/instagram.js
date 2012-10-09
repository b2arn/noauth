"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;


var Instagram = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Instagram, OAuth);

Instagram.prototype.providerInfo = {
	authUrl: 'https://instagram.com/oauth/authorize/',
	tokenUrl: 'https://api.instagram.com/oauth/access_token'
};

Instagram.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};


module.exports = Instagram;
