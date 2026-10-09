// web-gl-backend.js
import { BaseBackend, isWebGLSupported } from "./base-backend.jsx";
import {
  bloomFragment$1,
  blurFragment$1,
  buildProgram,
  clarityFragment$1,
  dehazeFragment$1,
  glamourFragment$1,
  grainFragment$1,
  kernelFragment$1,
  lutFragment$1,
  vignetteFragment$1,
} from "./grain-fragment.js";
import {
  blackPaletteFragment,
  blackVertexSource,
  brightnessFragment$1,
  contrastFragment$1,
  defaultLUTParams,
  exposureFragment$1,
  highlightsFragment$1,
  hueFragment$1,
  lutToFlat2D,
  passFragment$1,
  saturationFragment$1,
  shadowsFragment$1,
  temperatureFragment$1,
  tintFragment$1,
  vertexSource,
  vibranceFragment$1,
  whitesFragment$1,
} from "./highlights-fragment.js";
function createRenderTarget(gl, width, height) {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    throw new Error("Unable to create framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return {
    framebuffer,
    texture,
  };
}
const PALETTE_SIZE$1 = 256;
const clamp01$1 = (value) => Math.min(1, Math.max(0, value));
const cubicBezier$1 = (t2, p0, p1, p22, p3) => {
  const u4 = 1 - t2;
  return u4 * u4 * u4 * p0 + 3 * u4 * u4 * t2 * p1 + 3 * u4 * t2 * t2 * p22 + t2 * t2 * t2 * p3;
};
const buildCurvePalette$1 = (lowControl, highControl) => {
  const data2 = new Uint8Array(PALETTE_SIZE$1 * 3);
  for (let i2 = 0; i2 < PALETTE_SIZE$1; i2 += 1) {
    const t2 = i2 / (PALETTE_SIZE$1 - 1);
    const y4 = cubicBezier$1(t2, 0, lowControl, highControl, 1);
    const v2 = Math.round(clamp01$1(y4) * 255);
    const idx = i2 * 3;
    data2[idx] = v2;
    data2[idx + 1] = v2;
    data2[idx + 2] = v2;
  }
  return data2;
};
const buildBlackPalette$1 = (amount) => {
  const amt = Math.max(-100, Math.min(100, amount)) / 100;
  const strength = 0.35;
  const lowControl = clamp01$1(0.33 - amt * strength);
  const highControl = 0.66;
  return buildCurvePalette$1(lowControl, highControl);
};
const createPaletteTexture = (gl, data2) => {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create palette texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, PALETTE_SIZE$1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, data2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};
const updatePaletteTexture = (gl, texture, data2) => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PALETTE_SIZE$1, 1, gl.RGB, gl.UNSIGNED_BYTE, data2);
};
const buildContrastMatrix$1 = (amount) => {
  const t2 = Math.max(-100, Math.min(100, amount)) / 100;
  const scale2 = 1 + t2;
  const offset2 = 0.5 * (1 - scale2);
  return new Float32Array([
    scale2,
    0,
    0,
    0,
    offset2,
    0,
    scale2,
    0,
    0,
    offset2,
    0,
    0,
    scale2,
    0,
    offset2,
    0,
    0,
    0,
    1,
    0,
  ]);
};
const buildSaturationMatrix$1 = (amount) => {
  const t2 = Math.max(-100, Math.min(100, amount)) / 100;
  const scale2 = 1 + t2;
  const lumR = 0.299;
  const lumG = 0.587;
  const lumB = 0.114;
  const inv = 1 - scale2;
  return new Float32Array([
    inv * lumR + scale2,
    inv * lumG,
    inv * lumB,
    0,
    0,
    inv * lumR,
    inv * lumG + scale2,
    inv * lumB,
    0,
    0,
    inv * lumR,
    inv * lumG,
    inv * lumB + scale2,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ]);
};
const SHARPEN_KERNEL$1 = new Float32Array([0, -1, 0, -1, 5, -1, 0, -1, 0]);
const SMOOTH_KERNEL$1 = new Float32Array([
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
]);
export class WebGLBackend extends BaseBackend {
  gl = null;
  resources = null;
  lutParams = {
    ...defaultLUTParams,
  };
  lastBlacksPalette = Number.NaN;
  // ImageBitmap / raw pixel uploads ignore UNPACK_FLIP_Y_WEBGL. Correct only
  // the source-texture pass; framebuffer textures already have WebGL orientation.
  sourceNeedsFlipY = false;
  constructor(canvas, options = {}) {
    super(canvas, options);
  }
  getType() {
    return "webgl";
  }
  static isSupported() {
    return isWebGLSupported();
  }
  init() {
    this.gl = this.canvas.getContext("webgl", {
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!this.gl) {
      throw new Error("WebGL not supported");
    }
    this.initialized = true;
  }
  loadFromImage(image2) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    this.sourceNeedsFlipY = false;
    const width = image2.naturalWidth || image2.width;
    const height = image2.naturalHeight || image2.height;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  loadFromImageData(imageData) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    this.sourceNeedsFlipY = true;
    const { width, height, data: data2 } = imageData;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  loadFromVideo(video) {
    this.loadFromSource(video, video.videoWidth, video.videoHeight);
  }
  loadFromSource(source, width, height) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    if (!width || !height) {
      throw new Error("Source dimensions unavailable");
    }
    this.sourceNeedsFlipY = typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  updateFromVideo(video) {
    this.updateFromSource(video);
  }
  updateFromSource(source) {
    const gl = this.gl;
    if (!gl || !this.resources) {
      throw new Error("Backend not ready, call loadFromSource first");
    }
    this.sourceNeedsFlipY = typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.resources.sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  setLUT(lut) {
    const gl = this.gl;
    if (!gl || !this.resources) {
      throw new Error("Backend not initialized");
    }
    if (this.resources.lutTexture) {
      gl.deleteTexture(this.resources.lutTexture);
      this.resources.lutTexture = null;
      this.resources.lutSize = 0;
    }
    if (!lut) return;
    const flat = lutToFlat2D(lut);
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to create LUT texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      flat.width,
      flat.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      flat.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    this.resources.lutTexture = tex;
    this.resources.lutSize = lut.size;
  }
  setLUTParams(params) {
    this.lutParams = {
      ...params,
    };
  }
  render(settings) {
    if (!this.resources) {
      return;
    }
    this.drawFrame(this.resources, settings);
  }
  getImageData() {
    const gl = this.gl;
    if (gl) {
      const pixels = new Uint8ClampedArray(this.width * this.height * 4);
      gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return new ImageData(pixels, this.width, this.height);
    }
    throw new Error("Cannot get ImageData");
  }
  dispose() {
    this.disposeResources();
    if (this.gl) {
      const loseExt = this.gl.getExtension("WEBGL_lose_context");
      loseExt?.loseContext();
    }
    this.gl = null;
    this.initialized = false;
  }
  initResources(gl, width, height, sourceTexture) {
    const blackPalette = createPaletteTexture(gl, buildBlackPalette$1(0));
    this.lastBlacksPalette = 0;
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    if (!positionBuffer || !texCoordBuffer) {
      throw new Error("Failed to create buffers");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const vs2 = vertexSource;
    const blackVs = blackVertexSource;
    const programs = {
      pass: buildProgram(gl, vs2, passFragment$1, ["uTexture"]),
      vibrance: buildProgram(gl, vs2, vibranceFragment$1, ["uTexture", "uAmount"]),
      saturation: buildProgram(gl, vs2, saturationFragment$1, ["uTexture", "uMatrix[0]"]),
      temperature: buildProgram(gl, vs2, temperatureFragment$1, ["uTexture", "uAmount"]),
      tint: buildProgram(gl, vs2, tintFragment$1, ["uTexture", "uAmount"]),
      hue: buildProgram(gl, vs2, hueFragment$1, ["uTexture", "uRotation"]),
      brightness: buildProgram(gl, vs2, brightnessFragment$1, ["uTexture", "uAmount"]),
      exposure: buildProgram(gl, vs2, exposureFragment$1, ["uTexture", "uAmount"]),
      contrast: buildProgram(gl, vs2, contrastFragment$1, ["uTexture", "uMatrix[0]"]),
      blacks: buildProgram(gl, blackVs, blackPaletteFragment, [
        "uTexture",
        "uPaletteMap",
        "transform",
      ]),
      whites: buildProgram(gl, vs2, whitesFragment$1, ["uTexture", "uAmount"]),
      highlights: buildProgram(gl, vs2, highlightsFragment$1, ["uTexture", "uAmount"]),
      shadows: buildProgram(gl, vs2, shadowsFragment$1, ["uTexture", "uAmount"]),
      dehaze: buildProgram(gl, vs2, dehazeFragment$1, ["uTexture", "uAmount", "uSize"]),
      bloom: buildProgram(gl, vs2, bloomFragment$1, [
        "uTexture",
        "uAmount",
        "uTexel",
        "uThreshold",
      ]),
      glamour: buildProgram(gl, vs2, glamourFragment$1, ["uTexture", "uAmount", "uTexel"]),
      clarity: buildProgram(gl, vs2, clarityFragment$1, ["uTexture", "uAmount", "uTexel"]),
      sharpen: buildProgram(gl, vs2, kernelFragment$1, [
        "uTexture",
        "uTexel",
        "uKernel[0]",
        "uAmount",
      ]),
      smooth: buildProgram(gl, vs2, kernelFragment$1, [
        "uTexture",
        "uTexel",
        "uKernel[0]",
        "uAmount",
      ]),
      blur: buildProgram(gl, vs2, blurFragment$1, ["uTexture", "uSize"]),
      vignette: buildProgram(gl, vs2, vignetteFragment$1, ["uTexture", "uAmount", "uSize"]),
      grain: buildProgram(gl, vs2, grainFragment$1, [
        "uTexture",
        "uResolution",
        "uAmount",
        "uTime",
      ]),
      lut: buildProgram(gl, vs2, lutFragment$1, ["uTexture", "uLUT", "uLUTSize", "uIntensity"]),
    };
    const targets = [createRenderTarget(gl, width, height), createRenderTarget(gl, width, height)];
    this.resources = {
      gl,
      width,
      height,
      sourceTexture,
      blackPalette,
      lutTexture: null,
      lutSize: 0,
      quad: {
        positionBuffer,
        texCoordBuffer,
      },
      programs,
      targets,
    };
  }
  disposeResources() {
    if (!this.resources) return;
    const { gl, sourceTexture, blackPalette, lutTexture, quad, programs, targets } = this.resources;
    gl.deleteTexture(sourceTexture);
    gl.deleteTexture(blackPalette);
    if (lutTexture) gl.deleteTexture(lutTexture);
    gl.deleteBuffer(quad.positionBuffer);
    gl.deleteBuffer(quad.texCoordBuffer);
    targets.forEach((target) => {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    });
    Object.values(programs).forEach((programInfo) => {
      gl.deleteProgram(programInfo.program);
    });
    this.resources = null;
  }
  drawFrame(resources, settings) {
    const { gl, width, height, sourceTexture, blackPalette, quad, programs, targets } = resources;
    gl.viewport(0, 0, width, height);
    const texel = [1 / width, 1 / height];
    let inputTexture = sourceTexture;
    let pingIndex = 0;
    const bindAttributes = (program) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
      const positionAttrib =
        program.attribs.aPosition >= 0 ? program.attribs.aPosition : program.attribs.apos;
      if (positionAttrib >= 0) {
        gl.enableVertexAttribArray(positionAttrib);
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.texCoordBuffer);
      const texAttrib =
        program.attribs.aTexCoord >= 0 ? program.attribs.aTexCoord : program.attribs.auv;
      if (texAttrib >= 0) {
        gl.enableVertexAttribArray(texAttrib);
        gl.vertexAttribPointer(texAttrib, 2, gl.FLOAT, false, 0, 0);
      }
    };
    const drawPass = (program, setupUniforms, output) => {
      gl.useProgram(program.program);
      bindAttributes(program);
      gl.uniform1f(
        program.uniforms.uFlipY,
        this.sourceNeedsFlipY && inputTexture === sourceTexture ? 1 : 0,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      const textureLoc = program.uniforms.uTexture;
      if (textureLoc) gl.uniform1i(textureLoc, 0);
      setupUniforms();
      gl.bindFramebuffer(gl.FRAMEBUFFER, output ? output.framebuffer : null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      inputTexture = output ? output.texture : inputTexture;
    };
    const swapTarget = () => {
      const target = targets[pingIndex % 2];
      pingIndex += 1;
      return target;
    };
    const lut = resources.lutTexture;
    const lutSize = resources.lutSize;
    if (lut && lutSize > 0 && this.lutParams.intensity > 5e-3) {
      drawPass(
        programs.lut,
        () => {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, lut);
          gl.uniform1i(programs.lut.uniforms.uLUT, 1);
          gl.uniform1f(programs.lut.uniforms.uLUTSize, lutSize);
          gl.uniform1f(programs.lut.uniforms.uIntensity, this.lutParams.intensity);
          gl.activeTexture(gl.TEXTURE0);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.vibrance) > 0.5) {
      drawPass(
        programs.vibrance,
        () => {
          gl.uniform1f(programs.vibrance.uniforms.uAmount, settings.vibrance / 100);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.saturation) > 0.5) {
      drawPass(
        programs.saturation,
        () => {
          const matrix = buildSaturationMatrix$1(settings.saturation);
          gl.uniform1fv(programs.saturation.uniforms["uMatrix[0]"], matrix);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.temperature) > 0.5) {
      drawPass(
        programs.temperature,
        () => {
          gl.uniform1f(programs.temperature.uniforms.uAmount, settings.temperature / 500);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.tint) > 0.5) {
      drawPass(
        programs.tint,
        () => {
          gl.uniform1f(programs.tint.uniforms.uAmount, settings.tint / 500);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.hue) > 0.5) {
      drawPass(
        programs.hue,
        () => {
          gl.uniform1f(programs.hue.uniforms.uRotation, settings.hue / 200);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.brightness) > 0.5) {
      drawPass(
        programs.brightness,
        () => {
          gl.uniform1f(programs.brightness.uniforms.uAmount, settings.brightness / 200);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.exposure) > 0.5) {
      drawPass(
        programs.exposure,
        () => {
          gl.uniform1f(programs.exposure.uniforms.uAmount, settings.exposure / 100);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.contrast) > 0.5) {
      drawPass(
        programs.contrast,
        () => {
          const matrix = buildContrastMatrix$1(settings.contrast);
          gl.uniform1fv(programs.contrast.uniforms["uMatrix[0]"], matrix);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.blacks) > 0.5) {
      if (this.lastBlacksPalette !== settings.blacks) {
        updatePaletteTexture(gl, blackPalette, buildBlackPalette$1(settings.blacks));
        this.lastBlacksPalette = settings.blacks;
      }
      drawPass(
        programs.blacks,
        () => {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, blackPalette);
          gl.uniform1i(programs.blacks.uniforms.uPaletteMap, 1);
          gl.uniform4f(programs.blacks.uniforms.transform, 1, 1, 0, 0);
          gl.activeTexture(gl.TEXTURE0);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.whites) > 0.5) {
      drawPass(
        programs.whites,
        () => {
          gl.uniform1f(programs.whites.uniforms.uAmount, settings.whites / 400);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.highlights) > 0.5) {
      drawPass(
        programs.highlights,
        () => {
          gl.uniform1f(programs.highlights.uniforms.uAmount, settings.highlights / 100);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.shadows) > 0.5) {
      drawPass(
        programs.shadows,
        () => {
          gl.uniform1f(programs.shadows.uniforms.uAmount, settings.shadows / 100);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.dehaze) > 0.5) {
      drawPass(
        programs.dehaze,
        () => {
          gl.uniform1f(programs.dehaze.uniforms.uAmount, settings.dehaze / 100);
          gl.uniform2f(programs.dehaze.uniforms.uSize, width, height);
        },
        swapTarget(),
      );
    }
    if (settings.bloom > 0.5) {
      drawPass(
        programs.bloom,
        () => {
          gl.uniform1f(programs.bloom.uniforms.uAmount, settings.bloom / 100);
          gl.uniform2f(programs.bloom.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(programs.bloom.uniforms.uThreshold, 0.5);
        },
        swapTarget(),
      );
    }
    if (settings.glamour > 0.5) {
      drawPass(
        programs.glamour,
        () => {
          gl.uniform1f(programs.glamour.uniforms.uAmount, settings.glamour / 100);
          gl.uniform2f(programs.glamour.uniforms.uTexel, texel[0], texel[1]);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.clarity) > 0.5) {
      drawPass(
        programs.clarity,
        () => {
          gl.uniform1f(programs.clarity.uniforms.uAmount, settings.clarity / 100);
          gl.uniform2f(programs.clarity.uniforms.uTexel, texel[0], texel[1]);
        },
        swapTarget(),
      );
    }
    if (settings.sharpen > 0.5) {
      drawPass(
        programs.sharpen,
        () => {
          gl.uniform2f(programs.sharpen.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(programs.sharpen.uniforms.uAmount, settings.sharpen / 100);
          gl.uniform1fv(programs.sharpen.uniforms["uKernel[0]"], SHARPEN_KERNEL$1);
        },
        swapTarget(),
      );
    }
    if (settings.smooth > 0.5) {
      drawPass(
        programs.smooth,
        () => {
          gl.uniform2f(programs.smooth.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(programs.smooth.uniforms.uAmount, settings.smooth / 100);
          gl.uniform1fv(programs.smooth.uniforms["uKernel[0]"], SMOOTH_KERNEL$1);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.blur) > 0.5) {
      const blurRadius = settings.blur;
      drawPass(
        programs.blur,
        () => {
          gl.uniform2f(programs.blur.uniforms.uSize, blurRadius / width, 0);
        },
        swapTarget(),
      );
      drawPass(
        programs.blur,
        () => {
          gl.uniform2f(programs.blur.uniforms.uSize, 0, blurRadius / height);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.vignette) > 0.5) {
      drawPass(
        programs.vignette,
        () => {
          gl.uniform1f(programs.vignette.uniforms.uAmount, settings.vignette / 100);
          gl.uniform1f(programs.vignette.uniforms.uSize, 0.25);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.grain) > 0.5) {
      drawPass(
        programs.grain,
        () => {
          gl.uniform2f(programs.grain.uniforms.uResolution, width, height);
          gl.uniform1f(programs.grain.uniforms.uAmount, settings.grain / 800);
          gl.uniform1f(programs.grain.uniforms.uTime, 0);
        },
        swapTarget(),
      );
    }
    drawPass(programs.pass, () => {}, null);
  }
}
