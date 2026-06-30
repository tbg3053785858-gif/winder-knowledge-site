const dataFiles = {
  alarms: "data/alarm.json",
  plc: "data/plc_notes.json",
  winding: "data/winding_notes.json",
  ccd: "data/ccd_notes.json",
  faults: "data/fault_cases.json"
};

const sourceFile = "data/source_links.json";

const fallbackData = {
  alarms: [
    {
      code: "ALM-WD-001",
      name: "卷绕张力异常",
      reason: "张力传感器反馈超出设定范围，可能存在放卷卡滞、辊轮脏污或参数漂移。",
      solution: "检查放卷轴、过辊、张力传感器零点和PID参数，确认材料走带无阻滞后复位。"
    },
    {
      code: "ALM-CCD-021",
      name: "下料CCD NG连续超限",
      reason: "极片位置偏移、光源亮度异常、镜头污染或检测阈值设置不合理。",
      solution: "清洁镜头和光源，重新取样校准，确认下料定位和CCD触发信号。"
    }
  ],
  plc: [],
  winding: [],
  ccd: [],
  faults: []
};

const state = {
  alarms: [],
  plc: [],
  winding: [],
  ccd: [],
  faults: [],
  sources: [],
  filters: {
    plc: "全部",
    winding: "全部",
    ccd: "全部",
    fault: "全部"
  }
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadAllData();
  renderStats();
  renderFilterGroup("plc", state.plc, "category");
  renderFilterGroup("winding", state.winding, "module");
  renderFilterGroup("ccd", state.ccd, "category");
  renderFilterGroup("fault", state.faults, "module");
  renderAll();
  bindEvents();
  calculateYield();
}

async function loadAllData() {
  if (window.KB_DATA && typeof window.KB_DATA === "object") {
    Object.keys(dataFiles).forEach((key) => {
      state[key] = Array.isArray(window.KB_DATA[key]) ? window.KB_DATA[key] : [];
    });
    return;
  }

  const entries = await Promise.all(
    Object.entries(dataFiles).map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`${path} ${response.status}`);
        return [key, await response.json()];
      } catch (error) {
        console.warn("读取JSON失败，使用内置备用数据：", path, error);
        return [key, fallbackData[key] || []];
      }
    })
  );

  entries.forEach(([key, value]) => {
    state[key] = Array.isArray(value) ? value : [];
  });

  try {
    const response = await fetch(sourceFile);
    if (!response.ok) throw new Error(`${sourceFile} ${response.status}`);
    const sources = await response.json();
    state.sources = Array.isArray(sources) ? sources : [];
  } catch (error) {
    console.warn("读取资料来源失败：", sourceFile, error);
  }
}

function bindEvents() {
  document.getElementById("alarmSearch").addEventListener("input", renderAlarmTable);
  document.getElementById("globalSearch").addEventListener("input", renderSearchResults);
  document.getElementById("yieldForm").addEventListener("submit", (event) => {
    event.preventDefault();
    calculateYield();
  });

  ["inputTotal", "inputGood", "inputBad"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculateYield);
  });
}

function renderAll() {
  renderNotes("plcList", filteredItems("plc", state.plc, "category"));
  renderNotes("windingList", filteredItems("winding", state.winding, "module"));
  renderNotes("ccdList", filteredItems("ccd", state.ccd, "category"));
  renderFaults();
  renderSources();
  renderAlarmTable();
  renderSearchResults();
}

function renderSources() {
  const target = document.getElementById("sourceList");
  if (!target) return;

  target.innerHTML = state.sources.map((group) => `
    <article class="source-group">
      <div class="source-head">
        <h3>${escapeHtml(group.category)}</h3>
        <p>${escapeHtml(group.summary)}</p>
      </div>
      <div class="source-links">
        ${(group.items || []).map((item) => renderSourceItem(item)).join("")}
      </div>
    </article>
  `).join("") || `<div class="empty">暂无资料来源。</div>`;
}

function renderSourceItem(item) {
  const isInternal = String(item.url || "").startsWith("#");
  const target = isInternal ? "" : ` target="_blank" rel="noopener noreferrer"`;
  return `
    <a class="source-card" href="${escapeHtml(item.url || "#")}"${target}>
      <div class="meta-row"><span class="tag">${escapeHtml(item.type)}</span></div>
      <strong>${escapeHtml(item.name)}</strong>
      <p>${escapeHtml(item.note)}</p>
      <span class="source-action">${isInternal ? "打开站内资料" : "打开公开资料"}</span>
    </a>
  `;
}

function renderStats() {
  const total = state.alarms.length + state.plc.length + state.winding.length + state.ccd.length + state.faults.length;
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statAlarm").textContent = state.alarms.length;
  document.getElementById("statFault").textContent = state.faults.length;
}

