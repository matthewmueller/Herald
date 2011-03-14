var Herald = {
	_groups : {},
	_connected : false,
	socketID: null,
	me : '',
	
	subscribe : function(groups) {
		var self = this;
		if(!self._connected) return self;
		if(_.isString(groups)) groups = [groups];

		_(groups).each(function(group) {
			if(_.isUndefined(self._groups[group])) { self._groups[group]= []; } 
			self._groups[group].push(self.socketID);
			
		}, self);

		var message = self._formatMessage('subscribe', self.me, groups);
		self.socket.send(message);

		return self;
	},
	
	publish : function(to, message) {
		var self = this;
		if(!self._connected) return self;
		message = message || "";
		if(_.isString(to)) to = [to];

		message = self._formatMessage('publish', to, self.me, message);
		self.socket.send(message);
		
		return self;
	},

	response : function(callback) {
		var self = this;
		self.on('response', function() {
			return callback.apply(self, arguments);
		});
	},

	ready : function(callback) {
		var self = this;
		if(this._connected) return self;

		var socket = self.socket = new io.Socket();

		_(self).on('ready', function() {
			return callback.call(self);
		});

		socket.on('connect', function() {
			self._connected = true;
			self.socketID = socket.transport.sessionid;
			self.me = self._readCookie('userID');
			
			_(self).emit('ready');
			
			socket.on('message', function(message) {
				self.emit(message.action, message.body);
			});
			
		});

		socket.connect();
		
		return self;
	},
	
	on: function(event, callback) {
		_(this).on(event, callback);
	},
	
	emit: function(event, args) {
		_(this).emit(event, args);
	},
	
	_readCookie : function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}

		return '';
	},
	
	_formatMessage: function() {
		var args = _.toArray(arguments);
		var action = args.splice(0, 1)[0];

		return {action : action, body : args};
	}
};

// EventEmitter
_.mixin({
on : function(obj, event, callback) {
    // Define a global Observer
    if(this.isString(obj)) {
        callback = event;
        event = obj;
        obj = this;
    }
    if(this.isUndefined(obj._events)) obj._events = {};
    if (!(event in obj._events)) obj._events[event] = [];
    obj._events[event].push(callback);
    return this;
},
once : function(obj, event, callback) {
    if(this.isString(obj)) {
        callback = event;
        event = obj;
        obj = this;
    }
    var removeEvent = function() { _.removeEvent(obj, event); };
    callback = _.compose(removeEvent, callback);
    this.on(obj, event, callback);
},
emit : function(obj, event, args){
    if(this.isString(obj)) {
        callback = event;
        event = obj;
        obj = this;
    }
    if(this.isUndefined(obj._events)) return;
    if (event in obj._events) {
        var events = obj._events[event].concat();
        for (var i = 0, ii = events.length; i < ii; i++)
            events[i].apply(obj, args === undefined ? [] : args);
    }
    return this;
},
removeEvent : function(obj, event) {
    if(this.isString(obj)) { event = obj; obj = this; }
    if(this.isUndefined(obj._events)) return;
    delete obj._events[event];
}
});