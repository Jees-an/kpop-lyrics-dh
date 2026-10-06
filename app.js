"use strict";
const D = {};                       // 불러온 데이터
const charts = {};                  // echarts 인스턴스
const $ = (s) => document.querySelector(s);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const MELON = (id, t = "", a = "") => id.startsWith("x") ? `https://www.melon.com/search/total/index.htm?q=${encodeURIComponent(t + " " + a)}` : `https://www.melon.com/song/detail.htm?songId=${id}`;
const PALETTE = ["#c2410c", "#1d4ed8", "#15803d", "#7c3aed", "#b45309", "#0e7490", "#be185d", "#4d7c0f", "#6b7280", "#9333ea", "#0369a1"];
// 플루칙 감정 수레바퀴 (시계 방향 순서)
const EMOS = ["기쁨", "신뢰", "두려움", "놀람", "슬픔", "혐오", "분노", "기대"];
const EMO_COLORS = ["#f5c400", "#7cb342", "#2e7d32", "#0ea5e9", "#1d4ed8", "#8e24aa", "#e53935", "#f57c00"];
const INTENSITY = [["평온", "기쁨", "황홀"], ["수용", "신뢰", "존경"], ["걱정", "두려움", "공포"], ["산만", "놀람", "경악"],
  ["수심", "슬픔", "비탄"], ["지루함", "혐오", "증오"], ["짜증", "분노", "격노"], ["관심", "기대", "경계"]];
const DYADS = ["사랑", "복종", "경외", "못마땅함", "후회", "경멸", "공격성", "낙관"];   // i번째 = 감정 i + 감정 i+1
const MEAS_LABEL = { en_ratio: "영어 비율", repetition: "반복도", tokens: "곡당 토큰 수", lines: "곡당 행 수", ttr: "어휘 다양도", n: "차트 등장 수" };
EMOS.forEach((e) => (MEAS_LABEL[e] = `${e} 강도`));
const mix = (hex, t) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(b + (255 - b) * t)})`; };
const emoTags = (e) => {
  const tags = e.map((v, i) => [v, i]).filter(([v]) => v >= 2).sort((a, b) => b[0] - a[0]).map(([v, i]) => `<span class="tag" style="border-left:3px solid ${EMO_COLORS[i]}">${INTENSITY[i][v - 1]}</span>`);
  const dy = DYADS.filter((_, i) => e[i] >= 2 && e[(i + 1) % 8] >= 2).map((d) => `<span class="tag">◇ ${d}</span>`);
  return tags.concat(dy).join("") || `<span class="tag">${INTENSITY[e.indexOf(Math.max(...e))][0]}</span>`;
};

async function load(name) {
  if (!D[name]) D[name] = await (await fetch(`data/${name}.json`)).json();
  return D[name];
}
function chart(id) {
  if (!charts[id]) charts[id] = echarts.init(document.getElementById(id), null, { renderer: "canvas" });
  return charts[id];
}
window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));

const TAG_NAMES = { NNG: "일반명사", NNP: "고유명사", NNB: "의존명사", NP: "대명사", NR: "수사", VV: "동사", VA: "형용사", VX: "보조용언",
  VCP: "긍정지정사", VCN: "부정지정사", MM: "관형사", MAG: "일반부사", MAJ: "접속부사", IC: "감탄사", JKS: "주격조사", JKO: "목적격조사",
  JKB: "부사격조사", JKG: "관형격조사", JKC: "보격조사", JKV: "호격조사", JX: "보조사", JC: "접속조사", EP: "선어말어미", EF: "종결어미",
  EC: "연결어미", ETM: "관형형 전성어미", ETN: "명사형 전성어미", XR: "어근", XSN: "명사 파생 접미사",
  NOUN: "명사(영)", VERB: "동사(영)", ADJ: "형용사(영)", ADV: "부사(영)", PRON: "대명사(영)", DET: "한정사(영)", ADP: "전치사(영)",
  CONJ: "접속사(영)", PRT: "불변화사(영)", NUM: "수사(영)", X: "기타(영)" };
const LAYER_TAGS = {
  ko: ["NNG", "NNP", "NP", "VV", "VA", "MAG", "XR"],
  en: ["NOUN", "VERB", "ADJ", "ADV", "PRON", "DET", "ADP", "CONJ", "PRT", "NUM", "X"],
  mwe: ["NNG", "NNP", "NNB", "NP", "VV", "VA", "VX", "VCP", "VCN", "MM", "MAG", "JKS", "JKO", "JKB", "JKG", "JX", "EC", "EF", "ETM", "EP",
        "NOUN", "VERB", "ADJ", "ADV", "PRON", "DET", "ADP", "PRT"],
};
LAYER_TAGS["ko+en"] = [...LAYER_TAGS.ko, ...LAYER_TAGS.en];
LAYER_TAGS.all = LAYER_TAGS.mwe;
const tagOf = (k) => (D.tags && D.tags[k]) || "";
const isNgram = (k) => k.startsWith("kom:") || k.startsWith("enm:");
const KO_SLOT_TAGS = ["NNG", "NNP", "NNB", "NR", "NP", "VV", "VA", "VX", "VCP", "VCN", "MM", "MAG", "MAJ", "IC", "XR",
  "JKS", "JKC", "JKG", "JKO", "JKB", "JKV", "JX", "JC", "EP", "EF", "EC", "ETN", "ETM", "XPN", "XSN"];
const TAG_GROUPS = [
  ["실질 형태소", ["NNG", "NNP", "NNB", "NR", "NP", "VV", "VA", "MAG", "MAJ", "MM", "XR"]],
  ["형식 형태소", ["JKS", "JKC", "JKG", "JKO", "JKB", "JX", "JC", "EP", "EF", "EC", "ETN", "ETM", "VX", "VCP", "VCN"]],
  ["영어", ["NOUN", "VERB", "ADJ", "ADV", "PRON", "DET", "ADP", "CONJ", "PRT", "NUM", "X"]],
];
// 품사태그 필터(팝업): 단어는 고른 품사태그 중 하나, N-gram은 고른 품사태그를 모두 포함
function posFilter(el, onChange) {
  const sel = new Set();
  let cur = null;
  const render = (layer) => {
    if (layer !== cur) { sel.clear(); cur = layer; }
    const avail = new Set(LAYER_TAGS[layer] || []);
    const groups = TAG_GROUPS.map(([g, ts]) => [g, ts.filter((t) => avail.has(t))]).filter(([, ts]) => ts.length);
    const lbl = sel.size ? [...sel].join(", ") : "전체";
    el.innerHTML = `<span class="tagmenu"><button type="button" class="tm-btn">품사태그: ${esc(lbl)} ▾</button>
      <div class="tagpop" hidden>${groups.map(([g, ts]) => `<div class="grp"><label><input type="checkbox" data-g="${g}" ${ts.every((t) => sel.has(t)) ? "checked" : ""}>${g}</label>
        <div class="tags">${ts.map((t) => `<label><input type="checkbox" data-t="${t}" ${sel.has(t) ? "checked" : ""}>${t} ${TAG_NAMES[t] || ""}</label>`).join("")}</div></div>`).join("")}
        <div class="acts"><button type="button" class="tm-all">모두 선택</button><button type="button" class="tm-none">모두 해제</button><button type="button" class="tm-ok primary">적용</button></div>
      </div></span>${layer === "mwe" ? `<span class="lbl">N-gram은 고른 품사태그를 모두 포함하는 것만</span>` : ""}`;
    const pop = el.querySelector(".tagpop");
    el.querySelector(".tm-btn").onclick = () => (pop.hidden = !pop.hidden);
    pop.querySelectorAll("input[data-g]").forEach((cb) => (cb.onchange = () => {
      const ts = groups.find(([g]) => g === cb.dataset.g)[1];
      pop.querySelectorAll("input[data-t]").forEach((x) => { if (ts.includes(x.dataset.t)) x.checked = cb.checked; });
    }));
    el.querySelector(".tm-all").onclick = () => pop.querySelectorAll("input").forEach((x) => (x.checked = true));
    el.querySelector(".tm-none").onclick = () => pop.querySelectorAll("input").forEach((x) => (x.checked = false));
    el.querySelector(".tm-ok").onclick = () => {
      sel.clear();
      pop.querySelectorAll("input[data-t]").forEach((x) => x.checked && sel.add(x.dataset.t));
      if (sel.size === pop.querySelectorAll("input[data-t]").length) sel.clear();
      render(cur); onChange();
    };
  };
  const match = (k) => {
    if (!sel.size) return true;
    const parts = tagOf(k).split(" ");
    return isNgram(k) ? [...sel].every((t) => parts.includes(t)) : parts.some((t) => sel.has(t));
  };
  return { render, match };
}
const layerOfKeyForPos = (k) => (k.startsWith("ko:") ? "ko" : k.startsWith("en:") ? "en" : "mwe");

const layerOf = (k) => (k.startsWith("ko:") ? "ko" : k.startsWith("en:") ? "en" : "mwe");
const label = (k) => (D.labels && D.labels[k]) || k.replace(/^(ko|en|kom|enm):/, "").replace(/\/[A-Z]+$/, "");
const ptag = (k) => `<span class="ptag">${esc(tagOf(k))}</span>`;
const langTag = (k) => { const l = layerOf(k); const t = l === "ko" ? "한" : l === "en" ? "영" : (k.startsWith("kom:") ? "한·N" : "영·N"); return `<span class="lang ${l}">${t}</span>`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const baseText = () => ({ color: css("--ink2"), fontFamily: "Noto Sans KR" });
const axisStyle = () => ({ axisLine: { lineStyle: { color: css("--line") } }, axisLabel: baseText(), splitLine: { lineStyle: { color: css("--line") } } });

// ---------- 용례 ----------
function highlight(raw, key) {
  const lab = label(key);
  let pats = [];
  if (key.startsWith("en:") || key.startsWith("enm:")) pats = [new RegExp(`\\b${lab.replace(/[.*+?^${}()|[\]\\']/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i")];
  else if (key.startsWith("kom:")) pats = [new RegExp(esc(lab).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"))];
  else { const stem = lab.endsWith("다") && lab.length > 1 ? lab.slice(0, -1) : lab; pats = [stem, stem.slice(0, Math.max(1, stem.length - 1))]; }
  let html = esc(raw);
  for (const p of pats) {
    const re = p instanceof RegExp ? p : new RegExp(esc(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (re.test(html)) return html.replace(re, (m) => `<mark>${m}</mark>`);
  }
  return html;
}
function examplesHTML(key) {
  const ex = (D.examples || {})[key];
  if (!ex || !ex.length) return `<p class="hint">용례 없음</p>`;
  return `<ul class="ex">${ex.map(([raw, si]) => {
    const s = D.songs[si];
    return `<li><q>${highlight(raw, key)}</q><small><button class="songlink" data-song="${si}" data-key="${esc(key)}" data-line="${esc(raw)}">${esc(s[1])}</button> · ${esc(s[2])} · ${s[3]}</small></li>`;
  }).join("")}</ul>`;
}
function miniSeries(el, key) {
  const s = D.series && D.series.series[key];
  if (!s) { el.innerHTML = ""; return; }
  const c = echarts.init(el);
  c.setOption({
    grid: { left: 36, right: 8, top: 10, bottom: 24 }, tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: D.meta.years, ...axisStyle(), axisLabel: { ...baseText(), interval: 4 } },
    yAxis: { type: "value", ...axisStyle() },
    series: [{ type: "line", data: s[3], smooth: true, symbol: "none", lineStyle: { color: css("--accent"), width: 2 }, areaStyle: { color: css("--accent"), opacity: 0.12 } }],
  });
}
function distCharts(el, key) {
  const d = D.dist && D.dist[key];
  if (!d) { el.innerHTML = ""; return; }
  const genres = D.meta.genres, eras = D.meta.eras;
  el.innerHTML = `<h3>장르별 분포 <span class="unit">(이 말 전체 출현 = 100%)</span></h3><div class="dist g"></div><h3>시대별 분포 <span class="unit">(이 말 전체 출현 = 100%)</span></h3><div class="dist e"></div>`;
  const bar = (box, names, share, rate, cov) => {
    const c = echarts.init(box);
    c.setOption({
      grid: { left: 72, right: 52, top: 4, bottom: 4 },
      tooltip: { formatter: (p) => `${names[p.dataIndex]}<br>점유율 ${share[p.dataIndex]}%<br>상대빈도* ${rate[p.dataIndex]}<br>곡 비율 ${cov[p.dataIndex]}%` },
      xAxis: { type: "value", show: false, max: 100 }, yAxis: { type: "category", data: names, inverse: true, ...axisStyle(), axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: "bar", data: share, barWidth: "60%", itemStyle: { color: css("--accent"), opacity: 0.75 },
        label: { show: true, position: "right", formatter: (p) => `${share[p.dataIndex]}%`, color: css("--ink2"), fontSize: 11 } }],
    });
  };
  bar(el.querySelector(".g"), genres, d[4], d[0], d[2]);
  bar(el.querySelector(".e"), eras, d[5], d[1], d[3]);
}
async function termPanel(el, key, extra = "") {
  await Promise.all([load("series"), load("dist")]);
  const s = D.series.series[key];
  const trend = s ? `<p class="hint">상대빈도* ${(s[0] / D.meta.tok_total * D.meta.pmw).toFixed(2)} · 정점 ${s[2]}년 · 추세 ρ=${s[1]}</p>` : "";
  el.innerHTML = `<h3>${esc(label(key))} ${langTag(key)} ${ptag(key)}</h3>${extra}${trend}<div class="mini"></div>
    <div class="distbox"></div><div class="songbox"></div>`;
  miniSeries(el.querySelector(".mini"), key);
  distCharts(el.querySelector(".distbox"), key);
  songListInto(el.querySelector(".songbox"), { re: surfaceRegex(key) });
}

// ---------- 탭 ----------
const inited = {};
function showTab(t) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("on", s.id === t));
  history.replaceState(null, "", `#${t}`);
  if (!inited[t] && INIT[t]) { inited[t] = true; INIT[t](); }
  setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 30);
}
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (document.getElementById(t) && D.meta) showTab(t); });
function seg(id, cb) {
  const el = $(id);
  el.querySelectorAll("button").forEach((b) => (b.onclick = () => {
    el.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); cb(b.dataset.v);
  }));
  return () => el.querySelector("button.on").dataset.v;
}

