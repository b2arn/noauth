"use strict";
var OAuth = require('./core/oauth2');
var url = require('url');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Google = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Google, OAuth);

Google.prototype.providerInfo = {
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://accounts.google.com/o/oauth2/token',
	apiUrl: 'https://www.googleapis.com/oauth2/v1'
};

Google.prototype.tokenName = 'token';

Google.prototype.defaultScope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

Google.prototype.availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'picture', 'profileUrl', 'locale'];

Google.prototype.parseRedirectError = function (query) {
	if ('error' in query) {
		if (query.error === 'access_denied') {
			throw new NoUserDeniedError();
		}
		else {
			throw new NoError('ProviderError', 'Unknown error: ' + query.error, query);
		}
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
	var fields;
	async.waterfall([
		function (cb) {
			var hasError = false;
			try {
				fields = self.genFields(options);
			}
			catch (err) {
				hasError = true;
				cb(err);
			}

			if (!hasError) {
				self.makeApiRequest({ slug: '/userinfo', token: authInfo.access_token, params: { token: authInfo.access_token } }, cb);
			}
		},
		function (body, cb) {
			cb(null, {
				auth: {
					token: authInfo.access_token,
					refreshToken: authInfo.refresh_token,
					expires: authInfo.expires_in,
					additional: {
						id_token: authInfo.id_token,
						token_type: authInfo.token_type
					}
				},
				data: self.removeWasteFields(body, self.renameRule, fields)
			});
		}
	], cb);
};

/*
	options are:
		method: {optional: true, default: 'GET'},
		slug : {optional: false}
		base: {optional: true}
		params: {optional: true}
		token: {optional: false}
*/
Google.prototype.makeApiRequest = function (options, cb) {
	if (options.token) {
		if (!options.headers) {
			options.headers = {};
		}

		options.headers = { Authorization: 'Bearer ' + options.token };
	}

	Google.super_.prototype.makeApiRequest.call(this, options, cb);
};

Google.prototype.refreshToken = function (refreshToken, cb) {
	this.makeApiRequest({
		method: 'POST',
		base: this.providerInfo.tokenUrl,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: url.format({ query: {
				client_id: this.appInfo.id,
				client_secret: this.appInfo.secret,
				refresh_token: refreshToken,
				grant_type: 'refresh_token'
			} }).substr(1)
	});
};


module.exports = Google;
