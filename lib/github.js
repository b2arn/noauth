"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Github = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Github, OAuth);

Github.prototype.availableFields = ['id', 'email', 'location', 'profileUrl', 'username', 'name', 'picture', 'site', 'bio'];

Github.prototype.renameRule = {
	username: 'login',
	picture: 'avatar_url',
	site: 'blog',
	profileUrl: 'html_url'
};

Github.prototype.parseError = function (statusCode, parsedBody) {
	if ('message' in parsedBody) {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message: ' + parsedBody.message,
			{statusCode: statusCode, body: parsedBody});
	}
};

Github.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('error' in query) {
		if (query.error === 'access_denied'){
			err = new NoUserDeniedError();
		}
		else {
			err = new NoError('ProviderError', 'Unknown error ' + query.error, query);
		}
	}
	cb(err, query);
};

Github.prototype.providerInfo = {
	authUrl: 'https://github.com/login/oauth/authorize',
	tokenUrl: 'https://github.com/login/oauth/access_token',
	apiUrl: 'https://api.github.com'
};

Github.prototype.constructResult = function (authInfo, options, cb) {
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
				self.makeApiRequest({ slug: '/user', token: authInfo.access_token }, cb);
			}
		},
		function (parsedBody, cb) {
			parsedBody.id += '';
			cb(null,{
				auth: {token: authInfo.access_token},
				data: self.removeWasteFields(parsedBody, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Github;
