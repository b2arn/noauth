"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var NoError = require('./core/errors').NoError;
var async = require('async');


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

Instagram.prototype.parseError = function (body, cb) {
	cb(null, body);
};

Instagram.prototype.parseRedirectError = function (query, cb) {
	if ('error' in query) {
		cb(new NoError('ProviderTechnicalError', query.error_description.replace('+', ' '), query));
	}
	else {
		cb(null, query);
	}
};

Instagram.prototype.providerInfo = {
	authUrl: 'https://instagram.com/oauth/authorize/',
	tokenUrl: 'https://api.instagram.com/oauth/access_token'
};

Instagram.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
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
