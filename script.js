// ---------- Data ----------
const KEY = "studyPlannerData";
let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch (e) {}
  return {
    subjects: [
      { id: 1, name: "Mathematics", color: "#2f6fed" },
      { id: 2, name: "Physics", color: "#1b9e77" },
      { id: 3, name: "Programming", color: "#d95f02" }
    ],
    tasks: [], slots: [], exams: []
  };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const subjectOf = id => state.subjects.find(s => s.id == id);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  kids.forEach(k => node.append(k));
  return node;
}
function tag(subject) {
  if (!subject) return el("span", { className: "tag", textContent: "General", style: "background:#5b6785" });
  const t = el("span", { className: "tag", textContent: subject.name });
  t.style.background = subject.color;
  return t;
}
function empty(msg) { return el("li", { className: "empty", textContent: msg }); }
function delBtn(onClick, label) {
  return el("button", { className: "del", textContent: "×", title: label, ariaLabel: label, onclick: onClick });
}

// ---------- Subjects ----------
function renderSubjects() {
  const list = $("subject-list");
  list.replaceChildren();
  if (!state.subjects.length) list.append(empty("No subjects yet. Add one above."));
  state.subjects.forEach(s => {
    list.append(el("li", {}, tag(s), el("span", { className: "grow" }),
      delBtn(() => {
        state.subjects = state.subjects.filter(x => x.id !== s.id);
        saveAndRender();
      }, "Delete " + s.name)));
  });
  ["task-subject", "slot-subject"].forEach(id => {
    const sel = $(id);
    sel.replaceChildren(el("option", { value: "", textContent: "General" }));
    state.subjects.forEach(s => sel.append(el("option", { value: s.id, textContent: s.name })));
  });
}

// ---------- Tasks ----------
function renderTasks() {
  const list = $("task-list");
  list.replaceChildren();
  if (!state.tasks.length) list.append(empty("Nothing planned for today. Add your first task."));
  state.tasks.forEach(t => {
    const box = el("input", { type: "checkbox", checked: t.done, ariaLabel: "Mark done" });
    box.onchange = () => { t.done = box.checked; saveAndRender(); };
    const li = el("li", { className: t.done ? "done" : "" }, box,
      el("span", { className: "grow", textContent: t.text }), tag(subjectOf(t.subject)),
      delBtn(() => { state.tasks = state.tasks.filter(x => x.id !== t.id); saveAndRender(); }, "Delete task"));
    list.append(li);
  });
  const done = state.tasks.filter(t => t.done).length, total = state.tasks.length;
  $("bar-fill").style.width = total ? (done / total * 100) + "%" : "0";
  $("bar-text").textContent = total ? `${done} of ${total} tasks done` : "No tasks yet";
}

// ---------- Timetable ----------
function renderTimetable() {
  const body = document.querySelector("#timetable-table tbody");
  body.replaceChildren();
  DAYS.forEach(day => {
    const cell = el("td");
    state.slots.filter(s => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start))
      .forEach(s => {
        const sub = subjectOf(s.subject);
        const chip = el("span", { className: "slot" }, `${s.start}–${s.end} ${sub ? sub.name : "General"}`,
          el("button", { textContent: "×", title: "Remove slot", ariaLabel: "Remove slot",
            onclick: () => { state.slots = state.slots.filter(x => x.id !== s.id); saveAndRender(); } }));
        chip.style.background = sub ? sub.color : "#5b6785";
        cell.append(chip);
      });
    body.append(el("tr", {}, el("td", { textContent: day }), cell));
  });
}

// ---------- Exams ----------
function renderExams() {
  const list = $("exam-list");
  list.replaceChildren();
  if (!state.exams.length) list.append(empty("No exams or deadlines added."));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  [...state.exams].sort((a, b) => a.date.localeCompare(b.date)).forEach(x => {
    const diff = Math.round((new Date(x.date + "T00:00:00") - today) / 86400000);
    const text = diff < 0 ? "Passed" : diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff} days left`;
    list.append(el("li", {},
      el("span", { className: "grow", textContent: `${x.title} (${x.date})` }),
      el("span", { className: "days" + (diff >= 0 && diff <= 3 ? " soon" : ""), textContent: text }),
      delBtn(() => { state.exams = state.exams.filter(e => e.id !== x.id); saveAndRender(); }, "Delete")));
  });
}

function saveAndRender() { save(); render(); }
function render() { renderSubjects(); renderTasks(); renderTimetable(); renderExams(); }

// ---------- Events ----------
$("task-form").onsubmit = e => {
  e.preventDefault();
  state.tasks.push({ id: uid(), text: $("task-text").value.trim(), subject: $("task-subject").value, done: false });
  e.target.reset(); saveAndRender();
};
$("clear-done").onclick = () => { state.tasks = state.tasks.filter(t => !t.done); saveAndRender(); };
$("slot-form").onsubmit = e => {
  e.preventDefault();
  if ($("slot-end").value <= $("slot-start").value) { alert("End time must be after the start time."); return; }
  state.slots.push({ id: uid(), day: $("slot-day").value, start: $("slot-start").value,
    end: $("slot-end").value, subject: $("slot-subject").value });
  saveAndRender();
};
$("subject-form").onsubmit = e => {
  e.preventDefault();
  state.subjects.push({ id: uid(), name: $("subject-name").value.trim(), color: $("subject-color").value });
  e.target.reset(); saveAndRender();
};
$("exam-form").onsubmit = e => {
  e.preventDefault();
  state.exams.push({ id: uid(), title: $("exam-title").value.trim(), date: $("exam-date").value });
  e.target.reset(); saveAndRender();
};
$("print").onclick = () => window.print();

$("today-date").textContent = new Date().toLocaleDateString("en-IN",
  { weekday: "long", day: "numeric", month: "long", year: "numeric" });
render();
