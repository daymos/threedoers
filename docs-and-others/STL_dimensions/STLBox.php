<?php

class STLStats
{

    //Properties
    //----------

    //3D Object Properties
    private $bboxvolume;
   	private $bbox = array("length"=>0,"width"=>0,"height"=>0);


    //Infrastructure Properties
    private $triangles_data;
    private $b_binary;
	private $fstl_handle;
	private $fstl_path;
	private $flag = false;
	private $minx = INF;
	private $maxx = -1E100000000;	//replace by -INF if allowed by local PHP installation
	private $miny = INF;
	private $maxy = -1E100000000;	//replace by -INF if allowed by local PHP installation
	private $minz = INF;
	private $maxz = -1E100000000;	//replace by -INF if allowed by local PHP installation


    //Function defs
    //-------------


    //0. Contructor (PHP 5)
    /*
     * Initialises the STLStats class by passing the path to the binary .stl file.
     */
    function __construct($stl_file_path){
		$b = $this->isAscii($stl_file_path);
		if(! $b){
			echo "BINARY STL Suspected.\n<BR>";
			$this->b_binary = TRUE;
			$this->fstl_handle = fopen($stl_file_path,"rb");//Opens the STL file in binary mode for reading.
			$this->fstl_path = $stl_file_path;
		}else{
			echo "ASCII STL Suspected.\n<BR>";
		}

    }


    //1. Public Functions
    
   	/*
     * Returns an array for the bounding box i.e. length-width-height (range x-y-z) of the 3D object represented in the binary STL.
     * If $unit is "cm" then returns each value in cm, but If $unit is "inch" then in inches.
     */
    public function getBBox($unit){
    	
    	$unitmap = array("cm"=>array($this, "mmtocm"),"inch"=>array($this, "mmtoinch"));

    	if(! $this->flag){  //boolean flag to minimize repeated computation overhead

            $this->scanTriangles();
            $this->flag = true;
        }
    	
    	$this->bbox["length"] = $this->maxx - $this->minx;
		$this->bbox["width"] = $this->maxy - $this->miny;
		$this->bbox["height"] = $this->maxz - $this->minz;
		
    	return array_map($unitmap[$unit],$this->bbox);
    }
    
    
    /*
     * Returns the calculated Bounding Box Volume of the 3D object represented in the binary STL.
     * If $unit is "cm" then returns volume in cubic cm, but If $unit is "inch" then returns volume in cubic inches.
     */
    public function getBBoxVolume($unit){
        $bbox = $this->getBBox($unit);
        $bbv = array_product($bbox);
        return $bbv;
    }

        
    //2. Infrastructure Functions

    /*
     * Invokes the binary file reader to read the header,
     * serially reads all the normal vector and triangular co-ordinates,
     * calls the math function to calculate signed tetrahedral volumes for each trangle,
     * sums up these volumes to give the final volume of the 3D object represented in the .stl binary file.
     */
	private function scanTriangles(){
		$totalVolume = 0;
		//BINARY STL
		if($this->b_binary){
			$totbytes = filesize($this->fstl_path);
		    try{
			    $this->read_header();
			    $this->triangles_count = $this->read_triangles_count();
			    try{
	                while(ftell($this->fstl_handle) < $totbytes){
					   	 $this->read_triangle();
	                }
	          }
			    catch(Exception $e){
	                return $e;
	          }	
	        }
		    catch(Exception $e){
	            return $e;
	        }
	        fclose($this->fstl_handle);
		}
		//ASCII STL
		else{
			$k = 0;
			while(sizeof($this->triangles_data[4]) > 0){
				$this->read_triangle_ascii();
				$k += 1;
			}
			$this->triangles_count = $k;
		}
	}

	
   /*
     * Wrapper around PHP's unpack() function which decodes binary numerical data to float, int, etc types.
     * $sig specifies the type of data (i.e. integer, float, etc)
     * $l specifies number of bytes to read.
     */
    function my_unpack($sig, $l){
	    $s = fread($this->fstl_handle, $l);
        $stuff = unpack($sig, $s);
	    return $stuff;
    }

    /*
     * Appends to an array either a single var or the contents of another array.
     */
    function my_append($myarr, $mystuff){

        if(gettype($mystuff) == "array"){
            $myarr = array_merge($myarr, $mystuff);
        }else{
            $ctr = sizeof($myarr);
            $myarr[$ctr] = $mystuff;
        }
        return $myarr;
    }

    //3. Binary read functions

    /* 
     * Reads the binary header field in the STL file and offsets the file reader pointer to
     * enable reading the triangle-normal data.
     */
    function read_header(){
	    fseek($this->fstl_handle, ftell($this->fstl_handle)+80);
    }

    /* 
     * Reads the binary field in the STL file which specifies the total number of triangles
     * and returns that integer.
     */
    function read_triangles_count(){
        $length = $this->my_unpack("I",4);	    
        return $length[1];
    }

