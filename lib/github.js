"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');
var request = require('request');
var url = require('url');

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
	tokenUrl: 'https://github.com/login/oauth/access_token'
};

Github.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var savedFields;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb){
			savedFields = fields;
			request({
				method: 'GET',
				url: url.resolve('https://api.github.com/user', url.format({
					query: {access_token: authInfo.access_token}
				}))
			}, self.createErrorHandler(cb));
		},
		function (parsedBody, cb) {
			parsedBody.id += '';
			cb(null,{
				auth: {token: authInfo.access_token},
				data: self.removeWasteFields(parsedBody, self.renameRule, savedFields)
			});
		}
	], cb);
};


module.exports = Github;
