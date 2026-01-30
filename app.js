"use strict";

// ====== 1) Вставь две ссылки CSV (New и Sale) ======
const NEW_CSV_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2i6_k2D5L8U-AQCbv98LQTbYF06te0i1Oq-PDqcAD3uzdxNv2XZM1CFgpVPiqDj4tapscefaG7D30/pub?gid=0&single=true&output=csv";
const SALE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2i6_k2D5L8U-AQCbv98LQTbYF06te0i1Oq-PDqcAD3uzdxNv2XZM1CFgpVPiqDj4tapscefaG7D30/pub?gid=2060716939&single=true&output=csv";

// ====== 2) Telegram WebApp init ======
const tg = window.Telegram?.WebApp || null;
const isTg = !!tg && typeof tg.sendData === "function";

if (isTg) {
  tg.ready();
  tg.expand();
}

// ====== 3) DOM helpers ======
const $ = (id) => document.getElementById(id);

function setStatus(text) {
  const el = $("status");
  if (el) el.innerText = text;
}

function _showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  const el = $(id);
  if (el) el.classList.remove("hidden");
  setStatus("");
}

function lockSend(locked) {
  const btn = $("sendBtn");
  if (!btn) return;
  btn.disabled = locked;
  btn.style.opacity = locked ? "0.7" : "1";
}

// ====== 4) CSV parser ======
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function csvToObjects(csvText) {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const objs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    objs.push(obj);
  }
  return objs;
}

function normalizePrice(v) {
  const s = String(v ?? "").trim();
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  if (s !== "" && !Number.isNaN(n)) return n.toLocaleString("ru-RU") + " ₽";
  return s;
}

// ====== 5) Data ======
let CATALOG = { new: [], sale: [] };
let loaded = false;
let activeSection = "new"; // 'new' | 'sale'
let selectedItem = null;

async function fetchSheet(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Sheets fetch failed: " + res.status);
  return res.text();
}

const CACHE_KEY = "catalog_cache_v1";

async function loadCatalog() {
  if (loaded) return;

  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    CATALOG = JSON.parse(cached);
    loaded = true;
    return;
  }

  const [newCsv, saleCsv] = await Promise.all([
    fetchSheet(NEW_CSV_URL),
    fetchSheet(SALE_CSV_URL),
  ]);

  const newItems = csvToObjects(newCsv)
    .map((it) => ({
      section: "new",
      id: it.id || "",          // (см. пункт 3)
      name: it.name || "",
      img: it.img || "",
      price: normalizePrice(it.price),
      oldPrice: "",
    }))
    .filter((x) => x.name);

  const saleItems = csvToObjects(saleCsv)
    .map((it) => ({
      section: "sale",
      id: it.id || "",
      name: it.name || "",
      img: it.img || "",
      price: normalizePrice(it.price),
      oldPrice: normalizePrice(it.old_price),
    }))
    .filter((x) => x.name);

  CATALOG = { new: newItems, sale: saleItems };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(CATALOG));
  loaded = true;
}

// ====== 6) Render ======
function renderCatalog(sectionKey) {
  const title = $("catalogTitle");
  const list = $("catalogList");
  if (!list) return;

  const items = CATALOG[sectionKey] || [];
  if (title) title.innerText = sectionKey === "sale" ? "Акции" : "Новинки";

  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<p style="opacity:.8">Пока нет товаров в этом разделе.</p>`;
    return;
  }

  for (const p of items) {
    const card = document.createElement("div");
    card.className = "card";

    if (p.img) {
      const img = document.createElement("img");
      img.src = p.img;
      img.alt = p.name;
      img.loading = "lazy";
      img.onerror = () => {
        img.src = "placeholder.png"; // положи рядом в репо
         };
      card.appendChild(img);
    }


    const h3 = document.createElement("h3");
    h3.innerText = p.name;
    card.appendChild(h3);

    const priceWrap = document.createElement("div");
    priceWrap.style.margin = "6px 0";

    if (sectionKey === "sale") {
      const newP = document.createElement("div");
      newP.style.fontWeight = "700";
      newP.innerText = p.price || "-";

      const oldP = document.createElement("div");
      oldP.style.textDecoration = "line-through";
      oldP.style.opacity = "0.7";
      oldP.innerText = p.oldPrice || "";

      priceWrap.appendChild(newP);
      if (p.oldPrice) priceWrap.appendChild(oldP);
    } else {
      const newP = document.createElement("div");
      newP.style.fontWeight = "700";
      newP.innerText = p.price || "-";
      priceWrap.appendChild(newP);
    }

    card.appendChild(priceWrap);

    const btn = document.createElement("button");
    btn.innerText = "Хочу купить";
    btn.onclick = () => selectItem(p);
    card.appendChild(btn);

    list.appendChild(card);
  }
}

// ====== 7) Navigation (HTML calls) ======
window.openCatalog = async function (sectionKey) {
  activeSection = sectionKey === "sale" ? "sale" : "new";
  _showSection("catalog");

  const list = $("catalogList");
  if (list) list.innerHTML = `<p style="opacity:.8">Загружаю каталог…</p>`;

  try {
    await loadCatalog();
    renderCatalog(activeSection);
  } catch (e) {
    console.error(e);
    if (list) list.innerHTML = `<p style="opacity:.8">Не удалось загрузить каталог. Проверь публикацию таблицы.</p>`;
  }
};

// ====== 8) Select -> form ======
function selectItem(item) {
  selectedItem = item;
  _showSection("form");
  $("model").value = item?.name || "";
  setStatus("");
}

window.selectModel = function (nameOrItem) {
  if (typeof nameOrItem === "string") {
    selectItem({ section: activeSection, name: nameOrItem, price: "", oldPrice: "" });
  } else {
    selectItem(nameOrItem);
  }
};



// ====== 9) Send form ======
window.sendForm = function () {
  const name = ($("name")?.value || "").trim();
  const contact = ($("contact")?.value || "").trim();
  const model = ($("model")?.value || "").trim();

  if (!name || !contact || !model) {
  setStatus("Заполните все поля");
  return;
  }

  if (!/^\+?\d{7,15}$/.test(contact) && !contact.includes("@") && !contact.startsWith("@")) {
    setStatus("Введите телефон, @username или email");
    return;
  };

  const payload = {
    id: selectedItem?.id || "",
    name,
    contact,
    model,
    section: selectedItem?.section === "sale" ? "Акции" : "Новинки",
    price: selectedItem?.price || "",
    old_price: selectedItem?.oldPrice || "",
    ts: Date.now(),
  };

  lockSend(true);

  if (!isTg) {
    console.log("DEMO SUBMIT:", payload);
    setStatus("Демо-режим: открой Mini App через Telegram (/app), чтобы заявка ушла в бот.");
    lockSend(false);
    return;
  }

  try {
    setStatus("Отправляю…");
    tg.sendData(JSON.stringify(payload));
    setStatus("✅ Отправлено");
  } catch (e) {
    console.error(e);
    setStatus("❌ Ошибка отправки");
    lockSend(false);
  }
};