// ---------- 시대 × 장르 ----------
async function initEG() {
  await Promise.all([load("eg"), load("monthly")]);
  const M = D.monthly.monthly;
  $("#mMeasure").insertAdjacentHTML("beforeend", EMOS.map((e) => `<option value="${e}">${e} 강도 (0–3)</option>`).join(""));
  const drawM = () => {
    const m = $("#mMeasure").value, v = M[m];
    const ma = v.map((_, i) => { const w = v.slice(Math.max(0, i - 11), i + 1); return +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(4); });
    chart("mChart").setOption({
      tooltip: { trigger: "axis" }, legend: { data: ["월별", "12개월 이동평균"], textStyle: baseText(), top: 0 },
      grid: { left: 52, right: 16, top: 32, bottom: 56 },
      xAxis: { type: "category", data: M.t, ...axisStyle() }, yAxis: { type: "value", scale: true, ...axisStyle() },
      dataZoom: [{ type: "slider", height: 18, bottom: 8 }, { type: "inside" }],
      series: [{ name: "월별", type: "line", data: v, symbol: "none", lineStyle: { width: 1, color: css("--line") }, itemStyle: { color: css("--ink2") } },
               { name: "12개월 이동평균", type: "line", data: ma, symbol: "none", lineStyle: { width: 2.5, color: css("--accent") }, itemStyle: { color: css("--accent") } }],
    }, true);
  };
  $("#mMeasure").onchange = drawM; drawM();
  const years = D.meta.years.map(String);
  const stack = (id, names, obj, colors) => chart(id).setOption({
    color: colors, tooltip: { trigger: "axis", valueFormatter: (v) => (v * 100).toFixed(1) + "%" },
    legend: { type: "scroll", bottom: 0, textStyle: baseText() }, grid: { left: 44, right: 12, top: 10, bottom: 56 },
    xAxis: { type: "category", data: years, ...axisStyle() }, yAxis: { type: "value", max: 1, ...axisStyle(), axisLabel: { ...baseText(), formatter: (v) => v * 100 + "%" } },
    series: names.map((n, i) => ({ name: n, type: "line", stack: "s", areaStyle: {}, symbol: "none", lineStyle: { width: 0 }, data: years.map((y) => obj[y][i]) })),
  });
  chart("emoYear").setOption({
    color: EMO_COLORS, tooltip: { trigger: "axis", valueFormatter: (v) => (+v).toFixed(2) },
    legend: { bottom: 0, textStyle: baseText() }, grid: { left: 40, right: 12, top: 10, bottom: 56 },
    xAxis: { type: "category", data: years, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
    series: EMOS.map((e, i) => ({ name: e, type: "line", smooth: true, symbol: "none", lineStyle: { width: 2.2 }, data: years.map((y) => D.monthly.emo_year[y][i]) })),
  });
  stack("genreYear", D.meta.genres, D.monthly.genre_year, PALETTE);

  const eras = D.meta.eras, genres = D.meta.genres.filter((g) => g !== "기타");
  $("#egMeasure").insertAdjacentHTML("beforeend", EMOS.map((e) => `<option value="${e}">${e} 강도</option>`).join(""));
  const draw = () => {
    const m = $("#egMeasure").value, data = [];
    genres.forEach((g, gi) => eras.forEach((e, ei) => { const c = D.eg[`${g}|${e}`]; if (c) data.push([ei, gi, c[m]]); }));
    const vals = data.map((d) => d[2]);
    chart("egChart").setOption({
      tooltip: { formatter: (p) => `${genres[p.value[1]]} · ${eras[p.value[0]]}<br>${MEAS_LABEL[m]} ${(+p.value[2]).toFixed(3)}<br>등장 ${D.eg[`${genres[p.value[1]]}|${eras[p.value[0]]}`].n}` },
      grid: { left: 90, right: 20, top: 10, bottom: 70 },
      xAxis: { type: "category", data: eras, ...axisStyle(), splitArea: { show: false } },
      yAxis: { type: "category", data: genres, ...axisStyle() },
      visualMap: { min: Math.min(...vals), max: Math.max(...vals), precision: m === "n" ? 0 : 2, calculable: true, orient: "horizontal", left: "center", bottom: 0, textStyle: baseText(),
                   inRange: { color: EMOS.includes(m) ? ["#f8fafc", mix(EMO_COLORS[EMOS.indexOf(m)], 0.4), EMO_COLORS[EMOS.indexOf(m)]] : ["#fef3c7", "#f97316", "#7c2d12"] } },
      series: [{ type: "heatmap", data, label: { show: true, formatter: (p) => (+p.value[2]).toFixed(m === "n" ? 0 : 2), fontSize: 11 } }],
    }, true);
  };
  $("#egMeasure").onchange = draw; draw();
  chart("egChart").on("click", (p) => {
    const g = genres[p.value[1]], e = eras[p.value[0]], c = D.eg[`${g}|${e}`];
    const side = $("#egSide");
    side.innerHTML = `<h3>${g} · ${e}</h3><p class="hint">차트 등장 수 ${c.n} · 점선: 시대 평균</p><div class="mini" style="height:320px"></div><div class="songbox"></div>`;
    loadAllLyrics().then((L) => {
      const a = parseInt(e, 10);
      const hits = D.songs.map((x, i) => [x, i]).filter(([x]) => x[6] === g && x[3] >= a && x[3] <= a + 9).map(([, i]) => [i, L[i][0] || ""]);
      songListInto(side.querySelector(".songbox"), { title: "이 칸의 곡 (차트 개월 수 순)", hits });
    });
    const all = genres.map((gg) => D.eg[`${gg}|${e}`]).filter(Boolean);
    const avg = EMOS.map((em) => all.reduce((a, x) => a + x[em] * x.n, 0) / all.reduce((a, x) => a + x.n, 0));
    const max = Math.max(1, ...EMOS.map((em) => c[em]), ...avg);
    echarts.init(side.querySelector(".mini")).setOption({
      tooltip: {},
      radar: { indicator: EMOS.map((em) => ({ name: em, max: +(max * 1.1).toFixed(2) })), axisName: { color: css("--ink2") }, splitLine: { lineStyle: { color: css("--line") } }, splitArea: { show: false } },
      series: [{ type: "radar", data: [
        { name: `${g} · ${e}`, value: EMOS.map((em) => +c[em].toFixed(2)), areaStyle: { opacity: 0.25 }, lineStyle: { color: css("--accent") }, itemStyle: { color: css("--accent") } },
        { name: `${e} 전체`, value: avg.map((v) => +v.toFixed(2)), lineStyle: { type: "dashed", color: css("--ink2") }, itemStyle: { color: css("--ink2") }, symbol: "none" }] }],
    });
  });
}

// ---------- AI 기반 노래 추천 ----------
// 1) 가사 의미: 곡마다 가사 전체를 다국어 문장 임베딩(multilingual-e5-small)으로 바꿔 둔 벡터와, 질의 문장을 브라우저에서 같은 모델로 바꾼 벡터의 코사인 유사도
// 2) 감정: 에이전트가 가사 전체를 읽고 매긴 플루칙 8감정 강도
// 3) 차트 성적: 연도 보정 점수(곡 순위 탭과 같은 값)
let EMB = null, embedder = null;
async function loadEmb() {
  if (!EMB) {
    const [buf] = await Promise.all([fetch("data/emb.bin").then((r) => r.arrayBuffer()), load("emb_meta"), load("emb_nn"), load("emb_map")]);
    EMB = new Int8Array(buf);
  }
  return EMB;
}
async function embedQuery(text, status) {
  if (!embedder) {
    status("AI 모델을 처음 내려받는 중입니다 (한 번만, 약 120MB)…");
    const tf = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
    tf.env.allowLocalModels = false;
    embedder = await tf.pipeline("feature-extraction", "Xenova/multilingual-e5-small", {
      progress_callback: (p) => { if (p.status === "progress" && p.file && p.file.endsWith(".onnx")) status(`AI 모델 내려받는 중… ${Math.round(p.progress)}%`); },
    });
  }
  status("문장의 의미를 계산하는 중…");
  const out = await embedder("query: " + text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}
async function initRec() {
  const S = D.songs, dim = 384;
  await Promise.all([loadEmb(), load("song_meta")]);
  const ADJ = D.song_meta.rows.map((r) => r[D.song_meta.cols.indexOf("adj")]);
  const sel = new Map();
  let qvec = null, qtext = "", sem = null;
  // ---- 감정 수레바퀴 ----
  const ring = (k, inner, outer) => ({
    type: "pie", radius: [inner, outer], startAngle: 90 + 22.5, clockwise: true,
    label: { position: "inside", fontSize: k === 2 ? 15 : 13, fontWeight: k === 2 ? 700 : 500, color: k === 1 ? "#333" : "#fff", fontFamily: "Noto Sans KR" },
    itemStyle: { borderColor: css("--card"), borderWidth: 2 },
    data: EMOS.map((e, i) => ({ name: INTENSITY[i][k - 1], value: 1, key: `e${i}:${k}`, info: { type: "emo", i, k },
      itemStyle: { color: k === 3 ? EMO_COLORS[i] : k === 2 ? mix(EMO_COLORS[i], 0.25) : mix(EMO_COLORS[i], 0.6) } })),
  });
  const dyadRing = () => ({
    type: "pie", radius: ["81%", "95%"], startAngle: 90, clockwise: true,
    label: { position: "inside", fontSize: 13, color: css("--ink"), fontFamily: "Noto Sans KR" },
    itemStyle: { borderColor: css("--card"), borderWidth: 2 },
    data: DYADS.map((d, i) => ({ name: d, value: 1, key: `d${i}`, info: { type: "dyad", i }, itemStyle: { color: css("--chip") } })),
  });
  const drawWheel = () => {
    const opt = { tooltip: { formatter: (p) => p.data.info.type === "emo" ? `${EMOS[p.data.info.i]} 강도 ${p.data.info.k} 이상: ${p.name}` : `${p.name} = ${EMOS[p.data.info.i]} + ${EMOS[(p.data.info.i + 1) % 8]}` },
      series: [ring(3, "12%", "36%"), ring(2, "36%", "58%"), ring(1, "58%", "78%"), dyadRing()] };
    opt.series.forEach((sr) => sr.data.forEach((d) => {
      if (sel.size && !sel.has(d.key)) d.itemStyle = { ...d.itemStyle, opacity: 0.35 };
      if (sel.has(d.key)) d.itemStyle = { ...d.itemStyle, borderColor: css("--ink"), borderWidth: 3, opacity: 1 };
    }));
    chart("wheel").setOption(opt, true);
    $("#recSel").innerHTML = [...sel.entries()].map(([k, v]) => `<span class="chip" data-k="${k}">${v.type === "emo" ? `${INTENSITY[v.i][v.k - 1]} <i>(${EMOS[v.i]} ≥${v.k})</i>` : `${DYADS[v.i]} <i>(${EMOS[v.i]}+${EMOS[(v.i + 1) % 8]})</i>`} <i>×</i></span>`).join("")
      + (sel.size ? `<span class="chip" data-k="*"><i>모두 지우기</i></span>` : "");
    $("#recSel").querySelectorAll(".chip").forEach((c) => (c.onclick = () => { c.dataset.k === "*" ? sel.clear() : sel.delete(c.dataset.k); drawWheel(); draw(); }));
  };
  chart("wheel").on("click", (p) => { const d = p.data; sel.has(d.key) ? sel.delete(d.key) : sel.set(d.key, d.info); drawWheel(); draw(); });
  $("#recEra").insertAdjacentHTML("beforeend", D.meta.eras.map((e) => `<option>${e}</option>`).join(""));
  $("#recGenre").insertAdjacentHTML("beforeend", D.meta.genres.map((g) => `<option>${g}</option>`).join(""));

  // ---- 점수 ----
  const empty = new Set(D.emb_meta.empty);
  const maxPop = Math.log10(1 + Math.max(...ADJ));
  const emoMatch = (e) => { if (!sel.size) return 0; let t = 0; for (const v of sel.values()) t += v.type === "emo" ? e[v.i] / 3 : (e[v.i] + e[(v.i + 1) % 8]) / 6; return t / sel.size; };
  const match = (e, v) => v.type === "emo" ? e[v.i] >= v.k : e[v.i] >= 2 && e[(v.i + 1) % 8] >= 2;
  const weights = () => ({ s: +$("#wSem").value / 100, e: +$("#wEmo").value / 100, p: +$("#wPop").value / 100 });
  const computeSem = () => {
    if (!qvec) { sem = null; return; }
    sem = new Float32Array(S.length);
    let lo = 1, hi = -1;
    for (let i = 0; i < S.length; i++) {
      let d = 0; const o = i * dim;
      for (let j = 0; j < dim; j++) d += qvec[j] * EMB[o + j];
      d /= 127; sem[i] = empty.has(i) ? -1 : d;
      if (!empty.has(i)) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
    }
    for (let i = 0; i < S.length; i++) sem[i] = sem[i] < 0 ? 0 : (sem[i] - lo) / (hi - lo || 1);   // 0~1로 맞춤
  };
  const eraRange = (e) => { const a = parseInt(e, 10); return [a, a + 9]; };
  const filt = () => {
    const era = $("#recEra").value, g = $("#recGenre").value, q = $("#recQ").value.trim().toLowerCase();
    const [ya, yb] = era ? eraRange(era) : [0, 9999];
    return S.map((s, i) => [s, i]).filter(([s, i]) => (!sem || !empty.has(i)) &&
      [...sel.values()].every((v) => match(s[7], v)) && s[3] >= ya && s[3] <= yb && (!g || s[6] === g) &&
      (!q || s[1].toLowerCase().includes(q) || s[2].toLowerCase().includes(q)));
  };
  const scoreOf = (s, i, w) => (sem ? w.s * sem[i] : 0) + w.e * emoMatch(s[7]) + w.p * Math.log10(1 + ADJ[i]) / maxPop;
  const songLi = ([s, i], extra = "") => `<li data-i="${i}"><div class="song-t"><button class="songlink" data-song="${i}">${esc(s[1])}</button>${extra}</div><div class="song-m">${esc(s[2])} · ${s[3]} · ${esc(s[6])} · 최고 순위 ${s[4]} · 차트 개월 수 ${s[5]}</div><div>${emoTags(s[7])}</div></li>`;

  // ---- 상세: 세 가지 기준의 비슷한 노래 ----
  const emoNorm = S.map((s) => { const n = Math.hypot(...s[7]); return n ? s[7].map((v) => v / n) : null; });
  const emoNN = (i) => {
    const a = emoNorm[i]; if (!a) return [];
    const r = [];
    for (let j = 0; j < S.length; j++) { if (j === i || !emoNorm[j]) continue; let d = 0; for (let k = 0; k < 8; k++) d += a[k] * emoNorm[j][k]; r.push([j, d]); }
    return r.sort((x, y) => y[1] - x[1] || S[y[0]][5] - S[x[0]][5]).slice(0, 10);
  };
  let simMode = "sem";
  const detail = (i) => {
    const s = S[i];
    const lists = {
      sem: (D.emb_nn[i] || []).map(([j, v]) => [j, `유사도 ${v.toFixed(3)}`]),
      emo: emoNN(i).map(([j, v]) => [j, `유사도 ${v.toFixed(3)}`]),
      lex: s[10].map((j) => [j, ""]),
    };
    $("#recDetail").innerHTML = `<div><h3><button class="songlink" data-song="${i}">${esc(s[1])}</button></h3>
      <p class="song-m">${esc(s[2])} · ${s[3]}년 · ${esc(s[6])} · 영어 비율 ${(s[9] * 100).toFixed(0)}%${sem ? ` · 가사 의미 ${sem[i].toFixed(2)}` : ""}</p>
      <p>${emoTags(s[7])}</p><p>${s[8].map((w) => `<span class="tag">#${esc(w)}</span>`).join("")}</p><div class="radar"></div></div>
      <div style="margin-top:12px"><h3>비슷한 노래</h3>
      <div class="seg" id="simSeg"><button data-v="sem" class="${simMode === "sem" ? "on" : ""}">가사 의미</button><button data-v="emo" class="${simMode === "emo" ? "on" : ""}">감정</button><button data-v="lex" class="${simMode === "lex" ? "on" : ""}">어휘</button></div>
      <ol class="songs">${lists[simMode].map(([j, t]) => songLi([S[j], j], ` <span class="unit">${t}</span>`)).join("") || `<li class="hint">결과가 없습니다.</li>`}</ol></div>`;
    echarts.init($("#recDetail .radar")).setOption({
      radar: { indicator: EMOS.map((e) => ({ name: e, max: 3 })), radius: "65%", splitNumber: 3, axisName: { color: css("--ink2") }, splitLine: { lineStyle: { color: css("--line") } }, splitArea: { show: false } },
      series: [{ type: "radar", data: [{ value: s[7], areaStyle: { opacity: 0.25 }, lineStyle: { color: css("--accent") }, itemStyle: { color: css("--accent") } }] }],
    });
    $("#simSeg").querySelectorAll("button").forEach((b) => (b.onclick = () => { simMode = b.dataset.v; detail(i); }));
    $("#recDetail").querySelectorAll("li[data-i]").forEach((li) => (li.onclick = (ev) => { if (!ev.target.closest(".songlink")) detail(+li.dataset.i); }));
    $("#recList").querySelectorAll("li").forEach((li) => li.classList.toggle("sel", +li.dataset.i === i));
  };

  // ---- 가사 의미 지도 ----
  const mapColor = () => $("#mapColor").value;
  let focus = null;      // 지도에서 누른 곡
  const drawMap = (hits) => {
    const mode = mapColor(), M = D.emb_map, hitSet = new Set(hits || []);
    const groups = mode === "era" ? D.meta.eras : mode === "genre" ? D.meta.genres : EMOS;
    const gOf = (s) => mode === "era" ? D.meta.eras.findIndex((e) => s[3] >= parseInt(e, 10) && s[3] <= parseInt(e, 10) + 9)
      : mode === "genre" ? D.meta.genres.indexOf(s[6]) : (Math.max(...s[7]) ? s[7].indexOf(Math.max(...s[7])) : -1);
    const colors = mode === "emo" ? EMO_COLORS : PALETTE;
    const series = groups.map((g, gi) => ({ name: g, type: "scatter", symbolSize: 5,
      itemStyle: { color: colors[gi % colors.length], opacity: hitSet.size ? 0.12 : 0.55 },
      data: S.map((s, i) => [s, i]).filter(([s, i]) => !empty.has(i) && gOf(s) === gi).map(([, i]) => [M[i][0], M[i][1], i]) }));
    if (hitSet.size) series.push({ name: "추천 결과", type: "scatter", symbolSize: 9, itemStyle: { color: css("--ink"), borderColor: "#fff", borderWidth: 1 }, data: [...hitSet].map((i) => [M[i][0], M[i][1], i]), z: 10 });
    if (focus !== null) {
      const nn = (D.emb_nn[focus] || []).slice(0, 5);
      series.push({ name: "가장 가까운 5곡", type: "lines", coordinateSystem: "cartesian2d", silent: true, z: 11,
        lineStyle: { color: css("--accent"), width: 1.5, opacity: 0.9 }, data: nn.map(([j]) => ({ coords: [[M[focus][0], M[focus][1]], [M[j][0], M[j][1]]] })) });
      series.push({ name: "가장 가까운 5곡 ", type: "scatter", symbolSize: 11, z: 12, itemStyle: { color: css("--accent"), borderColor: "#fff", borderWidth: 1.5 }, data: nn.map(([j]) => [M[j][0], M[j][1], j]) });
      series.push({ name: "고른 곡", type: "scatter", symbolSize: 16, z: 13, itemStyle: { color: css("--ink"), borderColor: "#fff", borderWidth: 2 }, data: [[M[focus][0], M[focus][1], focus]] });
    }
    chart("embMap").dispatchAction({ type: "hideTip" });
    chart("embMap").setOption({
      tooltip: { formatter: (p) => (p.data && S[p.data[2]] ? `${esc(S[p.data[2]][1])}<br>${esc(S[p.data[2]][2])} · ${S[p.data[2]][3]}` : "") },
      legend: { type: "scroll", bottom: 0, textStyle: baseText() }, grid: { left: 10, right: 10, top: 10, bottom: 40 },
      xAxis: { show: false, scale: true }, yAxis: { show: false, scale: true }, series,
    }, true);
    chart("embMap").getZr().setCursorStyle && chart("embMap").getZr().setCursorStyle("crosshair");
  };
  const mapSide = (i) => {
    const s = S[i], nn = (D.emb_nn[i] || []).slice(0, 5);
    $("#mapSide").innerHTML = `<h3><button class="songlink" data-song="${i}">${esc(s[1])}</button></h3><p class="song-m">${esc(s[2])} · ${s[3]} · ${esc(s[6])}</p><p>${emoTags(s[7])}</p>
      <h3>가사 의미 유사 5곡</h3><ol class="songs">${nn.map(([j, v]) => songLi([S[j], j], ` <span class="unit">유사도 ${v.toFixed(3)}</span>`)).join("")}</ol>`;
    $("#mapSide").querySelectorAll("li[data-i]").forEach((li) => (li.onclick = (ev) => { if (!ev.target.closest(".songlink")) { focus = +li.dataset.i; mapSide(focus); chart("embMap").resize(); drawMap(lastHits); } }));
  };
  // 지도 아무 데나 누르면 그 자리에서 가장 가까운 곡을 고른다 (데이터 좌표에서 계산)
  chart("embMap").getZr().on("click", (e) => {
    const c = chart("embMap"), M = D.emb_map;
    const p = c.convertFromPixel({ gridIndex: 0 }, [e.offsetX, e.offsetY]);
    if (!p || isNaN(p[0])) return;
    const a = c.convertFromPixel({ gridIndex: 0 }, [0, 0]), b = c.convertFromPixel({ gridIndex: 0 }, [1, 1]);
    const sx = Math.abs(b[0] - a[0]) || 1, sy = Math.abs(b[1] - a[1]) || 1;     // 화면 1px당 데이터 크기
    let best = -1, bd = Infinity;
    for (let i = 0; i < M.length; i++) {
      if (empty.has(i)) continue;
      const d = ((M[i][0] - p[0]) / sx) ** 2 + ((M[i][1] - p[1]) / sy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { focus = best; mapSide(focus); c.resize(); drawMap(lastHits); }
  });
  $("#mapColor").onchange = () => drawMap(lastHits);

  let lastHits = [];
  const draw = () => {
    const w = weights();
    $("#wInfo").textContent = `추천 점수 = 가사 의미 × ${(w.s).toFixed(2)} + 감정 × ${(w.e).toFixed(2)} + 차트 성적 × ${(w.p).toFixed(2)}`;
    const rows = filt().map(([s, i]) => [s, i, scoreOf(s, i, w)]).sort((a, b) => b[2] - a[2]);
    $("#recCount").textContent = `추천 점수 상위 ${Math.min(100, rows.length)}곡 (조건에 맞는 곡 ${rows.length.toLocaleString()}곡)${qtext ? ` · “${qtext}”` : ""}`;
    $("#recList").innerHTML = rows.slice(0, 100).map(([s, i, sc]) => songLi([s, i], ` <span class="unit">추천 점수 ${sc.toFixed(2)}</span>`)).join("");
    $("#recList").querySelectorAll("li").forEach((li) => (li.onclick = (ev) => { if (!ev.target.closest(".songlink")) detail(+li.dataset.i); }));
    lastHits = rows.slice(0, 30).map((r) => r[1]);
    if (rows.length) detail(rows[0][1]); else $("#recDetail").innerHTML = `<p class="hint">조건에 맞는 곡이 없습니다.</p>`;
    drawMap(qtext || sel.size ? lastHits : []);
  };
  const status = (t) => ($("#aiStatus").textContent = t);
  $("#aiGo").onclick = async () => {
    const t = $("#aiQ").value.trim();
    if (!t) { qvec = null; qtext = ""; sem = null; status(""); draw(); return; }
    $("#aiGo").disabled = true;
    try { qvec = await embedQuery(t, status); qtext = t; computeSem(); status(`가사 8,250곡과 의미 유사도를 비교했습니다.`); }
    catch (e) { status("AI 모델을 불러오지 못했습니다: " + e.message); }
    $("#aiGo").disabled = false; draw();
  };
  $("#aiQ").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#aiGo").click(); } };
  $("#aiClear").onclick = () => { $("#aiQ").value = ""; qvec = null; qtext = ""; sem = null; status(""); draw(); };
  ["#recEra", "#recGenre"].forEach((id) => ($(id).onchange = draw));
  ["#wSem", "#wEmo", "#wPop"].forEach((id) => ($(id).oninput = draw));
  $("#recQ").oninput = draw;
  drawWheel(); draw();
}

// ---------- 곡 팝업: 노래 정보·감정·차트 이력·가사 ----------
const shardCache = {};
async function songExtra(i) {
  const n = Math.floor(i / 200);
  if (!shardCache[n]) shardCache[n] = await (await fetch(`data/lyrics/${String(n).padStart(3, "0")}.json`)).json();
  return shardCache[n][i % 200];
}
async function openSong(i, key, line) {
  const s = D.songs[i], x = await songExtra(i);
  const lines = x.l.map((l) => { const h = key && !key.startsWith("fig:") ? highlight(l, key) : esc(l); return l === line ? `<span class="hit">${h}</span>` : h; });
  const best = x.h.reduce((a, b) => (b[1] < a[1] ? b : a), x.h[0]);
  $("#modalBody").innerHTML = `<h2 id="mTitle">${esc(s[1])}</h2><p class="song-m">${esc(s[2])}</p>
    <div class="modal-grid"><div>
      <table class="meta-tbl">
        <tr><th>앨범</th><td>${esc(x.album || "-")}</td></tr>
        <tr><th>발매일</th><td>${esc(x.rel || "-")}</td></tr>
        <tr><th>장르</th><td>${esc(x.genre || "-")}</td></tr>
        <tr><th>차트</th><td>${x.h[0][0]} ~ ${x.h[x.h.length - 1][0]} · ${x.h.length}회 · 최고 ${best[1]}위 (${best[0]})</td></tr>
        <tr><th>영어 비율</th><td>${(s[9] * 100).toFixed(0)}%</td></tr>
        <tr><th>특징어</th><td>${s[8].map((w) => `<span class="tag">#${esc(w)}</span>`).join("")}</td></tr>
        <tr><th>멜론</th><td><a href="${MELON(s[0], s[1], s[2])}" target="_blank" rel="noopener">${s[0].startsWith("x") ? "멜론에서 검색" : "곡 페이지"} ↗</a></td></tr>
      </table>
      <h3>감정 (플루칙)</h3><p>${emoTags(s[7])}</p>
      <div class="radar" id="mRadar"></div>
      <h3>월간 차트 순위</h3><div class="histchart" id="mHist"></div>
    </div><div>
      <h3>가사 <span class="unit">(${x.l.length}행)</span></h3>
      <pre class="lyrics">${lines.join("\n")}</pre>
    </div></div>`;
  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
  echarts.init($("#mRadar")).setOption({
    radar: { indicator: EMOS.map((e) => ({ name: e, max: 3 })), radius: "65%", splitNumber: 3, axisName: { color: css("--ink2") }, splitLine: { lineStyle: { color: css("--line") } }, splitArea: { show: false } },
    series: [{ type: "radar", data: [{ value: s[7], areaStyle: { opacity: 0.25 }, lineStyle: { color: css("--accent") }, itemStyle: { color: css("--accent") } }] }],
  });
  echarts.init($("#mHist")).setOption({
    grid: { left: 36, right: 10, top: 10, bottom: 24 }, tooltip: { trigger: "axis", valueFormatter: (v) => v + "위" },
    xAxis: { type: "category", data: x.h.map((h) => h[0]), ...axisStyle() },
    yAxis: { type: "value", inverse: true, min: 1, max: 100, ...axisStyle() },
    series: [{ type: "line", data: x.h.map((h) => h[1]), symbolSize: 5, lineStyle: { color: css("--accent") }, itemStyle: { color: css("--accent") } }],
  });
  const m = $("#modalBody .hit") || $("#modalBody mark");
  if (m) m.scrollIntoView({ block: "center" });
}
function closeSong() { $("#modal").hidden = true; document.body.style.overflow = ""; }
$("#modalX").onclick = closeSong;
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeSong(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeSong(); });
document.addEventListener("click", (e) => {
  const b = e.target.closest(".songlink");
  if (b) { e.preventDefault(); e.stopPropagation(); openSong(+b.dataset.song, b.dataset.key, b.dataset.line); }
}, true);

// ---------- 비유 표현 ----------
// 받침 유무로 조사 고르기
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const figParts = (it) => {        // [원관념, 보조관념]
  if (it[1] === "met") { const [t, s] = it[3].split("→"); return [t === "?" ? "" : t, s]; }
  return ["", it[3]];
};
const figSentence = (it) => {
  const [t, s] = figParts(it);
  if (it[1] === "met") return `${t || "(무엇)"}${t && !hasBatchim(t) ? "는" : "은"} ${s}${hasBatchim(s) ? "이다" : "다"}`;
  const m = Object.keys(it[4])[0] || "";
  if (it[2] === "en") return m === "as … as" ? `as … as ${s}` : `like ${s}`;
  return m === "같다" ? `${s} 같은` : m === "듯" ? `${s}인 듯` : `${s}${m}`;
};
async function initFig() {
  await load("figur");
  const F = D.figur, years = D.meta.years;
  const eras = D.meta.eras;
  const heat = (t) => {
    const [kind, lang] = t.split("|");
    let rows = F.items.filter((it) => it[1] === kind && it[2] === lang);
    if (kind === "met") {          // 같은 보조관념의 쌍을 더해 보조관념 단위로
      const g = new Map();
      for (const it of rows) {
        const s = figParts(it)[1];
        if (!g.has(s)) g.set(s, { label: s, rates: it[8].map(() => 0), w: 0, items: [] });
        const x = g.get(s); it[8].forEach((v, i) => (x.rates[i] += v)); x.w += it[5]; x.items.push(it);
      }
      rows = [...g.values()].sort((a, b) => b.w - a.w).slice(0, 40).map((x) => { const it = [...x.items[0]]; it[3] = x.label; it[8] = x.rates.map((v) => +v.toFixed(3)); it.group = x.items; return it; });
    } else rows = rows.slice(0, 40);
    // 가장 많이 쓰인 시대(가중 평균 시대) 순으로 정렬 → 위는 이른 시기, 아래는 최근
    const center = (it) => { const v = it[8], s = v.reduce((a, b) => a + b, 0) || 1; return v.reduce((a, x, i) => a + x * i, 0) / s; };
    rows = rows.sort((a, b) => center(a) - center(b));
    const data = [];
    rows.forEach((it, r) => { const mx = Math.max(...it[8]) || 1; it[8].forEach((v, c) => data.push([c, r, +(v / mx).toFixed(3), v])); });
    $("#figHeat").style.height = Math.max(240, rows.length * 22 + 80) + "px";
    chart("figHeat").resize();
    chart("figHeat").setOption({
      tooltip: { formatter: (p) => `${esc(rows[p.value[1]][3])} · ${eras[p.value[0]]}<br>1천 행당 ${p.value[3]}` },
      grid: { left: 120, right: 20, top: 34, bottom: 10 },
      xAxis: { type: "category", data: eras, position: "top", ...axisStyle(), splitArea: { show: false } },
      yAxis: { type: "category", data: rows.map((it) => it[3]), inverse: true, ...axisStyle() },
      visualMap: { show: false, min: 0, max: 1, inRange: { color: ["#f8fafc", mix(css("--accent").startsWith("#") ? css("--accent") : "#c2410c", 0.35), css("--accent")] } },
      series: [{ type: "heatmap", data, label: { show: true, formatter: (p) => (p.value[3] ? p.value[3].toFixed(2) : ""), fontSize: 10 } }],
    }, true);
    chart("figHeat").off("click");
    chart("figHeat").on("click", (p) => { const it = rows[p.value[1]]; side(it.group ? it.group[0] : it); });
  };
  let type = "sim|ko";
  const exHTML = (key) => {
    const ex = F.examples[key] || [];
    if (!ex.length) return `<p class="hint">용례 없음</p>`;
    return `<ul class="ex">${ex.map(([raw, si, span]) => {
      const s = D.songs[si], at = raw.indexOf(span);
      const q = at >= 0 ? esc(raw.slice(0, at)) + `<mark>${esc(span)}</mark>` + esc(raw.slice(at + span.length)) : esc(raw);
      return `<li><q>${q}</q><small><button class="songlink" data-song="${si}" data-key="fig:" data-line="${esc(raw)}">${esc(s[1])}</button> · ${esc(s[2])} · ${s[3]}</small></li>`;
    }).join("")}</ul>`;
  };
  const side = (it) => {
    const el = $("#fgSide");
    const pairs = it[11] && it[11].length ? `<p>원관념: ${it[11].map(([t, c]) => `<span class="tag">${esc(t)} <i>${c}</i></span>`).join("")}</p>` : "";
    const [ft, fs] = figParts(it);
    tsPanel($("#fgTS"), figSentence(it), it[7], (it[13] || it[7].map(() => 0)).map((v, i) => v / D.meta.year_songs[i] * 100), "1천 행당");
    el.innerHTML = `<h3>${esc(figSentence(it))}</h3><p class="hint">원관념 ${esc(ft || "-")} · 보조관념 ${esc(fs)}</p><p class="hint">곡 비율 ${(it[6] / D.meta.n_songs * 100).toFixed(2)}% · ${it[1] === "met" ? "유형" : "표지"} ${Object.entries(it[4]).map(([m, c]) => `${esc(m)} ${c}`).join(", ")}</p>${pairs}
      <h3>연도별 흐름 <span class="unit">(가사 1천 행당)</span></h3><div class="mini"></div>
      <h3>장르별 분포 <span class="unit">(이 비유 전체 출현 = 100%)</span></h3><div class="dist g"></div><div class="songbox"></div>`;
    songListInto(el.querySelector(".songbox"), { title: "이 비유가 나오는 곡", hits: it[14] || [], mark: new RegExp(reEsc(figParts(it)[1]).replace(/ /g, "\\s*")) });
    const gb = echarts.init(el.querySelector(".dist.g"));
    gb.setOption({ grid: { left: 72, right: 52, top: 4, bottom: 4 }, xAxis: { type: "value", show: false, max: 100 },
      tooltip: { formatter: (p) => `${D.meta.genres[p.dataIndex]}<br>점유율 ${it[12][p.dataIndex]}%<br>1천 행당 ${it[9][p.dataIndex]}<br>곡 비율 ${it[10][p.dataIndex]}%` },
      yAxis: { type: "category", data: D.meta.genres, inverse: true, ...axisStyle(), axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: "bar", data: it[12], barWidth: "60%", itemStyle: { color: css("--accent"), opacity: 0.75 },
        label: { show: true, position: "right", formatter: (p) => `${it[12][p.dataIndex]}%`, color: css("--ink2"), fontSize: 11 } }] });
    echarts.init(el.querySelector(".mini")).setOption({
      grid: { left: 36, right: 8, top: 10, bottom: 24 }, tooltip: { trigger: "axis", valueFormatter: (v) => (+v).toFixed(3) + " /1천 행" },
      xAxis: { type: "category", data: years, ...axisStyle(), axisLabel: { ...baseText(), interval: 4 } }, yAxis: { type: "value", ...axisStyle() },
      series: [{ type: "line", data: it[7], smooth: true, symbol: "none", lineStyle: { color: css("--accent"), width: 2 }, areaStyle: { color: css("--accent"), opacity: 0.12 } }],
    });
  };
  const draw = () => {
    const [kind, lang] = type.split("|"), q = $("#fgQ").value.trim().toLowerCase();
    const rows = F.items.filter((it) => it[1] === kind && it[2] === lang && (!q || it[3].toLowerCase().includes(q)));
    $("#fgTbl tbody").innerHTML = rows.map((it, i) => {
      const peak = years[it[7].indexOf(Math.max(...it[7]))];
      const per = it[7].reduce((a, b) => a + b, 0) / it[7].length;
      const [t, sv] = figParts(it);
      return `<tr data-i="${F.items.indexOf(it)}"><td>${esc(t || "-")}</td><td>${esc(sv)}</td><td>${esc(figSentence(it))}</td><td>${Object.keys(it[4]).slice(0, 2).map(esc).join(", ")}</td><td class="num">${per.toFixed(3)}</td><td class="num">${(it[6] / D.meta.n_songs * 100).toFixed(2)}%</td><td class="num">${peak}</td></tr>`;
    }).join("");
    $("#fgTbl tbody").querySelectorAll("tr").forEach((tr) => (tr.onclick = () => {
      $("#fgTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      side(F.items[+tr.dataset.i]);
    }));
    if (rows.length) side(rows[0]); else $("#fgSide").innerHTML = `<p class="hint">해당 항목이 없습니다.</p>`;
    changeBox($("#fgCH"), { items: rows.map((it) => ({ k: it[0], label: figSentence(it), sub: "", rates: it[7], w: it[6], it })), unit: "1천 행당", minW: 10, onPick: (x) => side(x.it) });
  };
  seg("#fgType", (v) => { type = v; draw(); });
  seg("#fgHeatType", (v) => heat(v));
  heat("sim|ko");
  $("#fgQ").oninput = draw;
  draw();
}


// ---------- 자리(슬롯) 조건: N-gram, Cluster, PoS-gram 공통 ----------
// 자리마다 형태소·품사태그를 넣는다(PoS-gram은 품사태그만). 비우면 아무거나. 일치는 정확히 같을 때.
const KO_FORMS = {}, EN_FORMS = {};
function formList(lang) {
  const store = lang === "ko" ? KO_FORMS : EN_FORMS;
  if (!store.list) {
    const c = new Map();
    for (const r of D.clusters[lang]) {
      const parts = r[0].split(" ");
      for (const p of parts) { const f = lang === "ko" ? p.slice(0, p.lastIndexOf("/")) : p; c.set(f, (c.get(f) || 0) + r[2]); }
    }
    store.list = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3000).map(([f]) => f);
  }
  return store.list;
}
function makeSlots(el, { tagOnly = false, onChange }) {
  let n = 2, lang = "ko";
  const vals = [];
  const render = () => {
    const tags = lang === "ko" ? KO_SLOT_TAGS : LAYER_TAGS.en;
    el.innerHTML = `<div class="slotrow">${Array.from({ length: n }, (_, i) => `
      <div class="slot"><label>${i + 1}번째</label>
        ${tagOnly ? "" : `<input data-i="${i}" data-f="f" list="${el.id}-forms" placeholder="형태소" value="${esc((vals[i] || {}).f || "")}" spellcheck="false">`}
        <input data-i="${i}" data-f="t" list="${el.id}-tags" placeholder="품사태그" value="${esc((vals[i] || {}).t || "")}" spellcheck="false">
      </div>`).join("")}</div>
      <datalist id="${el.id}-tags">${tags.map((t) => `<option value="${t}">${TAG_NAMES[t] || ""}</option>`).join("")}</datalist>
      ${tagOnly ? "" : `<datalist id="${el.id}-forms">${formList(lang).map((f) => `<option value="${esc(f)}">`).join("")}</datalist>`}`;
    el.querySelectorAll("input").forEach((inp) => {
      inp.oninput = () => { const i = +inp.dataset.i; vals[i] = vals[i] || {}; vals[i][inp.dataset.f] = inp.value.trim(); };
      inp.onchange = () => onChange();
      inp.onkeydown = (e) => { if (e.key === "Enter") onChange(); };
    });
  };
  return {
    setN(k) { n = k; vals.length = Math.min(vals.length, n); render(); },
    setLang(l) { if (l !== lang) { lang = l; vals.length = 0; } render(); },
    get n() { return n; },
    cons() { return Array.from({ length: n }, (_, i) => ({ f: ((vals[i] || {}).f || "").toLowerCase(), t: ((vals[i] || {}).t || "").toUpperCase() })); },
    match(parts) {      // parts: [[form, tag], ...]
      const c = this.cons();
      return parts.length === n && c.every((x, i) => (!x.f || parts[i][0].toLowerCase() === x.f) && (!x.t || parts[i][1] === x.t));
    },
    desc() {
      const c = this.cons().map((x, i) => (x.f || x.t ? `${i + 1}번째 ${x.f}${x.t ? "/" + x.t : ""}` : "")).filter(Boolean);
      return c.length ? `자리 조건 ${c.join(", ")}` : "자리 조건 없음";
    },
  };
}
const ngParts = (key) => {
  if (key.startsWith("kom:")) return key.slice(4).split(" ").map((p) => [p.slice(0, p.lastIndexOf("/")), p.slice(p.lastIndexOf("/") + 1)]);
  const ws = key.slice(4).split(" "), ts = tagOf(key).split(" ");
  return ws.map((w, i) => [w, ts[i] || ""]);
};
const relf = (w) => (w / D.meta.tok_total * D.meta.pmw);
const PMW_NOTE = "* 십만 어절당";

// ---------- 공통: 하위 말뭉치(시대 × 장르) 선택 ----------
function subPicker(el, { title, allowRest = false, onChange, initEras }) {
  const eras = D.meta.eras, genres = D.meta.genres;
  const selE = new Set(initEras || eras), selG = new Set(genres);
  let rest = allowRest;            // 참조 말뭉치: '목표 외 전체'
  const render = () => {
    el.innerHTML = `<div class="sub"><b>${title}</b>
      ${allowRest ? `<label class="restchk"><input type="checkbox" ${rest ? "checked" : ""}> 목표 말뭉치를 뺀 나머지 전체</label>` : ""}
      <div class="subrow ${rest ? "dim" : ""}"><span class="lbl">시대</span>${eras.map((e) => `<span class="chip ${selE.has(e) ? "on" : ""}" data-e="${e}">${e}</span>`).join("")}
        <button type="button" class="mini-btn" data-all="e">전체 선택</button><button type="button" class="mini-btn" data-none="e">전체 해제</button></div>
      <div class="subrow ${rest ? "dim" : ""}"><span class="lbl">장르</span>${genres.map((g) => `<span class="chip ${selG.has(g) ? "on" : ""}" data-g="${g}">${g}</span>`).join("")}
        <button type="button" class="mini-btn" data-all="g">전체 선택</button><button type="button" class="mini-btn" data-none="g">전체 해제</button></div></div>`;
    el.querySelectorAll("[data-all]").forEach((b) => (b.onclick = () => { const set = b.dataset.all === "e" ? selE : selG; (b.dataset.all === "e" ? eras : genres).forEach((x) => set.add(x)); render(); onChange(); }));
    el.querySelectorAll("[data-none]").forEach((b) => (b.onclick = () => { (b.dataset.none === "e" ? selE : selG).clear(); render(); onChange(); }));
    el.querySelectorAll(".chip[data-e]").forEach((c) => (c.onclick = () => { if (rest) return; const e = c.dataset.e; selE.has(e) ? selE.delete(e) : selE.add(e); render(); onChange(); }));
    el.querySelectorAll(".chip[data-g]").forEach((c) => (c.onclick = () => { if (rest) return; const g = c.dataset.g; selG.has(g) ? selG.delete(g) : selG.add(g); render(); onChange(); }));
    const rc = el.querySelector(".restchk input");
    if (rc) rc.onchange = () => { rest = rc.checked; render(); onChange(); };
  };
  render();
  return {
    get rest() { return rest; },
    cells() { return D.cells.cells.map((c, i) => [c, i]).filter(([[e, g]]) => selE.has(e) && selG.has(g)).map(([, i]) => i); },
    desc() {
      if (rest) return "목표 말뭉치를 뺀 나머지 전체";
      const e = selE.size === eras.length ? "전체 시대" : [...selE].join(", ");
      const g = selG.size === genres.length ? "전체 장르" : [...selG].join(", ");
      return `${e} / ${g}`;
    },
  };
}
// 셀 합산: [절대빈도, 출현 곡 수]
function cellSum(key, idx) {
  const it = D.cells.items[key];
  if (!it) return [0, 0];
  let a = 0, s = 0;
  for (const i of idx) { a += it[0][i]; s += it[1][i]; }
  return [a, s];
}
const sumOf = (arr, idx) => idx.reduce((t, i) => t + arr[i], 0);

// ---------- 공통: 비교 원천 (단어 / N-gram: n과 자리 조건) ----------
function sourcePicker(el, { allowWords = true, onChange }) {
  el.innerHTML = `<div class="row wrapgap">
      <span class="lbl">원천</span>
      <div class="seg src">${allowWords ? `<button data-v="ko" class="on">한국어 단어</button><button data-v="en">영어 단어</button>` : ""}<button data-v="ng" ${allowWords ? "" : 'class="on"'}>N-gram</button></div>
      <div class="ngopt" ${allowWords ? "hidden" : ""}>
        <div class="seg nglang"><button data-v="ko" class="on">한국어</button><button data-v="en">영어</button></div>
        <div class="seg ngn"><button data-v="2" class="on">n=2</button><button data-v="3">n=3</button><button data-v="4">n=4</button><button data-v="5">n=5</button></div>
      </div>
    </div><div class="slots" id="${el.id}-slots" ${allowWords ? "hidden" : ""}></div>`;
  let src = allowWords ? "ko" : "ng", lang = "ko";
  const slots = makeSlots(el.querySelector(".slots"), { onChange });
  slots.setN(2);
  const segs = (cls, cb) => el.querySelectorAll(`.${cls} button`).forEach((b) => (b.onclick = () => {
    el.querySelectorAll(`.${cls} button`).forEach((x) => x.classList.toggle("on", x === b)); cb(b.dataset.v); onChange();
  }));
  segs("src", (v) => { src = v; el.querySelector(".ngopt").hidden = v !== "ng"; el.querySelector(".slots").hidden = v !== "ng"; });
  segs("nglang", (v) => { lang = v; slots.setLang(v); });
  segs("ngn", (v) => slots.setN(+v));
  return {
    get src() { return src; },
    layer() { return src === "ng" ? "mwe" : src; },
    keys() {
      if (src === "ko") return D.freq.ko.map((r) => r[0]);
      if (src === "en") return D.freq.en.map((r) => r[0]);
      const pre = lang === "ko" ? "kom:" : "enm:";
      return D.freq.mwe.map((r) => r[0]).filter((k) => k.startsWith(pre) && slots.match(ngParts(k)));
    },
    desc() { return src === "ko" ? "한국어 단어" : src === "en" ? "영어 단어" : `N-gram (${lang === "ko" ? "한국어" : "영어"}) | n=${slots.n} | ${slots.desc()}`; },
  };
}
const LL = (a, b, c, d) => {   // a,b: 목표·참조 절대빈도, c,d: 목표·참조 어절 수
  const e1 = c * (a + b) / (c + d), e2 = d * (a + b) / (c + d);
  return 2 * ((a > 0 ? a * Math.log(a / e1) : 0) + (b > 0 ? b * Math.log(b / e2) : 0));
};
const LR = (a, b, c, d) => Math.log2(((a || 0.5) / c) / ((b || 0.5) / d));
const fmt = (v, k = 2) => (isFinite(v) ? v.toFixed(k) : "-");

// ---------- 빈도 목록: 하위 말뭉치, 비교 ----------
async function initFreq() {
  await Promise.all([load("freq"), load("cells"), load("series"), load("clusters"), load("ts")]);
  const pos = posFilter($("#frPos"), () => draw());
  const source = sourcePicker($("#frSrc"), { onChange: () => draw() });
  const A = subPicker($("#frA"), { title: "분석 대상 곡 (시대·장르로 고르기)", onChange: () => draw() });
  const B = subPicker($("#frB"), { title: "비교 대상 곡 (시대·장르로 고르기)", onChange: () => draw() });
  let cmp = false, sortBy = "a";
  $("#frCmp").onchange = () => { cmp = $("#frCmp").checked; $("#frB").hidden = !cmp; $("#frSortB").hidden = !cmp; draw(); };
  const SHOW = 1000;
  const draw = () => {
    pos.render(source.layer());
    const q = $("#frQ").value.trim().toLowerCase();
    const ia = A.cells(), ib = B.cells();
    const ea = sumOf(D.cells.eoj, ia), eb = sumOf(D.cells.eoj, ib);
    const sa = sumOf(D.cells.songs, ia), sb = sumOf(D.cells.songs, ib);
    let rows = [];
    for (const k of source.keys()) {
      if (q && !label(k).toLowerCase().includes(q)) continue;
      if (!pos.match(k)) continue;
      const [a, as] = cellSum(k, ia);
      if (!cmp && !a) continue;
      const row = { k, ar: ea ? a / ea * D.meta.pmw : 0, as: sa ? as / sa * 100 : 0, a };
      if (cmp) { const [b, bs] = cellSum(k, ib); if (!a && !b) continue; Object.assign(row, { br: eb ? b / eb * D.meta.pmw : 0, bs: sb ? bs / sb * 100 : 0, b, lr: LR(a, b, ea, eb) }); }
      rows.push(row);
    }
    const key = { a: "ar", as: "as", b: "br", bs: "bs", lr: "lr", lrn: "lr" }[sortBy];
    rows.sort((x, y) => (sortBy === "lrn" ? x.lr - y.lr : y[key] - x[key]));
    $("#frInfo").textContent = `${source.desc()} | 분석 대상: ${A.desc()}${cmp ? ` | 비교 대상: ${B.desc()}` : ""} | ${rows.length.toLocaleString()}개${rows.length > SHOW ? `, 상위 ${SHOW.toLocaleString()}개 표시` : ""} | ${PMW_NOTE}`;
    $("#frTbl thead").innerHTML = cmp
      ? `<tr><th class="num">순위</th><th>항목</th><th>품사태그</th><th class="num">분석 대상<br>상대빈도*</th><th class="num">분석 대상<br>곡 비율</th><th class="num">비교 대상<br>상대빈도*</th><th class="num">비교 대상<br>곡 비율</th><th class="num">Log Ratio<br>(분석/비교)</th></tr>`
      : `<tr><th class="num">순위</th><th>항목</th><th>품사태그</th><th class="num">상대빈도*</th><th class="num">곡 비율</th></tr>`;
    $("#frTbl tbody").innerHTML = rows.length ? rows.slice(0, SHOW).map((r, i) => `<tr data-k="${esc(r.k)}"><td class="num">${i + 1}</td><td>${esc(label(r.k))}</td><td>${ptag(r.k)}</td>
      <td class="num">${fmt(r.ar)}</td><td class="num">${fmt(r.as)}%</td>${cmp ? `<td class="num">${fmt(r.br)}</td><td class="num">${fmt(r.bs)}%</td><td class="num">${fmt(r.lr)}</td>` : ""}</tr>`).join("")
      : `<tr><td colspan="8" class="hint">결과가 없습니다.</td></tr>`;
    $("#frTbl tbody").querySelectorAll("tr[data-k]").forEach((tr) => (tr.onclick = () => {
      $("#frTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      termPanel($("#frSide"), tr.dataset.k);
      tsForKey($("#frTS"), tr.dataset.k);
    }));
    changeBox($("#frCH"), { items: keyItems(rows.slice(0, 3000).map((r) => r.k)), onPick: (x) => { termPanel($("#frSide"), x.k); tsForKey($("#frTS"), x.k); } });
  };
  $("#frSortA").onchange = () => { sortBy = $("#frSortA").value; draw(); };
  $("#frSortB").onchange = () => { sortBy = $("#frSortB").value; draw(); };
  $("#frQ").oninput = draw;
  draw();
}

// ---------- 핵심어: 목표 말뭉치 vs 참조 말뭉치 ----------
async function initKW() {
  await Promise.all([load("freq"), load("cells"), load("series"), load("clusters"), load("ts")]);
  const source = sourcePicker($("#kwSrc"), { onChange: () => draw() });
  const T = subPicker($("#kwT"), { title: "목표 말뭉치", onChange: () => draw(), initEras: [D.meta.eras[D.meta.eras.length - 1]] });
  const R = subPicker($("#kwR"), { title: "참조 말뭉치", allowRest: true, onChange: () => draw() });
  const pos = posFilter($("#kwPos"), () => draw());
  let side = "target";
  seg("#kwSide2", (v) => { side = v; draw(); });
  const draw = () => {
    pos.render(source.layer());
    const it = T.cells();
    let ir = R.rest ? D.cells.cells.map((_, i) => i).filter((i) => !it.includes(i)) : R.cells();
    const c = sumOf(D.cells.eoj, it), d = sumOf(D.cells.eoj, ir);
    const minF = +$("#kwMin").value, crit = +$("#kwSig").value, sortBy = $("#kwSort").value;
    const overlap = !R.rest && it.some((i) => ir.includes(i));
    const rows = [];
    if (c && d && !overlap) {
      for (const k of source.keys()) {
        if (!pos.match(k)) continue;
        const [a] = cellSum(k, it), [b] = cellSum(k, ir);
        const pa = a / c, pb = b / d;
        if (side === "target" ? (pa < pb || a < minF) : (pb <= pa || b < minF)) continue;
        const ll = LL(a, b, c, d);
        if (ll < crit) continue;
        rows.push({ k, a, b, ra: pa * D.meta.pmw, rb: pb * D.meta.pmw, ll, lr: LR(a, b, c, d) });
      }
    }
    rows.sort((x, y) => sortBy === "ll" ? y.ll - x.ll : side === "target" ? y.lr - x.lr : x.lr - y.lr);
    $("#kwInfo").textContent = overlap ? "목표 말뭉치와 참조 말뭉치가 겹칩니다. 시대나 장르를 겹치지 않게 골라 주세요."
      : `목표 ${T.desc()}, 참조 ${R.desc()} | ${source.desc()} | 최소 빈도 ${minF} | LL ≥ ${crit} | ${rows.length.toLocaleString()}개 | ${PMW_NOTE}`;
    $("#kwTbl tbody").innerHTML = rows.length ? rows.slice(0, 1000).map((r, i) => `<tr data-k="${esc(r.k)}"><td class="num">${i + 1}</td><td>${esc(label(r.k))}</td><td>${ptag(r.k)}</td>
      <td class="num">${fmt(r.ra)}</td><td class="num">${fmt(r.rb)}</td><td class="num">${fmt(r.ll, 1)}</td><td class="num">${fmt(r.lr)}</td></tr>`).join("")
      : `<tr><td colspan="7" class="hint">결과가 없습니다.</td></tr>`;
    $("#kwTbl tbody").querySelectorAll("tr[data-k]").forEach((tr) => (tr.onclick = () => {
      $("#kwTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      termPanel($("#kwSidePanel"), tr.dataset.k);
      tsForKey($("#kwTS"), tr.dataset.k);
    }));
    changeBox($("#kwCH"), { items: keyItems(rows.slice(0, 1000).map((r) => r.k)), minW: 10, onPick: (x) => { termPanel($("#kwSidePanel"), x.k); tsForKey($("#kwTS"), x.k); } });
  };
  ["#kwMin", "#kwSig", "#kwSort"].forEach((id) => ($(id).onchange = draw));
  draw();
}

// ---------- 공기어: 중심어를 자리 조건으로 ----------
async function initCol() {
  await Promise.all([load("colloc_index"), load("freq"), load("clusters")]);
  const fq = {};
  for (const l of ["ko", "en", "mwe"]) for (const r of D.freq[l]) fq[r[0]] = r[1];
  const nodes = Object.keys(D.colloc_index);
  const shard = {};
  const getCol = async (k) => {
    const n = D.colloc_index[k];
    if (shard[n] === undefined) shard[n] = await (await fetch(`data/colloc/${String(n).padStart(3, "0")}.json`)).json();
    return shard[n][k];
  };
  // 중심어 자리 조건: n=1이면 단어, 2~5면 N-gram
  $("#colNode").innerHTML = `<div class="row wrapgap"><span class="lbl">중심어</span>
      <div class="seg cl-lang"><button data-v="ko" class="on">한국어</button><button data-v="en">영어</button></div>
      <div class="seg cl-n"><button data-v="1" class="on">단어 (n=1)</button><button data-v="2">n=2</button><button data-v="3">n=3</button><button data-v="4">n=4</button><button data-v="5">n=5</button></div>
      <button class="primary cl-go">찾기</button></div>
      <div class="row wrapgap cl-word"><input id="colWord" list="colWordList" placeholder="단어 (예: 사랑, 눈물, love)"><datalist id="colWordList"></datalist></div>
      <div class="slots" id="colSlots" hidden></div>
      <div class="row wrapgap"><span class="lbl">조건에 맞는 중심어</span><select id="colPick"></select><span class="hint" id="colCount"></span></div>`;
  let lang = "ko", n = 1;
  const slots = makeSlots($("#colSlots"), { onChange: () => find() });
  const fillWords = () => { $("#colWordList").innerHTML = nodes.filter((k) => k.startsWith(lang === "ko" ? "ko:" : "en:")).sort((a, b) => (fq[b] || 0) - (fq[a] || 0)).slice(0, 3000).map((k) => `<option value="${esc(label(k))}">`).join(""); };
  fillWords();
  $("#colWord").onchange = () => find();
  $("#colWord").onkeydown = (e) => { if (e.key === "Enter") find(); };
  const wordParts = (k) => { const [w, t] = k.slice(3).split(/\/(?=[A-Z]+$)/); return [[w, t]]; };
  const matchNode = (k) => {
    if (n === 1) {
      if (!k.startsWith(lang === "ko" ? "ko:" : "en:")) return false;
      const [[w]] = wordParts(k), q = $("#colWord").value.trim().toLowerCase();
      return !q || w.toLowerCase() === q || w === q + "다";
    }
    return k.startsWith(lang === "ko" ? "kom:" : "enm:") && slots.match(ngParts(k));
  };
  const find = () => {
    const m = nodes.filter(matchNode).sort((a, b) => (fq[b] || 0) - (fq[a] || 0));
    $("#colCount").textContent = `${m.length.toLocaleString()}개`;
    $("#colPick").innerHTML = m.slice(0, 500).map((k) => `<option value="${esc(k)}">${esc(label(k))} (${esc(tagOf(k))})</option>`).join("");
    if (m.length) { node = m[0]; draw(); } else { $("#colSide").innerHTML = `<p class="hint">결과가 없습니다.</p>`; chart("colChart").clear(); $("#colCompare").innerHTML = ""; }
  };
  $("#colNode").querySelectorAll(".cl-lang button").forEach((b) => (b.onclick = () => { $("#colNode").querySelectorAll(".cl-lang button").forEach((x) => x.classList.toggle("on", x === b)); lang = b.dataset.v; slots.setLang(lang); fillWords(); find(); }));
  $("#colNode").querySelectorAll(".cl-n button").forEach((b) => (b.onclick = () => { $("#colNode").querySelectorAll(".cl-n button").forEach((x) => x.classList.toggle("on", x === b)); n = +b.dataset.v;
    $("#colSlots").hidden = n === 1; $("#colNode .cl-word").hidden = n !== 1; if (n > 1) slots.setN(n); find(); }));
  $("#colNode").querySelector(".cl-go").onclick = find;
  $("#colPick").onchange = () => { node = $("#colPick").value; draw(); };
  const periods = ["전체", ...D.meta.eras];
  $("#colPeriod").innerHTML = periods.map((p, i) => `<button data-v="${p}" class="${i ? "" : "on"}">${p}</button>`).join("");
  let node = null;
  const colPos = posFilter($("#colPos"), () => draw());
  const getType = seg("#colType", () => draw());
  const getP = seg("#colPeriod", () => draw());
  const draw = async () => {
    if (!node) return;
    const data = (await getCol(node)) || {};
    tsForKey($("#colTS"), node);
    {
      const e0 = D.meta.eras[0], e1 = D.meta.eras[D.meta.eras.length - 1];
      const a = new Map((data[e0] || []).map(([k, ld]) => [k, ld])), b = new Map((data[e1] || []).map(([k, ld]) => [k, ld]));
      const neu = [...b].filter(([k]) => !a.has(k)), gone = [...a].filter(([k]) => !b.has(k)), both = [...b].filter(([k]) => a.has(k)).map(([k, ld]) => [k, ld, ld - a.get(k)]).sort((x, y) => y[2] - x[2]);
      const cell = (arr, f) => arr.slice(0, 15).map(f).join("") || `<li class="hint">없음</li>`;
      $("#colCH").hidden = false;
      $("#colCH").innerHTML = `<h2>눈에 띄는 변화: ${esc(label(node))}의 공기어, ${e0} → ${e1}</h2>
        <div class="grid3"><div><h3 class="up">새로 생긴 공기어 (${e1}에만)</h3><ol class="chlist">${cell(neu, ([k, ld]) => `<li>${esc(label(k))} <span class="ptag">${esc(tagOf(k))}</span><span class="ch-n">logDice ${ld}</span></li>`)}</ol></div>
        <div><h3 class="down">사라진 공기어 (${e0}에만)</h3><ol class="chlist">${cell(gone, ([k, ld]) => `<li>${esc(label(k))} <span class="ptag">${esc(tagOf(k))}</span><span class="ch-n">logDice ${ld}</span></li>`)}</ol></div>
        <div><h3>계속 함께한 공기어</h3><ol class="chlist">${cell(both, ([k, ld, d]) => `<li>${esc(label(k))} <span class="ptag">${esc(tagOf(k))}</span><span class="ch-n">logDice ${d >= 0 ? "+" : ""}${d.toFixed(2)}</span></li>`)}</ol></div></div>`;
    }
    colPos.render(getType() === "ng" ? "mwe" : getType() === "word" ? "ko+en" : "all");
    const typeOk = (k) => getType() === "all" || (getType() === "ng") === isNgram(k);
    const p = getP(), list = (data[p] || []).filter(([k]) => typeOk(k) && colPos.match(k)).slice(0, 25);
    const max = Math.max(...list.map((x) => x[1]), 1), min = Math.min(...list.map((x) => x[1]), 0);
    const colorOf = (k) => css(isNgram(k) ? "--mwe" : layerOf(k) === "ko" ? "--ko" : "--en");
    // 옆 칸을 먼저 띄워 그래프 영역 크기를 확정한 뒤 그린다(가운데 정렬)
    if (!$("#colSide").innerHTML) $("#colSide").innerHTML = "&nbsp;";
    chart("colChart").resize();
    chart("colChart").setOption({
      tooltip: { formatter: (d) => d.dataType === "node" && d.data.ld ? `${esc(d.name)}<br>logDice ${d.data.ld}` : esc(d.name) },
      series: [{
        type: "graph", layout: "force", roam: true, draggable: true,
        force: { repulsion: 260, edgeLength: [60, 200], gravity: 0.08 },
        label: { show: true, color: css("--ink"), fontFamily: "Noto Sans KR" },
        data: [{ name: label(node), symbolSize: 54, itemStyle: { color: css("--ink") }, label: { color: css("--card"), fontWeight: 700 } },
               ...list.map(([k, ld]) => ({ name: label(k), key: k, ld, symbolSize: 14 + 30 * (ld - min) / (max - min || 1), itemStyle: { color: colorOf(k), opacity: 0.85 } }))],
        links: list.map(([k, ld]) => ({ source: label(node), target: label(k), lineStyle: { width: 0.5 + 3.5 * (ld - min) / (max - min || 1), color: css("--line"), opacity: 0.9 } })),
      }],
    }, true);
    $("#colSide").innerHTML = `<h3>${esc(label(node))} ${ptag(node)} ${langTag(node)} · ${p}</h3>` + (list.length ? `<table class="tbl"><thead><tr><th>공기어</th><th>품사태그</th><th class="num">logDice</th></tr></thead><tbody>${list.map(([k, ld]) => `<tr data-k="${esc(k)}"><td>${esc(label(k))}${langTag(k)}</td><td>${ptag(k)}</td><td class="num">${ld}</td></tr>`).join("")}</tbody></table>` : `<p class="hint">결과가 없습니다.</p>`);
    $("#colSide").insertAdjacentHTML("beforeend", `<div class="songbox" id="colSongs"></div>`);
    songListInto($("#colSongs"), { re: surfaceRegex(node) });
    $("#colSide").querySelectorAll("tbody tr").forEach((tr) => (tr.onclick = () => {
      $("#colSide").querySelectorAll("tbody tr").forEach((x) => x.classList.toggle("sel", x === tr));
      const a = surfaceRegex(node).source, b = surfaceRegex(tr.dataset.k).source;
      songListInto($("#colSongs"), { title: `${label(node)} + ${label(tr.dataset.k)}이 함께 나오는 행`, re: new RegExp(`(?=.*(?:${a}))(?=.*(?:${b}))`, "i"), mark: new RegExp(b, "i") });
    }));
    $("#colCompare").innerHTML = `<thead><tr>${D.meta.eras.map((e) => `<th>${e}</th>`).join("")}</tr></thead><tbody><tr>${D.meta.eras.map((e) => `<td>${(data[e] || []).filter(([k]) => typeOk(k) && colPos.match(k)).slice(0, 15).map(([k]) => `<span>${esc(label(k))}</span>`).join("")}</td>`).join("")}</tr></tbody>`;
  };
  chart("colChart").on("click", (d) => { if (d.data && d.data.key && D.colloc_index[d.data.key] !== undefined) { node = d.data.key; draw(); } });
  // 처음: 한국어 단어 '사랑'
  $("#colWord").value = "사랑";
  find();
}

// ---------- 공통: 곡 범위(시대·장르) 선택 + 비교 ----------
// el 안에 분석 대상 / 비교 대상 선택기와 정렬을 만든다. rows: {k, label, tag, ca: 셀별 절대빈도, cs: 셀별 곡 수, extra}
function scopeUI(el, onChange) {
  el.innerHTML = `<div class="sA subbox"></div>
    <label class="cmpchk"><input type="checkbox" class="sCmp"> 다른 곡 범위와 비교하기</label>
    <div class="sB subbox" hidden></div>
    <div class="row wrapgap" style="margin-top:8px"><label class="lbl">정렬 <select class="sSort">
      <option value="a">분석 대상 상대빈도</option><option value="as">분석 대상 곡 비율</option>
      <option value="b">비교 대상 상대빈도</option><option value="bs">비교 대상 곡 비율</option>
      <option value="lr">Log Ratio 큰 순 (분석 대상 쪽)</option><option value="lrn">Log Ratio 작은 순 (비교 대상 쪽)</option></select></label></div>`;
  const A = subPicker(el.querySelector(".sA"), { title: "분석 대상 곡 (시대·장르로 고르기)", onChange });
  const B = subPicker(el.querySelector(".sB"), { title: "비교 대상 곡 (시대·장르로 고르기)", onChange });
  let cmp = false;
  el.querySelector(".sCmp").onchange = (e) => { cmp = e.target.checked; el.querySelector(".sB").hidden = !cmp; onChange(); };
  el.querySelector(".sSort").onchange = onChange;
  return {
    get cmp() { return cmp; },
    desc() { return `분석 대상: ${A.desc()}${cmp ? ` | 비교 대상: ${B.desc()}` : ""}`; },
    compute(rows) {
      const ia = A.cells(), ib = B.cells();
      const ea = sumOf(D.cells.eoj, ia), eb = sumOf(D.cells.eoj, ib);
      const sa = sumOf(D.cells.songs, ia), sb = sumOf(D.cells.songs, ib);
      const out = [];
      for (const r of rows) {
        const a = sumOf(r.ca, ia), as = sumOf(r.cs, ia);
        const x = { ...r, ar: ea ? a / ea * D.meta.pmw : 0, as: sa ? as / sa * 100 : 0 };
        if (cmp) {
          const b = sumOf(r.ca, ib), bs = sumOf(r.cs, ib);
          if (!a && !b) continue;
          Object.assign(x, { br: eb ? b / eb * D.meta.pmw : 0, bs: sb ? bs / sb * 100 : 0, lr: LR(a, b, ea, eb) });
        } else if (!a) continue;
        out.push(x);
      }
      const s = el.querySelector(".sSort").value, key = { a: "ar", as: "as", b: "br", bs: "bs", lr: "lr", lrn: "lr" }[s];
      const k = !cmp && (s === "b" || s === "bs" || s.startsWith("lr")) ? "ar" : key;
      out.sort((p, q) => (cmp && s === "lrn" ? p.lr - q.lr : (q[k] || 0) - (p[k] || 0)));
      return out;
    },
    head(first, extraHead = "") {
      return cmp
        ? `<tr><th class="num">순위</th>${first}<th class="num">분석 대상<br>상대빈도*</th><th class="num">분석 대상<br>곡 비율</th><th class="num">비교 대상<br>상대빈도*</th><th class="num">비교 대상<br>곡 비율</th><th class="num">Log Ratio<br>(분석/비교)</th>${extraHead}</tr>`
        : `<tr><th class="num">순위</th>${first}<th class="num">상대빈도*</th><th class="num">곡 비율</th>${extraHead}</tr>`;
    },
    cells(x) {
      return `<td class="num">${fmt(x.ar)}</td><td class="num">${fmt(x.as)}%</td>` + (cmp ? `<td class="num">${fmt(x.br)}</td><td class="num">${fmt(x.bs)}%</td><td class="num">${fmt(x.lr)}</td>` : "");
    },
  };
}

// ---------- N-gram ----------
async function initMWE() {
  await Promise.all([load("mwe"), load("series"), load("clusters"), load("cells"), load("ts")]);
  let lang = "ko";
  const slots = makeSlots($("#mweSlots"), { onChange: () => draw() });
  const scope = scopeUI($("#mweScope"), () => draw());
  const draw = () => {
    const base = D.mwe.filter((r) => r[1] === lang && slots.match(ngParts(r[0])))
      .map((r) => ({ k: r[0], ld: r[4], ca: D.cells.items[r[0]][0], cs: D.cells.items[r[0]][1] }));
    const rows = scope.compute(base);
    $("#mweInfo").textContent = `N-gram | n=${slots.n} | ${slots.desc()} | ${scope.desc()} | 결과 ${rows.length.toLocaleString()}개${rows.length > 1000 ? ", 상위 1,000개 표시" : ""} | ${PMW_NOTE}`;
    $("#mweTbl thead").innerHTML = scope.head(`<th>N-gram (n=${slots.n})</th><th>품사태그</th>`, `<th class="num">logDice</th>`);
    $("#mweTbl tbody").innerHTML = rows.length ? rows.slice(0, 1000).map((x, i) => `<tr data-k="${esc(x.k)}"><td class="num">${i + 1}</td><td>${esc(label(x.k))}</td><td>${ptag(x.k)}</td>${scope.cells(x)}<td class="num">${x.ld}</td></tr>`).join("")
      : `<tr><td colspan="9" class="hint">결과가 없습니다.</td></tr>`;
    $("#mweTbl tbody").querySelectorAll("tr[data-k]").forEach((tr) => (tr.onclick = () => {
      $("#mweTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      termPanel($("#mweSide"), tr.dataset.k, tr.dataset.k.startsWith("kom:") ? `<p class="hint">형태소: ${esc(tr.dataset.k.slice(4))}</p>` : "");
      tsForKey($("#mweTS"), tr.dataset.k);
    }));
    changeBox($("#mweCH"), { items: keyItems(rows.map((x) => x.k)), minW: 20, onPick: (x) => { termPanel($("#mweSide"), x.k); tsForKey($("#mweTS"), x.k); } });
  };
  seg("#mweLang", (v) => { lang = v; slots.setLang(v); draw(); });
  seg("#mweN", (v) => { slots.setN(+v); draw(); });
  $("#mweGo").onclick = draw;
  slots.setN(2); draw();
}

// ---------- Cluster ----------
async function initClu() {
  await Promise.all([load("clusters"), load("cells")]);
  let lang = "ko";
  const slots = makeSlots($("#cluSlots"), { onChange: () => draw() });
  const scope = scopeUI($("#cluScope"), () => draw());
  const parts = (r) => lang === "ko" ? r[0].split(" ").map((p) => [p.slice(0, p.lastIndexOf("/")), p.slice(p.lastIndexOf("/") + 1)])
    : r[0].split(" ").map((w, i) => [w, r[1].split(" ")[i] || ""]);
  const draw = () => {
    const base = D.clusters[lang].filter((r) => slots.match(parts(r))).map((r) => ({
      k: (lang === "ko" ? "kom:" : "enm:") + r[0], lab: lang === "ko" ? r[1] : r[0],
      tg: lang === "ko" ? parts(r).map((p) => p[1]).join(" ") : r[1], ca: r[4], cs: r[5], ya: r[6], ys: r[7] }));
    const byKey = new Map(base.map((x) => [x.k, x]));
    const rows = scope.compute(base);
    $("#cluInfo").textContent = `Cluster | n=${slots.n} | ${slots.desc()} | ${scope.desc()} | 결과 ${rows.length.toLocaleString()}개${rows.length > 1000 ? ", 상위 1,000개 표시" : ""} | ${PMW_NOTE}`;
    $("#cluTbl thead").innerHTML = scope.head(`<th>Cluster (n=${slots.n})</th><th>품사태그</th>`);
    $("#cluTbl tbody").innerHTML = rows.length ? rows.slice(0, 1000).map((x, i) => `<tr data-k="${esc(x.k)}"><td class="num">${i + 1}</td><td>${esc(x.lab)}</td><td><span class="ptag">${esc(x.tg)}</span></td>${scope.cells(x)}</tr>`).join("")
      : `<tr><td colspan="8" class="hint">결과가 없습니다.</td></tr>`;
    $("#cluTbl tbody").querySelectorAll("tr[data-k]").forEach((tr) => (tr.onclick = () => {
      $("#cluTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      const k = tr.dataset.k, x = byKey.get(k);
      if (x) tsFromCounts($("#cluTS"), `${x.lab} (${x.tg})`, x.ya, x.ys);
      if (D.labels[k]) termPanel($("#cluSide"), k);
      else { const lab = tr.children[1].textContent; $("#cluSide").innerHTML = `<h3>${esc(lab)}</h3><div class="songbox"></div>`; songListInto($("#cluSide .songbox"), { re: new RegExp(reEsc(lab).replace(/ /g, "\\s*"), lang === "en" ? "i" : "") }); }
    }));
    changeBox($("#cluCH"), {
      items: rows.slice(0, 5000).map((x) => ({ k: x.k, label: x.lab, sub: x.tg, rates: x.ya.map((v, i) => v / D.meta.year_eoj[i] * D.meta.pmw), w: x.ya.reduce((a, b) => a + b, 0) })), minW: 20,
      onPick: (x) => { const y = byKey.get(x.k); tsFromCounts($("#cluTS"), `${y.lab} (${y.tg})`, y.ya, y.ys); if (D.labels[x.k]) termPanel($("#cluSide"), x.k); },
    });
  };
  seg("#cluLang", (v) => { lang = v; slots.setLang(v); draw(); });
  seg("#cluN", (v) => { slots.setN(+v); draw(); });
  $("#cluGo").onclick = draw;
  slots.setN(3); draw();
}

// ---------- PoS-gram ----------
async function initPos() {
  await Promise.all([load("posgram"), load("clusters"), load("cells")]);
  let lang = "ko";
  const slots = makeSlots($("#pgSlots"), { tagOnly: true, onChange: () => draw() });
  const scope = scopeUI($("#pgScope"), () => draw());
  const side = (r) => {
    const el = $("#pgSide");
    el.innerHTML = `<h3><span class="ptag" style="font-size:15px;color:var(--ink)">${esc(r[0].slice(4))}</span></h3>
      <h3>실현형</h3><p>${r[5].slice(0, 20).map(([, w, c]) => `<span class="tag">${esc(w)} <i>${c}</i></span>`).join("")}</p>
      <h3>연도별 흐름 <span class="unit">(상대빈도*)</span></h3><div class="mini"></div>
      <div class="songbox"></div>
      <h3>용례</h3><ul class="ex">${r[6].map(([raw, si, surf]) => {
        const s = D.songs[si], at = raw.indexOf(surf);
        const q = at >= 0 ? esc(raw.slice(0, at)) + `<mark>${esc(surf)}</mark>` + esc(raw.slice(at + surf.length)) : esc(raw);
        return `<li><q>${q}</q><small><button class="songlink" data-song="${si}" data-key="fig:" data-line="${esc(raw)}">${esc(s[1])}</button> · ${esc(s[2])} · ${s[3]}</small></li>`;
      }).join("")}</ul>`;
    echarts.init(el.querySelector(".mini")).setOption({
      grid: { left: 44, right: 8, top: 10, bottom: 24 }, tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: D.meta.years, ...axisStyle(), axisLabel: { ...baseText(), interval: 4 } }, yAxis: { type: "value", scale: true, ...axisStyle() },
      series: [{ type: "line", data: r[7], smooth: true, symbol: "none", lineStyle: { color: css("--accent"), width: 2 }, areaStyle: { color: css("--accent"), opacity: 0.12 } }],
    });
    const real = r[5].slice(0, 15).map(([, w]) => reEsc(w).replace(/ /g, "\\s*")).filter(Boolean);
    songListInto(el.querySelector(".songbox"), { title: "이 패턴이 나오는 곡", re: new RegExp(real.join("|"), r[1] === "en" ? "i" : "") });
  };
  const draw = () => {
    const base = D.posgram.map((r, i) => [r, i]).filter(([r]) => r[1] === lang && slots.match(r[0].slice(4).split(" ").map((t) => ["", t])))
      .map(([r, i]) => ({ k: r[0], i, real: r[5], ca: r[8], cs: r[9] }));
    const rows = scope.compute(base);
    $("#pgInfo").textContent = `PoS-gram | n=${slots.n} | ${slots.desc()} | ${scope.desc()} | 결과 ${rows.length.toLocaleString()}개 | ${PMW_NOTE}`;
    $("#pgTbl thead").innerHTML = scope.head(`<th>PoS-gram (n=${slots.n})</th><th>대표 실현형</th>`);
    $("#pgTbl tbody").innerHTML = rows.length ? rows.map((x, i) => `<tr data-i="${x.i}"><td class="num">${i + 1}</td><td><span class="ptag" style="color:var(--ink)">${esc(x.k.slice(4))}</span></td><td>${x.real.slice(0, 3).map(([, w]) => esc(w)).join(", ")}</td>${scope.cells(x)}</tr>`).join("")
      : `<tr><td colspan="8" class="hint">결과가 없습니다.</td></tr>`;
    $("#pgTbl tbody").querySelectorAll("tr[data-i]").forEach((tr) => (tr.onclick = () => {
      $("#pgTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      const r = D.posgram[+tr.dataset.i];
      side(r); tsFromCounts($("#pgTS"), r[0].slice(4), r[10], r[11]);
    }));
    if (rows.length) side(D.posgram[rows[0].i]); else $("#pgSide").innerHTML = "";
    changeBox($("#pgCH"), {
      items: rows.map((x) => { const r = D.posgram[x.i]; return { k: r[0], i: x.i, label: r[0].slice(4), sub: (r[5][0] || [])[1] || "", rates: r[10].map((v, j) => v / D.meta.year_eoj[j] * D.meta.pmw), w: r[10].reduce((a, b) => a + b, 0) }; }), minW: 50,
      onPick: (x) => { const r = D.posgram[x.i]; side(r); tsFromCounts($("#pgTS"), r[0].slice(4), r[10], r[11]); },
    });
  };
  seg("#pgLang", (v) => { lang = v; slots.setLang(v); draw(); });
  seg("#pgN", (v) => { slots.setN(+v); draw(); });
  $("#pgGo").onclick = draw;
  slots.setN(3); draw();
}


// ---------- 공통: 표 아래 연도별 시계열 분석 ----------
// rates: 연도별 상대빈도(또는 1천 행당), cov: 연도별 곡 비율(%)
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const rankOf = (v) => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = Array(v.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
function spearman(x, y) {
  const rx = rankOf(x), ry = rankOf(y), n = x.length, mx = rx.reduce((a, b) => a + b) / n, my = ry.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  const rho = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  const z = Math.abs(rho) * Math.sqrt(n - 1);
  return { rho, p: 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2))) };
}
function tsPanel(card, title, rates, cov, unit = "상대빈도*") {
  if (!card) return;
  const years = D.meta.years, eras = D.meta.eras;
  card.hidden = false;
  const n = rates.length, xs = years.map((y) => +y);
  const mx = xs.reduce((a, b) => a + b) / n, my = rates.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (rates[i] - my); sxx += (x - mx) ** 2; });
  const slope = sxy / sxx, fit = xs.map((x) => +(my + slope * (x - mx)).toFixed(3));
  const { rho, p } = spearman(xs, rates);
  const judge = p < 0.05 ? (rho > 0 ? "증가" : "감소") : "뚜렷한 추세 없음";
  const nz = rates.map((v, i) => [v, i]).filter(([v]) => v > 0);
  const first = nz.length ? years[nz[0][1]] : "-", last = nz.length ? years[nz[nz.length - 1][1]] : "-";
  const peak = years[rates.indexOf(Math.max(...rates))];
  const eraAvg = eras.map((e) => { const a = parseInt(e, 10); const v = rates.filter((_, i) => years[i] >= a && years[i] <= a + 9); return v.reduce((s, x) => s + x, 0) / (v.length || 1); });
  const lr = eraAvg[0] && eraAvg[eraAvg.length - 1] ? Math.log2(eraAvg[eraAvg.length - 1] / eraAvg[0]) : NaN;
  card.innerHTML = `<h2>시계열 분석: ${esc(title)}</h2>
    <div class="ts-grid"><div class="ts-chart"></div>
    <table class="tbl ts-sum"><tbody>
      <tr><th>추세</th><td><b>${judge}</b> (스피어만 ρ = ${rho.toFixed(3)}, p ${p < 0.001 ? "< 0.001" : "= " + p.toFixed(3)})</td></tr>
      <tr><th>정점</th><td>${peak}년</td></tr>
      <tr><th>첫 등장 / 마지막 등장</th><td>${first}년 / ${last}년</td></tr>
      ${eras.map((e, i) => `<tr><th>${e} 평균 ${unit}</th><td>${fmt(eraAvg[i], 3)}</td></tr>`).join("")}
      <tr><th>${eras[0]} → ${eras[eras.length - 1]} 변화</th><td>${isFinite(lr) ? `Log Ratio ${lr.toFixed(2)} (${(2 ** lr).toFixed(2)}배)` : "-"}</td></tr>
    </tbody></table></div>`;
  const c = echarts.init(card.querySelector(".ts-chart"));
  c.setOption({
    tooltip: { trigger: "axis" }, legend: { data: [unit, "직선 추세", "곡 비율 %"], textStyle: baseText(), top: 0 },
    grid: { left: 50, right: 50, top: 32, bottom: 28 },
    xAxis: { type: "category", data: years, ...axisStyle() },
    yAxis: [{ type: "value", ...axisStyle() }, { type: "value", ...axisStyle(), splitLine: { show: false }, axisLabel: { ...baseText(), formatter: "{value}%" } }],
    series: [
      { name: "곡 비율 %", type: "bar", yAxisIndex: 1, data: cov.map((v) => +v.toFixed(2)), itemStyle: { color: css("--line") }, barWidth: "55%" },
      { name: unit, type: "line", data: rates.map((v) => +v.toFixed(3)), smooth: false, symbolSize: 6, lineStyle: { color: css("--accent"), width: 2.5 }, itemStyle: { color: css("--accent") },
        markPoint: { data: [{ type: "max", name: "정점" }], symbolSize: 40, label: { fontSize: 10, formatter: (p) => (+p.value).toFixed(1) } } },
      { name: "직선 추세", type: "line", data: fit, symbol: "none", lineStyle: { type: "dashed", color: css("--ink2"), width: 1.5 }, itemStyle: { color: css("--ink2") } },
    ],
  }, true);
}
// 항목 키(단어·N-gram)의 연도별 값
async function tsForKey(card, key, title) {
  await load("ts");
  const t = D.ts[key];
  if (!t) { if (card) { card.hidden = false; card.innerHTML = `<h2>시계열 분석: ${esc(title || label(key))}</h2><p class="hint">결과가 없습니다.</p>`; } return; }
  tsPanel(card, title || `${label(key)} (${tagOf(key)})`, t[0].map((v, i) => v / D.meta.year_eoj[i] * D.meta.pmw), t[1].map((v, i) => v / D.meta.year_songs[i] * 100));
}
const tsFromCounts = (card, title, ya, ys) => tsPanel(card, title, ya.map((v, i) => v / D.meta.year_eoj[i] * D.meta.pmw), ys.map((v, i) => v / D.meta.year_songs[i] * 100));


// ---------- 사례 연구 ----------
async function initCase() {
  await Promise.all([load("case"), load("ts"), load("cells"), load("figur"), load("artist_kw")]);
  const C = D.case, years = D.meta.years.map(String), eras = D.meta.eras, genres = D.meta.genres;
  const body = $("#csBody");
  const line = (id, names, data, opt = {}) => chart(id).setOption({
    color: opt.colors || PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => (+v).toFixed(2) + (opt.unit || "") },
    legend: { type: "scroll", bottom: 0, textStyle: baseText() }, grid: { left: 50, right: 16, top: 12, bottom: 50 },
    xAxis: { type: "category", data: opt.x || years, ...axisStyle() },
    yAxis: { type: "value", max: opt.max, ...axisStyle(), axisLabel: { ...baseText(), formatter: "{value}" + (opt.unit || "") } },
    series: names.map((n, i) => ({ name: n, type: "line", stack: opt.stack ? "s" : undefined, areaStyle: opt.stack ? {} : undefined, symbol: opt.stack ? "none" : "circle", symbolSize: 4, lineStyle: { width: opt.stack ? 0 : 2 }, data: data.map((r) => r[i]) })),
  }, true);
  const bars = (id, cats, names, data, opt = {}) => chart(id).setOption({
    color: opt.colors || PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => (+v).toFixed(1) + "%" },
    legend: { bottom: 0, textStyle: baseText() }, grid: { left: 90, right: 20, top: 10, bottom: 40 },
    xAxis: { type: "value", max: 100, ...axisStyle(), axisLabel: { ...baseText(), formatter: "{value}%" } },
    yAxis: { type: "category", data: cats, inverse: true, ...axisStyle() },
    series: names.map((n, i) => ({ name: n, type: "bar", stack: "s", data: data.map((r) => r[i]) })),
  }, true);
  const clear = () => { Object.keys(charts).filter((k) => k.startsWith("cs")).forEach((k) => { charts[k].dispose(); delete charts[k]; }); };

  const VIEWS = {
    // 1) 감정 × 비유
    emo() {
      body.innerHTML = `<div class="card"><h2>감정 × 비유</h2>
        
        <div class="chips pick" id="csEmo">${EMOS.map((e, i) => `<span class="chip ${i ? "" : "on"}" data-i="${i}"><span class="dot" style="background:${EMO_COLORS[i]}"></span>${e}</span>`).join("")}</div>
        <div class="grid-main"><div id="csEmoChart" class="chart xtall"></div>
        <div class="tablebox"><table class="tbl" id="csEmoTbl"><thead><tr><th>보조관념</th><th class="num">곡 수</th><th class="num">그 감정 곡 중</th><th class="num">Log Ratio</th></tr></thead><tbody></tbody></table></div></div>
        <div class="songbox" id="csEmoSongs"></div></div>`;
      let curEmo = 0;
      const figSongs = (src, pred) => { const m = new Map(); D.figur.items.filter((it) => it[2] === "ko" && figParts(it)[1] === src).forEach((it) => (it[14] || []).forEach(([i, l]) => { if (!m.has(i) && (!pred || pred(i))) m.set(i, l); })); return [...m]; };
      const draw = (i) => {
        const d = C.emo_fig[i], top = d.top.slice(0, 20);
        chart("csEmoChart").setOption({
          tooltip: { formatter: (p) => `${esc(top[p.dataIndex][0])}<br>곡 수 ${top[p.dataIndex][1]}<br>Log Ratio ${top[p.dataIndex][3]}` },
          grid: { left: 110, right: 40, top: 8, bottom: 24 }, xAxis: { type: "value", name: "Log Ratio", ...axisStyle() },
          yAxis: { type: "category", data: top.map((r) => r[0]), inverse: true, ...axisStyle() },
          series: [{ type: "bar", data: top.map((r) => r[3]), itemStyle: { color: EMO_COLORS[i] } }],
        }, true);
        curEmo = i;
        $("#csEmoTbl tbody").innerHTML = d.top.map((r) => `<tr data-s="${esc(r[0])}"><td>${esc(r[0])}</td><td class="num">${r[1]}</td><td class="num">${r[2]}%</td><td class="num">${r[3]}</td></tr>`).join("") || `<tr><td colspan="4" class="hint">결과가 없습니다.</td></tr>`;
        const show = (src) => { const row = d.top.find((r) => r[0] === src) || []; songListInto($("#csEmoSongs"), { title: `${EMOS[curEmo]} 곡에서 ‘${src}’ 비유가 나오는 곡`, hits: row[4] || figSongs(src, (j) => D.songs[j][7][curEmo] >= 2) }); };
        $("#csEmoTbl tbody").querySelectorAll("tr[data-s]").forEach((tr) => (tr.onclick = () => { $("#csEmoTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr)); show(tr.dataset.s); }));
        chart("csEmoChart").off("click"); chart("csEmoChart").on("click", (p) => show(top[p.dataIndex][0]));
      };
      $("#csEmo").querySelectorAll(".chip").forEach((c) => (c.onclick = () => { $("#csEmo").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); draw(+c.dataset.i); }));
      draw(0);
    },
    // 2) 은유 지식 그래프
    graph() {
      body.innerHTML = `<div class="card"><h2>은유 지식 그래프</h2>
        <div class="row wrapgap"><span class="lbl">시대</span><div class="seg" id="csGEra">${["전체", ...eras].map((e, i) => `<button data-v="${i - 1}" class="${i ? "" : "on"}">${e}</button>`).join("")}</div>
        <label class="lbl">최소 곡 수 <select id="csGMin"><option>3</option><option selected>5</option><option>10</option><option>20</option></select></label>
        <input id="csGQ" placeholder="원관념·보조관념 검색 (예: 사랑, 마음)"></div>
        <div class="grid-main"><div id="csGraph" class="chart" style="height:680px"></div><aside class="side" id="csGSide"></aside></div></div>`;
      let era = -1;
      const edges = () => {
        const mn = +$("#csGMin").value, q = $("#csGQ").value.trim();
        return C.meta_graph.map(([t, s, n, en, k]) => [t, s, era < 0 ? n : en[era], k])
          .filter(([t, s, n]) => n >= mn && (!q || t.includes(q) || s.includes(q))).slice(0, 160);
      };
      const draw = () => {
        const E = edges(), nodes = new Map();
        E.forEach(([t, s, n]) => {
          const a = nodes.get("t:" + t) || { id: "t:" + t, name: t, w: 0, role: "t" }; a.w += n; nodes.set(a.id, a);
          const b = nodes.get("s:" + s) || { id: "s:" + s, name: s, w: 0, role: "s" }; b.w += n; nodes.set(b.id, b);
        });
        const mx = Math.max(1, ...[...nodes.values()].map((x) => x.w)), me = Math.max(1, ...E.map((e) => e[2]));
        chart("csGraph").setOption({
          tooltip: { formatter: (p) => p.dataType === "edge" ? `${esc(p.data.t)} → ${esc(p.data.s)}: ${p.data.n}곡` : `${esc(p.name)} (${p.data.role === "t" ? "원관념" : "보조관념"})` },
          series: [{
            type: "graph", layout: "force", roam: true, draggable: true, force: { repulsion: 180, edgeLength: [40, 140], gravity: 0.06 },
            label: { show: true, fontSize: 11, color: css("--ink"), fontFamily: "Noto Sans KR" }, edgeSymbol: ["none", "arrow"], edgeSymbolSize: 6,
            data: [...nodes.values()].map((x) => ({ ...x, symbolSize: 8 + 34 * Math.sqrt(x.w / mx), itemStyle: { color: x.role === "t" ? "#ea580c" : "#7c3aed", opacity: 0.85 } })),
            links: E.map(([t, s, n]) => ({ source: "t:" + t, target: "s:" + s, t, s, n, lineStyle: { width: 0.6 + 5 * n / me, color: css("--ink2"), opacity: 0.35 } })),
          }],
        }, true);
      };
      chart("csGraph").off("click");
      chart("csGraph").on("click", (p) => {
        if (p.dataType !== "node") return;
        const nm = p.data.name, role = p.data.role;
        const rel = C.meta_graph.filter(([t, s]) => (role === "t" ? t : s) === nm).slice(0, 30);
        $("#csGSide").innerHTML = `<h3>${esc(nm)} <span class="unit">(${role === "t" ? "원관념" : "보조관념"})</span></h3><table class="tbl"><thead><tr><th>은유</th><th class="num">곡 수</th></tr></thead><tbody>${rel.map(([t, s, n, en, k]) => `<tr data-k="${esc(k)}"><td>${esc(t)}${t && !hasBatchim(t) ? "는" : "은"} ${esc(s)}${hasBatchim(s) ? "이다" : "다"}</td><td class="num">${n}</td></tr>`).join("")}</tbody></table><div class="songbox"></div>`;
        const itemsBy = new Map(D.figur.items.map((it) => [it[0], it]));
        const songsOf = (keys) => { const m = new Map(); keys.forEach((k) => ((itemsBy.get(k) || [])[14] || []).forEach(([i, l]) => { if (!m.has(i)) m.set(i, l); })); return [...m]; };
        songListInto($("#csGSide .songbox"), { title: "이 은유가 나오는 곡", hits: songsOf(rel.map((r) => r[4])) });
        $("#csGSide").querySelectorAll("tbody tr[data-k]").forEach((tr) => (tr.onclick = () => {
          $("#csGSide").querySelectorAll("tbody tr").forEach((x) => x.classList.toggle("sel", x === tr));
          songListInto($("#csGSide .songbox"), { title: tr.children[0].textContent, hits: songsOf([tr.dataset.k]) });
        }));
      });
      seg("#csGEra", (v) => { era = +v; draw(); });
      $("#csGMin").onchange = draw; $("#csGQ").oninput = draw;
      draw();
    },
    // 3) 대명사
    pron() {
      const keys = C.pronouns.filter((k) => D.ts[k]);
      const names = keys.map((k) => label(k));
      const PRON_RE = { 나: "나|내|난|날", 너: "너|네|넌|널|니", 그대: "그대", 당신: "당신", 우리: "우리", 그녀: "그녀", 자기: "자기" };
      body.innerHTML = `<div class="card"><h2>대명사의 변화</h2>
        <div id="csP1" class="chart tall"></div><div id="csP2" class="chart tall"></div><div id="csP3" class="chart tall"></div><div class="songbox" id="csPSongs"></div></div>`;
      const rel = keys.map((k) => D.ts[k][0].map((v, i) => v / D.meta.year_eoj[i] * D.meta.pmw));
      line("csP1", names, years.map((_, y) => rel.map((r) => +r[y].toFixed(1))));
      const pronSongs = (nm, year) => songListInto($("#csPSongs"), { title: `‘${nm}’이 나오는 곡${year ? ` (${year}년 차트)` : ""}`, re: new RegExp(`(^|\\s)(${PRON_RE[nm] || reEsc(nm)})`), filter: year ? (i) => D.songs[i][3] <= +year && D.songs[i][3] + D.songs[i][5] / 12 + 1 >= +year : null });
      ["csP1", "csP2", "csP3"].forEach((id) => { chart(id).off("click"); chart(id).on("click", (p) => pronSongs(p.seriesName, id === "csP3" ? null : p.name)); });
      line("csP2", names, years.map((_, y) => { const t = rel.reduce((a, r) => a + r[y], 0) || 1; return rel.map((r) => +(r[y] / t * 100).toFixed(2)); }), { stack: true, max: 100, unit: "%" });
      const gi = (g) => D.cells.cells.map((c, i) => [c, i]).filter(([[, gg]]) => gg === g).map(([, i]) => i);
      const data = genres.map((g) => { const idx = gi(g), e = sumOf(D.cells.eoj, idx) || 1; return keys.map((k) => +(sumOf(D.cells.items[k][0], idx) / e * D.meta.pmw).toFixed(1)); });
      chart("csP3").setOption({
        color: PALETTE, tooltip: { trigger: "axis" }, legend: { type: "scroll", bottom: 0, textStyle: baseText() }, grid: { left: 50, right: 16, top: 12, bottom: 50 },
        xAxis: { type: "category", data: genres, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
        series: names.map((n, i) => ({ name: n, type: "bar", data: data.map((r) => r[i]) })),
      }, true);
    },
    // 4) 종결 어미
    end() {
      const E = C.endings;
      body.innerHTML = `<div class="card"><h2>종결 어미와 말투</h2>
        <h3>연도별 말투 비중</h3><div id="csE1" class="chart tall"></div>
        <h3>장르별 말투 비중</h3><div id="csE2" class="chart tall"></div>
        <h3>시대별 많이 쓰인 종결 어미 (EF 중 비율)</h3><div class="tablebox"><table class="tbl compare"><thead><tr>${eras.map((e) => `<th>${e}</th>`).join("")}</tr></thead>
        <tbody><tr>${E.era_top.map((col) => `<td>${col.map(([f, st, v]) => `<span>${esc(f)} <i class="ptag">${st} ${v}%</i></span><br>`).join("")}</td>`).join("")}</tr></tbody></table></div></div>`;
      line("csE1", E.styles, E.year, { stack: true, max: 100, unit: "%" });
      bars("csE2", genres, E.styles, E.genre);
    },
    // 5) 한영 전환
    cs() {
      const X = C.codeswitch;
      body.innerHTML = `<div class="card"><h2>한영 전환 (코드 스위칭)</h2>
        <h3>연도별 행 유형 비중</h3><div id="csC1" class="chart tall"></div>
        <h3>연도별 행 안 전환 횟수 (100행당)</h3><div id="csC2" class="chart"></div>
        <h3>영어가 들어간 행의 곡 안 위치 (시대별)</h3><div id="csC3" class="chart"></div>
        <h3>장르별 행 유형 비중</h3><div id="csC4" class="chart tall"></div></div>`;
      line("csC1", X.types, X.year, { stack: true, max: 100, unit: "%", colors: ["#94a3b8", "#a855f7", "#2563eb"] });
      line("csC2", ["전환 횟수"], X.switches.map((v) => [v]));
      chart("csC3").setOption({
        color: PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => v + "%" }, legend: { bottom: 0, textStyle: baseText() }, grid: { left: 50, right: 16, top: 12, bottom: 50 },
        xAxis: { type: "category", data: ["처음 20%", "20–40%", "40–60%", "60–80%", "끝 20%"], ...axisStyle() }, yAxis: { type: "value", ...axisStyle(), axisLabel: { ...baseText(), formatter: "{value}%" } },
        series: eras.map((e, i) => ({ name: e, type: "bar", data: X.pos_era[i] })),
      }, true);
      bars("csC4", genres, X.types, X.genre, { colors: ["#94a3b8", "#a855f7", "#2563eb"] });
    },
    // 6) 가수별 문체 비교
    art() {
      const A = C.artists, list = A.list, byName = new Map(list.map((a) => [a.name, a]));
      const AK = D.artist_kw;
      body.innerHTML = `<div class="card"><h2>가수 핵심어</h2>
        <div class="chips pick" id="akArt">${AK.order.map((a, i) => `<span class="chip ${i ? "" : "on"}" data-a="${esc(a)}">${esc(a)}</span>`).join("")}</div>
        <div class="seg" id="akLayer"><button data-v="ko" class="on">한국어 단어</button><button data-v="en">영어 단어</button><button data-v="mwe">N-gram</button></div>
        <p class="hint" id="akInfo"></p>
        <div class="tablebox"><table class="tbl" id="akTbl"><thead><tr><th class="num">순위</th><th>핵심어</th><th>품사태그</th><th class="num">목표 말뭉치<br>상대빈도*</th><th class="num">참조 말뭉치<br>상대빈도*</th><th class="num">LL</th><th class="num">Log Ratio</th><th class="num">곡 수</th></tr></thead><tbody></tbody></table></div><div class="songbox" id="akSongs"></div></div>
        <div class="card"><h2>가수별 문체 비교</h2>
        <div class="row wrapgap"><input id="csAQ" list="csAList" placeholder="가수 이름"><datalist id="csAList">${list.map((a) => `<option value="${esc(a.name)}">`).join("")}</datalist><button id="csAAdd" class="primary">추가</button></div>
        <div class="chips" id="csASel"></div>
        <div class="tablebox"><table class="tbl" id="csATbl"></table></div>
        <div class="grid2"><div><h3>감정 프로필 (평균 강도 0–3)</h3><div id="csARadar" class="chart tall"></div></div>
        <div><h3>전체 가수: 영어 비율 × 반복도</h3><div id="csAScatter" class="chart tall"></div></div></div></div>`;
      let akA = AK.order[0], akL = "ko";
      const akDraw = () => {
        const d = AK.data[akA], rows = d.kw[akL];
        $("#akInfo").textContent = `목표 ${akA} (${d.songs}곡), 참조 다른 모든 곡 | LL ≥ 15.13 | ${PMW_NOTE}`;
        $("#akTbl tbody").innerHTML = rows.map((r, i) => `<tr data-k="${esc(r[0])}"><td class="num">${i + 1}</td><td>${esc(label(r[0]))}</td><td>${ptag(r[0])}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td class="num">${r[4]}</td><td class="num">${r[5]}</td></tr>`).join("") || `<tr><td colspan="8" class="hint">결과가 없습니다.</td></tr>`;
        $("#akTbl tbody").querySelectorAll("tr[data-k]").forEach((tr) => (tr.onclick = () => {
          $("#akTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
          songListInto($("#akSongs"), { title: `${akA}의 곡에서 ‘${label(tr.dataset.k)}’`, re: surfaceRegex(tr.dataset.k), filter: (i) => D.songs[i][2] === akA });
        }));
      };
      $("#akArt").querySelectorAll(".chip").forEach((c) => (c.onclick = () => { $("#akArt").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); akA = c.dataset.a; akDraw(); }));
      $("#akLayer").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("#akLayer").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); akL = b.dataset.v; akDraw(); }));
      akDraw();
      let sel = list.slice(0, 3).map((a) => a.name);
      const draw = () => {
        const S = sel.map((n) => byName.get(n)).filter(Boolean);
        $("#csASel").innerHTML = S.map((a, i) => `<span class="chip" data-n="${esc(a.name)}"><span class="dot" style="background:${PALETTE[i]}"></span>${esc(a.name)} <i>×</i></span>`).join("");
        $("#csASel").querySelectorAll(".chip").forEach((c) => (c.onclick = () => { sel = sel.filter((n) => n !== c.dataset.n); draw(); }));
        const rows = [["곡 수", (a) => a.songs], ["차트 개월 수", (a) => a.months], ["활동 연도", (a) => `${a.years[0]}–${a.years[1]}`], ["대표 장르", (a) => a.genre],
          ["영어 비율", (a) => a.en + "%"], ["반복도", (a) => a.rep + "%"], ["어휘 다양도 (TTR)", (a) => a.ttr + "%"], ["비유 (1천 행당)", (a) => a.fig],
          ...C.endings.styles.map((st, i) => [`말투: ${st}`, (a) => a.style[i] + "%"]),
          ...A.pron.map((p, i) => [`대명사 몫: ${p}`, (a) => a.pron[i] + "%"])];
        $("#csATbl").innerHTML = `<thead><tr><th>지표</th>${S.map((a) => `<th class="num">${esc(a.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(([n, f]) => `<tr><td>${n}</td>${S.map((a) => `<td class="num">${esc(String(f(a)))}</td>`).join("")}</tr>`).join("")}</tbody>`;
        chart("csARadar").setOption({
          color: PALETTE, legend: { bottom: 0, textStyle: baseText() }, tooltip: {},
          radar: { indicator: EMOS.map((e) => ({ name: e, max: 3 })), radius: "62%", splitNumber: 3, axisName: { color: css("--ink2") }, splitLine: { lineStyle: { color: css("--line") } }, splitArea: { show: false } },
          series: [{ type: "radar", data: S.map((a) => ({ name: a.name, value: a.emo, areaStyle: { opacity: 0.12 } })) }],
        }, true);
        chart("csAScatter").setOption({
          tooltip: { formatter: (p) => `${esc(p.data.name)}<br>영어 ${p.data.value[0]}% · 반복도 ${p.data.value[1]}%` },
          grid: { left: 50, right: 16, top: 12, bottom: 40 },
          xAxis: { type: "value", name: "영어 비율 %", nameLocation: "middle", nameGap: 26, ...axisStyle() }, yAxis: { type: "value", name: "반복도 %", ...axisStyle() },
          series: [{ type: "scatter", symbolSize: (v, p) => 4 + Math.sqrt(p.data.songs) * 1.5,
            data: list.map((a) => ({ name: a.name, songs: a.songs, value: [a.en, a.rep], itemStyle: { color: sel.includes(a.name) ? PALETTE[sel.indexOf(a.name)] : css("--ink2"), opacity: sel.includes(a.name) ? 1 : 0.35 } })) }],
        }, true);
      };
      const add = (n) => { if (byName.has(n) && !sel.includes(n)) { sel = [...sel, n].slice(-5); draw(); } };
      $("#csAAdd").onclick = () => { add($("#csAQ").value.trim()); $("#csAQ").value = ""; };
      $("#csAQ").onkeydown = (e) => { if (e.key === "Enter") $("#csAAdd").click(); };
      chart("csAScatter").off("click"); chart("csAScatter").on("click", (p) => add(p.data.name));
      draw();
    },
  };
  seg("#csNav", (v) => { clear(); VIEWS[v](); });
  VIEWS.emo();
}


// ---------- 공통: 눈에 띄는 변화 (해마다 늘어난 것, 줄어든 것) ----------
function sparkSVG(v, color) {
  const w = 90, h = 22, mx = Math.max(...v) || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1) * w).toFixed(1)},${(h - 2 - x / mx * (h - 4)).toFixed(1)}`).join(" ");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
}
function trendOf(rates) {
  const years = D.meta.years.map(Number), eras = D.meta.eras;
  const { rho, p } = spearman(years, rates);
  const avg = (e) => { const a = parseInt(e, 10); const v = rates.filter((_, i) => years[i] >= a && years[i] <= a + 9); return v.reduce((s, x) => s + x, 0) / (v.length || 1); };
  const f = avg(eras[0]), l = avg(eras[eras.length - 1]);
  return { rho, p, ratio: f ? l / f : l ? Infinity : 1, years: rates.filter((x) => x > 0).length };
}
// items: [{k, label, sub, rates, w}] / onPick(item): 항목을 눌렀을 때
function changeBox(card, { items, unit = "상대빈도*", minW = 30, onPick }) {
  if (!card) return;
  const cand = items.filter((x) => x.w >= minW).map((x) => ({ ...x, t: trendOf(x.rates) })).filter((x) => x.t.years >= 4 && x.t.p < 0.01);
  const up = cand.filter((x) => x.t.rho > 0).sort((a, b) => b.t.rho - a.t.rho || b.t.ratio - a.t.ratio).slice(0, 12);
  const down = cand.filter((x) => x.t.rho < 0).sort((a, b) => a.t.rho - b.t.rho || a.t.ratio - b.t.ratio).slice(0, 12);
  const times = (r) => (isFinite(r) ? (r >= 1 ? `${r.toFixed(1)}배` : `${r.toFixed(2)}배`) : "새로 등장");
  const li = (x, dir) => `<li data-k="${esc(x.k)}"><span class="ch-l">${esc(x.label)}${x.sub ? ` <span class="ptag">${esc(x.sub)}</span>` : ""}</span>
    ${sparkSVG(x.rates, dir === "up" ? css("--up") : css("--down"))}<span class="ch-n">ρ ${x.t.rho.toFixed(2)} · ${times(x.t.ratio)}</span></li>`;
  card.hidden = false;
  card.innerHTML = `<h2>눈에 띄는 변화 <span class="unit">(2000–2023, p &lt; 0.01)</span></h2>
    <div class="grid2"><div><h3 class="up">▲ 증가</h3><ol class="chlist">${up.map((x) => li(x, "up")).join("") || `<li class="hint">결과가 없습니다.</li>`}</ol></div>
    <div><h3 class="down">▼ 감소</h3><ol class="chlist">${down.map((x) => li(x, "down")).join("") || `<li class="hint">결과가 없습니다.</li>`}</ol></div></div>
    <div class="row between"><h3>비교</h3><div class="seg ch-scale"><button data-v="n" class="on">최댓값 = 100</button><button data-v="r">${unit}</button></div></div>
    <div class="row wrapgap"><input class="ch-q" list="${card.id}-list" placeholder="항목 추가"><datalist id="${card.id}-list"></datalist><button class="ch-add">더하기</button><button class="ch-clear ghost">모두 지우기</button></div>
    <div class="chips ch-chips"></div><div class="chart ch-chart"></div>`;
  let norm = true;
  card.querySelectorAll(".ch-scale button").forEach((b) => (b.onclick = () => { card.querySelectorAll(".ch-scale button").forEach((x) => x.classList.toggle("on", x === b)); norm = b.dataset.v === "n"; draw(); }));
  const all = new Map(cand.map((x) => [x.k, x]));
  // 검색해서 더하기: 지금 결과 전체(추세가 뚜렷하지 않은 것 포함)에서
  const pool = new Map(items.map((x) => [`${x.label}${x.sub ? ` (${x.sub})` : ""}`, x]));
  card.querySelector("datalist").innerHTML = [...pool.keys()].slice(0, 5000).map((l) => `<option value="${esc(l)}">`).join("");
  let picked = [...up.slice(0, 2), ...down.slice(0, 2)];
  const c = echarts.init(card.querySelector(".ch-chart"));
  const draw = () => {
    card.querySelector(".ch-chips").innerHTML = picked.map((x, i) => `<span class="chip" data-k="${esc(x.k)}"><span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span>${esc(x.label)} <i>×</i></span>`).join("");
    card.querySelectorAll(".ch-chips .chip").forEach((ch) => (ch.onclick = () => { picked = picked.filter((x) => x.k !== ch.dataset.k); draw(); }));
    c.setOption({
      color: PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => (+v).toFixed(2) }, legend: { show: false },
      grid: { left: 52, right: 16, top: 12, bottom: 28 }, xAxis: { type: "category", data: D.meta.years, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
      series: picked.map((x) => { const mx = Math.max(...x.rates) || 1; return { name: x.label, type: "line", smooth: true, symbolSize: 4, data: x.rates.map((v) => +(norm ? v / mx * 100 : v).toFixed(norm ? 1 : 3)) }; }),
    }, true);
  };
  const addQ = () => {
    const x = pool.get(card.querySelector(".ch-q").value.trim());
    if (x && !picked.some((p) => p.k === x.k)) { picked = [...picked, x].slice(-8); draw(); onPick && onPick(x); }
    card.querySelector(".ch-q").value = "";
  };
  card.querySelector(".ch-add").onclick = addQ;
  card.querySelector(".ch-q").onkeydown = (e) => { if (e.key === "Enter") addQ(); };
  card.querySelector(".ch-clear").onclick = () => { picked = []; draw(); };
  card.querySelectorAll(".chlist li[data-k]").forEach((el) => (el.onclick = () => {
    const x = all.get(el.dataset.k);
    if (!picked.some((p) => p.k === x.k)) picked = [...picked, x].slice(-8);
    draw(); onPick && onPick(x);
  }));
  draw();
}
const ratesFromTs = (k) => { const t = D.ts && D.ts[k]; return t ? t[0].map((v, i) => v / D.meta.year_eoj[i] * D.meta.pmw) : null; };
const wFromTs = (k) => { const t = D.ts && D.ts[k]; return t ? t[0].reduce((a, b) => a + b, 0) : 0; };
function keyItems(keys) {
  return keys.map((k) => { const r = ratesFromTs(k); return r && { k, label: label(k), sub: tagOf(k), rates: r, w: wFromTs(k) }; }).filter(Boolean);
}


// ---------- 곡 순위: 차트 기록(메타데이터)으로 본 인기 ----------
const META_COLS = [
  ["score", "차트 점수", "Σ(101 − 월간 순위)", "desc"],
  ["adj", "연도 보정 점수", "Σ(그해 점수 ÷ 그해 곡 평균 점수)", "desc"],
  ["months", "차트 개월 수", "TOP100에 든 달 수", "desc"],
  ["best", "최고 순위", "가장 높은 월간 순위", "asc"],
  ["no1", "1위 개월 수", "1위인 달 수", "desc"],
  ["top10", "TOP10 개월 수", "10위 안인 달 수", "desc"],
  ["debut", "첫 진입 순위", "처음 오른 달의 순위", "asc"],
  ["lag", "진입까지(개월)", "발매 월 → 첫 진입 월", "asc"],
];
async function initTop() {
  await load("song_meta");
  const SM = D.song_meta, S = D.songs, R = SM.rows, ci = Object.fromEntries(SM.cols.map((c, i) => [c, i]));
  const ym = (v) => `${Math.floor(v / 12)}-${String(v % 12 + 1).padStart(2, "0")}`;
  $("#topDefs").innerHTML = `<table class="tbl defs"><tbody>${META_COLS.map(([, n, d]) => `<tr><th>${n}</th><td>${d}</td></tr>`).join("")}</tbody></table>`;
  $("#topSort").innerHTML = META_COLS.map(([c, n, , dir]) => `<option value="${c}">${n} (${dir === "desc" ? "큰 순" : "작은 순"})</option>`).join("");
  $("#topGenre").insertAdjacentHTML("beforeend", D.meta.genres.map((g) => `<option>${g}</option>`).join(""));
  const years = D.meta.years;
  $("#topFrom").innerHTML = years.map((y) => `<option ${y === years[0] ? "selected" : ""}>${y}</option>`).join("");
  $("#topTo").innerHTML = years.map((y) => `<option ${y === years[years.length - 1] ? "selected" : ""}>${y}</option>`).join("");
  let dirOverride = null;
  const draw = () => {
    const col = $("#topSort").value, dir = dirOverride || META_COLS.find((c) => c[0] === col)[3];
    const g = $("#topGenre").value, a = +$("#topFrom").value, b = +$("#topTo").value, q = $("#topQ").value.trim().toLowerCase();
    const rows = R.map((r, i) => [r, i]).filter(([r, i]) => {
      const fy = Math.floor(r[ci.first] / 12);
      return fy >= a && fy <= b && (!g || S[i][6] === g) && (!q || S[i][1].toLowerCase().includes(q) || S[i][2].toLowerCase().includes(q)) && r[ci[col]] !== null;
    }).sort((x, y) => (dir === "desc" ? y[0][ci[col]] - x[0][ci[col]] : x[0][ci[col]] - y[0][ci[col]]) || y[0][ci.score] - x[0][ci.score]);
    $("#topInfo").textContent = `정렬: ${META_COLS.find((c) => c[0] === col)[1]} | 처음 차트에 오른 해 ${a}~${b} | ${g || "전체 장르"}${q ? ` | 검색: ${q}` : ""} | ${rows.length.toLocaleString()}곡 중 상위 100곡`;
    $("#topTbl").innerHTML = `<thead><tr><th class="num">순위</th><th>곡명</th><th>가수</th><th>장르</th><th>첫 진입</th>${META_COLS.map(([c, n]) => `<th class="num sortable ${c === col ? "sorted" : ""}" data-col="${c}">${n}${c === col ? (dir === "desc" ? " ▼" : " ▲") : ""}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(0, 100).map(([r, i], k) => `<tr><td class="num">${k + 1}</td><td><button class="songlink" data-song="${i}">${esc(S[i][1])}</button></td><td>${esc(S[i][2])}</td><td>${esc(S[i][6])}</td><td>${ym(r[ci.first])}</td>
        ${META_COLS.map(([c]) => `<td class="num ${c === col ? "sorted" : ""}">${r[ci[c]] === null ? "-" : r[ci[c]].toLocaleString()}</td>`).join("")}</tr>`).join("")}</tbody>`;
  };
  $("#topSort").onchange = () => { dirOverride = null; draw(); };
  ["#topGenre", "#topFrom", "#topTo"].forEach((id) => ($(id).onchange = draw));
  $("#topTbl").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]"); if (!th) return;
    const c = th.dataset.col, cur = $("#topSort").value, def = META_COLS.find((x) => x[0] === c)[3];
    if (c === cur) dirOverride = (dirOverride || def) === "desc" ? "asc" : "desc"; else { $("#topSort").value = c; dirOverride = null; }
    draw();
  });
  $("#topQ").oninput = draw;
  draw();

  // 연도별 인기 구조
  const Y = years.map(String), P = SM.year;
  chart("topTurn").setOption({
    color: [css("--ink2"), css("--accent")], tooltip: { trigger: "axis" }, legend: { bottom: 0, textStyle: baseText() },
    grid: { left: 50, right: 16, top: 12, bottom: 50 }, xAxis: { type: "category", data: Y, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
    series: [{ name: "그해 차트에 오른 곡 수", type: "bar", data: Y.map((y) => P[y].songs) }, { name: "그해 처음 오른 곡 수", type: "bar", data: Y.map((y) => P[y].new) }],
  });
  chart("topLife").setOption({
    tooltip: { trigger: "axis", valueFormatter: (v) => v + "개월" }, grid: { left: 50, right: 16, top: 12, bottom: 30 },
    xAxis: { type: "category", data: Y, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
    series: [{ name: "평균 차트 개월 수", type: "line", data: Y.map((y) => P[y].months_debut), symbolSize: 6, lineStyle: { color: css("--accent"), width: 2.5 }, itemStyle: { color: css("--accent") } }],
  });
  chart("topNo1").setOption({
    color: [css("--accent"), css("--en")], tooltip: { trigger: "axis" }, legend: { bottom: 0, textStyle: baseText() },
    grid: { left: 50, right: 16, top: 12, bottom: 50 }, xAxis: { type: "category", data: Y, ...axisStyle() }, yAxis: { type: "value", ...axisStyle() },
    series: [{ name: "1위에 오른 곡 수", type: "line", data: Y.map((y) => P[y].no1), symbolSize: 5 }, { name: "TOP10에 오른 곡 수", type: "line", data: Y.map((y) => P[y].top10), symbolSize: 5 }],
  });
  chart("topGenreY").setOption({
    color: PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => v + "%" }, legend: { type: "scroll", bottom: 0, textStyle: baseText() },
    grid: { left: 44, right: 12, top: 10, bottom: 56 }, xAxis: { type: "category", data: Y, ...axisStyle() },
    yAxis: { type: "value", max: 100, ...axisStyle(), axisLabel: { ...baseText(), formatter: "{value}%" } },
    series: D.meta.genres.map((n, i) => ({ name: n, type: "line", stack: "s", areaStyle: {}, symbol: "none", lineStyle: { width: 0 }, data: Y.map((y) => P[y].genre_top10[i]) })),
  });
  const A = SM.artists.slice().reverse();
  chart("topArt").setOption({
    tooltip: { formatter: (p) => { const a = A[p.dataIndex]; return `${esc(a[0])}<br>차트 점수 ${a[1].toLocaleString()}<br>차트 개월 수 ${a[2]}<br>곡 수 ${a[3]}<br>1위 개월 수 ${a[4]}`; } },
    grid: { left: 150, right: 60, top: 8, bottom: 20 }, xAxis: { type: "value", ...axisStyle() },
    yAxis: { type: "category", data: A.map((a) => a[0]), ...axisStyle(), axisLabel: { ...baseText(), width: 140, overflow: "truncate" } },
    series: [{ type: "bar", data: A.map((a) => a[1]), itemStyle: { color: css("--accent"), opacity: 0.8 }, label: { show: true, position: "right", color: css("--ink2"), fontSize: 11, formatter: (p) => p.value.toLocaleString() } }],
  });
}


