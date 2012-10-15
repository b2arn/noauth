"use strict";
var OAuth = require('./core/oauth2');
var inherits = require('util').inherits;


var Instagram = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Instagram, OAuth);

Instagram.prototype.defaultScope = ['basic'];

Instagram.prototype.scopeGen = function (scope) {
	return scope.join('+');
};

Instagram.prototype.providerInfo = {
	authUrl: 'https://instagram.com/oauth/authorize/',
	tokenUrl: 'https://api.instagram.com/oauth/access_token'
};

Instagram.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Instagram.prototype.constructResult = function (body, options, cb) {
	var result = JSON.parse(body);
	console.log(result);
	cb(null,
	{
		auth: {
			token: result.access_token
		},
		data: {
			id: result.user.id,
			username: result.user.username,
			name: result.user.full_name,
			photo: result.user.profile_picture,
			site: result.user.website,
			bio: result.user.bio
		}
	});
};


module.exports = Instagram;
