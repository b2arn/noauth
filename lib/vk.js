"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;


var Vk = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Vk, OAuth);

Vk.prototype.providerInfo = {
	authUrl: 'http://api.vkontakte.ru/oauth/authorize',
	tokenUrl: 'https://api.vkontakte.ru/oauth/access_token'
};

Vk.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};


module.exports = Vk;
