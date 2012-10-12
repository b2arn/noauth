"use strict";
var OAuth = require('./core/oauth2');
var url = require('url');
var async = require('async');
var request = require('request');
var inherits = require('util').inherits;


var Vk = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Vk, OAuth);

Vk.prototype.providerInfo = {
	authUrl: 'http://api.vkontakte.ru/oauth/authorize',
	tokenUrl: 'https://api.vkontakte.ru/oauth/access_token'
};

Vk.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Vk.prototype.constructResult = function (body, cb) {
	var authInfo = this.parseJsonBody(body);

	async.waterfall(
	[
		function (cb) {
			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/getProfiles', url.format({
					query: {
						access_token: authInfo.access_token,
						uids: authInfo.user_id,
						fields: 'uid,first_name,last_name,nickname,sex,bdate,city,country,photo_big'
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(err);
				}
				else {
					cb(null, {
						auth: authInfo,
						data: JSON.parse(body).response[0]
					});
				}
			});
		},
		function (result, cb) {
			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/places.getCityById', url.format({
					query: {
						access_token: authInfo.access_token,
						cids: result.data.city
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(err);
				}
				else {
					var response = JSON.parse(body).response;
					if (response.length === 0) {
						delete result.data.city;
					}
					else {
						result.data.city = response[0].name;
					}

					cb(null, result);
				}
			});
		},
		function (result, cb) {
			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/places.getCountryById', url.format({
					query: {
						access_token: authInfo.access_token,
						cids: result.data.country
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(err);
				}
				else {
					var response = JSON.parse(body).response;
					delete result.data.country;
					result.data.city += response.length > 0 ? ', ' + response[0].name : '';
					cb(null, result);
				}
			});
		}
	],
	function (err, result) {
		if (err) {
			cb(err);
		}
		else {
			cb(null, {
				auth: {
					access_token: result.auth.access_token,
					expires: result.auth.expires
				},
				data: {
					id: result.data.uid + '',
					name: result.data.first_name + ' ' + result.data.last_name,
					gender: result.data.sex === 2 ? 'male' : 'female',
					birthday: result.data.bdate,
					location: result.data.city,
					photo: result.data.photo_big
				}
			});
		}
	});

};


module.exports = Vk;
