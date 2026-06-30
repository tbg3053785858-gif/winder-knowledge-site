const publicDataFiles = {
  alarms: "data/alarm.json",
  winding: "data/winding_notes.json"
};

const privateDataFiles = {
  documentIndex: "data/document_index.json",
  alarmCodes: "data/alarm_codes.json",
  faults: "data/fault_cases.json",
  plc: "data/plc_notes.json",
  servo: "data/servo_notes.json",
  ccd: "data/ccd_notes.json",
  pneumatic: "data/pneumatic_notes.json",
  bom: "data/bom_parts.json",
  maintenance: "data/maintenance.json",
  productionQuality: "data/production_quality.json"
};

const sourceFile = "data/source_links.json";
const securityReportFile = "data/security_report.json";

const authConfig = {
  username: "admin",
  passwordHash: "784737260114ab5f7ad67c08a36743de05be62d37ae072db83004d953b435058",
  sessionKey: "winderKnowledgeAuth",
  passKey: "winderKnowledgePassphrase"
};

const fallbackData = {
  alarms: [
    {
      code: "ALM-WD-001",
      name: "卷绕张力异常",
      reason: "张力传感器反馈超出设定范围，可能存在放卷卡滞、辊轮脏污或参数漂移。",
      solution: "检查放卷轴、过辊、张力传感器零点和 PID 参数，确认材料走带无阻滞后复位。"
    },
    {
      code: "ALM-CCD-021",
      name: "下料CCD NG连续超限",
      reason: "极片位置偏移、光源亮度异常、镜头污染或检测阈值设置不合理。",
      solution: "清洁镜头和光源，重新取样校准，确认下料定位和 CCD 触发信号。"
    }
  ],
  winding: [],
  documents: [],
  plc: [],
  servo: [],
  ccd: [],
  pneumatic: [],
  faults: [],
  alarmCodes: [],
  bom: [],
  maintenance: [],
  productionQuality: []
};

const state = {
  alarms: [],
  alarmCodes: [],
  plc: [],
  winding: [],
  servo: [],
  ccd: [],
  pneumatic: [],
  faults: [],
  bom: [],
  maintenance: [],
  productionQuality: [],
  documents: [],
  sources: [],
  securityReport: null,
  filters: {
    plc: "全部",
    winding: "全部",
    ccd: "全部",
    fault: "全部",
    documentCategory: "全部",
    documentType: "全部"
  }
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindAuthEvents();
  if (!isAuthenticated()) {
    showLogin();
    return;
  }

  await startApp();
}

async function startApp() {
  unlockApp();
  await loadAllData();
  renderStats();
  renderFilterGroup("plc", state.plc, "sub_category", "category");
  renderFilterGroup("winding", state.winding, "module", "category");
  renderFilterGroup("ccd", state.ccd, "sub_category", "category");
  renderFilterGroup("fault", state.faults, "station", "module");
  renderDocumentFilters();
  renderAll();
  bindEvents();
  calculateYield();
}

function bindAuthEvents() {
  const loginForm = document.getElementById("loginForm");
  const logoutButton = document.getElementById("logoutButton");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");
    const isValid = username === authConfig.username && await sha256(password) === authConfig.passwordHash;

    if (!isValid) {
      message.textContent = "账号或密码错误。";
      return;
    }

    sessionStorage.setItem(authConfig.sessionKey, "ok");
    sessionStorage.setItem(authConfig.passKey, password);
    message.textContent = "";
    await startApp();
  });

  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(authConfig.sessionKey);
    sessionStorage.removeItem(authConfig.passKey);
    location.reload();
  });
}

function isAuthenticated() {
  return sessionStorage.getItem(authConfig.sessionKey) === "ok" && Boolean(sessionStorage.getItem(authConfig.passKey));
}

function showLogin() {
  document.body.classList.add("locked");
  document.getElementById("loginScreen").removeAttribute("hidden");
  document.getElementById("loginUser").focus();
}

function unlockApp() {
  document.body.classList.remove("locked");
  document.getElementById("loginScreen").setAttribute("hidden", "");
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadAllData() {
  await loadPublicData();
  await loadPrivateData();
  await loadSources();
  await loadSecurityReport();
}

async function loadPublicData() {
  const entries = await Promise.all(
    Object.entries(publicDataFiles).map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`${path} ${response.status}`);
        return [key, await response.json()];
      } catch (error) {
        console.warn("读取公开 JSON 失败，使用内置备用数据：", path, error);
        return [key, fallbackData[key] || []];
      }
    })
  );

  entries.forEach(([key, value]) => {
    state[key] = Array.isArray(value) ? value : [];
  });
}

