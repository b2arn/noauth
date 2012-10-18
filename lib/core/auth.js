"use strict";
var url = require('url');
var NoError = require('./error');
var async = require('async');

var Auth = function (opt_appInfo, opt_redirectUrl) {
	this.appInfo = opt_appInfo;
	this.redirectUrl = opt_redirectUrl;
};

Auth.prototype.availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'picture', 'bio', 'site', 'location', 'locale', 'username'];

Auth.prototype.rename = function (src, rule) {
	var data = {};
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

		var keyArr = key.split('.');
		var newData = data;
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

	return data;
};

Auth.prototype.needStorage = false;

Auth.prototype.renameRule = {};

Auth.prototype.createAuthRequestUrl = function (options, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.exchangeAuthGrant = function (resultInfo, options, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.parseResultUrl = function (url) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.setInfo = function (appInfo, redirectUrl) {
	this.appInfo = appInfo;
	this.redirectUrl = redirectUrl;
};

Auth.prototype.parseBody = function (body) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.parseJsonBody = function (body) {
	return JSON.parse(body);
};

Auth.prototype.parseUrlEncodedBody = function (body) {
	return url.parse('?' + body, true).query;
};

Auth.prototype.parseError = function (body, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.constructResult = function (body, options, callback) {
	callback(null, this.parseBody(body));
};

Auth.prototype.handleAuthResponse = function (err, res, body, options, cb) {
	var self = this;
	async.waterfall([
		function (cb) {
			if (err) {
				cb(new NoError('network', null, err.message, err));
			}
			else {
				var parsedBody = self.parseBody(body);
				self.parseError(parsedBody, cb);
			}
		},
		function (result, cb) {
			self.constructResult(result, options, cb);
		}
	], cb);
};

Auth.prototype.genFields = function (options, cb) {
	var err, result = {};
	if (options && options.fields) {
		for (var i = 0; i < options.fields.length; i++) {
			var key = options.fields[i];
			err = this.checkField(key);
			if (err) {
				break;
			}
			if (key in result) {
				err = new NoError('badInput', 'Wrong field', 'Duplicate field ' + key);
			}
			result[key] = null;
		}
		result = err ? null : Object.keys(result);
	}
	else {
		result = this.availableFields;
	}
	cb(err, result);
};

Auth.prototype.removeWasteFields = function (body, rule, fields) {
	var data = this.rename(body, rule);
	for (var i = 0; i < fields.length; i++) {
		var field = fields[i];
		if (field in body && !(field in data)) {
			data[field] = body[field];
		}
	}
	return data;
};

Auth.prototype.checkField = function (field) {
	var result;
	var isKnownField = this.availableFields.some(function (el) {
		return el === field;
	});
	if (!isKnownField) {
		result = new NoError('badInput', 'Wrong field', 'Wrong field ' + field);
	}
	return result;
};

module.exports = Auth;
