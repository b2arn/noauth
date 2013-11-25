"use strict";
var inherits = require('util').inherits;
var async = require('async');
var OAuth1 = require('./core/oauth1a');
var errors = require('./core/errors');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Dropbox = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Dropbox, OAuth1);

Dropbox.prototype.availableFields = ['id', 'username', 'email'];

Dropbox.prototype.parseError = function (statusCode, parsedBody) {
	if ('error' in parsedBody) {
		return new NoError('ProviderError', 'Status code = ' + statusCode + ' and message ' + parsedBody.error, {statusCode: statusCode, body: parsedBody});
	}
};

Dropbox.prototype.providerInfo = {
	requestUrl: 'https://api.dropbox.com/1/oauth/request_token',
	authUrl: 'https://www.dropbox.com/1/oauth/authorize',
	accessUrl: 'https://api.dropbox.com/1/oauth/access_token',
	apiUrl: 'https://api.dropbox.com/1'
};

Dropbox.prototype.parseRedirectError = function (query) {
	if ('not_approved' in query && query.not_approved === 'true') {
		throw new NoUserDeniedError();
	}
};

Dropbox.prototype.renameRule = {
	id: 'uid',
	username: 'display_name'
};

Dropbox.prototype.constructResult = function (authInfo, options, cb) {
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
				if (fields.length === 1 && fields[0] === 'id') {
					cb (null, authInfo);
				}
				else {
					self.makeApiRequest({
						path: '/account/info',
						token: authInfo.oauth_token,
						secret: authInfo.oauth_token_secret
					}, cb);
				}
			}

		},
		function (res, parsedBody, cb) {
			parsedBody.uid += '';
			cb(null, {
				auth: self.rename(authInfo, {
					token: 'oauth_token',
					secret: 'oauth_token_secret'}),
				data: self.removeWasteFields(parsedBody, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Dropbox;