async function loadPrivateData() {
  const passphrase = sessionStorage.getItem(authConfig.passKey);
  const entries = await Promise.all(
    Object.entries(privateDataFiles).map(async ([key, path]) => {
      try {
        const payload = await loadJson(path);
        return [key, await unwrapPayload(payload, passphrase)];
      } catch (error) {
        console.warn("读取或解密内部资料失败：", path, error);
        return [key, key === "documentIndex" ? { documents: [] } : []];
      }
    })
  );

  entries.forEach(([key, value]) => {
    if (key === "documentIndex") {
      state.documents = Array.isArray(value.documents) ? value.documents : [];
      return;
    }
    state[key] = Array.isArray(value) ? value : [];
  });
}

async function loadSources() {
  try {
    const sources = await loadJson(sourceFile);
    state.sources = Array.isArray(sources) ? sources : [];
  } catch (error) {
    console.warn("读取资料来源失败：", sourceFile, error);
  }
}

async function loadSecurityReport() {
  try {
    state.securityReport = await loadJson(securityReportFile);
  } catch (error) {
    console.warn("读取安全报告失败：", securityReportFile, error);
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

async function unwrapPayload(payload, passphrase) {
  if (!payload || payload.encrypted !== true) return payload;

  const salt = base64ToBytes(payload.kdf.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: payload.kdf.iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain));
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bindEvents() {
  document.getElementById("alarmSearch").addEventListener("input", renderAlarmTable);
  document.getElementById("globalSearch").addEventListener("input", renderSearchResults);

  const documentSearch = document.getElementById("documentSearch");
  const documentCategory = document.getElementById("documentCategory");
  const documentType = document.getElementById("documentType");
  const documentList = document.getElementById("documentList");
  const detailClose = document.getElementById("documentDetailClose");

  documentSearch.addEventListener("input", renderDocuments);
  documentCategory.addEventListener("change", () => {
    state.filters.documentCategory = documentCategory.value;
    renderDocuments();
  });
  documentType.addEventListener("change", () => {
    state.filters.documentType = documentType.value;
    renderDocuments();
  });
  documentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-document-id]");
    if (!button) return;
    showDocumentDetail(button.dataset.documentId);
  });
  detailClose.addEventListener("click", hideDocumentDetail);

  document.getElementById("yieldForm").addEventListener("submit", (event) => {
    event.preventDefault();
    calculateYield();
  });

  ["inputTotal", "inputGood", "inputBad"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculateYield);
  });
}

function renderAll() {
  renderNotes("plcList", filteredItems("plc", state.plc, "sub_category", "category"));
  renderNotes("windingList", filteredItems("winding", state.winding, "module", "category"));
  renderNotes("ccdList", filteredItems("ccd", state.ccd, "sub_category", "category"));
  renderDocuments();
  renderFaults();
  renderSources();
  renderAlarmTable();
  renderSearchResults();
  renderSecurityNotice();
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
  const alarmTotal = getAlarmRows().length;
  const total = state.documents.length + state.winding.length + alarmTotal;
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statAlarm").textContent = alarmTotal;
  document.getElementById("statFault").textContent = state.faults.length;
}

