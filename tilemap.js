class GLTilemap {
  constructor(pos, size, res, img, tilemapData, tilesList,
              shad = createShader(GLTilemap.vertShader, GLTilemap.fragShader),
              rdr = window, canvas = _renderer) {
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

      // Load tilemap texture
      this.loadTilemap();
      
      // Load tileset texture
      this.loadTiles(tilesList)

      this.shad.bindShader();
    }
  }
  
  loadTilemap() {
      let tilemapTex = new Texture.T2D(0, this.gl.R16UI, this.res[0], this.res[1], 1, 0, this.gl.RED_INTEGER, this.gl.UNSIGNED_SHORT, this.tilemapData, this.gl);
      tilemapTex.bind();
    
      this.tilemap = new GLPixy(this.pos, this.size, tilemapTex, 1, null, false, false, this.rdr, this.canvas);
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

    this.tiles = new GLPixy([0, 0], [0, 0], tilesTex, 1, null, false, false, this.rdr, this.canvas);
    this.tiles.setInterpolation(this.gl.NEAREST, this.gl.NEAREST);
  }
  
  display() {
    shader(this.shad);
    {
      const cachedSamplers = this.shad.samplers;
      this.shad.samplers = [];

      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.img.texture.glTex);
      this.shad.setUniform("atlas", 0);
      
      this.tilemap.img.activate();
      this.tilemap.img.bind();
      this.shad.setUniform("tilemap", 1);

      this.tiles.img.activate();
      this.tiles.img.bind();
      this.shad.setUniform("tiles", 2);

      this.rdr.rect(this.tilemap.off[0], this.tilemap.off[1], this.tilemap.size[0], this.tilemap.size[1]);

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
  uniform mediump usampler2D tilemap;
  uniform mediump usampler2D tiles;

  out vec4 fragColor;

  void main() {
    uint tile = texture(tilemap, vTexCoord).r;

    if (tile == uint(0)) {
      fragColor = vec4(0.0);
      return;
    }

    const float MAX_UNSIGNED_SHORT = pow(2.0, 16.0) - 1.0;
    uvec4 iCoords = texelFetch(tiles, ivec2(tile - uint(1), 0), 0);
    vec4 fCoords = vec4(iCoords) / MAX_UNSIGNED_SHORT;

    vec2 tileTexCoord = mod(vTexCoord * vec2(textureSize(tilemap, 0)), 1.0) + 1e-3;

    fragColor = texture(atlas, fCoords.rg + tileTexCoord * fCoords.ba);
  }
`;

// Overwrite p5.js setUniform function to work with different data formats
p5.Shader.prototype.setUniform = function (uniformName, data) {
  const uniform = this.uniforms[uniformName];
  if (!uniform) {
    return;
  }

  const gl = this._renderer.GL;

  if (uniform.isArray) {
    if (
      uniform._cachedData &&
      this._renderer._arraysEqual(uniform._cachedData, data)
    ) {
      return;
    } else {
      uniform._cachedData = data.slice(0);
    }
  } else if (uniform._cachedData && uniform._cachedData === data) {
    return;
  } else {
    if (Array.isArray(data)) {
      uniform._cachedData = data.slice(0);
    } else {
      uniform._cachedData = data;
    }
  }

  const location = uniform.location;

  this.useProgram();
  
  switch (uniform.type) {
    case gl.BOOL:
      if (data === true) {
        gl.uniform1i(location, 1);
      } else {
        gl.uniform1i(location, 0);
      }
      break;
    case gl.INT:
      if (uniform.size > 1) {
        data.length && gl.uniform1iv(location, data);
      } else {
        gl.uniform1i(location, data);
      }
      break;
    case gl.FLOAT:
      if (uniform.size > 1) {
        data.length && gl.uniform1fv(location, data);
      } else {
        gl.uniform1f(location, data);
      }
      break;
    case gl.FLOAT_MAT3:
      gl.uniformMatrix3fv(location, false, data);
      break;
    case gl.FLOAT_MAT4:
      gl.uniformMatrix4fv(location, false, data);
      break;
    case gl.FLOAT_VEC2:
      if (uniform.size > 1) {
        data.length && gl.uniform2fv(location, data);
      } else {
        gl.uniform2f(location, data[0], data[1]);
      }
      break;
    case gl.FLOAT_VEC3:
      if (uniform.size > 1) {
        data.length && gl.uniform3fv(location, data);
      } else {
        gl.uniform3f(location, data[0], data[1], data[2]);
      }
      break;
    case gl.FLOAT_VEC4:
      if (uniform.size > 1) {
        data.length && gl.uniform4fv(location, data);
      } else {
        gl.uniform4f(location, data[0], data[1], data[2], data[3]);
      }
      break;
    case gl.INT_VEC2:
      if (uniform.size > 1) {
        data.length && gl.uniform2iv(location, data);
      } else {
        gl.uniform2i(location, data[0], data[1]);
      }
      break;
    case gl.INT_VEC3:
      if (uniform.size > 1) {
        data.length && gl.uniform3iv(location, data);
      } else {
        gl.uniform3i(location, data[0], data[1], data[2]);
      }
      break;
    case gl.INT_VEC4:
      if (uniform.size > 1) {
        data.length && gl.uniform4iv(location, data);
      } else {
        gl.uniform4i(location, data[0], data[1], data[2], data[3]);
      }
      break;
    case gl.SAMPLER_2D:
      if (typeof data == 'number') {
        gl.activeTexture(gl.TEXTURE0 + data);
        gl.uniform1i(location, data);
      }
      else {
        gl.activeTexture(gl.TEXTURE0 + uniform.samplerIndex);
        uniform.texture = data instanceof p5.Texture ? data : this._renderer.getTexture(data);
        gl.uniform1i(location, uniform.samplerIndex);
        if (typeof uniform.texture === 'object' && uniform.texture.src.gifProperties) {
          uniform.texture.src._animateGif(this._renderer._pInst);
        }
      }
      break;
    case gl.UNSIGNED_INT_SAMPLER_2D:
      gl.activeTexture(gl.TEXTURE0 + data);
      gl.uniform1i(location, data);
      break;
    //@todo complete all types
  }
  return this;
}