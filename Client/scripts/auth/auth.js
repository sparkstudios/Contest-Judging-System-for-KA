/*
 * This file contains all the authentication logic for the Khan Academy Contest Judging System
 */
var Authentication_Logic = (function() {
	/* Firebase, jQuery, and Contest_Judging_System are all required objects, so if we don't have them; exit immediately! */
	if (!window.Firebase || !window.jQuery || !window.Contest_Judging_System) {
		console.log("[Authentication_Logic] Firebase and jQuery are both required!");
		return;
	}

	/* Return an object containing all of the data relating to this wrapper. */
	return {
		/* Checks Firebase to see if the selected user exists in our list of known users */
		doesUserExist: function(authData, callback) {
			var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com");
			var usersRef = fbRef.child("users");

			var knownUsers = { };

			usersRef.orderByKey().on("child_added", function(snapshot) {
				knownUsers[snapshot.key()] = snapshot.val();
			});

			usersRef.once("value", function() {
				/* If this user's UID was found in knownUsers... */
				if (knownUsers.hasOwnProperty(authData.uid)) {
					/* ...pass true to our callback! */
					callback(true);
				} else {
					/* ...pass false into our callback. */
					callback(false);
				}
			});
		},
		/* Adds a new user to our list of known users in Firebase */
		createUser: function(userData) {
			var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com");
			var usersRef = fbRef.child("users");

			usersRef.child(userData.uid).set({
				name: userData.google.displayName,
				permLevel: 1
			});
		},
		/* Does all the major authentication logic */
		logUserIn: function(callback) {
			var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com");

			fbRef.authWithOAuthPopup("google", function(error, authData) {
				/* If an error occurred, log the error to the console, and pass false to our callback. */
				if (error) {
					console.log(error);
					callback(false);
				}

				Authentication_Logic.doesUserExist(authData, function(doTheyExist) {
					if (doTheyExist) {
						Contest_Judging_System.setCookie("loggedInUID", authData.uid);
					} else {
						/* The user doesn't exist. Sign them up? */
						Authentication_Logic.createUser(authData);
						Contest_Judging_System.setCookie("loggedInUID", authData.uid);
					}
				});
				console.log("Authenticated!");
			});
		},
		/* Checks to see if the selected user has the correct permLevel in Firebase */
		userHasCorrectPermissions: function(uid, requiredPerms, callback) {
			var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com");
			var usersRef = fbRef.child("users");

			var thisUser = { };

			usersRef.orderByKey().equalTo(uid).on("child_added", function(snapshot) {
				thisUser = snapshot.val();
			});

			usersRef.once("value", function() {
				/* Pass a boolean value to our callback. The boolean is determined based on whether or not the user has the permission level that is required for a certain task. */
				callback(thisUser.permLevel === requiredPerms);
			});
		},
		/* Gets the permissions level for the specified user */
		getPermLevel: function(uid, callback) {
			var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com");
			var usersRef = fbRef.child("users");
			var thisUserRef = usersRef.child(uid);

			var permLevel = -1;

			thisUserRef.orderByKey().equalTo("permLevel").on("child_added", function(data) {
				permLevel = data.val().permLevel;
			});

			thisUserRef.once("value", function() {
				callback(permLevel);
			});
		},
		/* Checks to see if the user is currently logged in */
		isUserLoggedIn: function() {
			if (Contest_Judging_System.getCookie("loggedInUID") !== "") {
				return true;
			}

			return false;
		}
	};
})();

/* If the user is already logged in, hide the login button. */
if (Authentication_Logic.isUserLoggedIn()) {
	$(".login").css("display", "none");
}

/* When the login button is clicked, attempt to log the user in. If the login succeeds, move to the next step (TODO). */
$(".login").on("click", function() {
	Authentication_Logic.logUserIn(function() {
		console.log("Logged user in!");
	});
});