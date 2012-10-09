"use strict";
var inherits = require('util').inherits;
var  OAuth1 = require('./oauth1a');


var Twitter = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Twitter, OAuth1);

Twitter.prototype.providerInfo = {
	requestUrl: 'https://api.twitter.com/oauth/request_token',
	authUrl:'https://api.twitter.com/oauth/authenticate',
	accessUrl: 'https://api.twitter.com/oauth/access_token'
};

Twitter.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};


module.exports = Twitter;
