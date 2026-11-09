/* Kabadi Symbiosis: app logic. Depends on d3 v7 and data.js. */
(() => {
  "use strict";

  const KABADI_BOOST = 0.15;
  const KABADI_CAP = 0.95;
  const HUB = "__kabadi";

  const fmtT = t => t >= 1e6 ? (t / 1e6).toFixed(t >= 1e7 ? 0 : 1) + " Mt" : t >= 1e3 ? Math.round(t / 1e3).toLocaleString("en-IN") + " kt" : Math.round(t).toLocaleString("en-IN") + " t";
  const fmtCr = r => { const cr = r / 1e7; return "₹" + (cr >= 100 ? Math.round(cr).toLocaleString("en-IN") : cr >= 10 ? cr.toFixed(0) : cr.toFixed(1)) + " cr"; };
  const fmtN = n => n >= 1e5 ? (n / 1e5).toFixed(1) + " lakh" : Math.round(n).toLocaleString("en-IN");
  const fmtCO2 = t => t >= 1e6 ? (t / 1e6).toFixed(1) + " Mt" : t >= 1e3 ? Math.round(t / 1e3).toLocaleString("en-IN") + " kt" : Math.round(t) + " t";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const indColor = id => SECTORS[INDUSTRIES[id].sector].color;
  const synergy = (w, i) => SYNERGIES[`${w}>${i}`] || {};

  /* ---------------- engine ---------------- */
  function computeNetwork(nodes, uptake, kabadiOn) {
    const active = nodes.filter(n => n.count > 0);
    const edges = [], orphans = [];
    let total = 0, matched = 0, value = 0, co2 = 0, jobs = 0;

    for (const src of active) {
      const out = INDUSTRIES[src.ind].out;
      for (const w in out) {
        const supply = out[w] * src.count * src.scale;
        if (!supply) continue;
        total += supply;
        const receivers = active.filter(r => INDUSTRIES[r.ind].accepts.includes(w));
        if (!receivers.length) { orphans.push({ src: src.ind, waste: w, tonnes: supply }); continue; }
        const wd = WASTES[w];
        const rate = kabadiOn && wd.kabadi ? Math.min(KABADI_CAP, uptake + KABADI_BOOST) : uptake;
        const weightSum = d3.sum(receivers, r => r.count * r.scale);
        for (const r of receivers) {
          const t = supply * rate * (r.count * r.scale) / weightSum;
          edges.push({ from: src.ind, to: r.ind, waste: w, tonnes: t, viaKabadi: kabadiOn && wd.kabadi });
          matched += t;
          value += t * (wd.value + wd.disposal);
          co2 += t * wd.co2;
          jobs += t * wd.jobs / 1000;
        }
      }
    }

    // Missing links: which absent industries could absorb each orphan stream?
    const present = new Set(active.map(n => n.ind));
    const byWaste = d3.rollups(orphans, v => d3.sum(v, d => d.tonnes), d => d.waste)
      .map(([waste, tonnes]) => ({
        waste, tonnes,
        candidates: Object.keys(INDUSTRIES).filter(i => !present.has(i) && INDUSTRIES[i].accepts.includes(waste))
      }))
      .sort((a, b) => b.tonnes * (WASTES[b.waste].value + WASTES[b.waste].disposal) - a.tonnes * (WASTES[a.waste].value + WASTES[a.waste].disposal));

    return { active, edges, missing: byWaste, total, matched, value, co2, jobs };
  }

  /* ---------------- state ---------------- */
  const state = {
    clusterId: CLUSTERS[0].id,
    nodes: [],
    uptake: 0.35,
    kabadi: true
  };
  const CUSTOM = { id: "custom", name: "Design your own park", state: "Sandbox", tag: "Build",
    blurb: "Start from an empty plot. Add industries one at a time and watch exchanges form, Kalundborg-style. Try a thermal plant first, then see what the missing links suggest.",
    nodes: [["thermal", 1, 0.3], ["sugar", 1, 1]] };
  const allClusters = () => [...CLUSTERS, CUSTOM];
  const currentCluster = () => allClusters().find(c => c.id === state.clusterId);

  function loadCluster(id) {
    state.clusterId = id;
    const c = currentCluster();
    state.nodes = c.nodes.map(([ind, count, scale]) => ({ ind, count, scale }));
    renderClusterList();
    document.getElementById("c-name").textContent = c.id === "custom" ? c.name : `${c.name}, ${c.state}`;
    document.getElementById("c-blurb").textContent = c.blurb;
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    update(true);
  }

  /* ---------------- cluster list ---------------- */
  function renderClusterList() {
    const el = document.getElementById("cluster-list");
    el.innerHTML = allClusters().map(c => `
      <button class="cluster-btn ${c.id === state.clusterId ? "active" : ""} ${c.id === "custom" ? "custom" : ""}" data-id="${c.id}">
        <span class="tag">${esc(c.tag)}</span><b>${esc(c.name)}</b><span>${esc(c.state)}</span>
      </button>`).join("");
    el.querySelectorAll("button").forEach(b => b.onclick = () => loadCluster(b.dataset.id));
  }

  /* ---------------- node editor ---------------- */
  function renderNodeEditor() {
    const list = document.getElementById("node-list");
    list.innerHTML = state.nodes.map((n, i) => `
      <span class="chip ${n.count ? "" : "zero"}">
        <span class="dot" style="background:${indColor(n.ind)}"></span>${esc(INDUSTRIES[n.ind].name)}
        <button data-i="${i}" data-d="-1" aria-label="Fewer">−</button><b>${n.count}</b><button data-i="${i}" data-d="1" aria-label="More">+</button>
      </span>`).join("");
    list.querySelectorAll("button").forEach(b => b.onclick = () => {
      const n = state.nodes[+b.dataset.i];
      const step = n.count >= 100 ? Math.round(n.count * 0.2) : n.count >= 20 ? 5 : 1;
      n.count = Math.max(0, n.count + (+b.dataset.d) * step);
      update(false);
    });
    const present = new Set(state.nodes.map(n => n.ind));
    const add = document.getElementById("add-list");
    add.innerHTML = Object.keys(INDUSTRIES).filter(i => !present.has(i)).map(i =>
      `<button class="pill-btn" data-ind="${i}"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${indColor(i)};margin-right:5px"></span>${esc(INDUSTRIES[i].name)}</button>`).join("");
    add.querySelectorAll("button").forEach(b => b.onclick = () => addIndustry(b.dataset.ind));
  }

  function addIndustry(ind) {
    const ex = state.nodes.find(n => n.ind === ind);
    if (ex) ex.count = Math.max(1, ex.count);
    else state.nodes.push({ ind, count: 1, scale: 1 });
    update(false);
  }

  /* ---------------- panel ---------------- */
  function renderPanel(net) {
    const circ = net.total ? net.matched / net.total : 0;
    document.getElementById("metrics").innerHTML = `
      <div class="metric hero-m"><div class="k">Circularity</div><div class="v">${Math.round(circ * 100)}%</div>
        <div class="s">${fmtT(net.matched)} of ${fmtT(net.total)} waste finds a buyer</div><div class="bar"><span style="width:${(circ * 100).toFixed(1)}%"></span></div></div>
      <div class="metric"><div class="k">Value unlocked</div><div class="v">${fmtCr(net.value)}</div><div class="s">per year</div></div>
      <div class="metric"><div class="k">CO₂ avoided</div><div class="v">${fmtCO2(net.co2)}</div><div class="s">per year</div></div>
      <div class="metric"><div class="k">Livelihoods</div><div class="v">${fmtN(net.jobs)}</div><div class="s">collection, sorting, transport</div></div>
      <div class="metric"><div class="k">Exchanges</div><div class="v">${net.edges.length}</div><div class="s">active links</div></div>`;

    const m = document.getElementById("missing");
    if (!net.missing.length) {
      m.innerHTML = `<h3 class="small-h">Missing links</h3><p class="ok-note">Every waste stream here has at least one buyer in the cluster.</p>`;
    } else {
      m.innerHTML = `<h3 class="small-h">Missing links: waste with no buyer</h3>` + net.missing.slice(0, 5).map(x => `
        <div class="missing-item"><div>
          <b style="color:${WASTES[x.waste].color}">●</b> <b>${fmtT(x.tonnes)}</b> ${esc(WASTES[x.waste].name)}
          <div class="opts">${x.candidates.length ? x.candidates.slice(0, 3).map(c => `<button class="pill-btn" data-ind="${c}">+ ${esc(INDUSTRIES[c].name)}</button>`).join("") : '<span class="muted">No receiver in our database yet</span>'}</div>
        </div></div>`).join("");
      m.querySelectorAll("button").forEach(b => b.onclick = () => addIndustry(b.dataset.ind));
    }

    const top = [...net.edges].sort((a, b) => b.tonnes * (WASTES[b.waste].value + WASTES[b.waste].disposal) - a.tonnes * (WASTES[a.waste].value + WASTES[a.waste].disposal)).slice(0, 12);
    document.getElementById("exchanges").innerHTML = top.map(e => {
      const s = synergy(e.waste, e.to);
      return `<li style="border-color:${WASTES[e.waste].color}" title="${esc(s.how || "")}">
        <b>${esc(WASTES[e.waste].name)}</b>: ${esc(INDUSTRIES[e.from].name)} → ${esc(INDUSTRIES[e.to].name)}
        <small>${fmtT(e.tonnes)}/yr · ${fmtCr(e.tonnes * (WASTES[e.waste].value + WASTES[e.waste].disposal))}${e.viaKabadi ? " · via kabadi" : ""}</small></li>`;
    }).join("") || `<li class="muted">No exchanges yet. Add a receiving industry.</li>`;
  }

  /* ---------------- graph ---------------- */
  const tip = document.getElementById("tooltip");
  function showTip(ev, html) { tip.innerHTML = html; tip.classList.add("show"); moveTip(ev); }
  function moveTip(ev) {
    const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = Math.min(ev.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => tip.classList.remove("show");

  let sim, svg, gLinks, gNodes, posCache = new Map();

  function initGraph() {
    const el = document.getElementById("graph");
    svg = d3.select(el).append("svg");
    const g = svg.append("g");
    gLinks = g.append("g");
    gNodes = g.append("g");
    svg.call(d3.zoom().scaleExtent([0.4, 3]).on("zoom", ev => g.attr("transform", ev.transform)));
    sim = d3.forceSimulation()
      .force("charge", d3.forceManyBody().strength(-900))
      .force("link", d3.forceLink().id(d => d.id).distance(l => l.self ? 0 : 170).strength(0.35))
      .force("collide", d3.forceCollide().radius(d => d.r + 26))
      .force("x", d3.forceX().strength(0.06))
      .force("y", d3.forceY().strength(0.09))
      .on("tick", ticked);
    new ResizeObserver(() => centre()).observe(el);
  }

  function centre() {
    const el = document.getElementById("graph");
    const w = el.clientWidth, h = el.clientHeight;
    sim.force("x").x(w / 2); sim.force("y").y(h / 2);
    const small = w < 640;
    sim.force("charge").strength(small ? -380 : -900);
    sim.force("link").distance(l => l.self ? 0 : small ? 95 : 170);
    sim._w = w; sim._h = h;
    sim.alpha(0.3).restart();
  }

  function renderGraph(net, reheat) {
    const el = document.getElementById("graph");
    const empty = el.querySelector(".empty");
    if (empty) empty.remove();
    if (!net.active.length) {
      el.insertAdjacentHTML("beforeend", `<div class="empty">Add an industry below to start building your park.</div>`);
    }

    // throughput per node for sizing
    const thr = new Map();
    const bump = (k, t) => thr.set(k, (thr.get(k) || 0) + t);
    for (const n of net.active) for (const w in INDUSTRIES[n.ind].out) bump(n.ind, INDUSTRIES[n.ind].out[w] * n.count * n.scale);
    for (const e of net.edges) bump(e.to, e.tonnes);
    const orphanSrc = new Set();
    net.missing.forEach(m => net.active.forEach(n => { if (INDUSTRIES[n.ind].out[m.waste]) orphanSrc.add(n.ind); }));

    const rScale = d3.scaleSqrt().domain([0, d3.max([...thr.values(), 1])]).range([10, 34]);
    const nodes = net.active.map(n => ({ id: n.ind, ind: n.ind, count: n.count, r: rScale(thr.get(n.ind) || 0), orphan: orphanSrc.has(n.ind) }));

    // links, optionally routed via kabadi hub
    let links = [];
    const hubNeeded = net.edges.some(e => e.viaKabadi);
    if (hubNeeded) {
      const agg = new Map();
      const add = (s, t, w, tn) => { const k = `${s}|${t}|${w}`; agg.set(k, (agg.get(k) || 0) + tn); };
      for (const e of net.edges) {
        if (e.viaKabadi) { add(e.from, HUB, e.waste, e.tonnes); add(HUB, e.to, e.waste, e.tonnes); }
        else add(e.from, e.to, e.waste, e.tonnes);
      }
      links = [...agg].map(([k, t]) => { const [s, tg, w] = k.split("|"); return { source: s, target: tg, waste: w, tonnes: t }; });
      const hubT = d3.sum(net.edges.filter(e => e.viaKabadi), e => e.tonnes);
      nodes.push({ id: HUB, hub: true, r: Math.max(16, rScale(hubT) * 0.8), count: 0 });
    } else {
      links = net.edges.map(e => ({ source: e.from, target: e.to, waste: e.waste, tonnes: e.tonnes }));
    }
    links.forEach(l => { l.self = l.source === l.target; });
    // index parallel links so they curve apart
    const groups = d3.group(links, l => [l.source, l.target].sort().join("|"));
    groups.forEach(arr => arr.forEach((l, i) => { l.idx = i - (arr.length - 1) / 2; l.n = arr.length; }));

    const wScale = d3.scaleSqrt().domain([0, d3.max(links, l => l.tonnes) || 1]).range([1.2, 9]);

    // keep positions between updates
    const el2 = document.getElementById("graph");
    nodes.forEach(n => {
      const p = posCache.get(n.id);
      if (p) { n.x = p.x; n.y = p.y; }
      else { n.x = el2.clientWidth / 2 + (Math.random() - .5) * 200; n.y = el2.clientHeight / 2 + (Math.random() - .5) * 200; }
    });

    const linkSel = gLinks.selectAll("path").data(links, l => `${l.source}|${l.target}|${l.waste}`);
    linkSel.exit().remove();
    const linkEnter = linkSel.enter().append("path").attr("class", "link flow");
    const linkAll = linkEnter.merge(linkSel)
      .attr("stroke", l => WASTES[l.waste].color)
      .attr("stroke-width", l => wScale(l.tonnes))
      .on("mouseenter", (ev, l) => {
        const to = typeof l.target === "object" ? l.target.id : l.target, from = typeof l.source === "object" ? l.source.id : l.source;
        const nm = id => id === HUB ? "Kabadi aggregator hub" : INDUSTRIES[id].name;
        const s = to !== HUB ? synergy(l.waste, to) : {};
        showTip(ev, `<b>${esc(WASTES[l.waste].name)}</b>${esc(nm(from))} → ${esc(nm(to))}<br>${fmtT(l.tonnes)}/yr${s.how ? "<br><br>" + esc(s.how) : ""}${s.abroad ? "<br><i>Abroad:</i> " + esc(s.abroad) : ""}${s.india ? "<br><i>India:</i> " + esc(s.india) : ""}`);
      })
      .on("mousemove", moveTip).on("mouseleave", hideTip);

    const nodeSel = gNodes.selectAll("g.node").data(nodes, d => d.id);
    nodeSel.exit().remove();
    const nodeEnter = nodeSel.enter().append("g").attr("class", "node");
    nodeEnter.append("circle");
    nodeEnter.append("text").attr("class", "count").attr("text-anchor", "middle").attr("dy", "0.35em");
    nodeEnter.append("text").attr("class", "label").attr("text-anchor", "middle");
    const nodeAll = nodeEnter.merge(nodeSel)
      .classed("hub", d => d.hub).classed("orphan", d => d.orphan);
    nodeAll.select("circle").attr("r", d => d.r).attr("fill", d => d.hub ? "var(--surface)" : indColor(d.ind));
    nodeAll.select(".count").text(d => d.hub ? "♻" : d.count > 1 ? (d.count >= 1000 ? (d.count / 1000).toFixed(1) + "k" : d.count) : "")
      .attr("fill", d => d.hub ? "var(--accent)" : "#fff").style("font-size", d => d.hub ? "16px" : null);
    nodeAll.select(".label").attr("dy", d => d.r + 13).text(d => d.hub ? "Kabadi network" : INDUSTRIES[d.ind].name);

    nodeAll.on("mouseenter", (ev, d) => {
      highlight(d.id, linkAll, nodeAll, links);
      if (d.hub) { showTip(ev, `<b>Kabadi aggregator network</b>Informal collectors, kabadiwalas and scrap dealers who move small, scattered streams to bulk buyers. In this model they lift uptake by ${KABADI_BOOST * 100} points.`); return; }
      const I = INDUSTRIES[d.ind];
      const outs = Object.keys(I.out).map(w => WASTES[w].name).join(", ") || "None";
      const ins = I.accepts.map(w => WASTES[w].name).join(", ") || "None";
      showTip(ev, `<b>${esc(I.name)}${d.count > 1 ? " ×" + d.count : ""}</b>Gives: ${esc(outs)}<br>Takes: ${esc(ins)}${d.orphan ? "<br><br><i>Has waste with no buyer here.</i>" : ""}`);
    }).on("mousemove", moveTip).on("mouseleave", () => { hideTip(); highlight(null, linkAll, nodeAll, links); })
      .call(d3.drag()
        .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    sim.nodes(nodes);
    sim.force("link").links(links.filter(l => !l.self));
    sim._links = links;
    sim._linkSel = linkAll; sim._nodeSel = nodeAll;
    centre();
    sim.alpha(reheat ? 1 : 0.5).restart();
  }

  function highlight(id, linkAll, nodeAll, links) {
    if (!id) { linkAll.classed("dim", false); nodeAll.classed("dim", false); return; }
    const nb = new Set([id]);
    links.forEach(l => { const s = l.source.id || l.source, t = l.target.id || l.target; if (s === id) nb.add(t); if (t === id) nb.add(s); });
    linkAll.classed("dim", l => (l.source.id || l.source) !== id && (l.target.id || l.target) !== id);
    nodeAll.classed("dim", d => !nb.has(d.id));
  }

  function ticked() {
    if (!sim._linkSel) return;
    const W = sim._w || 800, H = sim._h || 500;
    sim.nodes().forEach(d => { d.x = Math.max(d.r + 30, Math.min(W - d.r - 30, d.x)); d.y = Math.max(d.r + 10, Math.min(H - d.r - 22, d.y)); });
    sim._linkSel.attr("d", l => {
      const s = l.source, t = typeof l.target === "object" ? l.target : sim.nodes().find(n => n.id === l.target);
      const src = typeof s === "object" ? s : sim.nodes().find(n => n.id === s);
      if (!src || !t) return null;
      if (l.self) {
        const r = src.r, k = 1 + Math.abs(l.idx) * 0.4;
        return `M${src.x - r * 0.5},${src.y - r * 0.85} C${src.x - r * 2.2 * k},${src.y - r * 3 * k} ${src.x + r * 2.2 * k},${src.y - r * 3 * k} ${src.x + r * 0.5},${src.y - r * 0.85}`;
      }
      const dx = t.x - src.x, dy = t.y - src.y, d = Math.hypot(dx, dy) || 1;
      const dir = src.id < t.id ? 1 : -1;
      const off = (l.idx * 22 * dir) + (l.n === 1 ? 0 : 0);
      const mx = (src.x + t.x) / 2 - dy / d * off, my = (src.y + t.y) / 2 + dx / d * off;
      return `M${src.x},${src.y} Q${mx},${my} ${t.x},${t.y}`;
    });
    sim._nodeSel.attr("transform", d => { posCache.set(d.id, { x: d.x, y: d.y }); return `translate(${d.x},${d.y})`; });
  }

  function renderLegend(net) {
    const ws = [...new Set(net.edges.map(e => e.waste))];
    const secs = [...new Set(net.active.map(n => INDUSTRIES[n.ind].sector))];
    document.getElementById("legend").innerHTML =
      secs.map(s => `<span><i style="background:${SECTORS[s].color}"></i>${SECTORS[s].name}</span>`).join("") +
      ws.map(w => `<span class="ln"><i style="background:${WASTES[w].color}"></i>${WASTES[w].name}</span>`).join("") +
      (net.missing.length ? `<span><i style="background:transparent;border:1.5px dashed #d62828"></i>Has unsold waste</span>` : "");
  }

  function update(reheat) {
    document.getElementById("uptake-label").textContent = Math.round(state.uptake * 100) + "% uptake";
    const net = computeNetwork(state.nodes, state.uptake, state.kabadi);
    renderNodeEditor();
    renderPanel(net);
    renderLegend(net);
    renderGraph(net, reheat);
  }

  /* ---------------- match tab ---------------- */
  function initMatch() {
    const sel = document.getElementById("m-waste");
    sel.innerHTML = Object.entries(WASTES).sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, w]) => `<option value="${id}">${esc(w.name)}</option>`).join("");
    sel.value = "fly_ash";
    const run = () => {
      const w = sel.value, wd = WASTES[w];
      const t = Math.max(0, +document.getElementById("m-tonnes").value || 0);
      const recv = Object.keys(INDUSTRIES).filter(i => INDUSTRIES[i].accepts.includes(w));
      const gens = Object.keys(INDUSTRIES).filter(i => INDUSTRIES[i].out[w]);
      document.getElementById("m-summary").innerHTML = `
        <div class="metric"><div class="k">Worth to a buyer</div><div class="v">${fmtCr(t * wd.value)}</div><div class="s">per year at ₹${wd.value.toLocaleString("en-IN")}/t</div></div>
        <div class="metric"><div class="k">Disposal you avoid</div><div class="v">${fmtCr(t * wd.disposal)}</div><div class="s">per year at ₹${wd.disposal.toLocaleString("en-IN")}/t</div></div>
        <div class="metric"><div class="k">CO₂ avoided</div><div class="v">${fmtCO2(t * wd.co2)}</div><div class="s">${wd.co2} t per tonne</div></div>
        <div class="metric"><div class="k">Livelihoods</div><div class="v">${fmtN(t * wd.jobs / 1000)}</div><div class="s">${wd.kabadi ? "Usually moved by the kabadi network" : "Usually moved by bulk trucking or pipe"}</div></div>`;
      document.getElementById("m-results").innerHTML = recv.length ? recv.map(i => {
        const s = synergy(w, i);
        const where = CLUSTERS.filter(c => c.nodes.some(([ind, n]) => ind === i && n > 0));
        return `<article class="card match-card">
          <span class="small-h" style="color:${indColor(i)}">${esc(SECTORS[INDUSTRIES[i].sector].name)}</span>
          <h3>${esc(INDUSTRIES[i].name)}</h3>
          <dl>
            <dt>How</dt><dd>${esc(s.how || "Accepts this stream as a raw-material substitute.")}</dd>
            ${s.abroad ? `<dt>Done abroad</dt><dd>${esc(s.abroad)}</dd>` : ""}
            ${s.india ? `<dt>In India</dt><dd>${esc(s.india)}</dd>` : ""}
            <dt>Clusters with this buyer</dt><dd class="where">${where.length ? where.map(c => `<button class="pill-btn" data-c="${c.id}">${esc(c.name)}</button>`).join("") : '<span class="muted">None in our sample. A gap to fill.</span>'}</dd>
          </dl></article>`;
      }).join("") : `<p class="muted">No receivers in the database yet.</p>`;
      document.querySelectorAll("#m-results [data-c]").forEach(b => b.onclick = () => { goTab("explore"); loadCluster(b.dataset.c); });
      if (gens.length) document.getElementById("m-results").insertAdjacentHTML("beforeend",
        `<p class="muted" style="grid-column:1/-1">Typically generated by: ${gens.map(g => esc(INDUSTRIES[g].name)).join(", ")}.</p>`);
    };
    sel.onchange = run; document.getElementById("m-tonnes").oninput = run;
    run();
  }

  /* ---------------- research + method ---------------- */
  function initResearch() {
    document.getElementById("models").innerHTML = MODELS.map(m => `
      <article class="model"><span class="place">${esc(m.place)} · ${esc(m.year)}</span>
        <h3>${esc(m.title)}</h3><p>${esc(m.what)}</p>
        <p class="lesson"><b>For India:</b> ${esc(m.lesson)} ${m.refs.map(r => `<a class="cite" href="#ref-${r}">[${r}]</a>`).join("")}</p></article>`).join("");
    document.getElementById("refs").innerHTML = REFERENCES.map(r => {
      const href = r.url || "https://scholar.google.com/scholar?q=" + encodeURIComponent(r.text.replace(/^[^)]*\)\.\s*/, "").split(".")[0]);
      return `<li id="ref-${r.id}">${esc(r.text)} <a href="${href}" target="_blank" rel="noopener">${r.url ? "Link" : "Find paper"} ↗</a></li>`;
    }).join("");
    document.getElementById("factor-table").innerHTML = `<thead><tr><th>Stream</th><th>Value ₹/t</th><th>Disposal ₹/t</th><th>tCO₂e/t</th><th>Jobs/kt</th><th>Kabadi-moved</th></tr></thead><tbody>` +
      Object.values(WASTES).map(w => `<tr><td><span style="color:${w.color}">●</span> ${esc(w.name)}</td><td class="num">${w.value.toLocaleString("en-IN")}</td><td class="num">${w.disposal.toLocaleString("en-IN")}</td><td class="num">${w.co2}</td><td class="num">${w.jobs}</td><td>${w.kabadi ? "Yes" : ""}</td></tr>`).join("") + `</tbody>`;
  }

  /* ---------------- tabs ---------------- */
  function goTab(name) {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === "tab-" + name));
    if (name === "explore") setTimeout(centre, 0);
  }
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => goTab(b.dataset.tab));
  document.querySelectorAll("[data-goto]").forEach(a => a.onclick = e => { e.preventDefault(); goTab(a.dataset.goto); window.scrollTo(0, 0); });
  document.addEventListener("click", e => {
    const a = e.target.closest("a.cite");
    if (a && !document.getElementById("tab-research").classList.contains("active")) { goTab("research"); }
  });

  /* ---------------- wire up ---------------- */
  document.getElementById("uptake").oninput = e => { state.uptake = +e.target.value / 100; update(false); };
  document.getElementById("kabadi").onchange = e => { state.kabadi = e.target.checked; update(false); };
  document.getElementById("reset").onclick = () => loadCluster(state.clusterId);

  initGraph();
  initMatch();
  initResearch();
  const fromHash = location.hash.slice(1);
  loadCluster(allClusters().some(c => c.id === fromHash) ? fromHash : "nanjangud");
})();
