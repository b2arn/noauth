"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;


var Fb = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Fb, OAuth);

Fb.prototype.providerInfo = {
	authUrl: 'https://www.facebook.com/dialog/oauth',
	tokenUrl: 'https://graph.facebook.com/oauth/access_token'
};

Fb.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};


Fb.prototype.constructResult = function (body, cb) {
	var authInfo = this.parseUrlEncodedBody(body);
	request({
		method: 'GET',
		url: url.resolve('https://graph.facebook.com/me', url.format({
			query: {
				token: authInfo.access_token,
				fields: 'id,name,email,gender,birthday,picture.width(700),bio,website,location,locale,username'
		}}))}, function (err, res, body) {
			if (err) {
				cb(err);
			}
			else {
				var parsedBody = JSON.parse(body);
				var data = {};
				for (var key in parsedBody) {
					if (key === 'location') {
						data.city = parsedBody.location.name;
						continue;
					}

					if (key === 'picture' && parsedBody[key].data) {
						data.photo = parsedBody[key].data.url;
						continue;
					}

					if (key === 'website') {
						data.site = parsedBody[key];
						continue;
					}

					data[key] = parsedBody[key];
				}
				cb(null, {
					auth: authInfo,
					data: data
				});
			}
		}
	);
};

module.exports = Fb;

