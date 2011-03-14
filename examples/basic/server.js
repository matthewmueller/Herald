var express = require('express');
var _ = require('underscore');
	// herald = require('./herald');
var herald = require('../../lib/herald.js');
	
var app = express.createServer();	

herald.connect(app);

// Overwrite the response function
herald.response = function(to, from, message, next) {
	
	_.delay(function() {
		next( from, to, message);
	}, 2000);
	
};

herald.on('subscribe', function(args) {
	console.log("From subscribe event");
	console.log(args);
});

herald.on('publish', function(args) {
	console.log(args);
});

app.configure(function() {
	
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.favicon());
	app.use(express.methodOverride()); // Allows us to use PUTs
	app.use(express['static']('.'));
	
});

app.listen(8000);

app.get('/', function(req, res) {
	res.send(require('fs').readFileSync('./index.html'));
});

app.get('/publish.html', function(req, res) {
	res.send(require('fs').readFileSync('./publish.html'));
});