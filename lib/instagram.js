"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;
var errors = require('./core/errors');


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
	try {
		var fields = this.genFields(options);
		cb(null,{
			auth: {token: result.access_token},
			data: this.removeWasteFields(result, this.renameRule, fields)
		});
	}
	catch (err) {
		cb(err);
	}
};


module.exports = Instagram;
