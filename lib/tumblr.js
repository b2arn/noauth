"use strict";
var inherits = require('util').inherits;
var request = require('request');
var  OAuth1 = require('./core/oauth1a');
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;
var NoConnectionError = errors.NoConnectionError;

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
	if (body === 'Missing or invalid request token.') {
		cb(new NoError('ProviderTechnicalError', body));
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
	var self = this;
	var savedFields;
	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			var usrUrl = 'http://api.tumblr.com/v2/user/info';
			savedFields = fields;
			request({
				method: 'GET',
				url: usrUrl,
				headers: {Authorization: self.generateAuthorizationHeader('GET', usrUrl, null, authInfo.oauth_token, authInfo.oauth_token_secret)}
			}, function (err, res, body) {
				if (err) {
					cb(new NoConnectionError(err, res));
				}
				self.parseError(self.parseJsonBody(body), function (err, body) {
					cb(err, savedFields, body);
				});
			});
		},
		function (fields, body, cb) {
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(body, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Tumblr;