function renderFilterGroup(group, items, field) {
  const target = document.querySelector(`[data-filter-group="${group}"]`);
  if (!target) return;

  const categories = ["全部", ...new Set(items.map((item) => item[field]).filter(Boolean))];
  target.innerHTML = categories.map((category) => {
    const active = state.filters[group] === category ? "active" : "";
    return `<button class="${active}" type="button" data-group="${group}" data-value="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
  }).join("");

  target.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.filters[group] = button.dataset.value;
    renderFilterGroup(group, items, field);
    renderAll();
  });
}

function filteredItems(group, items, field) {
  const value = state.filters[group];
  if (!value || value === "全部") return items;
  return items.filter((item) => item[field] === value);
}

function renderNotes(targetId, items) {
  const target = document.getElementById(targetId);
  if (!items.length) {
    target.innerHTML = `<div class="empty">暂无资料，请在对应 JSON 文件中补充。</div>`;
    return;
  }

  target.innerHTML = items.map((item) => `
    <article class="note-card">
      <div class="meta-row">
        ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ""}
        ${item.module ? `<span class="tag">${escapeHtml(item.module)}</span>` : ""}
        ${item.level ? `<span class="tag">${escapeHtml(item.level)}</span>` : ""}
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      ${renderList(item.points)}
    </article>
  `).join("");
}

function renderFaults() {
  const items = filteredItems("fault", state.faults, "module");
  const target = document.getElementById("faultList");
  if (!items.length) {
    target.innerHTML = `<div class="empty">暂无故障案例，请在 data/fault_cases.json 中补充。</div>`;
    return;
  }

  target.innerHTML = items.map((item) => `
    <article class="fault-card">
      <div class="fault-column">
        <strong>故障现象</strong>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.symptom)}</p>
      </div>
      <div class="fault-column">
        <strong>可能原因</strong>
        ${renderList(item.possible_causes)}
      </div>
      <div class="fault-column">
        <strong>处理方法</strong>
        ${renderList(item.actions)}
      </div>
      <div class="fault-column">
        <strong>现场案例</strong>
        <p>${escapeHtml(item.case_note)}</p>
        <div class="meta-row"><span class="tag">${escapeHtml(item.module)}</span><span class="tag">${escapeHtml(item.priority)}</span></div>
      </div>
    </article>
  `).join("");
}

function renderAlarmTable() {
  const keyword = normalize(document.getElementById("alarmSearch").value);
  const items = state.alarms.filter((item) => !keyword || normalize(Object.values(item).join(" ")).includes(keyword));
  const target = document.getElementById("alarmTable");
  target.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.reason)}</td>
      <td>${escapeHtml(item.solution)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">没有找到匹配报警。</td></tr>`;
}

function renderSearchResults() {
  const keyword = normalize(document.getElementById("globalSearch").value);
  const target = document.getElementById("searchResults");

  if (!keyword) {
    target.innerHTML = `<div class="empty">输入关键词后，可在 PLC、卷绕机、CCD、报警和故障案例中统一搜索。</div>`;
    return;
  }

  const rows = [
    ...state.plc.map((item) => toSearchItem("PLC学习区", item.title, item.summary, item)),
    ...state.winding.map((item) => toSearchItem("卷绕机资料", item.title, item.summary, item)),
    ...state.ccd.map((item) => toSearchItem("CCD资料", item.title, item.summary, item)),
    ...state.faults.map((item) => toSearchItem("故障知识库", item.title, item.symptom, item)),
    ...state.alarms.map((item) => toSearchItem("报警代码", `${item.code} ${item.name}`, item.solution, item)),
    ...state.sources.flatMap((group) => (group.items || []).map((item) => toSearchItem("资料来源", item.name, `${group.category} / ${item.type} / ${item.note}`, item)))
  ].filter((item) => normalize(item.searchText).includes(keyword));

  target.innerHTML = rows.map((item) => `
    <article class="search-item">
      <div class="meta-row"><span class="tag">${escapeHtml(item.type)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `).join("") || `<div class="empty">没有找到匹配资料。</div>`;
}

function calculateYield() {
  const total = numberValue("inputTotal");
  const good = numberValue("inputGood");
  const bad = numberValue("inputBad");
  const rate = total > 0 ? good / total : 0;
  const badRate = total > 0 ? bad / total : 0;
  const check = good + bad === total ? "一致" : `差异 ${total - good - bad}`;

  document.getElementById("yieldRate").textContent = formatPercent(rate);
  document.getElementById("badRate").textContent = formatPercent(badRate);

  const checkEl = document.getElementById("yieldCheck");
  checkEl.textContent = check;
  checkEl.classList.toggle("warn", good + bad !== total);
}

function numberValue(id) {
  return Math.max(0, Number(document.getElementById(id).value) || 0);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function toSearchItem(type, title, summary, raw) {
  return {
    type,
    title,
    summary,
    searchText: JSON.stringify(raw)
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return `<ul class="check-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