// ---------- 표 머리글을 누르면 정렬 (곡 순위 표 제외) ----------
document.addEventListener("click", (e) => {
  const th = e.target.closest(".tbl thead th");
  if (!th || th.dataset.col || th.closest("#topTbl") || th.closest(".defs") || th.closest(".overview")) return;
  const table = th.closest("table"), tbody = table.querySelector("tbody");
  if (!tbody) return;
  const idx = [...th.parentNode.children].indexOf(th);
  const rows = [...tbody.querySelectorAll("tr")].filter((r) => r.children.length > idx);
  if (rows.length < 2) return;
  const dir = th.dataset.dir === "desc" ? "asc" : "desc";
  table.querySelectorAll("thead th").forEach((x) => { delete x.dataset.dir; x.textContent = x.textContent.replace(/ [▲▼]$/, ""); });
  th.dataset.dir = dir; th.textContent += dir === "desc" ? " ▼" : " ▲";
  const val = (r) => { const t = r.children[idx].textContent.trim().replace(/[,%배]/g, ""); const n = parseFloat(t); return isNaN(n) || !/^[-+]?[\d.]/.test(t) ? t : n; };
  rows.sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko"); return dir === "desc" ? -c : c; });
  rows.forEach((r) => tbody.appendChild(r));
  const first = table.querySelector("thead th");
  if (first && first.textContent.startsWith("순위") && idx !== 0) rows.forEach((r, i) => (r.children[0].textContent = i + 1));
});

