"use strict";
var inherits = require('util').inherits;
var request = require('request');
var  OAuth1 = require('./core/oauth1a');
var errors = require('noerror');
var async = require('async');


var NoError = errors.NoError;

var Tumblr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Tumblr, OAuth1);

Tumblr.prototype.providerInfo = {
	requestUrl: 'http://www.tumblr.com/oauth/request_token',
	authUrl: 'http://www.tumblr.com/oauth/authorize',
	accessUrl: 'http://www.tumblr.com/oauth/access_token'
};

Tumblr.prototype.availableFields = ['id', 'profileUrl'];

Tumblr.prototype.parseError = function (statusCode, parsedBody) {
	if (parsedBody === 'Missing or invalid request token.') {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message: ' + parsedBody);
	}
	if ('meta' in parsedBody && parsedBody.meta.status >= 400) {
		return new NoError('ProviderError', 'Error with statusCode = ' + parsedBody.meta.status + ' and message: ' + parsedBody.meta.msg, parsedBody);
	}
};

Tumblr.prototype.renameRule = {
	id: 'response.user.name',
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
			}, self.createErrorHandler(cb));
		},
		function (parsedBody, cb) {
			parsedBody.profileUrl = 'http://' + parsedBody.response.user.name + '.tumblr.com';
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(parsedBody, self.renameRule, savedFields)
			});
		}
	], cb);
};


module.exports = Tumblr;
