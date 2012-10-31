"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;
var NoConnectionError = errors.NoConnectionError;

var Google = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Google, OAuth);

Google.prototype.providerInfo = {
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://accounts.google.com/o/oauth2/token'
};

Google.prototype.defaultScope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

Google.prototype.availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'picture', 'profileUrl', 'locale'];

Google.prototype.parseRedirectError = function (query, cb) {
	if ('error' in query) {
		cb(new NoError('ProviderTechnicalError', '', query.error));
	}
	else {
		cb(null, query);
	}
};

Google.prototype.scopeGen = function (scope) {
	return scope.join(' ');
};

Google.prototype.parseError = function (statusCode, parsedBody) {
	if ('error' in parsedBody) {
		return new NoError('ProviderTechnicalError', 'Error with statusCode = ' + statusCode + ' and message: ' + parsedBody.error, parsedBody);
	}
};

Google.prototype.renameRule = {
	profileUrl: 'link'
};

Google.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var savedFields;
	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			savedFields = fields;
			request({
				method: 'GET',
				headers: {Authorization: 'Bearer ' + authInfo.access_token},
				url: url.resolve('https://www.googleapis.com/oauth2/v1/userinfo', url.format({
					query: {
						token: authInfo.access_token
				}}))}, self.createErrorHandler(cb));
		},
		function (body, cb) {
			cb(null, {
				auth: {
					token: authInfo.access_token,
					refresh_token: authInfo.id_token,
					expires: authInfo.expires_in,
					additional: {
						token_type: authInfo.token_type
					}
				},
				data: self.removeWasteFields(body, self.renameRule, savedFields)
			});
		}
	], cb);
};


module.exports = Google;
