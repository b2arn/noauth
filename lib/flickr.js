"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var  OAuth1 = require('./core/oauth1a');


var Flickr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Flickr, OAuth1);

Flickr.prototype.providerInfo = {
	requestUrl: 'http://www.flickr.com/services/oauth/request_token',
	authUrl: 'http://www.flickr.com/services/oauth/authorize',
	accessUrl: 'http://www.flickr.com/services/oauth/access_token'
};

Flickr.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Flickr.prototype.constructResult = function (body, options, cb) {
	var authInfo = this.parseUrlEncodedBody(body);

	var usrUrl = 'http://api.flickr.com/services/rest/';
	var picUrl = 'http://farm{icon-farm}.staticflickr.com/{icon-server}/buddyicons/{nsid}.jpg';

	var params = {
		method: 'flickr.people.getInfo',
		format: 'json',
		nojsoncallback: 1,
		api_key: this.appInfo.id,
		user_id: authInfo.user_nsid
	};

	request({
		url: url.resolve(usrUrl, url.format({query: params})),
		method: 'GET',
		headers: {Authorization: this.generateAuthorizationHeader('GET', usrUrl, params, authInfo.oauth_token, authInfo.oauth_token_secret)}
	}, function (err, res, body) {
		if (err) {
			cb(err);
		}
		else {
			var parsedBody = JSON.parse(body);
			var picReplace = {
				'icon-farm': parsedBody.person.iconfarm,
				'icon-server': parsedBody.person.iconserver,
				'nsid': parsedBody.person.nsid
			};
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: {
					id: parsedBody.person.id,
					photo: picUrl.replace(/\{([\w\-]+)\}/g, function (match, expr) {
						return picReplace[expr];
					}),
					name: parsedBody.person.realname._content,
					username: parsedBody.person.username._content,
					location: parsedBody.person.location._content,
					bio: parsedBody.person.description._content
				}
			});
		}
	});
};


module.exports = Flickr;
