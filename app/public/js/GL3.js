<script type="text/javascript">
    function onLoad(){
      initScene();
      function initScene() {
        var container = document.getElementById("visualizer");
		renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild( renderer.domElement );
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, container.offsetWidth / container.offsetHeight, 1, 1000 );
	camera.position.z = 10;
	scene.add( camera );
	var dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
dirLight.position.set(-3, 3, 7);
dirLight.position.normalize();
scene.add(dirLight);
 
var pointLight = new THREE.PointLight(0xFFFFFF, 5, 50);
pointLight.position.set(10, 20, -10);
scene.add(pointLight);
animate();
      }
	  
	  function animate() {
	  requestAnimationFrame( animate );
  render();
	  }
	  
	  function render() {
  renderer.render( scene, camera );
}
	  
	  
    }
</script>