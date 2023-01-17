'use strict';

/* REFER https://docs.microsoft.com/en-us/aspnet/signalr/overview/guide-to-the-api/hubs-api-guide-javascript-client */
angular.module('talentCubeAdminApp').factory('NotificationFactory', ["$rootScope", "ConfigFactory", "toastr","UserFactory", function ($rootScope, ConfigFactory, toastr,UserFactory) {
	var proxy, connection, notifications;

	var AesEnc     = CryptoJS.AES;
	var passphrase = ConfigFactory.getSecretPhrase();
	var socketURL  = ConfigFactory.getSockUrl();
	var token			 = UserFactory.getUser();
	setInitValues();

	$rootScope.$on('loggedOut', function () {
		if(connection){
			// connection.stop();
			connection.off("broadcastMessage");
		}
		setInitValues();
	});

	return { backendFactory, updateNotification, removeNotification, getNotifications,removeSchNotification };

	function setInitValues() {
		notifications = [];
		connection    = null;
		proxy         = null;
	}

	function backendFactory() {
		if(connection) return connection;

		const signalR = require("@microsoft/signalr");
		connection = new signalR.HubConnectionBuilder()
    .withUrl(socketURL, { 
			// skipNegotiation: true,
			// transport: signalR.HttpTransportType.WebSockets,
			accessTokenFactory: () => token.access_token })
    .build();
connection.start()
.then(() => {
		console.log("hubConnectionStart");
		// askServerListener();
		// askServer();
})
.catch(err => console.log( err))
		console.log(connection)
	
		connection.on("broadcasttouser",	function (user, message) {
			// We can assign user-supplied strings to an element's textContent because it
			// is not interpreted as markup. If you're assigning in any other way, you 
			// should be aware of possible script injection concerns.
			console.log(`${user} says ${message}`)
		}
	//  (data) => {
	// 		console.log(data);
	// }
	);
	return connection;
		// connection = $.hubConnection(socketURL);
		// proxy = connection.createHubProxy('notificationHub');
		// proxy.on('broadcastMessage', addNotification);
		// console.log(connection)
		// connection.accessToken = token.access_token;
		// connection.start().done(()=>{console.log("Connection done")}).fail(()=>{console.log("Fail")});
	
	}
// 	function askServerListener() {
// 		console.log("askServerListenerStart");

// 		connection.on("askServerResponse", (someText) => {
// 				console.log("askServer.listener");
// 				this.toastr.success(someText);
// 		})
// }
//  function askServer() {
// 	console.log("askServerStart");

// 	hubConnection.invoke("askServer", "hi")
// 			.then(() => {
// 					console.log("askServer.then");
// 			})
// 			.catch(err => console.error(err));

// 	console.log("This is the final prompt");
// }

	function addNotification (notification) {
		notifications.unshift(notification);
		cleanNotifications();
		saveToLocalStorage(notifications);
	}

	function updateNotification (notification, key) {
		var index = notifications.findIndex(log => log[key] == key);
		if (index > -1) {
			notifications[index] = notification;
			saveToLocalStorage(notifications);
		}
	}

	function removeNotification (notification) {
		if (notification.CallId) {
			let index = notifications.findIndex(log => log.CallId == notification.CallId);
			if (index > -1) notifications.splice(index, 1);
			saveToLocalStorage(notifications);
		}
	}

	function removeSchNotification(notification) {
		let index;
		if (/schedule|hotlead|emailpositiveresponse|smspositiveresponse|schcomment/.test(notification.NotificationType))
			index = notifications.findIndex(log => log.CandidateApplicationId == notification.CandidateApplicationId && log.NotificationType == notification.NotificationType);

		if (index > -1) notifications.splice(index, 1);
		saveToLocalStorage(notifications);
	}

	function saveToLocalStorage(notifications) {
		var encString = AesEnc.encrypt(JSON.stringify(notifications), passphrase);
		localStorage.setItem('UserNotification', encString.toString());
	}

	function cleanNotifications(notifications) {
		return _.uniqWith(notifications, _.isEqual);
	}

	function getNotifications () {
		if(notifications.length) return notifications;

		let temp = localStorage.getItem('UserNotification');

		if(temp) {
			try {
				var decrypted = AesEnc.decrypt(temp, passphrase).toString(CryptoJS.enc.Utf8);
				notifications = cleanNotifications(JSON.parse(decrypted));
			} catch(e) {
				toastr.warning('Failed to retrieve Notification Data.');
			}
		}

		return notifications;
	}
}]);