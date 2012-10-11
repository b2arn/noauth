"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var  OAuth1 = require('./core/oauth1a');


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

Twitter.prototype.constructResult = function (body, cb) {
	var authInfo = this.parseUrlEncodedBody(body);
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
					city: parsedBody.location,
					site: parsedBody.url,
					username: parsedBody.screen_name,
					locale: parsedBody.lang
				}
			});
		}
	});
};


module.exports = Twitter;
