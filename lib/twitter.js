"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var  OAuth1 = require('./core/oauth1a');
var NoError = require('./core/error');


var Twitter = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Twitter, OAuth1);

Twitter.prototype.parseError = function (body, cb) {
	if ('errors' in body) {
		cb(new NoError('badInput', 'OAuthException', body.error.message, body.errors));
	}
	else {
		cb(null, body);
	}
};

Twitter.prototype.providerInfo = {
	requestUrl: 'https://api.twitter.com/oauth/request_token',
	authUrl:'https://api.twitter.com/oauth/authenticate',
	accessUrl: 'https://api.twitter.com/oauth/access_token'
};

Twitter.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Twitter.prototype.constructResult = function (authInfo, options, cb) {
	var usrUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
	var params = {
		include_entities: false,
		skip_status: true
	};
	var authHeader = this.generateAuthorizationHeader('GET', usrUrl, params, authInfo.oauth_token, authInfo.oauth_token_secret);
	request({
		method: 'GET',
		url: url.resolve(usrUrl, url.format({query: params})),
		headers: {Authorization: authHeader}
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
					id: parsedBody.id_str,
					name: parsedBody.name,
					photo: parsedBody.profile_image_url,
					bio: parsedBody.description,
					location: parsedBody.location,
					site: parsedBody.url,
					username: parsedBody.screen_name,
					locale: parsedBody.lang
				}
			});
		}
	});
};


module.exports = Twitter;
