(function() {
  "use strict";
  const COLOR_STOPS = [
    { k: 1e3, r: 255, g: 140, b: 20 },
    { k: 1800, r: 255, g: 179, b: 71 },
    { k: 3200, r: 255, g: 210, b: 161 },
    { k: 5600, r: 255, g: 255, b: 255 },
    { k: 7e3, r: 232, g: 241, b: 255 },
    { k: 1e4, r: 150, g: 157, b: 245 }
  ];
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  function kelvinToHex(kelvin) {
    const clamped = Math.max(
      COLOR_STOPS[0].k,
      Math.min(COLOR_STOPS[COLOR_STOPS.length - 1].k, kelvin)
    );
    let lo = COLOR_STOPS[0];
    let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      if (clamped >= COLOR_STOPS[i].k && clamped <= COLOR_STOPS[i + 1].k) {
        lo = COLOR_STOPS[i];
        hi = COLOR_STOPS[i + 1];
        break;
      }
    }
    const t = hi.k === lo.k ? 0 : (clamped - lo.k) / (hi.k - lo.k);
    const r = lerp(lo.r, hi.r, t);
    const g = lerp(lo.g, hi.g, t);
    const b = lerp(lo.b, hi.b, t);
    const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  const MAX_EDGE = 1024;
  const REFERENCE_FALLBACK_INPUT_SIZE = { width: MAX_EDGE, height: 512 };
  const CAMERA_Z = 5.6;
  const TAN_HALF_FOV = Math.tan(21 * Math.PI / 180);
  const LIGHT_DISTANCE = 4;
  function getReferenceSize(userImageWidth, userImageHeight) {
    if (!Number.isFinite(userImageWidth) || !Number.isFinite(userImageHeight) || userImageWidth <= 0 || userImageHeight <= 0) {
      return { ...REFERENCE_FALLBACK_INPUT_SIZE };
    }
    return userImageWidth >= userImageHeight ? {
      width: MAX_EDGE,
      height: Math.max(1, Math.round(userImageHeight / userImageWidth * MAX_EDGE))
    } : {
      width: Math.max(1, Math.round(userImageWidth / userImageHeight * MAX_EDGE)),
      height: MAX_EDGE
    };
  }
  function toLinear(value) {
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }
  function toSRGB(value) {
    const clamped = Math.max(0, Math.min(1, value));
    return Math.round(
      255 * (clamped <= 31308e-7 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055)
    );
  }
  function colorRGB(hex) {
    const expanded = /^#[0-9a-f]{3}$/i.test(hex) ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const value = /^#[0-9a-f]{6}$/i.test(expanded) ? Number.parseInt(expanded.slice(1), 16) : 16777215;
    return [
      toLinear((value >> 16) / 255),
      toLinear((value >> 8 & 255) / 255),
      toLinear((value & 255) / 255)
    ];
  }
  const STUDIOS = {
    default: { ambient: 0.4, hemisphere: 0.25, ground: colorRGB("#dce0ea") },
    black: { ambient: 0.2, hemisphere: 0.12, ground: colorRGB("#3a3f4a") },
    white: { ambient: 0.5, hemisphere: 0.32, ground: colorRGB("#eceef3") }
  };
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  function prepareLight(light) {
    const az = finite(light.horizontalAngle, 0) * Math.PI / 180;
    const el = finite(light.verticalAngle, 0) * Math.PI / 180;
    const soft = light.type === "rectAreaLight";
    const directional = light.type === "directionalLight";
    const angle = Math.PI / (soft ? 2.5 : 5.5);
    return {
      x: Math.cos(el) * Math.sin(az),
      y: Math.sin(el),
      z: Math.cos(el) * Math.cos(az),
      directional,
      intensity: (Math.max(0, Math.min(100, finite(light.intensity, 50))) / 100 * 3.2 + 0.3) * (directional ? 1.15 : soft ? 0.95 : 1.2),
      color: colorRGB(
        light.colorMode === "hex" ? light.color : kelvinToHex(finite(light.colorTemp, 5600))
      ),
      cone: Math.cos(angle),
      innerCone: Math.cos(angle * (1 - (soft ? 0.75 : 0.22)))
    };
  }
  function renderRelightPixels(params) {
    const { width, height } = getReferenceSize(params.userImageWidth, params.userImageHeight);
    const data = new Uint8ClampedArray(width * height * 4);
    const studio = STUDIOS[params.studioMode] ?? STUDIOS.default;
    const lights = params.lights.length ? params.lights.slice(0, 3).map(prepareLight) : [
      {
        x: 1 / Math.sqrt(6),
        y: 1 / Math.sqrt(6),
        z: 2 / Math.sqrt(6),
        directional: true,
        intensity: 1.2,
        color: [1, 1, 1],
        cone: 0,
        innerCone: 0
      }
    ];
    const scale = 2 * TAN_HALF_FOV / height;
    const radius = 1 / (scale * Math.sqrt(CAMERA_Z * CAMERA_Z - 1));
    const radiusSquared = radius * radius;
    const minX = Math.max(0, Math.floor(width / 2 - radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(width / 2 + radius + 1));
    const minY = Math.max(0, Math.floor(height / 2 - radius - 1));
    const maxY = Math.min(height - 1, Math.ceil(height / 2 + radius + 1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let px = x + 0.5 - width / 2;
        let py = height / 2 - y - 0.5;
        const distance = Math.hypot(px, py);
        if (distance > radius + Math.SQRT1_2) continue;
        let coverage = 1;
        if (distance > radius - Math.SQRT1_2) {
          let hits = 0;
          for (let sy = 0; sy < 4; sy++) {
            for (let sx = 0; sx < 4; sx++) {
              const dx = px + (sx + 0.5) / 4 - 0.5;
              const dy = py + (sy + 0.5) / 4 - 0.5;
              if (dx * dx + dy * dy <= radiusSquared) hits++;
            }
          }
          if (!hits) continue;
          coverage = hits / 16;
          if (distance >= radius) {
            const shrink = radius * (1 - 1e-8) / distance;
            px *= shrink;
            py *= shrink;
          }
        }
        const u = px * scale;
        const v = py * scale;
        const a = 1 + u * u + v * v;
        const t = (CAMERA_Z - Math.sqrt(Math.max(0, CAMERA_Z * CAMERA_Z - a * (CAMERA_Z * CAMERA_Z - 1)))) / a;
        const nx = t * u;
        const ny = t * v;
        const nz = CAMERA_Z - t;
        const invView = 1 / Math.sqrt(a);
        const vx = -u * invView;
        const vy = -v * invView;
        const vz = invView;
        const nv = Math.max(1e-5, nx * vx + ny * vy + nz * vz);
        const sky = ny * 0.5 + 0.5;
        let r = (studio.ambient + studio.hemisphere * (studio.ground[0] * (1 - sky) + sky)) / Math.PI;
        let g = (studio.ambient + studio.hemisphere * (studio.ground[1] * (1 - sky) + sky)) / Math.PI;
        let b = (studio.ambient + studio.hemisphere * (studio.ground[2] * (1 - sky) + sky)) / Math.PI;
        for (const light of lights) {
          let lx = light.x;
          let ly = light.y;
          let lz = light.z;
          let attenuation = 1;
          if (!light.directional) {
            lx = lx * LIGHT_DISTANCE - nx;
            ly = ly * LIGHT_DISTANCE - ny;
            lz = lz * LIGHT_DISTANCE - nz;
            const inverseLength = 1 / Math.hypot(lx, ly, lz);
            lx *= inverseLength;
            ly *= inverseLength;
            lz *= inverseLength;
            const cosine = lx * light.x + ly * light.y + lz * light.z;
            const ramp = Math.max(
              0,
              Math.min(1, (cosine - light.cone) / (light.innerCone - light.cone))
            );
            attenuation = ramp * ramp * (3 - 2 * ramp);
          }
          const nl = Math.max(0, nx * lx + ny * ly + nz * lz);
          if (nl <= 0 || attenuation === 0) continue;
          const hx = lx + vx;
          const hy = ly + vy;
          const hz = lz + vz;
          const invHalf = 1 / Math.hypot(hx, hy, hz);
          const nh = Math.max(0, (nx * hx + ny * hy + nz * hz) * invHalf);
          const vh = Math.max(0, Math.min(1, (vx * hx + vy * hy + vz * hz) * invHalf));
          const alphaSquared = 0.3 ** 4;
          const denominator = nh * nh * (alphaSquared - 1) + 1;
          const distribution = alphaSquared / (Math.PI * denominator * denominator);
          const visibility = 0.5 / (nl * Math.sqrt(nv * nv * (1 - alphaSquared) + alphaSquared) + nv * Math.sqrt(nl * nl * (1 - alphaSquared) + alphaSquared));
          const fresnel = 0.04 + 0.96 * (1 - vh) ** 5;
          const radiance = light.intensity * attenuation * nl * (1 / Math.PI + distribution * visibility * fresnel);
          r += light.color[0] * radiance;
          g += light.color[1] * radiance;
          b += light.color[2] * radiance;
        }
        const offset = (y * width + x) * 4;
        data[offset] = toSRGB(r);
        data[offset + 1] = toSRGB(g);
        data[offset + 2] = toSRGB(b);
        data[offset + 3] = Math.round(coverage * 255);
      }
    }
    return { width, height, data };
  }
  self.onmessage = async (event) => {
    try {
      const { width, height, data } = renderRelightPixels(event.data);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("OffscreenCanvas 2D is unavailable");
      const image = context.createImageData(width, height);
      image.data.set(data);
      context.putImageData(image, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      self.postMessage({ blob });
    } catch (error) {
      self.postMessage({ error: error instanceof Error ? error.message : String(error) });
    }
  };
})();
