/* Get the GET params: */
var getParams = window.Contest_Judging_System.getGETParams();
/* If it doesn't look like there's a contest ID in the URL, show an alert, and go back one page. */
if (!getParams.contest) {
	window.alert("Contest ID not found!");
	window.history.back();
}

/* If it doesn't look like there's an entry ID in the URL, show an alert, and go back one page. */
if (!getParams.entry) {
	window.alert("Entry ID not found!");
	window.history.back();
}

/* The ids of the buttons selected on judging tools */
var selectedBtn = {};
/* The score for this entry */
var scoreData = {};

/* Get the GET params: */
var contestId = getParams.contest;
var entryId = getParams.entry;

/* The dimensions of the program */
var dimens = {
	width: 400,
	height: 400
};
/* Set the <input> elements in <form>[name=dimensions] to dimens */
document.forms.dimensions.width.value = dimens.width;
document.forms.dimensions.height.value = dimens.height;
/* The base URL for the program preview Iframe. */
var baseURL = "https://www.khanacademy.org/computer-programming/entry/{ENTRYID}/embedded?buttons=no&editor=yes&author=no&embed=yes&width=" + dimens.width + "&height=" + dimens.height;

/* A couple elements that we'll be using later on */
var programPreview = document.querySelector(".program-preview");
//var judgingPane = document.querySelector(".judging-pane");
var currentScoreDiv = document.querySelector(".current-score");
var rubricsDiv = document.querySelector(".rubrics");

/* Print the contest ID that we found, to the console. */
console.log("Contest ID: " + contestId);

/* Print the entry ID that we found, to the console. */
console.log("Entry ID: " + entryId);

/* The number of lines of code of this project */
var linesOfCode;
/* Our Firebase user data: */
var global_userData = {};
/* Send an AJAX request to the KA API for this program. */
$.ajax({
	type: "GET",
	url: "https://www.khanacademy.org/api/internal/scratchpads/" + entryId,
	async: true,
	complete: function(response) {
		/* Calculate the number of lines of code in this entry. */
		linesOfCode = response.responseJSON.revision.code.split("\n").length;
		/* Insert it into where it should be in the document. */
		document.querySelector("#program-info").textContent = linesOfCode + " lines of code";
	}
});

function judgingButtonClick(k, kLower) {
	/* Click event handler for judging tool buttons */
	return function(event) {
		var id = event.target.id;
		/* Unselect previously selected button */
		if (selectedBtn[k] !== null && selectedBtn[k] !== id) {
			$("#"+selectedBtn[k]).removeClass("btn-success").addClass("btn-default");
		}
		/* Set selectedBtn[k] and scoreData[k] */
		selectedBtn[k] = id;
		scoreData[k] = parseInt(selectedBtn[k].replace(kLower + "SelectButton", ""), 10);
		/* Select the selected button */
		$("#" + id).removeClass("btn-default").addClass("btn-success");
	};
}

/* The <iframe> for this program */
var programIframe;
/* The user ID and permission level of a user: */
var permLevel;
/* The rubrics and entry data: */
var rubrics, entryData;

function updateScoreData() {
	/* This function updates currentScoreDiv and submitBtn. */
    /* Change the text of submitBtn to "Vote submitted!" if they already submitted a vote: */
    if (entryData.scores.rubric.hasOwnProperty("judgesWhoVoted") && entryData.scores.rubric.judgesWhoVoted.indexOf(fbAuth.uid) !== -1) {
        submitBtn.text("Vote submitted!");
    }

	/* Empty currentScoreDiv except for the first element (the heading): */
	while (currentScoreDiv.childNodes.length > 1) {
        currentScoreDiv.removeChild(currentScoreDiv.childNodes[currentScoreDiv.childNodes.length - 1]);
    }
	/* Go through rubrics in the intended order: */
	for (var _i = 0; _i < rubrics.Order.length; _i++) {
		/* Current Property: */
		var k = rubrics.Order[_i];
        /* Name of Rubric */
        var rubricName = k.replace(/_/gi, " ");
        /* The current score in this rubric */
        var curRubric = document.createElement("p");

		var displayMessage = rubricName + ": ";

		var rubricValue = Math.round(entryData.scores.rubric.hasOwnProperty(k) ? entryData.scores.rubric[k].avg : rubrics[k].min);

        /* If there are discrete options to this rubric: */
        if (rubrics[k].hasOwnProperty("keys")) {
            /* Set the textContent using .keys: */
            displayMessage += rubrics[k].keys[rubricValue];
        }
        /* Otherwise, the rubric is numerical. */
        else {
            /* Set the current score using numbers */
            displayMessage += rubricValue + " out of " + rubrics[k].max;
        }
		curRubric.textContent = displayMessage;

        /* Append curRubric to currentScoreDiv: */
        currentScoreDiv.appendChild(curRubric);
	}
}

