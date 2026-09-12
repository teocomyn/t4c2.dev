(function () {
  const canvas = document.getElementById("constellation-canvas");
  const stage = canvas && canvas.parentElement;
  if (!canvas || !stage) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0, radius: 220 };
  const dark = canvas.getAttribute("data-theme") === "dark";
  const SPRING_K = 18;
  const DAMPING = 0.82;
  const MAX_CONN = dark ? 88 : 92;
  const MAX_CONN_SQ = MAX_CONN * MAX_CONN;
  const nodeColor = dark ? "232, 240, 248" : "16, 24, 40";
  const accentColor = dark ? "125, 211, 252" : "47, 111, 237";
  const linkScale = dark ? 0.42 : 0.22;
  const restNode = dark ? 0.16 : 0.22;

  let width = 0;
  let height = 0;
  let nodes = [];
  let rows = 0;
  let raf = 0;
  let lastTime = performance.now();

  function initNodes() {
    nodes = [];
    const spacing = width < 700 ? (dark ? 64 : 70) : (dark ? 52 : 58);
    const cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * spacing;
        const y = j * spacing;
        nodes.push({
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          baseX: x,
          baseY: y,
          radius: Math.random() * 1.2 + 1.2,
          label: (i * 7).toString(16).toUpperCase() + ":" + (j * 11).toString(16).toUpperCase(),
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  function neighborIndexes(i) {
    const list = [];
    if ((i % rows) + 1 < rows) list.push(i + 1);
    if (i + rows < nodes.length) list.push(i + rows);
    if ((i % rows) + 1 < rows && i + rows + 1 < nodes.length) list.push(i + rows + 1);
    return list;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < -40 || y < -40 || x > rect.width + 40 || y > rect.height + 40) {
      mouse.x = -1000;
      mouse.y = -1000;
      return;
    }
    mouse.x = x;
    mouse.y = y;
  }

  function drawLinks(alphaScale) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const near = neighborIndexes(i);
      for (let k = 0; k < near.length; k++) {
        const n2 = nodes[near[k]];
        const ndx = n.x - n2.x;
        const ndy = n.y - n2.y;
        const distSq = ndx * ndx + ndy * ndy;
        if (distSq >= MAX_CONN_SQ) continue;
        const nDist = Math.sqrt(distSq);
        const alpha = (1 - nDist / MAX_CONN) * alphaScale;
        ctx.strokeStyle = "rgba(" + nodeColor + ", " + alpha + ")";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      }
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawLinks(linkScale);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      ctx.fillStyle = "rgba(" + nodeColor + ", " + restNode + ")";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1);
    mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1);
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.pulse += dt * 3;
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius && dist > 0) {
        const power = 1 - dist / mouse.radius;
        const force = power * (1500 + speed * 150);
        const angle = Math.atan2(dy, dx);
        n.vx -= Math.cos(angle) * force * dt;
        n.vy -= Math.sin(angle) * force * dt;
      }
      n.vx += (n.baseX - n.x) * SPRING_K * dt;
      n.vy += (n.baseY - n.y) * SPRING_K * dt;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx * dt * 60;
      n.y += n.vy * dt * 60;
    }

    drawLinks(linkScale);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isNear = dist < mouse.radius;
      const baseAlpha = isNear ? 0.95 : restNode + Math.sin(n.pulse) * 0.08;
      ctx.fillStyle = isNear
        ? "rgba(" + accentColor + ", " + baseAlpha + ")"
        : "rgba(" + nodeColor + ", " + baseAlpha + ")";
      const currentRadius = isNear ? n.radius * 2.2 : n.radius + Math.sin(n.pulse) * 0.3;
      ctx.beginPath();
      ctx.arc(n.x, n.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
      ctx.fill();

      if (dist < 90 && window.scrollY < window.innerHeight * 0.6) {
        const pulseRing = ((n.pulse * 20) % 30) + 4;
        ctx.strokeStyle = "rgba(" + accentColor + ", " + ((1 - pulseRing / 34) * 0.4) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = "8px ui-monospace, SFMono-Regular, Consolas, monospace";
        ctx.fillStyle = "rgba(" + accentColor + ", 0.85)";
        ctx.fillText(n.label, n.x + 10, n.y - 10);
      }
    }

    raf = requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(stage);
  }

  if (reduced) {
    drawStatic();
    return;
  }

  window.addEventListener("mousemove", pointFromEvent);
  window.addEventListener("mouseleave", function () {
    mouse.x = -1000;
    mouse.y = -1000;
  });
  raf = requestAnimationFrame(render);
  window.addEventListener("pagehide", function () {
    cancelAnimationFrame(raf);
  }, { once: true });
})();
