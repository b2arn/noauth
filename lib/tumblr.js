"use strict";
var inherits = require('util').inherits;
var request = require('request');
var  OAuth1 = require('./core/oauth1a');
var NoError = require('./core/error');
var async = require('async');


var Tumblr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Tumblr, OAuth1);

Tumblr.prototype.providerInfo = {
	requestUrl: 'http://www.tumblr.com/oauth/request_token',
	authUrl: 'http://www.tumblr.com/oauth/authorize',
	accessUrl: 'http://www.tumblr.com/oauth/access_token'
};

Tumblr.prototype.availableFields = ['id', 'username'];

Tumblr.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Tumblr.prototype.parseError = function (body, cb) {
	if (body.meta.status >= 400) {
		cb(new NoError('provider', 'OAuthException', body.meta.msg, body.meta));
	}
	else {
		cb(null, body);
	}
};

Tumblr.prototype.renameRule = {
	id: 'response.user.name',
	username: 'response.user.name'
};

Tumblr.prototype.constructResult = function (authInfo, options, cb) {
	console.log(authInfo);
	var self = this;
	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			var usrUrl = 'http://api.tumblr.com/v2/user/info';
			request({
				method: 'GET',
				url: usrUrl,
				headers: {Authorization: this.generateAuthorizationHeader('GET', usrUrl, null, authInfo.oauth_token, authInfo.oauth_token_secret)}
			}, function (err, res, body) {
				if (err) {
					cb(new NoError('network', null, err.message, err));
				}
				else {
					self.parseError(self.parseJsonBody(body), function (err, body) {
						cb(err, {fields: fields, body: body});
					});
				}
			});
		},
		function (result, cb) {
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(result.body, self.renameRule, result.fields)
			});
		}
	], cb);
};


module.exports = Tumblr;
