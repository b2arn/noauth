"use strict";
var Twitter = require('./twitter');
var Tumblr = require('./tumblr');
var Google = require('./google');
var Fb = require('./fb');
var Vk = require('./vk');
var Instagram = require('./instagram');
var Flickr = require('./flickr');
var Dropbox = require('./dropbox');
var Github = require('./github');
var SoundCloud = require('./soundcloud');

var all = {
	twitter: Twitter,
	tumblr: Tumblr,
	google: Google,
	fb: Fb,
	vk: Vk,
	instagram: Instagram,
	flickr: Flickr,
	dropbox: Dropbox,
	github: Github,
	soundcloud: SoundCloud
};

module.exports = {
	Twitter: Twitter,
	Tumblr: Tumblr,
	Google: Google,
	Fb: Fb,
	Vk: Vk,
	Instagram: Instagram,
	Flickr: Flickr,
	Dropbox: Dropbox,
	Github: Github,
	SoundCloud: SoundCloud,
	all: all
};