function loadEntry() {
    console.log(global_userData);
    /* Set permLevel: */
    permLevel = global_userData.permLevel;
    /* Fetch the data for this contest entry, and then use the data to build up the current page. */
    window.Contest_Judging_System.loadEntry(contestId, entryId, permLevel, function(entryDataLocal) {
        console.log("Entered loadEntry callback!");
        /* Set entryData: */
        entryData = entryDataLocal;

        /* Set the text of our "program-name" heading to the name of the current entry */
        document.querySelector("#program-name").textContent = entryData.name;

        /* The following stuff is broken in Firefox. Issue reported on Khan Academy live-editor repo. */
        if (!programPreview.childNodes.length) {
            programIframe = document.createElement("iframe");
            programIframe.src = baseURL.replace("{ENTRYID}", entryData.id);
            programIframe.width = "100%";
            programIframe.height = dimens.height;
            programIframe.scrolling = "no";
            programIframe.frameborder = 0;
        }

        /* Wrap all this code in a callback to get the rubrics: */
        window.Contest_Judging_System.getRubricsForContest(contestId, function(rubricsLocal) {
            /* Get the rubrics: */
            rubrics = rubricsLocal;
            console.log(JSON.stringify(rubrics));

            /* If the user can see the scores, update the scores: */
            if (entryData.hasOwnProperty("scores")) {
                updateScoreData();
            }
            /* Otherwise, hide the scores: */
            else {
                currentScoreDiv.style.display = "none";
            }

            /* If the user can see the scores... */
            if (entryData.hasOwnProperty("scores")) {
                document.querySelector(".judgeOnly").style.display = "block";
                /* Empty rubricsDiv: */
                while (rubricsDiv.childNodes.length) {
                    rubricsDiv.removeChild(rubricsDiv.childNodes[0]);
                }

				/* Any local functions that we'll need to use to help prevent Javascript "gotchas" from surfacing */
				var localRubricFunctions = {
					"setupSlider": function(curLabel, scoreData, rubricName, k) {
						/* Use noUiSlider to create slider */
						window.noUiSlider.create(curSlider, {
							connect: "lower",
							start: rubrics[k].min,
							step: 1,
							range: {
								min: rubrics[k].min,
								max: rubrics[k].max
							}
						});
						curSlider.noUiSlider.on("update", function(values, handle) {
							/* Tell the score in curLabel when the slider changes. */
							curLabel.textContent = rubricName + ": " + parseInt(values[handle]).toString();
							/* Set scoreData */
							scoreData[k] = parseInt(values[handle]);
						});
					}
				};

                /* ...Go through the rubrics in the order that we want: */
                for (var _i = 0; _i < rubrics.Order.length; _i++) {
                    /* Current Property: */
                    var k = rubrics.Order[_i];
                    /* Name of Rubric */
                    var rubricName = k.replace(/_/gi, " ");
                    /* Lowercase Property */
                    var kLower = k.toLowerCase();
                    /* The container for all elems of this rubric */
                    var curGroup = document.createElement("div");
                    curGroup.id = kLower + "_group";
                    /* Create label for this rubric */
                    var curLabel = document.createElement("label");
                    curLabel.htmlFor = kLower;
                    curLabel.textContent = rubricName + ": ";

					var descElem;

					if (rubrics[k].hasOwnProperty("desc")) {
						descElem = document.createElement("small");
						descElem.textContent = "(" + rubrics[k].desc + ")";
					}

                    /* If there are discrete options to this rubric: */
                    if (rubrics[k].hasOwnProperty("keys")) {
                        /* Container for curSelectBtnGroup */
                        var curSelect = document.createElement("div");
                        curSelect.id = kLower + "-btn-toolbar";
                        curSelect.className = "btn-toolbar";

                        /* Container for curSelectBtns */
                        var curSelectBtnGroup = document.createElement("div");
                        curSelectBtnGroup.className = "btn-group";
                        curSelectBtnGroup.role = "group";

                        /* All buttons */
                        var curSelectBtns = [ ];
                        /* Initialize scoreData[k] to the minimum: */
                        scoreData[k] = rubrics[k].min;
                        /* Create all buttons and push into curSelectBtns */
                        for (var i = rubrics[k].min; i <= rubrics[k].max; i++){
                            var curSelectButton = document.createElement("button");
                            curSelectButton.type = "button";
                            curSelectButton.id = (kLower + "SelectButton" + i.toString());
                            /* Intitialize selectedBtn[k] to the id of the minimum: */
                            if (i === rubrics[k].min) {
                                selectedBtn[k] = curSelectButton.id;
                                /* Also, select the button: */
                                curSelectButton.className = "btn btn-sm btn-success";
                            }
                            /* Otherwise, give the button a default look: */
                            else {
								curSelectButton.className = "btn btn-sm btn-default";
							}
                            /* Remember to set the text using rubrics[k].keys and to add a click event using judgingButtonClick() above. */
                            curSelectButton.textContent = rubrics[k].keys[i];
                            $(curSelectButton).click(judgingButtonClick(k, kLower));
                            curSelectBtns.push(curSelectButton);
                        }

                        /* Append everything to whatever it needs to be appended to */
                        for (var cbInd = 0; cbInd < curSelectBtns.length; cbInd++){
                            curSelectBtnGroup.appendChild(curSelectBtns[cbInd]);
                        }
                        curSelect.appendChild(curSelectBtnGroup);
                        curGroup.appendChild(curLabel);
						if (descElem !== undefined) {
							curGroup.appendChild(descElem);
						}
                        curGroup.appendChild(curSelect);
                    }
                    /* Otherwise, the rubric is numerical. */
                    else {
                        /* Edit label textContent */
                        curLabel.textContent += rubrics[k].min;

                        /* Initialize scoreData[k] to the minimum */
                        scoreData[k] = rubrics[k].min;
                        /* Slider */
                        var curSlider = document.createElement("div");
                        curSlider.className = "judgingSlider";
                        curSlider.role = "slider";

						/* Invoke our "setupSlider" function, this prevents JSLint from yelling at us, and it prevents function closure errors. */
						localRubricFunctions.setupSlider(curLabel, scoreData, rubricName, k);

                        /* Append everything to whatever it needs to be appended to */
                        curGroup.appendChild(curLabel);
						if (descElem !== undefined) {
							curGroup.appendChild(descElem);
						}
                        curGroup.appendChild(curSlider);
                    }

                    /* Add this judging tools to the rubrics div */
                    rubricsDiv.appendChild(curGroup);
                }
            } else {
                /* Not sure if this is intended or not, but this will only hide the first element of class "judgeOnly"
                    that it finds, not all of them. */
                document.querySelector(".judgeOnly").style.display = "none";
            }

            /* Append our program iframe to the "program-preview" div if it's no there already. */
            if (!programPreview.childNodes.length) {
                programPreview.appendChild(programIframe);
            }

            /* Set the widths of our sliders to 30% */
            $(".judgingSlider").width("30%");
        });
        console.log("Exiting loadEntry callback!");
    });
}

