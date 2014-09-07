README.TXT
-----------

Introduction
------------
STL format is popularly used for representing 3D object information for 3D printing applications. It is useful to know the Bounding Box (BBox) and the BBox Volume in some cases. This determines if the 3D object is printable on the your printer bed and the size of packing box required for shipping.

The math is wrapped inside an easy to use PHP class that exposes getter functions (i.e. getBBoxVolume, getBBoxVolume) to calculate these properties. This class will be useful to a website which deals in web based 3D printing applications.

The PHP code has been commented extensively. Example usage has been given at the end of this documentation as well as at the end of the class and should be commented out when the class is deployed on your server.


Install Notes
-------------
Follow these steps to start using this PHP class in your applications:

1. Extract the contents of the STLBox.zip folder.

2. Copy the STLBox.php file to your webserver folder such that your application can resolve the path and find this class file.

3. A sample binary STL file - 40mmcube.stl has been provided to help you test the class right away. Copy this file such that the PHP class can find this path. Pass this path as an argument when you instantiate the STLStats class. For example: if the 40mmcube.stl file is in the directory "/var/www/mystlfiles/" then call this class from within your code like this:


    $mypath = "/var/www/mystlfiles/40mmcube.stl";
    $obj = new STLStats($mypath);
    $unit = "cm";
    $bbox = $obj->getBBox($unit);
    echo "Bounding Box (unit: ".$unit."): <BR>X: " . $bbox["length"] . "<BR>Y: " . $bbox["width"] . "<BR>Z: " . $bbox["height"]." <BR>";

    $bbv = $obj->getBBoxVolume($unit);
    echo "Bounding Box Volume: " . $bbv . " cubic " . $unit ." <BR>\n";

4. A sample ASCII STL file - nut-ascii.stl has also been provided to help you test the class right away.

Note:
=====
The function assumes that the STL file represents 3D object in a ready-to-print orientation i.e. this class does not axis-align the 3D object. Therefore, the resulting bounding box may not necessarily be a "minimum volume" box.


Thats all!