// ---------- 공통: 이 말이 나오는 곡 (가사 전체에서 찾기) ----------
let ALL_LYR = null;
async function loadAllLyrics() {
  if (!ALL_LYR) {
    const n = Math.ceil(D.songs.length / 200);
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => fetch(`data/lyrics/${String(i).padStart(3, "0")}.json`).then((r) => r.json())));
    ALL_LYR = parts.flat().map((x) => x.l);
  }
  return ALL_LYR;
}
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 항목 키 → 가사에서 찾을 정규식
function surfaceRegex(key) {
  const lab = label(key);
  if (key.startsWith("en:")) return new RegExp(`\\b${reEsc(lab)}\\b`, "i");
  if (key.startsWith("enm:")) return new RegExp(`\\b${reEsc(lab).replace(/ /g, "\\s+")}\\b`, "i");
  if (key.startsWith("kom:")) return new RegExp(reEsc(lab).replace(/ /g, "\\s*"));
  const tag = tagOf(key);
  if ((tag === "VV" || tag === "VA") && lab.endsWith("다")) return new RegExp(stemVariants(lab.slice(0, -1)).map(reEsc).join("|"));
  return new RegExp(reEsc(lab));
}
// 용언 어간의 활용형 앞부분: 피우→피워, 보→봐, 하→해, 되→돼, 모르→몰라, 아름답→아름다워, 듣→들어, 살→사
function stemVariants(stem) {
  const out = new Set([stem]);
  const last = stem.charCodeAt(stem.length - 1) - 0xac00, pre = stem.slice(0, -1);
  if (last < 0 || last > 11171) return [...out];
  const cho = Math.floor(last / 588), jung = Math.floor((last % 588) / 28), jong = last % 28;
  const mk = (c, v, j = 0) => String.fromCharCode(0xac00 + c * 588 + v * 28 + j);
  if (jong === 0) {
    // 앞 음절 모음이 ㅏ·ㅗ면 '아', 아니면 '어' (모음 조화)
    const pv = pre ? Math.floor(((pre.charCodeAt(pre.length - 1) - 0xac00) % 588) / 28) : -1;
    const bright = pv === 0 || pv === 8;
    const merge = { 8: 9, 13: 14, 20: 6, 11: 10 };           // ㅗ→ㅘ, ㅜ→ㅝ, ㅣ→ㅕ, ㅚ→ㅙ
    if (merge[jung] !== undefined) out.add(pre + mk(cho, merge[jung]));
    if (jung === 18 && cho !== 5) out.add(pre + mk(cho, bright ? 0 : 4));   // ㅡ 탈락: 쓰→써, 아프→아파
    if (stem.endsWith("하")) out.add(pre + "해");
    if (jung === 18 && cho === 5 && pre) {                     // 르 불규칙: 모르→몰라, 부르→불러
      const p = pre.charCodeAt(pre.length - 1) - 0xac00;
      if (p >= 0 && p % 28 === 0) { const pp = pre.slice(0, -1) + String.fromCharCode(0xac00 + p + 8); out.add(pp + (bright ? "라" : "러")); }
    }
  } else if (jong === 17) {                                    // ㅂ 불규칙: 아름답→아름다워/아름다운
    out.add(pre + mk(cho, jung) + "워"); out.add(pre + mk(cho, jung) + "운"); out.add(pre + mk(cho, jung) + "울");
  } else if (jong === 7) {                                     // ㄷ 불규칙: 듣→들
    out.add(pre + mk(cho, jung, 8));
  } else if (jong === 8) {                                     // ㄹ 탈락: 살→사(는)
    out.add(pre + mk(cho, jung) + "는"); out.add(pre + mk(cho, jung) + "니"); out.add(pre + mk(cho, jung) + "세");
  }
  return [...out].sort((a, b) => b.length - a.length);
}
const songScore = (i) => D.songs[i][5] * 1000 - D.songs[i][4];      // 차트 개월 수, 최고 순위 순
// el 안에 곡 목록을 그린다. hits: [[곡 번호, 행]] 또는 정규식으로 찾기
async function songListInto(el, { title = "이 말이 나오는 곡", re = null, hits = null, filter = null, mark = null, limit = 50 }) {
  if (!el) return;
  el.innerHTML = `<h3>${esc(title)}</h3><p class="hint">찾는 중…</p>`;
  let rows = hits;
  if (!rows) {
    const L = await loadAllLyrics();
    rows = [];
    for (let i = 0; i < L.length; i++) {
      if (filter && !filter(i)) continue;
      const line = L[i].find((l) => re.test(l));
      if (line) rows.push([i, line]);
    }
  } else if (filter) rows = rows.filter(([i]) => filter(i));
  rows = rows.slice().sort((a, b) => songScore(b[0]) - songScore(a[0]));
  const hl = (line) => {
    const r = mark || re;
    if (!r) return esc(line);
    const m = line.match(r);
    if (!m) return esc(line);
    const at = m.index;
    return esc(line.slice(0, at)) + `<mark>${esc(m[0])}</mark>` + esc(line.slice(at + m[0].length));
  };
  el.innerHTML = `<h3>${esc(title)} <span class="unit">${rows.length.toLocaleString()}곡</span></h3>` + (rows.length ? `<ul class="ex songhits">${rows.slice(0, limit).map(([i, line]) => {
    const s = D.songs[i];
    return `<li><q>${hl(line)}</q><small><button class="songlink" data-song="${i}" data-line="${esc(line)}">${esc(s[1])}</button> · ${esc(s[2])} · ${s[3]}</small></li>`;
  }).join("")}</ul>${rows.length > limit ? `<p class="hint">상위 ${limit}곡</p>` : ""}` : `<p class="hint">결과가 없습니다.</p>`);
}


