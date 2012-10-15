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

Google.prototype.defaultScope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

Google.prototype.scopeGen = function (scope) {
	return scope.join(' ');
};

Google.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Google.prototype.constructResult = function (body, options, cb) {
	var authInfo = this.parseJsonBody(body);

	request({
		method: 'GET',
		headers: {Authorization: 'Bearer ' + authInfo.access_token},
		url: url.resolve('https://www.googleapis.com/oauth2/v1/userinfo', url.format({
			query: {
				token: authInfo.access_token
		}}))}, function (err, res, body) {
			if (err) {
				cb({
					errorType: 'request',
					error: err
				});
			}
			else {
				var parsedBody = JSON.parse(body);
				if ('error' in parsedBody) {
					cb({
						errorType: 'provider',
						error: parsedBody.error
					});
				}
				else {
					console.log(parsedBody);
					var data = {};
					for (var key in parsedBody) {
						switch (key) {
							case 'link':
								data.site = parsedBody[key];
								break;
							case 'picture':
								data.photo = parsedBody[key];
								break;
							case 'given_name':
							case 'family_name':
							case 'verified_email':
								break;
							default:
								data[key] = parsedBody[key];
								break;
						}
					}
					cb(null, {
						auth: {
							token: authInfo.access_token,
							refresh_token: authInfo.id_token
						},
						data: data
					});
				}
			}
		}
	);
};


module.exports = Google;
