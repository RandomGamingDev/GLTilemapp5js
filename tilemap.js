class GLTilemap {
  constructor(pos, size, res, img, tilemapData, tilesList,
              shad = createShader(GLTilemap.vertShader, GLTilemap.fragShader),
              fbo, rdr = window, canvas = _renderer) {
    { // Load parameters
      this.pos = pos;
      this.size = size;
      this.res = res;
      this.img = img;
      this.tilesList = tilesList;
      this.tilemapData = tilemapData;
      this.shad = shad;
      this.img.texture = canvas.getTexture(this.img);
      this.rdr = rdr;
      this.canvas = canvas;
      this.gl = canvas.drawingContext;
    }
    
    { // Load WebGL stuff
       // Chrome can't load the texture properly without this for some reason otherwise it complains about the type and format not being valid
      this.gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

      // Load shared FBO
      if (fbo == undefined)
        this.fbo = new Framebuffer(this.gl);
      else
        this.fbo = fbo;
      this.fbo.bind();

      // Load tilemap texture
      this.loadTilemap();
      
      // Load tileset texture
      this.loadTiles(tilesList)
      
      // Unbind the shared fbo
      this.fbo.unbind();

      this.shad.bindShader();
    }
  }
  
  loadTilemap() {
      let tilemapTex = new Texture.T2D(0, this.gl.R16UI, this.res[0], this.res[1], 1, 0, this.gl.RED_INTEGER, this.gl.UNSIGNED_SHORT, this.tilemapData, this.gl);
      tilemapTex.bind();
    
      this.tilemap = new GLPixy(this.pos, this.size, tilemapTex, 1, this.fbo, true, true, this.rdr, this.canvas);
      this.tilemap.setInterpolation(this.gl.NEAREST, this.gl.NEAREST);
  }

  loadTiles(tilesList) {
    const coordsPerTile = 4;
    let tilesData = new Uint16Array(tilesList.length * coordsPerTile);
    for (const i in tilesList) {
      const tile = tilesList[i];
      for (let j = 0; j < tile.length; j++) {
        const coord = tile[j];

        const MAX_UNSIGNED_SHORT = 2 ** 16 - 1;
        const uintCoord = Math.floor(coord * MAX_UNSIGNED_SHORT);
        
        tilesData[i * coordsPerTile + j] = uintCoord;
      }
    }

    let tilesTex = new Texture.T2D(0, this.gl.RGBA16UI, tilesList.length, 1, 2, 0, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_SHORT, tilesData, this.gl);
    tilesTex.bind();

    this.tiles = new GLPixy([0, 0], [0, 0], tilesTex, 1, this.fbo, true, true, this.rdr, this.canvas);
    this.tiles.setInterpolation(this.gl.NEAREST, this.gl.NEAREST);
  }
  
  display() {
    shader(this.shad);
    {
      const cachedSamplers = this.shad.samplers;
      this.shad.samplers = [];

      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.img.texture.glTex);
      this.gl.uniform1i(this.gl.getUniformLocation(this.shad._glProgram, "atlas"), 0);

      this.tilemap.img.activate();
      this.tilemap.img.bind();
      this.tilemap.img.setUniform(this.shad._glProgram, "uSampler");

      this.tiles.img.activate();
      this.tiles.img.bind();
      this.tiles.img.setUniform(this.shad._glProgram, "tiles");

      this.tilemap.rdr.rect(this.tilemap.off[0], this.tilemap.off[1], this.tilemap.size[0], this.tilemap.size[1]);

      this.tilemap.img.unbind();

      this.shad.samplers = cachedSamplers;
    }
    resetShader();
  }
}

GLTilemap.vertShader = `#version 300 es
  in vec3 aPosition;
  in vec2 aTexCoord;

  out vec2 vTexCoord;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    vec4 positionVec4 = vec4(aPosition, 1.0);
    gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
    vTexCoord = aTexCoord;
  }
`;
GLTilemap.fragShader = `#version 300 es
  #ifdef GL_ES
  precision mediump float;
  precision mediump int;
  #endif

  in vec2 vTexCoord;

  uniform sampler2D atlas;
  uniform mediump usampler2D uSampler;
  uniform mediump usampler2D tiles;

  out vec4 fragColor;

  void main() {
    uint tile = texture(uSampler, vTexCoord).r;

    if (tile == uint(0)) {
      fragColor = vec4(0.0);
      return;
    }

    const uint MAX_UNSIGNED_SHORT = uint(pow(2.0, 16.0)) - uint(1);
    uvec4 iCoords = texelFetch(tiles, ivec2(tile - uint(1), 0), 0);
    vec4 fCoords = vec4(iCoords) / float(MAX_UNSIGNED_SHORT);

    vec2 tilemapSize = vec2(textureSize(uSampler, 0));
    vec2 tileSize = 1.0 / tilemapSize;
    vec2 tileTexCoord = mod(vTexCoord, tileSize) * tilemapSize;
    tileTexCoord.y = 1.0 - tileTexCoord.y;

    fragColor = texture(atlas, fCoords.rg + tileTexCoord * fCoords.ba);
  }
`;
