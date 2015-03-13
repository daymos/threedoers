Modernizr.load([
	{
	// The test: does the browser understand Media Queries?
		test : Modernizr.mq("only all"),
    // If not, load the respond.js file
		nope : '/js/vendor/respond.src.js'
	}

	//and then load enquire
//	"/js/site.js"
]);