/*Check if script already exists (detects duplicate loading) and function for reporting script errors */
var npl_cro_script = npl_cro_script || undefined;
function npl_cro_script_reportError(err) {
    dataLayer.push({ 'event': 'experiment', 'interaction_type': 'experiment_error', 'test_name': err.name + ': ' + err.message });
}
try { if (typeof npl_cro_script !== 'undefined') { throw new Error('npl_cro_script variable already exists (double loading the script?)'); } } catch (err) { try { npl_cro_script_reportError(err); } catch (err) { } }

if (typeof npl_cro_script === 'undefined') {
    try {
        npl_cro_script = (function () {
            /*
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                ~~~~							    							~~~~
                ~~~~  CHANGEABLE SETTINGS FOR TEST  ~~~~
                ~~~~							    							~~~~
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                */

            /// 1. Set up the basic variables
            var test_id = 'npl001',		 						//unique ID. used for GA labels and localStorage key.
                test_description = 'corporate | focusing effect',				//Also send with tag. Helps to understand what test was again
                test_eventName = 'experiment',							//The eventname that is being used in GTM
                traffic_total = 100, 										//a number from 1-100 for the % of traffic to include in the test.
                traffic_allocation = [50, 50, 0],					//e.g. [20, 40, 40] for three variations or [] for equal spread. Does not need to add up to 100.
                useHotjar = false,											//adds hotjar triggers like 'abTest-CRO01' and 'abTest-CRO01-B'. Also adds these names as tags for recordings.
                forceLoadWindowLoadTime = 10, 					//How long the script should wait for the window.onload event in seconds
                autoStart = true,												//If you want to trigger this script manually with 'npl_cro_script.start()' or automatically after it is loaded
                fireUserInTestNextPV = false,						//If the action that puts user in a test, navigates the user away from the page, set this to true to send the variation loaded event in the next pageview. ALSO RUN THIS SCRIPT ON THE NEXT PAGE THE USERS WILL GO TO!
                sendPreloadedEvent = false;							//Set this to true if you want to know who got pre-assigned to a variation, but the user is not yet in the test. Will send an abTest event that says which condition is pre-loaded.


            /// 2. Decide at what moment a user should be registered as being part of the test (e.g. when the user sees the variation changes).
            /**
                * function to decide when user will be part of the abTest. You can trigger it right away (sending event to tag manager), or wait for a specific moment.
                * You can also call setUserInTest() anywhere else to put user in a test. Will fire only once per pageview.
                */
            var triggerUserInTest = function () {
                loadOnWindowLoad(function () {
                    setUserInTest(); //Sends the actual trigger. Place this anywhere.
                });
            };



            /// 3. Add code for changes to the pages by each variation.
            /**
                * Put your code for all the variations in this variantions-object
                */
            var variations = {
                'Control': {
                    do: function () {
                        logDebug('[variations]Run Control script');
                        /* dance like a banana */
                        alert("A Running");
                    }
                },
                'B': {
                    do: function () {
                        logDebug('[variations]Run B script');
                        //ADD CODE THAT NEEDS TO BE LOADED AS FAST AS POSSIBLE HERE
                        alert("B Running");
                      
                    }
                }
            };

            /// 5. Send the data to your tag manager of choice
            /**
                * Sends the event data to your favorite tag manager
                * @param {Object} data - an object like {eventCategory: '', eventAction: '', eventLabel: ''}
                */
            function sendToMyTagmanager(data) {
                data.event = test_eventName;
                data.eventNonInteraction = true;
                logDebug('[sendToMyTagmanager] data = ', data);
                dataLayer.push(data);
                //utag.link(data);
            }

            
            //////////////
            // INITIALISE VARIABLES FOR LIBRARY & LOAD THE TEST
            //////////////
            var testSettings = {}, 				// testSettings = { variationLoaded: 'A', excluded: false, debug: false }
                localStorageKey = 'npl_cro_script_data-' + test_id,
                variationIsLoaded = false,
                debug = (LocalStorageSupported() && getDebug()) || false,
                isAssignedToTest = false;

            /**
                * Controls if and which test variation is loaded and stores the settings in localStorage
                */
            function loadTest() {
                if (test_id === undefined || test_id === '') {
                    throw new Error('test ID is not defined');
                }
                if (variationIsLoaded) throw new Error('LoadTest is called while variation is already loaded');

                if (!LocalStorageSupported()) {
                    logDebug('[loadTest]localStorage is not supported or full, so this function will stop');
                    throw new Error('localStorage is not supported or full. The test will not be loaded');
                }

                testSettings = readLocalStorage();
                logDebug('[loadTest]testSettings from localStorage = ', testSettings);

                if (Object.keys(testSettings).length === 0 && testSettings.constructor === Object) {
                    //Person has not seen variation or cleared storage
                    testSettings.included = isWithinPercentage(traffic_total);
                    testSettings.variationLoaded = selectRandomVariation(traffic_allocation);
                    logDebug('[loadTest]New variation assigned');
                } else {
                    //Variation has been loaded before
                    if (!testSettings.hasOwnProperty('variationLoaded') || !testSettings.hasOwnProperty('included')) {
                        deleteLocalStorage();
                        throw new Error('the testSettings object is missing one or two required properties. Deleted the wrong settings');
                    }
                    logDebug('[loadTest]Variation already assigned');
                }
                writeLocalStorage(testSettings);
                logDebug('[loadTest]testSettings written to localStorage = ', testSettings);

                if (testSettings.included) {
                    logDebug('[loadTest]Loading variation:', testSettings.variationLoaded);
                    variations[testSettings.variationLoaded].do(); //Load the selected variation if the person is not excluded
                    variationIsLoaded = true;

                    if (testSettings.hasOwnProperty('fireUserInTestNextPV') && testSettings.fireUserInTestNextPV == true) {
                        logDebug('[loadTest]Set user in test on the new pageview');
                        setUserInTest(true);
                        testSettings.fireUserInTestNextPV = false;
                        writeLocalStorage(testSettings);
                    } else {
                        triggerUserInTest();
                    }

                    eventListeners();
                    if (sendPreloadedEvent) sendCustomEvent('Preloaded variation ' + testSettings.variationLoaded);
                }
            }



            //////////////
            // DECIDING WHICH VARIATION USERS WILL SEE
            //////////////
            /**
                * Checks if a random number is within a percentage number
                * @param {Number} percentage - a number between 1 - 100
                * @return {Boolean} true if the random number is smaller than or equal to the percentage
                */
            function isWithinPercentage(percentage) {
                if (isNaN(percentage)) throw new Error('percentage is not a number');
                if (percentage > 100 || percentage < 1) throw new Error('percentage is not between 1 and 100');

                if (percentage == 100) return true;
                return (randomIntFromInterval(1, 100) <= percentage);
            }

            /**
                * Randomly selects a variation from all defined variation, taking weights into account
                * @param {Array} weights (optional) - e.g. [20, 40, 40]
                * @return {String} name of the variation (key in variations object
                */
            function selectRandomVariation(weights) {
                var keys = Object.keys(variations),
                    variation;

                if (typeof weights === 'undefined') weights = [];

                if (weights.length === 0) {
                    //Divide chance equally
                    variation = keys[randomIntFromInterval(0, keys.length - 1)];
                } else {
                    //Use weights for chance of selecting variation
                    if (weights.length !== keys.length) throw new Error('The number of weights should match the number of variations');

                    var rndValue = randomIntFromInterval(1, weights.reduce(add, 0)), //create a random int from 1 till the sum of all weights
                        sum = 0;

                    logDebug('[selectRandomVariation] rndValue = ', rndValue);

                    for (var i = 0; i < weights.length; i++) {		//sum the weights up, one by one, to check if the random number is within the range.
                        sum += weights[i];
                        logDebug('[selectRandomVariation] sum = ', sum);
                        if (rndValue <= sum) {
                            variation = keys[i];
                            break;
                        }
                    }
                }
                return variation;
            }
            /**
                * Returns a random number between a range
                * @param {Number} min - a whole number smaller than max
                * @param {Number} max - a whole number bigger than min
                * @return {Number} random number between min and max
                */
            function randomIntFromInterval(min, max) {
                return Math.floor(Math.random() * (max - min + 1) + min);
            }

            /**
                * Adds two numbers
                * @param {Number} a
                * @param {Number} b
                * @return {Number}
                */
            function add(a, b) {
                return a + b;
            }



            //////////////
            // SENDING (CUSTOM) EVENTS & TRIGGERS FOR EXTERNAL SERVICES (e.g. hotjar)
            //////////////
            /**
                * Send event to tag management system that puts user in the test. Send it only once per loading of the test.
                * @param {Boolean} calledInLoad - if the function is called from loadTest(). Used for firing userintest-event on next pageview.
                */
            function setUserInTest(calledInLoad) {
                if (isAssignedToTest) return;
                if (fireUserInTestNextPV && !calledInLoad) {
                    testSettings.fireUserInTestNextPV = true;
                    writeLocalStorage(testSettings);
                    return;
                }
                isAssignedToTest = true;

                //Send event or custom dimension that user is in test
                logDebug('[setUserInTest]User is assigned to test variation ' + testSettings.variationLoaded);

                var data = {
                    interaction_type: 'experiment_start',
                    test_name: test_id + ': ' + test_description + ' - ' + testSettings.variationLoaded + ' [LOADED]',
                    test_variant: test_id + '|' + testSettings.variationLoaded
                };
                sendToMyTagmanager(data);

            }
            //////////////
            // LOCALSTORAGE HELPERS
            //////////////
            /**
                * Tests if localStorage can be used to save data
                * @return {Boolean}
                */
            function LocalStorageSupported() {
                var mod = 'test';
                try {
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                } catch (err) {
                    return false;
                }
            }

            /**
                * Get data from the browser's localStorage
                * @param {String} customKey - alternative key for getting other data than settings for this test
                * @return {Object}
                */
            function readLocalStorage(customKey) {
                var key = customKey || localStorageKey;
                return (JSON.parse(localStorage.getItem(key)) || {});
            }

            /**
                * Write data to the browser's localStorage
                * @param {Object} settings - object to store in localStorage
                * @param {String} customKey - alternative key for getting other data than settings for this test
                */
            function writeLocalStorage(settings, customKey) {
                var key = customKey || localStorageKey,
                    json = JSON.stringify(settings);

                localStorage.setItem(key, json);
            }

            /**
                * Delete settings from localStorage
                * @param {String} customKey - alternative key for deleting other data than settings for this test
                */
            function deleteLocalStorage(customKey) {
                var key = customKey || localStorageKey;
                localStorage.removeItem(key);
            }
            if (autoStart) loadTest();

            return {
                start: loadTest,
                debugOn: function (variation) {
                    //WRITE CODE FOR LOADING THE VARIANT AND GIVING MORE OUTPUT
                    setDebug(true);
                    logDebug('[debugOn]Debug is on');

                    if (typeof variation !== 'undefined') {
                        logDebug('[debugOn]Force variation:', variation);
                        forceVariation(variation);
                    }
                },
                debugOff: function () {
                    logDebug('[debugOff]Turning debug off');
                    setDebug(false);
                },
                clearLocalStorage: function () {
                    deleteLocalStorage();
                }
            };
        })();
    } catch (err) {
        try {
            npl_cro_script_reportError(err);
        } catch (err) { }
    }

} //END if 'npl_cro_script' already exists
