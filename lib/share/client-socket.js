"use strict";
var ClientSocket = (function () {
    function ClientSocket(linkName, host, port) {
        var _this = this;
        this.net = require('net');
        this.openSocket = function () {
            console.log(_this.linkName + ": Retrying...");
            _this.socket = _this.net.connect(_this.port, _this.host);
            _this.socket.setKeepAlive(true);
            _this.socket.on('connect', _this.onConnect.bind({}, _this.socket));
            _this.socket.on('error', _this.onError.bind({}, _this.socket));
        };
        this.onConnect = function (socket) {
            console.log(_this.linkName + ": Open!");
            _this.active = true;
        };
        this.onError = function (socket) {
            console.log(_this.linkName + ": Failure!");
            _this.socket.destroy();
            _this.socket.unref();
            setTimeout(_this.openSocket, 2000);
        };
        this.write = function (msg) {
            if (_this.active) {
                return _this.active = _this.socket.write(msg);
            }
            else {
                return false;
            }
        };
        this.linkName = linkName;
        this.host = host;
        this.port = port;
        this.active = false;
        this.openSocket();
    }
    return ClientSocket;
}());
exports.ClientSocket = ClientSocket;