function renderFilterGroup(group, items, primaryField, fallbackField) {
  const target = document.querySelector(`[data-filter-group="${group}"]`);
  if (!target) return;

  const categories = ["全部", ...new Set(items.map((item) => item[primaryField] || item[fallbackField]).filter(Boolean))];
  target.innerHTML = categories.map((category) => {
    const active = state.filters[group] === category ? "active" : "";
    return `<button class="${active}" type="button" data-group="${group}" data-value="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
  }).join("");

  target.onclick = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.filters[group] = button.dataset.value;
    renderFilterGroup(group, items, primaryField, fallbackField);
    renderAll();
  };
}

function filteredItems(group, items, primaryField, fallbackField) {
  const value = state.filters[group];
  if (!value || value === "全部") return items;
  return items.filter((item) => (item[primaryField] || item[fallbackField]) === value);
}

function renderDocumentFilters() {
  const categorySelect = document.getElementById("documentCategory");
  const typeSelect = document.getElementById("documentType");
  if (!categorySelect || !typeSelect) return;

  fillSelect(categorySelect, ["全部", ...new Set(state.documents.map((item) => item.category).filter(Boolean))]);
  fillSelect(typeSelect, ["全部", ...new Set(state.documents.map((item) => item.file_type).filter(Boolean))]);
}

function fillSelect(select, values) {
  const current = select.value || "全部";
  select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = values.includes(current) ? current : "全部";
}

function renderDocuments() {
  const target = document.getElementById("documentList");
  const keyword = normalize(document.getElementById("documentSearch").value);
  const category = state.filters.documentCategory;
  const fileType = state.filters.documentType;

  const items = state.documents.filter((item) => {
    const matchKeyword = !keyword || normalize(JSON.stringify(item)).includes(keyword);
    const matchCategory = !category || category === "全部" || item.category === category;
    const matchType = !fileType || fileType === "全部" || item.file_type === fileType;
    return matchKeyword && matchCategory && matchType;
  });

  target.innerHTML = items.map((item) => `
    <article class="document-card">
      <div class="meta-row">
        <span class="tag">${escapeHtml(item.category)}</span>
        <span class="tag">${escapeHtml(item.sub_category)}</span>
        <span class="tag">${escapeHtml(item.file_type)}</span>
        ${item.is_internal ? `<span class="tag danger">内部</span>` : ""}
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="document-card-foot">
        <small>${escapeHtml(item.extract_status || "原文查看")}</small>
        <button type="button" data-document-id="${escapeHtml(item.id)}">查看详情</button>
      </div>
    </article>
  `).join("") || `<div class="empty">没有找到匹配资料。</div>`;
}

function showDocumentDetail(id) {
  const item = state.documents.find((documentItem) => documentItem.id === id);
  if (!item) return;

  const target = document.getElementById("documentDetailBody");
  const keywords = Array.isArray(item.keywords) ? item.keywords : [];
  const flags = Array.isArray(item.sensitive_flags) ? item.sensitive_flags : [];
  const canOpenOriginal = !item.is_internal && item.file_path && !String(item.file_path).startsWith("internal://");

  target.innerHTML = `
    <div class="detail-title">
      <div>
        <span class="eyebrow">Document Detail</span>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <div class="meta-row">
        <span class="tag">${escapeHtml(item.category)}</span>
        <span class="tag">${escapeHtml(item.sub_category)}</span>
        <span class="tag">${escapeHtml(item.file_type)}</span>
        ${item.is_internal ? `<span class="tag danger">内部资料</span>` : ""}
      </div>
    </div>
    <dl class="detail-grid">
      <div><dt>原始文件</dt><dd>${escapeHtml(item.source_file)}</dd></div>
      <div><dt>整理时间</dt><dd>${escapeHtml(item.created_at)}</dd></div>
      <div><dt>文件大小</dt><dd>${escapeHtml(item.size_kb)} KB</dd></div>
      <div><dt>访问方式</dt><dd>${escapeHtml(item.original_access || "原文查看")}</dd></div>
    </dl>
    <section class="detail-block">
      <h4>简短说明</h4>
      <p>${escapeHtml(item.summary)}</p>
    </section>
    <section class="detail-block">
      <h4>关键词</h4>
      <div class="keyword-row">${keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("") || "<span>未识别</span>"}</div>
    </section>
    <section class="detail-block">
      <h4>手机阅读摘要</h4>
      <pre>${escapeHtml(item.preview_text || "内容无法准确提取，请在受控环境查看原文。")}</pre>
    </section>
    <section class="detail-block">
      <h4>安全标记</h4>
      <p>${flags.length ? flags.map(escapeHtml).join("、") : "未发现明显敏感关键词。"}${item.is_internal ? " 该资料未上传原始文件到公网。" : ""}</p>
    </section>
    <div class="detail-actions">
      ${canOpenOriginal ? `<a class="primary-action" href="${escapeHtml(item.file_path)}" target="_blank" rel="noopener noreferrer">打开原文</a>` : `<button type="button" disabled>内部原文未上传公网</button>`}
    </div>
  `;

  document.getElementById("documentDetail").removeAttribute("hidden");
}

function hideDocumentDetail() {
  document.getElementById("documentDetail").setAttribute("hidden", "");
}

function renderNotes(targetId, items) {
  const target = document.getElementById(targetId);
  if (!items.length) {
    target.innerHTML = `<div class="empty">暂无资料，请在对应 JSON 文件中补充。</div>`;
    return;
  }

  target.innerHTML = items.map((item) => {
    const points = item.points || item.keywords || [];
    return `
      <article class="note-card">
        <div class="meta-row">
          ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ""}
          ${item.sub_category ? `<span class="tag">${escapeHtml(item.sub_category)}</span>` : ""}
          ${item.module ? `<span class="tag">${escapeHtml(item.module)}</span>` : ""}
          ${item.level ? `<span class="tag">${escapeHtml(item.level)}</span>` : ""}
          ${item.file_type ? `<span class="tag">${escapeHtml(item.file_type)}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        ${renderList(points.slice ? points.slice(0, 8) : points)}
      </article>
    `;
  }).join("");
}

