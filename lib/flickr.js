"use strict";
var inherits = require('util').inherits;
var OAuth1 = require('./core/oauth1a');
var errors = require('noerror');
var async = require('async');


var NoError = errors.NoError;
var NoOtherError = errors.NoOtherError;

var Flickr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Flickr, OAuth1);

Flickr.prototype.defaultScope = 'read';

Flickr.prototype.addScope = function (callbackUrl, options) {
	return callbackUrl + '&perms=' + (options.scope ? options.scope : this.defaultScope);
};

Flickr.prototype.availableFields = ['id', 'name', 'username', 'location', 'bio', 'picture', 'profileUrl'];

Flickr.prototype.providerInfo = {
	requestUrl: 'http://www.flickr.com/services/oauth/request_token',
	authUrl: 'http://www.flickr.com/services/oauth/authorize',
	accessUrl: 'http://www.flickr.com/services/oauth/access_token',
	apiUrl: 'http://api.flickr.com/services/rest/'
};

Flickr.prototype.renameRule = {
	id: 'person.id',
	username: 'person.username._content',
	name: 'person.realname._content',
	location: 'person.location._content',
	bio: 'person.description._content',
	profileUrl: 'person.profileurl._content'
};

/*Flickr.prototype.checkRequestUrlError = function (body) {
	if(body.oauth_problem) {
		throw new NoError('ProviderError', body.oauth_problem, body);
	}
	else {
		return body;
	}
};*/

Flickr.prototype.parseError = function (statusCode, parsedBody) {
	if (parsedBody.stat === 'fail') {
		return new NoError('ProviderTechnicalError', 'Error with message: '+ parsedBody.message, parsedBody);
	}
};

Flickr.prototype.constructResult = function (authInfo, options, cb) {
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
						method: 'flickr.people.getInfo',
						format: 'json',
						nojsoncallback: 1,
						api_key: self.appInfo.id,
						user_id: authInfo.user_nsid
					},
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				}, cb);
			}
		},
		function (parsedBody, cb) {
			if (fields.indexOf('picture' !== -1)) {
				var picReplace = {
					'icon-farm': parsedBody.person.iconfarm,
					'icon-server': parsedBody.person.iconserver,
					'nsid': parsedBody.person.nsid
				};
				var picUrl = 'http://farm{icon-farm}.staticflickr.com/{icon-server}/buddyicons/{nsid}.jpg';
				parsedBody.picture = picUrl.replace(/\{([\w\-]+)\}/g, function (match, expr) {
					return picReplace[expr];
				});
			}
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(parsedBody, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Flickr;
