const SAMPLE = [
  ["Graph Algorithms", 4, 18],
  ["Dynamic Programming", 3, 13],
  ["Sorting & Searching", 1, 5],
  ["Greedy Methods", 2, 8],
  ["NP-Completeness", 3, 9],
  ["Divide & Conquer", 1.5, 8],
];

const $ = (id) => document.getElementById(id);
const rowsEl = $("rows");

function addRow(name = "", hours = "", marks = "") {
  const row = document.createElement("div");
  row.className = "row";

  const n = Object.assign(document.createElement("input"), { type: "text", placeholder: "Topic name", value: name });
  const h = Object.assign(document.createElement("input"), { type: "number", min: "0.5", step: "0.5", placeholder: "Hours", value: hours });
  const m = Object.assign(document.createElement("input"), { type: "number", min: "0", step: "1", placeholder: "Marks", value: marks });
  n.setAttribute("aria-label", "Topic name");
  h.setAttribute("aria-label", "Hours needed");
  m.setAttribute("aria-label", "Expected marks");

  const del = document.createElement("button");
  del.type = "button";
  del.className = "del";
  del.textContent = "\u00d7";
  del.setAttribute("aria-label", "Remove topic");
  del.onclick = () => row.remove();

  row.append(n, h, m, del);
  rowsEl.appendChild(row);
}

function readTopics() {
  return [...rowsEl.children]
    .map((row) => {
      const [n, h, m] = row.querySelectorAll("input");
      return { name: n.value.trim(), hours: h.value, marks: m.value };
    })
    .filter((t) => t.name || t.hours || t.marks);
}

function showError(msg) {
  const el = $("error");
  el.textContent = msg || "";
  el.hidden = !msg;
}

const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace(/\.0$/, ""));

async function run() {
  showError("");
  const topics = readTopics();
  const capacity = parseFloat($("capacity").value);
  if (!(capacity > 0)) return showError("Enter the hours you have available.");
  if (!topics.length) return showError("Add at least one topic.");
  for (const t of topics) {
    const hrs = parseFloat(t.hours);
    const mk = parseFloat(t.marks);
    if (!(hrs > 0) || isNaN(mk) || mk < 0) {
      return showError(`Check "${t.name || "unnamed topic"}": hours must be above 0 and marks can't be blank.`);
    }
  }

  let res, data;
  try {
    res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity, topics }),
    });
    data = await res.json();
  } catch {
    return showError("Couldn't reach the server. Check that app.py is running.");
  }
  if (!res.ok) return showError(data.error || "Something went wrong.");
  render(data);
}

function render(d) {
  $("empty").hidden = true;
  $("output").hidden = false;

  $("s-marks").textContent = fmt(d.total_marks);
  $("s-hours").textContent = fmt(d.total_hours);
  $("s-cap").textContent = fmt(d.capacity_hours);

  // Timetable strip
  const strip = $("strip");
  strip.replaceChildren();
  strip.style.setProperty("--slots", d.units.capacity);
  d.selected.forEach((t, i) => {
    const b = document.createElement("div");
    b.className = "block";
    b.style.flex = `0 0 ${(t.hours / d.capacity_hours) * 100}%`;
    b.style.animationDelay = `${i * 70}ms`;
    b.title = `${t.name}: ${fmt(t.hours)} h, ${fmt(t.marks)} marks`;
    const s = document.createElement("span");
    s.textContent = t.name;
    b.appendChild(s);
    strip.appendChild(b);
  });

  // Chosen list
  const ul = $("chosen");
  ul.replaceChildren();
  if (!d.selected.length) {
    const li = document.createElement("li");
    li.textContent = "No topic fits in the time available. Try adding hours.";
    ul.appendChild(li);
  }
  d.selected.forEach((t) => {
    const li = document.createElement("li");
    const a = document.createElement("span"); a.textContent = t.name;
    const b = document.createElement("span"); b.className = "meta"; b.textContent = `${fmt(t.hours)} h`;
    const c = document.createElement("span"); c.className = "meta"; c.textContent = `${fmt(t.marks)} marks`;
    li.append(a, b, c);
    ul.appendChild(li);
  });

  // Skipped
  $("skipped-wrap").hidden = !d.skipped.length;
  $("skipped").textContent = d.skipped.map((t) => t.name).join(", ");

  // Greedy comparison
  const g = d.greedy;
  const cmp = $("compare");
  cmp.replaceChildren();
  const p = document.createElement("p");
  p.textContent = d.dp_beats_greedy
    ? `Picking topics by marks-per-hour would give only ${fmt(g.total_marks)} marks. Dynamic programming finds ${fmt(d.total_marks)}.`
    : `Picking topics by marks-per-hour also reaches ${fmt(g.total_marks)} marks here. Dynamic programming guarantees the best result on every input.`;
  cmp.appendChild(p);

  renderTable(d);
}

function renderTable(d) {
  const det = $("dp-details");
  const table = $("dp");
  table.replaceChildren();
  if (!d.table) { det.hidden = true; return; }
  det.hidden = false;

  const pathSet = new Set(d.path.map(([i, c]) => `${i},${c}`));
  // A cell is "taken" when topic i was included at that point of the backtrack.
  const takenSet = new Set();
  d.path.forEach(([i, c]) => {
    if (i > 0 && d.table[i][c] !== d.table[i - 1][c]) takenSet.add(`${i},${c}`);
  });

  const head = table.insertRow();
  const corner = document.createElement("th");
  corner.className = "rowname";
  corner.textContent = "Slots";
  head.appendChild(corner);
  for (let c = 0; c <= d.units.capacity; c++) {
    const th = document.createElement("th");
    th.textContent = c;
    head.appendChild(th);
  }

  d.table.forEach((row, i) => {
    const tr = table.insertRow();
    const th = document.createElement("th");
    th.className = "rowname";
    th.textContent = i === 0 ? "No topics" : `${i}. ${d.names[i - 1]}`;
    tr.appendChild(th);
    row.forEach((val, c) => {
      const td = tr.insertCell();
      td.textContent = fmt(val);
      const key = `${i},${c}`;
      if (takenSet.has(key)) td.className = "taken";
      else if (pathSet.has(key)) td.className = "path";
    });
  });
}

$("add").onclick = () => addRow();
$("run").onclick = run;
$("sample").onclick = () => {
  rowsEl.replaceChildren();
  SAMPLE.forEach(([n, h, m]) => addRow(n, h, m));
  $("capacity").value = 8;
  run();
};

for (let i = 0; i < 4; i++) addRow();
