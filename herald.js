var io = require('socket.io'),
	_ = require('underscore');


var Herald = {
	_groups : {},
	_connected : false, 
	_users : {}, // Direct mapping SocketID ---> MongoID
	_listeners : process.EventEmitter(),
	
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
			
			// Allow for this to be extended
			self._listeners.emit('subscribe', args);	
					
		}, self);

		return self;
	},
	
	response : function(to, from, message, next) {
		// Encode Message
		next(to, from, message);
	},
	
	// On a publish event being sent through by a client
	publish : function(to, message, socketID) {
		var self = this;
		if(!self._connected) return self;
		message = message || "";
		if(_.isString(to)) to = [to];

		var subscribers = [];
		
		_(to).each(function(group) {
			var group = self._groups[group];
			if(_.isArray(group)) {
				subscribers = subscribers.concat(group);
			}
			
		}, self);
		
		subscribers = _(subscribers).uniq();
		
		var next = function() {
			var messageArgs = ['response'].concat(_.toArray(arguments));

			message = self._formatMessage.apply(self, messageArgs);

			var clients = self.socket.clients;
			// delete clients[from]; // Delete myself

			_(subscribers).each(function(subscriber) {
				if(_.isUndefined(clients[subscriber])) {
					delete clients[subscriber];
					
				} else {
					clients[subscriber].send(message);
				}
			}, self);
		};
			
		self.response(to, self._users[socketID], message, next);
		
		return self;
	},
	
	connect : function(app) {
		var self = this;
		if(!app || self._connected) return this;

		var socket = self.socket = io.listen(app);
		self._connected = true;

		socket.on('connection', function(client) {
			
			client.on('message', function(message) {
				message.body.push(client.sessionId);
				self[message['action']].apply(self, message['body']);
			});

			client.on('disconnect', function() {
				// Remove subscriber
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

_.extend(Herald);

module.exports = Herald;


// function(app) {
// 	// _.extend(Herald, process.EventEmitter());
// 	return Herald;
// };
// function(app) {
// 
// 	return Herald;
// 	
// // DNode(function(client, con) {
// // 		this.say = function() {
// // 			console.log("hi");
// // 		};
// // 		
// // 		this.names = function(callback) {
// // 			console.log('wahoo');
// // 		};
// // 	}).listen(app);
// 	
// };