function renderFaults() {
  const items = filteredItems("fault", state.faults, "station", "module");
  const target = document.getElementById("faultList");
  if (!items.length) {
    target.innerHTML = `<div class="empty">暂无故障案例，请在 data/fault_cases.json 中补充。</div>`;
    return;
  }

  target.innerHTML = items.map((item) => `
    <article class="fault-card">
      <div class="fault-column">
        <strong>故障现象</strong>
        <h3>${escapeHtml(item.fault_name || item.title)}</h3>
        <p>${escapeHtml(item.symptom || item.summary)}</p>
      </div>
      <div class="fault-column">
        <strong>可能原因</strong>
        ${renderList(item.possible_causes)}
      </div>
      <div class="fault-column">
        <strong>处理方法</strong>
        ${renderList(item.actions || [item.solution])}
      </div>
      <div class="fault-column">
        <strong>现场案例</strong>
        <p>${escapeHtml(item.case_note || item.actual_cause || "需要结合原文确认。")}</p>
        <div class="meta-row">
          <span class="tag">${escapeHtml(item.station || item.module || "未分类")}</span>
          ${item.priority ? `<span class="tag">${escapeHtml(item.priority)}</span>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function renderAlarmTable() {
  const keyword = normalize(document.getElementById("alarmSearch").value);
  const items = getAlarmRows().filter((item) => !keyword || normalize(JSON.stringify(item)).includes(keyword));
  const target = document.getElementById("alarmTable");
  target.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.code || item.alarm_code || "")}</td>
      <td>${escapeHtml(item.name || item.alarm_name || "")}</td>
      <td>${escapeHtml(item.reason || item.cause || "")}</td>
      <td>${escapeHtml(item.solution || item.check_method || "")}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">没有找到匹配报警。</td></tr>`;
}

function getAlarmRows() {
  return [...state.alarms, ...state.alarmCodes];
}

function renderSearchResults() {
  const keyword = normalize(document.getElementById("globalSearch").value);
  const target = document.getElementById("searchResults");

  if (!keyword) {
    target.innerHTML = `<div class="empty">输入关键词后，可在资料索引、PLC、卷绕机、CCD、报警和故障案例中统一搜索。</div>`;
    return;
  }

  const rows = [
    ...state.documents.map((item) => toSearchItem("资料管理", item.title, item.summary, item, item.id)),
    ...state.plc.map((item) => toSearchItem("PLC学习区", item.title, item.summary, item, item.id)),
    ...state.winding.map((item) => toSearchItem("卷绕机资料", item.title, item.summary, item)),
    ...state.ccd.map((item) => toSearchItem("CCD资料", item.title, item.summary, item, item.id)),
    ...state.faults.map((item) => toSearchItem("故障知识库", item.fault_name || item.title, item.symptom || item.summary, item)),
    ...getAlarmRows().map((item) => toSearchItem("报警代码", `${item.code || item.alarm_code || ""} ${item.name || item.alarm_name || ""}`, item.solution || item.cause, item)),
    ...state.sources.flatMap((group) => (group.items || []).map((item) => toSearchItem("资料来源", item.name, `${group.category} / ${item.type} / ${item.note}`, item)))
  ].filter((item) => normalize(item.searchText).includes(keyword));

  target.innerHTML = rows.map((item) => `
    <article class="search-item">
      <div class="meta-row"><span class="tag">${escapeHtml(item.type)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      ${item.documentId ? `<button type="button" data-document-id="${escapeHtml(item.documentId)}" onclick="showDocumentDetail('${escapeHtml(item.documentId)}')">查看资料详情</button>` : ""}
    </article>
  `).join("") || `<div class="empty">没有找到匹配资料。</div>`;
}

function renderSecurityNotice() {
  const target = document.getElementById("securityNotice");
  if (!target) return;
  const report = state.securityReport || {};
  target.innerHTML = `
    <strong>安全提醒</strong>
    <p>当前是 GitHub Pages 静态网站，前端账号密码不能做到服务器级权限控制。内部原始文件没有上传公网，网站只读取加密后的资料索引和摘要。</p>
    <p>本次扫描 ${escapeHtml(report.total_files || 0)} 个文件，标记内部资料 ${escapeHtml(report.internal_files || 0)} 个，发现敏感关键词 ${escapeHtml(report.sensitive_files || 0)} 个。</p>
  `;
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

function toSearchItem(type, title, summary, raw, documentId = "") {
  return {
    type,
    title: title || "未命名资料",
    summary: summary || "暂无说明",
    documentId,
    searchText: JSON.stringify(raw)
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return `<ul class="check-list">${items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
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
