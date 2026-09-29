// DeepSeek-Pet drawn with WebGL on a bendable mesh rather than as a flat
// picture, so that parts of her move on their own: she breathes and blinks,
// her head tilts, she leans from the hips with her feet planted, her feet
// step when she walks, her tail wags, a hand waves, and her hair, skirt and
// tail swing after her when she moves. motion.js works out the pose each
// frame; without WebGL2 pet.js keeps showing the plain picture.
//
// Positions are in the sprite's own pixels (908x1337). The body landmarks
// below were measured on the art and hold for every sprite, as they are all
// drawn to one height and stand on the same spot; eyes, a waving hand and a
// bitten coin differ between sprites, so those come with each sprite (see
// `eyes`, `hand` and `bite` in art/states.mjs).
'use strict';

const Puppet = (() => {
  const TEX = [908, 1337];
  const PAD = [0.07, 0.04]; // room around her box for parts that swing out
  const GRID = [34, 50]; // mesh columns and rows

  const VERTEX = `#version 300 es
precision highp float;
in vec2 a_uv;
uniform vec2 u_tex;
uniform vec2 u_pad;
uniform float u_mirror;  // -1: facing right (drawn mirrored)
uniform float u_breath;  // -1 (out) .. 1 (in)
uniform vec2 u_hair;     // how far the ends of her hair swing, px
uniform vec2 u_skirt;    // ...and her skirt hem and tail
uniform float u_ahoge;   // the strand of hair on top of her head bobbing, rad
uniform float u_head;    // head tilt about the neck, rad
uniform float u_bend;    // upper body lean about the hips, rad
uniform float u_tail;    // tail wag about where it comes out, rad
uniform vec4 u_step;     // walking: phase, how far the feet swing, how high they lift, how high she rises, px
uniform vec4 u_part;     // a part moving on its own (a hand, a coin): centre, radius...
uniform vec4 u_move;     // ...turned about (x, y) by u_part.w and shifted by (z, w)
out vec2 v_uv;

float ramp(float v, float a, float b) { return smoothstep(a, b, v); }
vec2 turn(vec2 p, vec2 c, float a) {
  vec2 d = p - c;
  float s = sin(a), k = cos(a);
  return c + vec2(d.x * k - d.y * s, d.x * s + d.y * k);
}

void main() {
  vec2 p0 = a_uv * u_tex;
  vec2 p = p0;
  float x = p0.x, y = p0.y;

  // regions: soft 0..1 weights on the picture
  float tail = max(ramp(y, 996.0, 1030.0) * ramp(x, 548.0, 585.0), ramp(x, 772.0, 805.0) * ramp(y, 700.0, 745.0));
  float legs = ramp(y, 985.0, 1075.0) * (1.0 - tail);  // below the skirt
  float right = ramp(x, 418.0, 440.0);                  // the leg on the right of the picture
  float feet = ramp(y, 1060.0, 1185.0);                 // the feet, and the shins bending to them
  float part = u_part.z > 0.0 ? 1.0 - ramp(length(p0 - u_part.xy), 0.55 * u_part.z, u_part.z) : 0.0;
  float head = (1.0 - ramp(y, 335.0, 425.0)) * (1.0 - part);
  float upper = (1.0 - ramp(y, 600.0, 960.0)) * (1.0 - tail); // above the hips
  float sides = max(1.0 - ramp(x, 160.0, 345.0), ramp(x, 600.0, 790.0));
  float hair = sides * ramp(y, 280.0, 620.0) * (1.0 - ramp(y, 680.0, 780.0)) * (1.0 - tail) * (1.0 - part);
  float skirt = ramp(y, 760.0, 990.0) * (1.0 - legs) * (1.0 - tail) * (0.55 + 0.45 * min(1.0, abs(x - 455.0) / 320.0));
  vec2 root = vec2(398.0, 58.0);                        // of the strand on her head
  float ahoge = ramp(50.0 + 0.62 * (400.0 - x) - y, 0.0, 14.0) * ramp(length(p0 - root), 12.0, 90.0);

  // walking: her feet take turns to lift and swing forward (to the left, as
  // drawn), then push back along the floor, and she rises over the standing leg
  float c = cos(u_step.x), s = sin(u_step.x);
  float l = legs * feet * (1.0 - right), r = legs * feet * right;
  p.x += (l - r) * u_step.y * c;
  p.y -= (l * max(0.0, s) + r * max(0.0, -s)) * u_step.z;

  // a hand waving or a coin being bitten
  p = turn(p, u_move.xy, u_part.w * part) + part * u_move.zw;

  // breathing: the chest swells, the shoulders and head rise and fall
  vec2 chest = vec2(465.0, 520.0);
  float near = clamp(1.0 - length(p0 - chest) / 300.0, 0.0, 1.0);
  p = chest + (p - chest) * (1.0 + 0.012 * u_breath * near * near);
  p.y -= (3.0 + 3.0 * u_breath) * (1.0 - ramp(y, 430.0, 760.0));

  p = turn(p, root, u_ahoge * ahoge);
  p = turn(p, vec2(465.0, 398.0), u_head * head);
  p += u_hair * hair + u_skirt * max(skirt, 0.8 * tail);
  p = turn(p, vec2(465.0, 900.0), u_bend * upper);
  p = turn(p, vec2(600.0, 1050.0), u_tail * tail);
  p.y -= u_step.w * (1.0 - legs);

  if (u_mirror < 0.0) p.x = u_tex.x - p.x;
  vec2 q = (p / u_tex + u_pad) / (1.0 + 2.0 * u_pad);
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
  v_uv = a_uv;
}`;

  // Blinking: each upper lid comes down over the eye, bringing its lashes
  // with it, until they meet the lower lid: whatever is just above the
  // lashes (skin, a strand of hair) stretches down as the lid, and the eye
  // squeezes under them. An eye is (left, right, upper lash line, lower lid)
  // in px, at their highest and lowest: both lids curve.
  const FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
uniform vec2 u_tex;
uniform vec4 u_eye1;
uniform vec4 u_eye2;
uniform float u_blink;   // 0 open .. 1 shut
out vec4 color;

vec2 lid(vec2 p, vec4 e, float shut) {
  float u = (p.x - e.x) / (e.y - e.x);
  if (shut <= 0.0 || u <= 0.0 || u >= 1.0) return p;
  float h = e.w - e.z;
  float arch = sin(3.14159 * u);
  float top = e.z + 0.3 * h * (1.0 - arch);      // the upper lash line, lower towards the corners
  float bottom = e.w - 0.25 * h * (1.0 - arch);  // the lower lid, higher towards the corners
  shut *= smoothstep(0.0, 0.08, u) * smoothstep(0.0, 0.08, 1.0 - u);
  float drop = shut * max(0.0, bottom - top - 4.0);  // how far the lashes have come down
  float a = top - 32.0, b = top - 20.0, c = top + 3.0;  // above the lashes; the lashes; the eye
  if (p.y <= a || p.y >= bottom || drop <= 0.0) return p;
  if (p.y < b + drop) return vec2(p.x, a + (p.y - a) * (b - a) / (b + drop - a));
  if (p.y < c + drop) return vec2(p.x, p.y - drop);
  return vec2(p.x, c + (p.y - c - drop) * (bottom - c) / max(bottom - c - drop, 0.5));
}

void main() {
  vec2 p = v_uv * u_tex;
  p = lid(lid(p, u_eye1, u_blink), u_eye2, u_blink);
  // mipmaps chosen as for the picture as drawn, not for the squeezed bits
  color = textureGrad(u_img, p / u_tex, dFdx(v_uv), dFdy(v_uv));
}`;

  const UNIFORMS = ['u_tex', 'u_pad', 'u_mirror', 'u_breath', 'u_hair', 'u_skirt', 'u_ahoge', 'u_head', 'u_bend', 'u_tail',
    'u_step', 'u_part', 'u_move', 'u_img', 'u_eye1', 'u_eye2', 'u_blink'];

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  // A puppet drawing into `canvas`, or null if there is no WebGL2.
  function create(canvas) {
    // her edges come from the pictures' own transparency, so no antialiasing;
    // and a desktop pet has no business waking a laptop's second graphics card
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (e) {
      console.error('puppet:', e.message);
      return null;
    }
    gl.useProgram(program);
    const u = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));

    // the mesh: a grid over the picture
    const [cols, rows] = GRID;
    const uv = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) uv.push(i / cols, j / rows);
    const index = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i;
        index.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
      }
    }
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

    gl.uniform2f(u.u_tex, TEX[0], TEX[1]);
    gl.uniform2f(u.u_pad, PAD[0], PAD[1]);
    gl.uniform1i(u.u_img, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    // The sprites, each copied no bigger than she is drawn, which is much
    // smaller than the pictures unless she is big on a sharp screen.
    const textures = new Map();
    let textureHeight = 0;
    let shown = null; // [key, image]
    let rig = {};

    function upload(image) {
      const h = Math.min(image.naturalHeight, textureHeight);
      let source = image;
      if (h < image.naturalHeight) {
        source = document.createElement('canvas');
        source.width = Math.round((image.naturalWidth * h) / image.naturalHeight);
        source.height = h;
        const ctx = source.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, source.width, source.height);
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }

    // How tall she is drawn, in device pixels.
    function drawnHeight() {
      const h = canvas.clientHeight * (window.devicePixelRatio || 1);
      return Math.max(64, Math.ceil(h / (1 + 2 * PAD[1]) / 64) * 64);
    }

    // Show a sprite (an <img> that has loaded) with its rig: { eyes, hand, bite }.
    function show(key, image, spriteRig = {}) {
      if (!textureHeight) textureHeight = drawnHeight();
      if (!textures.has(key)) textures.set(key, upload(image));
      gl.bindTexture(gl.TEXTURE_2D, textures.get(key));
      shown = [key, image];
      rig = spriteRig;
    }

    // Draw her in `pose` (see motion.js), at the canvas's size on screen.
    function draw(pose) {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) [canvas.width, canvas.height] = [w, h];
      // resized, or moved to a screen of another sharpness: copy the sprites again
      const needed = drawnHeight();
      if (needed !== textureHeight) {
        textureHeight = needed;
        for (const texture of textures.values()) gl.deleteTexture(texture);
        textures.clear();
        if (shown) show(shown[0], shown[1], rig);
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.u_mirror, pose.mirror ? -1 : 1);
      gl.uniform1f(u.u_breath, pose.breath);
      gl.uniform2f(u.u_hair, pose.hair[0], pose.hair[1]);
      gl.uniform2f(u.u_skirt, pose.skirt[0], pose.skirt[1]);
      gl.uniform1f(u.u_ahoge, pose.ahoge);
      gl.uniform1f(u.u_head, pose.head);
      gl.uniform1f(u.u_bend, pose.bend);
      gl.uniform1f(u.u_tail, pose.tail);
      gl.uniform4f(u.u_step, ...pose.step);
      // a hand [x, y, radius, wrist x, wrist y] waves; a coin [x, y, radius] is bitten
      if (rig.hand) {
        const [x, y, r, px, py] = rig.hand;
        gl.uniform4f(u.u_part, x, y, r, pose.wave);
        gl.uniform4f(u.u_move, px, py, 0, 0);
      } else if (rig.bite) {
        const [x, y, r] = rig.bite;
        gl.uniform4f(u.u_part, x, y, r, 0);
        gl.uniform4f(u.u_move, x, y, 0, -pose.bite);
      } else {
        gl.uniform4f(u.u_part, 0, 0, 0, 0);
        gl.uniform4f(u.u_move, 0, 0, 0, 0);
      }
      const none = [0, 0, 0, 0];
      gl.uniform4fv(u.u_eye1, rig.eyes?.[0] || none);
      gl.uniform4fv(u.u_eye2, rig.eyes?.[1] || none);
      gl.uniform1f(u.u_blink, pose.blink);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    }

    return { show, draw, lost: () => gl.isContextLost() };
  }

  return { create, PAD };
})();
