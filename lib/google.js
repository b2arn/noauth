"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var NoError = require('./core/error');
var async = require('async');


var Google = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Google, OAuth);

Google.prototype.providerInfo = {
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://accounts.google.com/o/oauth2/token'
};

Google.prototype.defaultScope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

Google.prototype.scopeGen = function (scope) {
	return scope.join(' ');
};

Google.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Google.prototype.parseError = function (body, cb) {
	if ('error' in body) {
		cb(new NoError('badInput', 'OAuthException', body.error, body));
	}
	else {
		cb(null, body);
	}
};

Google.prototype.renameRule = {
	site: 'link'
};

Google.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			request({
				method: 'GET',
				headers: {Authorization: 'Bearer ' + authInfo.access_token},
				url: url.resolve('https://www.googleapis.com/oauth2/v1/userinfo', url.format({
					query: {
						token: authInfo.access_token
				}}))}, function (err, res, body) {
					if (err) {
						cb(new NoError('network', null, err.messege, err));
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
					token: authInfo.access_token,
					refresh_token: authInfo.id_token,
					expires: authInfo.expires_in,
					additional: {
						token_type: authInfo.token_type
					}
				},
				data: self.removeWasteFields(result.body, self.renameRule, result.fields)
			});
		}
	], cb);
};


module.exports = Google;
