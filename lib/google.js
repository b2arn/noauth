"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var errors = require('noerror');
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

Google.prototype.defaultScope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

Google.prototype.availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'picture', 'profileUrl', 'locale'];

Google.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('error' in query) {
		if (query.error === 'access_denied') {
			err = new NoUserDeniedError();
		}
		else {
			err = new NoError('ProviderError', 'Unknown error: ' + query.error, query);
		}
	}
	cb(err, query);
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
				self.makeApiRequest('GET', '/userinfo', {token: authInfo.access_token}, cb);
			}
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
				data: self.removeWasteFields(body, self.renameRule, fields)
			});
		}
	], cb);
};

Google.prototype.makeApiRequest = function (method, slug, params, cb) {
	request({
		method: method,
		headers: {Authorization: 'Bearer ' + params.token},
		url: url.resolve(this.providerInfo.apiUrl + slug, url.format({ query: params }))
	}, this.createErrorHandler(cb));
};


module.exports = Google;