/* Connect to Firebase: */
var fbRef = new window.Contest_Judging_System.Firebase("https://contest-judging-sys.firebaseio.com/");
/* The Firebase auth data: */
var fbAuth;
/* On authentication change... */
fbRef.onAuth(function(fbAuthLocal) {
    /* Set fbAuth: */
    fbAuth = fbAuthLocal;
    /* Get the user data if they're logged in: */
    if (fbAuth) {
        window.Contest_Judging_System.getUserData(fbAuth.uid, function(userData) {
            global_userData = userData;
            /* Load the entry when done: */
            loadEntry();
        });
    }
    /* Otherwise, just load the entry with default data: */
    else {
        global_userData = {"permLevel": 1};
        loadEntry();
    }
});

/* Whenever we click the toggleCode button; toggle the code. */
$(".toggleCode").on("click", function() {
	var currentSrc = programIframe.src;

	if (currentSrc.indexOf("editor=yes") !== -1) {
		programIframe.src = currentSrc.replace("editor=yes", "editor=no");
	} else {
		programIframe.src = currentSrc.replace("editor=no", "editor=yes");
	}
});

$(".viewOnKA").on("click", function() {
	/* Prompt the user with a message warning them about information that could potentially bias them. */
	var promptMsg = window.prompt("By visiting the following page, you're exposing yourself to information that could bias your judging. If you agree to not let information you see on Khan Academy bias your judging, please type \"I agree\" in the box below to show that you read this message. Otherwise, close this prompt.");
	/* If the user types 'I agree' in the prompt, open the entry on Khan Academy. */
	if (promptMsg !== null && promptMsg.toLowerCase().indexOf("i agree") > -1) {
		window.open("https://www.khanacademy.org/computer-programming/entry/" + entryId);
	}
});

