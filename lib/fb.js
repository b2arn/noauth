"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var NoError = require('./core/error');
var async = require('async');


var rename = function (src, rule) {
	console.log(src, '\n',rule);
	for (var key in rule) {
		var valArr = rule[key].split('.');
		var newSrc = src;
		var found = true;
		for (var i = 0; i < valArr.length; i++) {
			if (valArr[i] in newSrc) {
				newSrc = newSrc[valArr[i]];
			}
			else {
				found = false;
				break;
			}
		}

		if (!found) {
			continue;
		}
		delete src[valArr[0]];
		var keyArr = key.split('.');
		var newData = src;
		for (i = 0; i < keyArr.length - 1; i++) {
			if (!(keyArr[i] in newData)) {
				newData[keyArr[i]] = {};
			}
			else if (newData[keyArr[i]].constructor !== Object) {
				throw new Error('Strange data in keys of rules: ' + newData[keyArr[i]] + ' is not an Object');
			}
			newData = newData[keyArr[i]];
		}

		newData[keyArr[keyArr.length - 1]] = newSrc;
	}

	return src;
};

var Fb = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Fb, OAuth);

Fb.prototype.scopeGen = function (scope) {
	return scope.join(',');
};

Fb.prototype.providerInfo = {
	authUrl: 'https://www.facebook.com/dialog/oauth',
	tokenUrl: 'https://graph.facebook.com/oauth/access_token'
};

Fb.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Fb.prototype.parseError = function (body, cb) {
	if ('error' in body) {
		cb(new NoError('badInput', body.error.type, body.error.message, body.error));
	}
	else {
		cb(null, body);
	}
};

Fb.prototype.constructResult = function (authInfo, options, cb) {

	var availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'photo', 'bio', 'site', 'location', 'locale', 'username'];
	var nameRule = {
		photo: 'picture.width(700)',
		site: 'website'
	};
	var renameRule = {
		location: 'location.name',
		photo: 'picture.data.url',
		site: 'website'
	};

	var fields = (options && options.fields) ? options.fields.map(function (key) {
		if (availableFields.some(function (el) {
			return el === key;
		})) {
			return key;
		}
		else {
			cb(new NoError('badInput', 'Wrong field', 'Wronag field ' + key));
			return;
		}
	}) : availableFields;

	var self = this;

	request({
		method: 'GET',
		url: url.resolve('https://graph.facebook.com/me', url.format({
			query: {
				access_token: authInfo.access_token,
				fields: fields.map(function (el) {
					return el in nameRule ? nameRule[el] : el;
				}).join(',')
		}}))}, function (err, res, body) {
			async.waterfall([
				function (cb) {
					if (err) {
						cb(new NoError('network', null, err.messege, err));
					}
					else {
						var parsedBody = self.parseJsonBody(body);
						self.parseError(parsedBody, cb);
					}
				},
				function (parsedBody, cb) {
					cb(null, {
						auth: {
							token: authInfo.access_token,
							expires: authInfo.expires
						},
						data: rename(parsedBody, renameRule)
					});
				}
			], cb);
		}
	);
};

module.exports = Fb;

