"use strict";
var inherits = require('util').inherits;
var request = require('request');
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

Tumblr.prototype.constructResult = function (body, options, cb) {
	var authInfo = this.parseUrlEncodedBody(body);
	var usrUrl = 'http://api.tumblr.com/v2/user/info';
	request({
		method: 'GET',
		url: usrUrl,
		headers: {Authorization: this.generateAuthorizationHeader('GET', usrUrl, null, authInfo.oauth_token, authInfo.oauth_token_secret)}
	}, function (err, res, body) {
		if (err) {
			cb(err);
		}
		else {
			var parsedBody = JSON.parse(body);
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: {
					id: parsedBody.response.user.name,
					username: parsedBody.response.user.name
				}
			});
		}
	});
};


module.exports = Tumblr;
