var express = require('express');
var _ = require('underscore');
	// herald = require('./herald');
	
var app = express.createServer();	
var herald = require('./herald.js');

herald.connect(app);

// Overwrite the response function
// herald.response = function(to, from, message, next) {
// 	
// 	_.delay(function() {
// 		next(from, message);
// 	}, 2000);
// 	
// };

app.configure(function() {
	
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.favicon());
	app.use(express.methodOverride()); // Allows us to use PUTs
	app.use(express['static']('.'));
	
});

app.listen(8000);

app.get('/', function(req, res) {
	res.render('index.html');
});