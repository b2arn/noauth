"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var async = require('async');
var  OAuth1 = require('./core/oauth1a');
var errors = require('./core/errors');


var NoError = errors.NoError;
var NoConnectionError = errors.NoConnectionError;

var Twitter = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Twitter, OAuth1);

Twitter.prototype.availableFields = ['id', 'name', 'picture', 'bio', 'location', 'site', 'username', 'locale'];

Twitter.prototype.parseError = function (body, cb) {
	if ('errors' in body) {
		cb(new NoError('ProviderTechnicalError', body.errors.message, body.errors));
	}
	else {
		cb(null, body);
	}
};

Twitter.prototype.providerInfo = {
	requestUrl: 'https://api.twitter.com/oauth/request_token',
	authUrl:'https://api.twitter.com/oauth/authenticate',
	accessUrl: 'https://api.twitter.com/oauth/access_token'
};

Twitter.prototype.renameRule = {
	id: 'id_str',
	picture: 'profile_image_url',
	bio: 'description',
	site: 'url',
	username: 'screen_name',
	locale: 'lang'
};

Twitter.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Twitter.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			if (fields.length <= 2 && (fields.indexOf('id') !== -1 || fields.indexOf('username') !== -1)) {
				cb(null, fields,
					{
						id_str: authInfo.user_id,
						screen_name: authInfo.screen_name
					});
			}
			else {
				var usrUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
				var params = {
					include_entities: false,
					skip_status: true
				};
				var authHeader = self.generateAuthorizationHeader('GET', usrUrl, params, authInfo.oauth_token, authInfo.oauth_token_secret);
				request({
					method: 'GET',
					url: url.resolve(usrUrl, url.format({query: params})),
					headers: {Authorization: authHeader}
				}, function (err, res, body) {
					if (err) {
						cb(new NoConnectionError(err, res));
					}
					else {
						self.parseError(self.parseJsonBody(body), function (err, body) {
							cb(err, fields, body);
						});
					}
				});
			}
		},
		function (fields, body, cb) {
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
				data: self.removeWasteFields(body, partialRenameRule, fields)
			});
		}
	], cb);

};


module.exports = Twitter;
