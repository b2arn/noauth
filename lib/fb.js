"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Fb = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Fb, OAuth);

Fb.prototype.providerInfo = {
	authUrl: 'https://www.facebook.com/dialog/oauth',
	tokenUrl: 'https://graph.facebook.com/oauth/access_token',
	apiUrl: 'https://graph.facebook.com'
};

Fb.prototype.parseError = function (statusCode, parsedBody) {
	if ('error' in parsedBody) {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message ' + parsedBody.error.message, {statusCode: statusCode,
			body: parsedBody.error});
	}
};

Fb.prototype.parseRedirectError = function (query) {
	if ('error' in query) {
		if (query.error_reason === 'user_denied') {
			throw new NoUserDeniedError();
		}
		else {
			throw new NoError('ProviderError', 'Error "' + query.error.replace('_', ' ') + '" reason: "' + query.error_reason.replace('_', ' ') +
				'" description "' + query.error_description.replace('+', ' ') + '"', query);
		}
	}
};

Fb.prototype.renameRule = {
	location: 'location.name',
	picture: 'picture.data.url',
	site: 'website',
	lastName: 'last_name',
	firstName: 'first_name'
};

Fb.prototype.constructResult = function (authInfo, options, cb) {
	var nameRule = {
		picture: 'picture.width(700)',
		site: 'website',
		lastName: 'last_name',
		firstName: 'first_name'
	};

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
				var xFields = [];

				for (var i = 0; i < fields.length; i++) {
					if (fields[i] !== 'profileUrl'){
						xFields.push(fields[i]);
					}
				}

				if (fields.indexOf('profileUrl') !== -1) {
					if (fields.indexOf('username') === -1) {
						xFields.push('username');
					}

					if (fields.indexOf('id') === -1) {
						xFields.push('id');
					}
				}

				self.makeApiRequest({
					path: '/me',
					token: authInfo.access_token,
					params: { fields: xFields.map(function (el) {
							return el in nameRule ? nameRule[el] : el;
						}).join(',') }
				}, cb);
			}
		},
		function (parsedBody, cb) {
			if (fields.indexOf('profileUrl') !== -1) {
				parsedBody.profileUrl = 'https://www.facebook.com/' + (parsedBody.username ? parsedBody.username : parsedBody.id);
			}
			var data = self.removeWasteFields(parsedBody, self.renameRule, fields);
			if (data.birthday) {
				var bd = data.birthday.split('/');
				data.birthday = [bd[2],  bd[0], bd[1]].join('-');
			}
			cb(null, {
				auth: {
					token: authInfo.access_token,
					expires: parseInt(authInfo.expires, 10)
				},
				data: data
			});
		}
	], cb);
};


module.exports = Fb;
