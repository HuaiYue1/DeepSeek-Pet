// DeepSeek-Pet drawn with WebGL on a bendable mesh rather than as a flat
// picture, so that parts of her move on their own: she breathes and blinks,
// her head tilts, she leans from the hips with her feet planted, her feet
// step when she walks, her tail wags, a hand waves, and her hair, skirt and
// tail swing after her when she moves. motion.js works out the pose each
// frame and the mesh is bent to it here, in plain JS, which also tells
// pet.js which bit of her the mouse is over. Without WebGL2 pet.js keeps
// showing the plain picture.
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
  const CHEST = [465, 520];
  const NECK = [465, 398];
  const HIPS = [465, 900];
  const TAIL_ROOT = [600, 1050]; // where her tail comes out from under the skirt
  const AHOGE_ROOT = [398, 58]; // of the strand of hair on her head
  const NO_RIG = {};
  // standing still, as drawn
  const REST = { mirror: false, breath: 0, hair: [0, 0], skirt: [0, 0], ahoge: 0, head: 0, bend: 0, tail: 0, step: [0, 0, 0, 0], wave: 0, bite: 0, blink: 0 };

  const ramp = (v, a, b) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // The mesh is plain maths, so that it can be tested, and so that the
  // mouse can be told which bit of her it is over, however she is bent.

  // A grid over the picture, and how much each of its points belongs to
  // each part of her: soft 0..1 weights.
  function makeMesh() {
    const [cols, rows] = GRID;
    const n = (cols + 1) * (rows + 1);
    const uv = new Float32Array(2 * n);
    const w = {};
    for (const k of ['tail', 'legs', 'right', 'feet', 'head', 'upper', 'hair', 'skirt', 'ahoge', 'chest', 'shoulders']) w[k] = new Float32Array(n);
    for (let j = 0, v = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++, v++) {
        uv[2 * v] = i / cols;
        uv[2 * v + 1] = j / rows;
        const x = (i / cols) * TEX[0];
        const y = (j / rows) * TEX[1];
        const tail = Math.max(ramp(y, 996, 1030) * ramp(x, 548, 585), ramp(x, 772, 805) * ramp(y, 700, 745));
        const legs = ramp(y, 985, 1075) * (1 - tail); // below the skirt
        const sides = Math.max(1 - ramp(x, 160, 345), ramp(x, 600, 790));
        const near = Math.max(0, 1 - Math.hypot(x - CHEST[0], y - CHEST[1]) / 300);
        w.tail[v] = tail;
        w.legs[v] = legs;
        w.right[v] = ramp(x, 418, 440); // the leg on the right of the picture
        w.feet[v] = ramp(y, 1060, 1185); // the feet, and the shins bending to them
        w.head[v] = 1 - ramp(y, 335, 425);
        w.upper[v] = (1 - ramp(y, 600, 960)) * (1 - tail); // above the hips
        w.hair[v] = sides * ramp(y, 280, 620) * (1 - ramp(y, 680, 780)) * (1 - tail);
        w.skirt[v] = Math.max(ramp(y, 760, 990) * (1 - legs) * (1 - tail) * (0.55 + 0.45 * Math.min(1, Math.abs(x - 455) / 320)), 0.8 * tail);
        w.ahoge[v] = ramp(50 + 0.62 * (400 - x) - y, 0, 14) * ramp(Math.hypot(x - AHOGE_ROOT[0], y - AHOGE_ROOT[1]), 12, 90);
        w.chest[v] = near * near;
        w.shoulders[v] = 1 - ramp(y, 430, 760);
      }
    }
    const index = new Uint16Array(6 * cols * rows);
    for (let j = 0, k = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++, k += 6) {
        const a = j * (cols + 1) + i;
        index.set([a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1], k);
      }
    }
    // `at`: where each point is drawn, as a fraction of the canvas (see bend)
    const mesh = { n, uv, w, index, part: new Float32Array(n), rig: null, at: new Float32Array(2 * n) };
    setRig(mesh, NO_RIG);
    return mesh;
  }

  // The sprite's parts that move on their own (see RIGS in art/states.mjs):
  // a raised hand [x, y, radius, elbow x, elbow y], or a coin [x, y, radius].
  function setRig(mesh, rig = NO_RIG) {
    if (rig === mesh.rig) return;
    mesh.rig = rig;
    const [x, y, r] = rig.hand || rig.bite || [0, 0, 0];
    for (let v = 0; v < mesh.n; v++) {
      const d = Math.hypot(mesh.uv[2 * v] * TEX[0] - x, mesh.uv[2 * v + 1] * TEX[1] - y);
      mesh.part[v] = r > 0 ? 1 - ramp(d, 0.55 * r, r) : 0;
    }
  }

  const pt = [0, 0];
  function turn(cx, cy, a) {
    if (!a) return;
    const dx = pt[0] - cx;
    const dy = pt[1] - cy;
    const s = Math.sin(a);
    const k = Math.cos(a);
    pt[0] = cx + dx * k - dy * s;
    pt[1] = cy + dx * s + dy * k;
  }

  // Bend the mesh into `pose` (see motion.js).
  function bend(mesh, pose) {
    const { w, part, rig, uv, at } = mesh;
    const [phase, sweep, lift, bob] = pose.step;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const [, , , elbowX, elbowY] = rig.hand || [];
    for (let v = 0; v < mesh.n; v++) {
      pt[0] = uv[2 * v] * TEX[0];
      pt[1] = uv[2 * v + 1] * TEX[1];
      // walking: her feet take turns to lift and swing forward (to the left,
      // as drawn), then push back along the floor
      const l = w.legs[v] * w.feet[v] * (1 - w.right[v]);
      const r = w.legs[v] * w.feet[v] * w.right[v];
      pt[0] += (l - r) * sweep * c;
      pt[1] -= (l * Math.max(0, s) + r * Math.max(0, -s)) * lift;
      // a hand waving about the elbow, or a coin being bitten
      const p = part[v];
      if (p && rig.hand) turn(elbowX, elbowY, pose.wave * p);
      if (p && rig.bite) pt[1] -= pose.bite * p;
      // breathing: the chest swells, the shoulders and head rise and fall
      const swell = 1 + 0.012 * pose.breath * w.chest[v];
      pt[0] = CHEST[0] + (pt[0] - CHEST[0]) * swell;
      pt[1] = CHEST[1] + (pt[1] - CHEST[1]) * swell - 3 * pose.breath * w.shoulders[v];
      turn(AHOGE_ROOT[0], AHOGE_ROOT[1], pose.ahoge * w.ahoge[v]);
      turn(NECK[0], NECK[1], pose.head * w.head[v] * (1 - p));
      // her hair, skirt hem and tail trailing
      const hair = w.hair[v] * (1 - p);
      pt[0] += pose.hair[0] * hair + pose.skirt[0] * w.skirt[v];
      pt[1] += pose.hair[1] * hair + pose.skirt[1] * w.skirt[v];
      turn(HIPS[0], HIPS[1], pose.bend * w.upper[v]);
      turn(TAIL_ROOT[0], TAIL_ROOT[1], pose.tail * w.tail[v]);
      // rising over the standing leg
      pt[1] -= bob * (1 - w.legs[v]);
      const x = pose.mirror ? TEX[0] - pt[0] : pt[0];
      at[2 * v] = (x / TEX[0] + PAD[0]) / (1 + 2 * PAD[0]);
      at[2 * v + 1] = (pt[1] / TEX[1] + PAD[1]) / (1 + 2 * PAD[1]);
    }
  }

  // Which point of the picture (as fractions of it) is drawn at (x, y) on the
  // canvas (as fractions of it), as the mesh was last bent; the one in front
  // where parts overlap, or null if none is.
  function pick(mesh, x, y) {
    const { at, uv, index } = mesh;
    for (let k = index.length - 3; k >= 0; k -= 3) {
      const a = 2 * index[k];
      const b = 2 * index[k + 1];
      const c = 2 * index[k + 2];
      const [ax, ay, bx, by, cx, cy] = [at[a], at[a + 1], at[b], at[b + 1], at[c], at[c + 1]];
      if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) || y < Math.min(ay, by, cy) || y > Math.max(ay, by, cy)) continue;
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (!d) continue;
      const la = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      const lb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      const lc = 1 - la - lb;
      if (la < -1e-6 || lb < -1e-6 || lc < -1e-6) continue;
      return [la * uv[a] + lb * uv[b] + lc * uv[c], la * uv[a + 1] + lb * uv[b + 1] + lc * uv[c + 1]];
    }
    return null;
  }

  const VERTEX = `#version 300 es
in vec2 a_at;
in vec2 a_uv;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_at.x * 2.0 - 1.0, 1.0 - a_at.y * 2.0, 0.0, 1.0);
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
    const u = Object.fromEntries(['u_img', 'u_tex', 'u_eye1', 'u_eye2', 'u_blink'].map((name) => [name, gl.getUniformLocation(program, name)]));

    const mesh = makeMesh();
    bend(mesh, REST);
    gl.bindVertexArray(gl.createVertexArray());
    const attribute = (name, data, usage) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return buffer;
    };
    attribute('a_uv', mesh.uv, gl.STATIC_DRAW);
    const positions = attribute('a_at', mesh.at, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW);

    gl.uniform2f(u.u_tex, TEX[0], TEX[1]);
    gl.uniform1i(u.u_img, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    // The sprites, each copied no bigger than she is drawn, which is much
    // smaller than the pictures unless she is big on a sharp screen.
    const textures = new Map();
    let textureHeight = 0;
    let shown = null; // [key, image]
    let rig = NO_RIG;

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
    function show(key, image, spriteRig) {
      if (!textureHeight) textureHeight = drawnHeight();
      if (!textures.has(key)) textures.set(key, upload(image));
      gl.bindTexture(gl.TEXTURE_2D, textures.get(key));
      shown = [key, image];
      rig = spriteRig || NO_RIG;
      setRig(mesh, rig);
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
      bend(mesh, pose);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.at);
      const none = [0, 0, 0, 0];
      gl.uniform4fv(u.u_eye1, rig.eyes?.[0] || none);
      gl.uniform4fv(u.u_eye2, rig.eyes?.[1] || none);
      gl.uniform1f(u.u_blink, pose.blink);
      gl.drawElements(gl.TRIANGLES, mesh.index.length, gl.UNSIGNED_SHORT, 0);
    }

    // Which point of her picture (as fractions of it) is drawn at (x, y) on
    // the canvas (as fractions of it), or null.
    const pickAt = (x, y) => pick(mesh, x, y);

    return { show, draw, pick: pickAt, lost: () => gl.isContextLost() };
  }

  return { create, PAD, makeMesh, setRig, bend, pick, REST };
})();
