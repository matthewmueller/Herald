var io = require('socket.io'),
	_ = require('underscore');


var Herald = {
	_groups : {},
	_connected : false, 
	_users : {}, // Direct mapping SocketID ---> MongoID
	_listeners : (function() {
		var EventEmitter = require('events').EventEmitter;
		return new EventEmitter();
	})(),
	
	// On a publish event being sent through by a client
	subscribe : function(from, groups, socketID) {
		var self = this;
		var args = arguments;
		if(!self._connected) return self;
		if(_.isString(groups)) groups = [groups];

		_(groups).each(function(group) {
			if(_.isUndefined(self._groups[group])) { self._groups[group]= []; } 
			
			self._groups[group].push(socketID); // Add socketID to subscriber
			self._users[socketID] = from; // Map socketID to mongoID
			
					
		}, self);

		// Allow for this to be extended
		self._listeners.emit('subscribe', args);	

		return self;
	},
	
	response : function(to, from, message, next) {
		// Encode Message
		next(to, from, message);
	},
	
	// On a publish event being sent through by a client
	publish : function(to, from, message, socketID) {
		var self = this;
		if(!self._connected) return self;
		message = message || "";
		if(_.isString(to)) to = [to];
		self._users[socketID] = from;
		var subscribers = [];
		
		_(to).each(function(group) {
			var group = self._groups[group];
			if(_.isArray(group)) {
				subscribers = subscribers.concat(group);
			}
			
		}, self);
		// Make the total list of subscribers unique
		subscribers = _(subscribers).uniq();
		
		var next = function() {
			var messageArgs = ['response'].concat(_.toArray(arguments));

			message = self._formatMessage.apply(self, messageArgs);

			var clients = self.socket.clients;
			delete clients[socketID]; // Delete myself

			_(subscribers).each(function(subscriber) {
				if(_.isUndefined(clients[subscriber])) {
					delete clients[subscriber];
					delete self._users[socketID];
				} else {
					clients[subscriber].send(message);
				}
			}, self);
			
			self._listeners.emit('publish', arguments);
		};

		self.response(to, self._users[socketID], message, next);
		
		return self;
	},
	
	connect : function(app) {
		var self = this;
		if(!app || self._connected) return this;

		// Listen for requests to the client library
		app.get('/herald.js', function(req, res) {			
			require('fs').readFile(__dirname + '/herald.client.min.js', 'utf8', function(err, data) {
				res.setHeader("Content-Type", "text/javascript");
				res.send(data);
			});
		});
		
		var socket = self.socket = io.listen(app);
		self._connected = true;

		socket.on('connection', function(client) {
			
			client.on('message', function(message) {
				message.body.push(client.sessionId);
				self[message['action']].apply(self, message['body']);
			});

			client.on('disconnect', function() {
				// Remove subscriber
				delete self._users[client.sessionId];
			});

		});


		return this;
	},	
	
	_formatMessage: function() {
		var args = _.toArray(arguments);
		var action = args.splice(0, 1)[0];

		return {action : action, body : args};
	},
	
	
	on : function(event, callback) {
		this._listeners.on(event, callback);
	},
	
	emit : function(event, args) {
		this._listeners.emit(event, args);
	}
	
};


module.exports = Herald;
