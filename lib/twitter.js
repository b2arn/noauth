"use strict";
var inherits = require('util').inherits;
var async = require('async');
var OAuth1 = require('./core/oauth1a');
var errors = require('noerror');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Twitter = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Twitter, OAuth1);

Twitter.prototype.availableFields = ['id', 'name', 'picture', 'bio', 'location', 'site', 'username', 'locale', 'profileUrl'];

Twitter.prototype.parseError = function (statusCode, parsedBody) {
	if ('errors' in parsedBody) {
		return new NoError('ProviderError', 'Status code = ' + statusCode + 'Errors are: ' + parsedBody.errors.map(function (el) {
			return el.message;
		}).join(', '), {statusCode: statusCode, body: parsedBody});
	}
};

Twitter.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('denied' in query) {
		err = new NoUserDeniedError();
	}
	cb(err, query);
};

Twitter.prototype.providerInfo = {
	requestUrl: 'https://api.twitter.com/oauth/request_token',
	authUrl: 'https://api.twitter.com/oauth/authenticate',
	accessUrl: 'https://api.twitter.com/oauth/access_token',
	apiUrl: 'https://api.twitter.com/1.1'
};

Twitter.prototype.renameRule = {
	id: 'id_str',
	picture: 'profile_image_url',
	bio: 'description',
	site: 'url',
	username: 'screen_name',
	locale: 'lang'
};

Twitter.prototype.constructResult = function (authInfo, options, cb) {
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
				if (fields.every(function (el) {
					return ['id', 'username', 'profileUrl'].some(function (sub) {
						return sub === el;
					});
				})) {
					cb(null, {
						id_str: authInfo.user_id,
						screen_name: authInfo.screen_name
					});
				}
				else {
					self.makeApiRequest('GET', '/account/verify_credentials.json', {
						include_entities: false,
						skip_status: true
					}, authInfo, cb);
				}
			}
		},
		function (parsedBody, cb) {
			parsedBody.profileUrl = 'https://twitter.com/' + parsedBody.screen_name;
			var partialRenameRule = {};
			for (var key in self.renameRule) {
				var isKnownField = false;
				for (var i = 0; i < fields.length; i++) {
					if (fields[i] === key) {
						isKnownField = true;
						break;
					}
				}

				if (isKnownField) {
					partialRenameRule[key] = self.renameRule[key];
				}
			}

			cb(null, {
				auth: self.rename(authInfo, {
					token: 'oauth_token',
					secret: 'oauth_token_secret'}),
				data: self.removeWasteFields(parsedBody, partialRenameRule, fields)
			});
		}
	], cb);
};


module.exports = Twitter;
