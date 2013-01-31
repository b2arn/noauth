"use strict";
var inherits = require('util').inherits;
var async = require('async');
var OAuth1 = require('./core/oauth1a');
var errors = require('noerror');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Vimeo = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Vimeo, OAuth1);

Vimeo.prototype.availableFields = ['id', 'name', 'picture', 'bio', 'location', 'username', 'profileUrl'];

Vimeo.prototype.parseError = function (statusCode, parsedBody) {
	if (parsedBody.stat === 'fail') {
		return new NoError('ProviderError', 'Error with status code ' + statusCode + ', message: "' + parsedBody.err.msg +
		', ' + parsedBody.err.expl + '"',
		{statusCode: statusCode, body: parsedBody});
	}
};

Vimeo.prototype.providerInfo = {
	requestUrl: 'https://vimeo.com/oauth/request_token',
	authUrl: 'https://vimeo.com/oauth/authorize',
	accessUrl: 'https://vimeo.com/oauth/access_token',
	apiUrl: 'http://vimeo.com/api/rest/v2'
};

Vimeo.prototype.renameRule = {
	id: 'person.id',
	name: 'person.display_name',
	picture: 'profile_image_url',
	bio: 'person.bio',
	location: 'person.location',
	username: 'person.username',
	profileUrl: 'person.profileUrl'
};

Vimeo.prototype.constructResult = function (authInfo, options, cb) {
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
				self.makeApiRequest({
					params: {
						format: 'json',
						method: 'vimeo.people.getInfo'
					},
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				}, cb);
			}
		},
		function (parsedBody, cb) {
			cb(null, {
				auth: self.rename(authInfo, {
					token: 'oauth_token',
					secret: 'oauth_token_secret'}),
				data: self.removeWasteFields(parsedBody, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Vimeo;
