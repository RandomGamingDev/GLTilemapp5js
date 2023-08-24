let gl;

let img;
let tilemap;

function preload() {
  img = loadImage("https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/2324px-Banana-Single.jpg");
}

function setup() {
  createCanvas(400, 400, WEBGL);
  pixelDensity(1);
  noStroke();
  gl = drawingContext;
  
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
  tilemap = new GLTilemap([-200, -200], [400, 400], [3, 3], img, new Uint16Array([0, 1, 2, 2, 1, 0, 0, 1, 2]), [[0, 0, 1, 1], [0.5, 0.5, 0.5, 0.5]]);
}

function draw() {
  background(220);
  tilemap.display();
}