/* Restart the program when restart program buttons are clicked: */
$(".restartProgram").on("click", function() {
    programIframe.src = programIframe.src;
});

/* The submit button: */
var submitBtn = $("#submitBtn");
/* Attempt to judge the entry if the submit button is clicked. */
submitBtn.on("click", function() {
	/* Judge the entry if they have a permLevel of at least 4. */
	if (entryData.hasOwnProperty("scores")) {
        /* Tell the user they've already judged this entry if they've already judged this entry: */
        if (entryData.scores.rubric.hasOwnProperty("judgesWhoVoted") && entryData.scores.rubric.judgesWhoVoted.indexOf(fbAuth.uid) !== -1) {
            window.alert("You've already judged this entry!");
        }
        /* Otherwise, judge the entry if they haven't judged the entry: */
        else {
            /* Disable the button: */
            submitBtn.prop("disabled", true);
            submitBtn.text("Submitting vote...");
            /* Judge the entry: */
            window.Contest_Judging_System.judgeEntry(contestId, entryId, scoreData, permLevel, function(scoreData) {
                /* Update the score data when done: */
                entryData.scores.rubric = scoreData;
                updateScoreData();
                /* Also, when done, enable submitBtn again: */
                submitBtn.prop("disabled", false);
            });
        }
    }
    /* Make sure permLevel has been set: */
    else if (!permLevel) {
        window.alert("You haven't logged in yet!");
    }
    else {
        window.alert("You aren't in the allowed judges list!");
    }
});

/* When we click the "Set Dimensions" button, set the dimensions of the program. */
$("#setdimensions").on("click", function(event) {
	/* Prevent the form from redirecting */
	event.preventDefault();
	var width = parseInt(document.forms.dimensions.width.value), height = parseInt(document.forms.dimensions.height.value);
	if (isNaN(width) || isNaN(height)) {
		window.alert("Please enter in valid integers for the dimensions. Thanks!");
		return;
	}

	/* Edit the src attribute to set the width and height attributes */
	console.log(programIframe.src.replace("width=" + dimens.width, "width=" + width).replace("height=" + dimens.height, "height=" + height));
	programIframe.src = programIframe.src.replace("width=" + dimens.width, "width=" + width).replace("height=" + dimens.height, "height=" + height);

	/* Set dimens */
	dimens = {
		width: width,
		height: height
	};
	/* Adjust height */
	programIframe.height = dimens.height;
	programPreview.style.height = "auto";
	console.log(dimens.height, programIframe.style.height);
});
