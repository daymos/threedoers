#target photoshop
try{
var takefolder = Folder.  selectDialog("Enter folder to  take filles:");
var imagelist = takefolder.getFiles(/\.(jpg|JPG|JPEG|jpeg|png|PNG)$/i);
var allocationfolder = Folder.selectDialog("Enter folder to allocate files");
//alert(allocationfolder);

for(i=0;i<imagelist.length;i++) {
   var file = imagelist[i];
   var namefile = file.name; 
   var namefileblur = namefile.replace(/\.(jpg|JPG|JPEG|jpeg|png|PNG)$/i,"_low.jpg");
  
  
   var pathnewfile = allocationfolder + "/" + namefileblur;    
   var docRef = app.open(file);
   var options = new ExportOptionsSaveForWeb();
   
   options.blur = 2;
   options.quality =0;
   options.format = SaveDocumentType.JPEG;
   docRef.exportDocument(new File (pathnewfile), ExportType.SAVEFORWEB,options);
   app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);     
    }
alert("Ehhh non cazzeggiare più, ho finito");
}
catch(error){
      alert("Cosa hai fatto, l'operazione non è andata a buon fine");
}
    

