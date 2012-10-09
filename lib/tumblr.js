"use strict";
var inherits = require('util').inherits;
var  OAuth1 = require('./core/oauth1a');


var Tumblr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Tumblr, OAuth1);

Tumblr.prototype.providerInfo = {
	requestUrl: 'http://www.tumblr.com/oauth/request_token',
	authUrl: 'http://www.tumblr.com/oauth/authorize',
	accessUrl: 'http://www.tumblr.com/oauth/access_token'
};

Tumblr.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};


module.exports = Tumblr;
