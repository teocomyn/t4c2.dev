(function () {
  const canvas = document.getElementById("sparkles-canvas");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  const dots = [];
  let w = 0;
  let h = 0;
  let raf = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!dots.length) {
      const n = Math.min(140, Math.floor((w * h) / 900));
      for (let i = 0; i < n; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + Math.random() * 1.4,
          a: Math.random(),
          s: 0.4 + Math.random() * 1.2,
          v: (Math.random() - 0.5) * 0.25,
        });
      }
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.a += d.s * 0.02;
      d.y += d.v;
      if (d.y < 0) d.y = h;
      if (d.y > h) d.y = 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.abs(Math.sin(d.a)) * 0.75})`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  tick();
  window.addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });
})();