    /*
     * Reads a triangle data from the binary STL and updates min-max ranges over X,Y,Z..
     * A binary STL is a representation of a 3D object as a collection of triangles and their normal vectors.
     * Its specifiction can be found here:
     * http://en.wikipedia.org/wiki/STL_(file_format)%23Binary_STL
     * This function reads the bytes of the binary STL file, decodes the data to give float XYZ co-ordinates of the trinaglular
     * vertices and the normal vector for a triangle.
     */
    function read_triangle(){
    	$n  = $this->my_unpack("f3", 12);
		$p1 = $this->my_unpack("f3", 12);
		$p2 = $this->my_unpack("f3", 12);
	    $p3 = $this->my_unpack("f3", 12);
	    $b  = $this->my_unpack("v", 2);
	    
		$this->seekBounds($p1,$p2,$p3);
    }


	//4. ASCII read functions
	
	 /*
     * Reads a triangle data from the ascii STL and updates min-max ranges over X,Y,Z.
     */
    function read_triangle_ascii(){
		$p1[1] = floatval(array_pop($this->triangles_data[4]));
		$p1[2] = floatval(array_pop($this->triangles_data[5]));
		$p1[3] = floatval(array_pop($this->triangles_data[6]));

		$p2[1] = floatval(array_pop($this->triangles_data[7]));
		$p2[2] = floatval(array_pop($this->triangles_data[8]));
		$p2[3] = floatval(array_pop($this->triangles_data[9]));

		$p3[1] = floatval(array_pop($this->triangles_data[10]));
		$p3[2] = floatval(array_pop($this->triangles_data[11]));
		$p3[3] = floatval(array_pop($this->triangles_data[12]));

	   $this->seekBounds($p1,$p2,$p3);
    }


	/*
	 * Checks if the given file is an ASCII file.
	 * Populates the triangles_data array if TRUE.
	 */
	function isAscii($infilename){
		$b = FALSE;
		$facePattern =	'/facet\\s+normal\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+'
		 . 'outer\\s+loop\\s+'
		 . 'vertex\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+'
		 . 'vertex\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+'
		 . 'vertex\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+([-+]?\\b(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?\\b)\\s+'
		 . 'endloop\\s+' . 'endfacet/';
		 #echo $facePattern;
		$fdata = file_get_contents($infilename);
		preg_match_all($facePattern, $fdata, $matches);
		if(sizeof($matches[0]) > 0){
			$b = TRUE;
			$this->triangles_data = $matches;
      }
		return $b;
	}


    //5. Math Functions

    /*
     * Finds the value of min and max for X,Y,Z dimensions
     */
    function seekBounds($p1, $p2, $p3){
	    //x
	    $lminx = min($p1[1],$p2[1],$p3[1]);
	    $lmaxx = max($p1[1],$p2[1],$p3[1]);
	    
	    if($lminx < $this->minx){
	    	$this->minx = $lminx;
	    }
	    if($lmaxx > $this->maxx){
	    	$this->maxx = $lmaxx;
	    }

	    //y
	    $lminy = min($p1[2],$p2[2],$p3[2]);
	    $lmaxy = max($p1[2],$p2[2],$p3[2]);

	    if($lminy < $this->miny){
	    	$this->miny = $lminy;
	    }
	    if($lmaxy > $this->maxy){
	    	$this->maxy = $lmaxy;
	    }
	    
	    //z
	    $lminz = min($p1[3],$p2[3],$p3[3]);
	    $lmaxz = max($p1[3],$p2[3],$p3[3]);
	    
	    if($lminz < $this->minz){
	    	$this->minz = $lminz;
	    }
	    if($lmaxz > $this->maxz){
	    	$this->maxz = $lmaxz;
	    }
    }

    /*
     * Converts the volume specified in cubic cm to cubic inches.
     */
    function cm3toinch3($v){
	    return $v*0.0610237441;
    }
    
    /*
     * Converts the value specified in mm to cm
     */
    function mmtocm($v){
	    return $v*0.1;
    }
    
    /*
     * Converts the value specified in mm to inches
     */
    function mmtoinch($v){
	    return $v*0.0393701;
    }


    //Function defs END
    //-------------------------------------------------------------------------------------------------

}



//EXAMPLE//
//=======//

/*
 * Example of using the STLStats.php class:
 *  Create an instance of the STLStats class by passing the complete path of the .stl BINARY file as 
 *    Call the getBBox() function to calculate and return the Bounding Box (lenght-width-height) of the 3D object.
 *    Call the getBBoxVolume() function to calculate and return the Box Volume of the 3D object.
 */


/*
//$mystlpath = "models/40mmcube.stl";
$mystlpath = "models/nut-ascii.stl";


$obj = new STLStats($mystlpath);

$unit = "cm";
$bbox = $obj->getBBox($unit);
echo "Bounding Box (unit: ".$unit."): \n<BR>X: " . $bbox["length"] . "\n<BR>Y: " . $bbox["width"] . "\n<BR>Z: " . $bbox["height"]." <BR>\n";


$bbv = $obj->getBBoxVolume($unit);
echo "Bounding Box Volume: " . $bbv . " cubic " . $unit ." <BR>\n";
*/

?>
