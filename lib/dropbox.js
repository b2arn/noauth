"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var async = require('async');
var OAuth1 = require('./core/oauth1a');
var errors = require('noerror');


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
	accessUrl: 'https://api.dropbox.com/1/oauth/access_token'
};

Dropbox.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('not_approved' in query && query.not_approved === 'true') {
		err = new NoUserDeniedError();
	}
	cb(err, query);
};

Dropbox.prototype.renameRule = {
	id: 'uid',
	username: 'display_name'
};

Dropbox.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var savedFields;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			savedFields = fields;
			if (fields.length === 1 && fields[0] === 'id') {
				cb (null, authInfo);
			}
			else {
				var usrUrl = 'https://api.dropbox.com/1/account/info';
				var params = {
					include_entities: false,
					skip_status: true
				};
				var authHeader = self.generateAuthorizationHeader('GET', usrUrl, params, authInfo.oauth_token, authInfo.oauth_token_secret);
				request({
					method: 'GET',
					url: usrUrl,
					headers: {Authorization: authHeader}
				}, self.createErrorHandler(cb));
			}
		},
		function (parsedBody, cb) {
			parsedBody.uid += '';
			cb(null, {
				auth: self.rename(authInfo, {
					token: 'oauth_token',
					secret: 'oauth_token_secret'}),
				data: self.removeWasteFields(parsedBody, self.renameRule, savedFields)
			});
		}
	], cb);
};


module.exports = Dropbox;
