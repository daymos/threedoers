

/**
	* Node.js Login Boilerplate
	* More Info : http://bit.ly/LsODY8
	* Copyright (c) 2013 Stephen Braitsch
**/

var express = require('express');
var http = require('http');
var fs = require('fs');

var path = require('path')
var exec = require('child_process').exec;


viewer = require('jsc3d.min.js')
app = express();

target_path="ciao";


app.configure(function(){
	app.set('port', 3000);
	app.set('views', __dirname + '/app/server/views');
	app.set('view engine', 'jade');
	app.locals.pretty = true;
//	app.use(express.favicon());
//	app.use(express.logger('dev'));
	
	app.use(express.bodyParser({ keepExtensions: true, uploadDir: 'C:/imake_0.2/app/public/uploads/' }));
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'super-duper-secret-secret' }));
	app.use(express.methodOverride());
	//app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
	app.use(express.static(__dirname + '/app/public'));
	app.use(express.static(__dirname + '/app/public/uploads'));
	
	
	// Give Views/Layouts direct access to session data.
  app.use(function(req, res, next){
    res.locals.session = req.session;
	
    next();
  });
  app.use(app.router);
});



app.configure('development', function(){
	app.use(express.errorHandler());
});

app.post('/file-upload', function(req, res) {
    console.log(target_path);
	//set volume variable
	
    // get the temporary location of the file
    var tmp_path = req.files.thumbnail.path;
	var parts;
	vol=' ';
    // set where the file should actually exists - in this case it is in the "images" directory
    target_path = 'C:/imake_0.2/app/public/uploads/' + req.files.thumbnail.name;
    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, target_path, function(err) {
        if (err) throw err;
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function() {
            if (err) throw err;
            //res.send('File uploaded to: ' + target_path + ' - ' + req.files.thumbnail.size + ' bytes');
             console.log(target_path);
             exec('c:/gnu/wget/bin/wget -q -O - http://	127.0.0.1:8081/imake/live_preview.php'+ '?x='+ target_path , function (error, stdout, stderr) {console.log(stdout); vol = stdout; });			 
             setTimeout(function() {
			 parts = vol.split('Volume');
			 console.log(parts);
			 res.render('upload_1',{tg:req.files.thumbnail.name, vol:parts[1]});		
             },2000);
});
			
        });
    });
	


	

require('./app/server/router')(app);

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
})