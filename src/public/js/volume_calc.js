private function calcVolume(m:Mesh):Number
{
 var i:uint;
 var pointer:uint;
 var vtxIndx:uint;
 var iData:Vector.<uint> = m.geometry.subGeometries[0].indexData;
 var vData:Vector.<Number> = m.geometry.subGeometries[0].vertexData;
 var va:Vector3D = new Vector3D();
 var vb:Vector3D = new Vector3D();
 var vc:Vector3D = new Vector3D();
 var vol:Number = 0;
 
 for (i = 0; i < m.subMeshes[0].indexData.length / 3; i++)
 {
  pointer = i * 3;
  vtxIndx = iData[pointer] * 3;
  va.setTo(vData[vtxIndx], vData[vtxIndx + 1], vData[vtxIndx + 2]);
  vtxIndx = iData[pointer + 1] * 3;
  vb.setTo(vData[vtxIndx], vData[vtxIndx + 1], vData[vtxIndx + 2]);
  vtxIndx = iData[pointer + 2] * 3;
  vc.setTo(vData[vtxIndx], vData[vtxIndx + 1], vData[vtxIndx + 2])
  
  vol += (va.dotProduct(vb.crossProduct(vc)) / 6);
 }
 return vol;
} 