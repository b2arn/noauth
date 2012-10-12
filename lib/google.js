"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;


var Google = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Google, OAuth);

Google.prototype.providerInfo = {
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://accounts.google.com/o/oauth2/token'
};

Google.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Google.prototype.constructResult = function (body, cb) {
	var authInfo = this.parseJsonBody(body);

	request({
		method: 'GET',
		headers: {Authorization: 'Bearer ' + authInfo.access_token},
		url: url.resolve('https://www.googleapis.com/oauth2/v1/userinfo', url.format({
			query: {
				token: authInfo.access_token
		}}))}, function (err, res, body) {
			if (err) {
				cb(err);
			}
			else {
				var parsedBody = JSON.parse(body);
				if ('error' in parsedBody) {
					cb(parsedBody.error);
				}
				else {
					cb(null, {
						auth: {
							token: authInfo.access_token,
							refresh_token: authInfo.id_token
						},
						data: {
							id: parsedBody.id,
							name: parsedBody.name,
							site: parsedBody.link,
							photo: parsedBody.picture,
							gender: parsedBody.gender,
							birthday: parsedBody.birthday,
							locale: parsedBody.locale
						}
					});
				}
				/*var data = {};
				for (var key in parsedBody) {
					if (key === 'location') {
						data.location = parsedBody.location.name;
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
				}*/

			}
		}
	);
};


module.exports = Google;
