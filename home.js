(function () {
  const code = document.getElementById("try-code");
  const out = document.getElementById("try-out");
  const mem = document.getElementById("try-mem");
  const cursor = document.querySelector(".home-cursor");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!code || !out || !window.T4C2) return;

  function fmt(value) {
    if (Array.isArray(value)) return value.map(fmt).join(", ");
    if (typeof value === "boolean") return value ? "vrai" : "faux";
    if (typeof value === "number") return String(value).replace(".", ",");
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function run() {
    const r = window.T4C2.runProgram(code.value, { maxMs: 1000 });
    if (r.error) {
      out.innerHTML = '<div class="err">' + r.error.message + "</div>";
      mem.innerHTML = "";
      return;
    }
    out.textContent = r.output.length ? r.output.join("\n") : "Rien à afficher.";
    const keys = Object.keys(r.variables || {});
    mem.innerHTML = keys.length
      ? keys.map(function (k) {
          return '<div class="home-chip"><b>' + k + "</b><span>" + fmt(r.variables[k]) + "</span></div>";
        }).join("")
      : "";
  }

  document.getElementById("try-run").onclick = run;
  code.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  });

  document.querySelectorAll(".home-pill").forEach(function (btn) {
    btn.onclick = function () {
      document.querySelectorAll(".home-pill").forEach(function (b) { b.classList.remove("is-on"); });
      btn.classList.add("is-on");
      code.value = btn.getAttribute("data-src");
      run();
    };
  });

  const sky = document.querySelector(".home-sky");
  function fadeSky() {
    if (!sky) return;
    const fade = Math.max(0.18, 1 - window.scrollY / (window.innerHeight * 1.15));
    sky.style.opacity = String(fade);
  }
  fadeSky();
  window.addEventListener("scroll", fadeSky, { passive: true });

  if (cursor && !reduced) {
    window.addEventListener("pointermove", function (e) {
      cursor.classList.add("is-on");
      cursor.style.transform = "translate(" + e.clientX + "px, " + e.clientY + "px)";
    });
  }

  document.querySelectorAll(".home-reveal").forEach(function (el) {
    if (reduced) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });
    io.observe(el);
  });

  const starter = "affiche «Bonjour T4C2»\nsoit message «Le français suffit»\naffiche message";
  if (!reduced && code.value === starter) {
    const text = starter;
    let i = 0;
    code.value = "";
    const tick = setInterval(function () {
      if (document.activeElement === code) {
        clearInterval(tick);
        return;
      }
      i += 1;
      code.value = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(tick);
        run();
      }
    }, 28);
  } else {
    run();
  }
})();
