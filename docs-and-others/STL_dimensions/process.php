<?php

    include("STLBox.php");

    $allowedExts = array("stl");
    $extension = strtolower( end(explode(".", $_FILES["file"]["name"])) );
		if(in_array($extension, $allowedExts))
      {
        if ($_FILES["file"]["error"] > 0)
          {
              echo "Error: " . $_FILES["file"]["error"] . "<br />";
          }
        else
          {
            echo "<H1>STLBox report</H1><BR><BR>";
            $fname = $_FILES["file"]["tmp_name"];
            $obj = new STLStats($fname);
            
            echo "<H2>";
			$unit = "cm";
			$bbox = $obj->getBBox($unit);
			echo "Bounding Box (unit: ".$unit.", rounded): \n<BR>X: " . round($bbox["length"]) . "\n<BR>Y: " . round($bbox["width"]) . "\n<BR>Z: " . round($bbox["height"])." <BR>\n";
			
			
			$bbv = $obj->getBBoxVolume($unit);
			echo "Bounding Box Volume (rounded): " . round($bbv) . " cubic " . $unit ." <BR>\n";
			echo "</H2>";

          }
      }
    else
      {
        echo "Bad file.";
      }

?>
