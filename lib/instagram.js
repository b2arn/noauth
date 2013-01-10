"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('noerror');
var async = require('async');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Instagram = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Instagram, OAuth);

Instagram.prototype.defaultScope = ['basic'];

Instagram.prototype.availableFields = ['id', 'username', 'name', 'picture', 'site', 'bio'];

Instagram.prototype.renameRule = {
	id: 'user.id',
	username: 'user.username',
	name: 'user.full_name',
	picture: 'user.profile_picture',
	site: 'user.website',
	bio: 'user.bio'
};

Instagram.prototype.scopeGen = function (scope) {
	return scope.join('+');
};

Instagram.prototype.parseError = function (statusCode, body) {};

Instagram.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('error' in query) {
		if (query.error === 'access_denied') {
			err = new NoUserDeniedError();
		}
		else {
			err = new NoError('ProviderError', query.error_description.replace('+', ' '), query);
		}
	}
	cb(err, query);
};

Instagram.prototype.providerInfo = {
	authUrl: 'https://instagram.com/oauth/authorize/',
	tokenUrl: 'https://api.instagram.com/oauth/access_token',
	apiUrl: 'https://api.instagram.com/v1'
};

Instagram.prototype.constructResult = function (result, options, cb) {
	var self = this;
	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			cb(null,{
				auth: {token: result.access_token},
				data: self.removeWasteFields(result, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Instagram;