// ---------- 구문: 빈칸 틀 ----------
async function initCx() {
  await Promise.all([load("construct"), load("cells")]);
  const C = D.construct;
  const slotName = (t) => TAG_NAMES[t] || t;
  const cxRe = (r) => new RegExp(reEsc(r.label).replace(/＿/g, "[가-힣]{1,5}").replace(/ /g, "\\s*"));
  let slot = "", sortK = "types";
  const draw = () => {
    const q = $("#cxQ").value.trim();
    const rows = C.map((r, i) => [r, i]).filter(([r]) => (!slot || r.slot === slot) && (!q || r.label.includes(q) || r.fills.some(([f]) => f.startsWith(q))))
      .sort((a, b) => sortK === "tok" ? b[0].tok - a[0].tok : b[0].types - a[0].types);
    $("#cxInfo").textContent = `${rows.length.toLocaleString()}개 | ${PMW_NOTE}`;
    $("#cxTbl tbody").innerHTML = rows.slice(0, 1000).map(([r, i], k) => {
      const rel = r.year.reduce((a, b) => a + b, 0) / r.year.length;
      return `<tr data-i="${i}"><td class="num">${k + 1}</td><td class="cx">${esc(r.label).replace(/＿/g, `<b class="slotmark">＿</b>`)}</td>
        <td class="fills">${r.fills.slice(0, 10).map(([f, c]) => `${esc(f)} <i>${Math.round(c / r.tok * 100)}%</i>`).join(", ")}</td><td>${esc(slotName(r.slot))}</td>
        <td class="num">${rel.toFixed(2)}</td><td class="num">${Math.round(r.songs / D.meta.n_songs * 100)}%</td><td class="num">${r.types}</td></tr>`;
    }).join("") || `<tr><td colspan="8" class="hint">결과가 없습니다.</td></tr>`;
    $("#cxTbl tbody").querySelectorAll("tr[data-i]").forEach((tr) => (tr.onclick = () => {
      $("#cxTbl tbody").querySelectorAll("tr").forEach((x) => x.classList.toggle("sel", x === tr));
      side(C[+tr.dataset.i]);
    }));
    changeBox($("#cxCH"), {
      items: rows.map(([r, i]) => ({ k: "cx" + i, label: r.label, sub: slotName(r.slot), rates: r.year, w: r.tok, r })), minW: 50,
      onPick: (x) => side(x.r),
    });
  };
  const side = (r) => {
    const el = $("#cxSide");
    const fills = r.fills.slice().sort((a, b) => b[2] - a[2]).slice(0, 25);
    el.innerHTML = `<h3 class="cx">${esc(r.label).replace(/＿/g, `<b class="slotmark">＿</b>`)} <span class="unit">빈칸: ${esc(slotName(r.slot))}</span></h3>
      <p class="hint">빈도 ${r.tok.toLocaleString()} · 타입 ${r.types}</p>
      <h3>빈칸에 끌리는 말 <span class="unit">(결합 강도 LL 순)</span></h3>
      <table class="tbl"><thead><tr><th>채움말</th><th class="num">빈도</th><th class="num">비율</th><th class="num">LL</th></tr></thead><tbody>${fills.map(([f, c, ll]) => `<tr data-f="${esc(f)}"><td>${esc(f)}</td><td class="num">${c}</td><td class="num">${Math.round(c / r.tok * 100)}%</td><td class="num">${ll}</td></tr>`).join("")}</tbody></table>
      <h3>시대별 채움말</h3><table class="tbl compare"><thead><tr>${D.meta.eras.map((e) => `<th>${e}</th>`).join("")}</tr></thead><tbody><tr>${r.era.map((col) => `<td>${col.slice(0, 10).map(([f, c]) => `<span>${esc(f)} <i class="ptag">${c}</i></span><br>`).join("")}</td>`).join("")}</tr></tbody></table>
      <div class="songbox"></div>`;
    const re = cxRe(r);
    songListInto(el.querySelector(".songbox"), { title: "이 틀이 나오는 곡", re });
    el.querySelectorAll("tbody tr[data-f]").forEach((tr) => (tr.onclick = () => {
      el.querySelectorAll("tbody tr").forEach((x) => x.classList.toggle("sel", x === tr));
      const f = tr.dataset.f, stem = /[다]$/.test(f) && (r.slot === "VV" || r.slot === "VA") ? f.slice(0, -1) : f;
      const fr = new RegExp(reEsc(r.label).replace("＿", reEsc(stem) + "[가-힣]{0,3}").replace(/＿/g, "[가-힣]{1,5}").replace(/ /g, "\\s*"));
      songListInto(el.querySelector(".songbox"), { title: `‘${f}’ 자리의 곡`, re: fr });
    }));
    tsPanel($("#cxTS"), r.label, r.year, r.ycov);
    fillerChange(r);
  };
  // 틀 안 채움말의 변화: 시대별 몫(합 100%)과 연도별 몫의 추세
  const fillerChange = (r) => {
    const card = $("#cxFill"), Y = D.meta.years, eras = D.meta.eras, yf = r.yfill;
    if (!yf || !yf.fills.length) { card.hidden = true; return; }
    card.hidden = false;
    const eraIdx = eras.map((e) => { const a = parseInt(e, 10); return Y.map((y, i) => [y, i]).filter(([y]) => y >= a && y <= a + 9).map(([, i]) => i); });
    const eraTot = eraIdx.map((ix) => ix.reduce((t, i) => t + yf.total[i], 0));
    const share = yf.fills.map((f, j) => eraIdx.map((ix, e) => eraTot[e] ? ix.reduce((t, i) => t + yf.counts[j][i], 0) / eraTot[e] * 100 : 0));
    const other = eras.map((_, e) => Math.max(0, 100 - share.reduce((t, row) => t + row[e], 0)));
    const ys = yf.fills.map((f, j) => yf.total.map((t, i) => (t ? yf.counts[j][i] / t * 100 : null)));
    const rows = yf.fills.map((f, j) => {
      const pts = ys[j].map((v, i) => [Y[i], v]).filter(([, v]) => v !== null);
      const t = pts.length >= 4 ? spearman(pts.map((p) => p[0]), pts.map((p) => p[1])) : { rho: 0, p: 1 };
      const a = share[j][0], b = share[j][eras.length - 1];
      return { f, s: share[j], t, ratio: a ? b / a : (b ? Infinity : 1) };
    });
    if (charts.cxFillChart) { charts.cxFillChart.dispose(); delete charts.cxFillChart; }
    card.innerHTML = `<h2>채움말의 변화: ${esc(r.label)}</h2>
      <div class="grid2"><div id="cxFillChart" class="chart"></div>
      <div class="tablebox"><table class="tbl"><thead><tr><th>채움말</th>${eras.map((e) => `<th class="num">${e}</th>`).join("")}<th class="num">변화</th><th>추세</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td>${esc(x.f)}</td>${x.s.map((v) => `<td class="num">${Math.round(v)}%</td>`).join("")}
        <td class="num">${!x.s[0] && !x.s[x.s.length - 1] ? "-" : !x.s[0] ? "새로 등장" : !x.s[x.s.length - 1] ? "사라짐" : x.ratio.toFixed(1) + "배"}</td><td>${x.t.p < 0.05 ? (x.t.rho > 0 ? "▲ 증가" : "▼ 감소") : "-"}</td></tr>`).join("")}</tbody></table></div></div>`;
    chart("cxFillChart").setOption({
      color: PALETTE, tooltip: { trigger: "axis", valueFormatter: (v) => Math.round(v) + "%" }, legend: { type: "scroll", bottom: 0, textStyle: baseText() },
      grid: { left: 44, right: 12, top: 10, bottom: 50 }, xAxis: { type: "category", data: eras, ...axisStyle() },
      yAxis: { type: "value", max: 100, ...axisStyle(), axisLabel: { ...baseText(), formatter: "{value}%" } },
      series: [...yf.fills.map((f, j) => ({ name: f, type: "bar", stack: "s", data: share[j].map((v) => +v.toFixed(1)) })),
               { name: "그 밖의 말", type: "bar", stack: "s", data: other.map((v) => +v.toFixed(1)), itemStyle: { color: css("--line") } }],
    }, true);
  };
  seg("#cxSlot", (v) => { slot = v; draw(); });
  seg("#cxSort", (v) => { sortK = v; draw(); });
  $("#cxQ").oninput = draw;
  draw();
}


const INIT = { cx: initCx, top: initTop, case: initCase, clu: initClu, pos: initPos, freq: initFreq, fig: initFig, kw: initKW, mwe: initMWE, col: initCol, eg: initEG, rec: initRec };

// ---------- 시작 ----------
(async () => {
  await Promise.all([load("meta"), load("labels"), load("tags"), load("examples"), load("songs")]);
  const m = D.meta;
  $("#stats").innerHTML = [[m.n_songs.toLocaleString(), "곡"], [m.years.length, "연도"], [INTENSITY.flat().length + DYADS.length, "감정 태그"]]
    .map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
  const t = location.hash.slice(1);
  showTab(document.getElementById(t) ? t : "about");
})();
