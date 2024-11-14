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
  tilemap = new GLTilemap(
    [-width / 2, -height / 2], // pos: position of the tilemap from the top left
    [width, height], // size: size of the tilemap extending extending from the top left
    [3, 3], // res: of the tilemap in tiles
    img, // img: the texture atlas image containing all of the textures to be used for the tilemap
    new Uint16Array([ // tilemapData: The tiles stored via ints referencing their tiles from tilesList (goes from left to right then top to bottom)
      0, 1, 2,
      2, 1, 0,
      0, 1, 2
    ]),
    [ // tilesList: List of tiles based on their positions in the texture atlas where top left is (0, 0), and bottom right is (1, 1)
      [0, 0, 1, 1], // The first 2 numbers are the coordinates of the top left and the latter 2 numbers are the size of the tile's texture within the texture atlas
      [0.5, 0.5, 0.5, 0.5]
    ]
  );
}

function draw() {
  background(220);

  tilemap.display(); // Display the tilemap in a single draw call and with autmoatic tile occlusion :D
}