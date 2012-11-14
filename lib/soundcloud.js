"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('./core/errors');
var async = require('async');
var request = require('request');
var url = require('url');

var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var SoundCloud = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(SoundCloud, OAuth);

SoundCloud.prototype.availableFields = ['id', 'location', 'profileUrl', 'username', 'name', 'picture', 'site', 'bio'];

SoundCloud.prototype.defaultScope = ['non-expiring'];

SoundCloud.prototype.renameRule = {
	picture: 'avatar_url',
	site: 'website',
	bio: 'description',
	name: 'full_name',
	profileUrl: 'permalink_url'
};

SoundCloud.prototype.parseError = function (statusCode, parsedBody) {
	if ('errors' in parsedBody) {
		return new NoError('ProviderError', 'Errors with messages: ' + parsedBody.errors.map(function (el) {
			return el.error_message;
		}).join(', '),
			{statusCode: statusCode, body: parsedBody});
	}
};

SoundCloud.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('error' in query) {
		if (query.error === 'access_denied' && query.error_description === 'The end-user denied the request.'){
			err = new NoUserDeniedError();
		}
		else {
			err = new NoError('ProviderError', 'Unknown error ' + query.error + ' and description: ' + query.error_description, query);
		}
	}
	cb(err, query);
};

SoundCloud.prototype.providerInfo = {
	authUrl: 'https://soundcloud.com/connect',
	tokenUrl: 'https://api.soundcloud.com/oauth2/token'
};

SoundCloud.prototype.constructResult = function (authInfo, options, cb) {
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
				url: url.resolve('https://api.soundcloud.com/me.json', url.format({
					query: { oauth_token: authInfo.access_token}
				}))
			}, self.createErrorHandler(cb));
		},
		function (parsedBody, cb) {
			parsedBody.id += '';
			if (parsedBody.city || parsedBody.country) {
				parsedBody.location = '';
				if (parsedBody.city) {
					parsedBody.location += parsedBody.city;
				}
				if (parsedBody.country) {
					parsedBody.location += (parsedBody.location ? ', ' : '') + parsedBody.country;
				}
			}
			cb(null,{
				auth: {token: authInfo.access_token},
				data: self.removeWasteFields(parsedBody, self.renameRule, savedFields)
			});
		}
	], cb);
};


module.exports = SoundCloud;
