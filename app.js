"use strict";

/**
 * Mini App core:
 * - Works in Telegram WebApp and in browser (demo).
 * - Shows sections, renders catalog, fills model into form.
 * - Sends заявки via tg.sendData(JSON.stringify(...)).
 */

// ---------- Telegram WebApp init ----------
const tg = window.Telegram?.WebApp || null;

function isTelegramWebApp() {
  return !!tg && typeof tg.sendData === "function";
}

function onReady() {
  if (isTelegramWebApp()) {
    tg.ready();
    tg.expand();
  }
}

onReady();

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

function setStatus(text) {
  const el = $("status");
  if (el) el.innerText = text;
}

function show(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

// ---------- Desktop Telegram hint (optional) ----------
(function showDesktopHint() {
  // tg.platform can be: "android", "ios", "tdesktop", "web", etc.
  const platform = tg?.platform || "";
  if (platform === "tdesktop") {
    // Не ломаем UX, просто подсказываем
    const hint = document.createElement("div");
    hint.style.marginTop = "10px";
    hint.style.fontSize = "12px";
    hint.style.opacity = "0.75";
    hint.innerText =
      "⚠️ Telegram Desktop: иногда ввод с клавиатуры глючит. Если не печатает — кликни вне окна и вернись (Alt+Tab).";
    const form = $("form");
    if (form) form.appendChild(hint);
  }
})();

// ---------- Demo catalog data (replace later with Sheets/API) ----------
const PRODUCTS = [
  { name: "Nike Dunk Low (Panda)", price: "от 18 000 ₽", img: "img/dunk.jpg" },
  { name: "Air Jordan 1 Retro High", price: "от 25 000 ₽", img: "img/jordan1.jpg" },
  { name: "Yeezy 350 V2", price: "от 22 000 ₽", img: "img/yeezy.jpg" },
];

// ---------- Catalog rendering ----------
function renderCatalog(list = PRODUCTS) {
  const wrap = $("catalogList");
  if (!wrap) return;

  wrap.innerHTML = "";

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";

    // lazy loading to avoid heavy loads
    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.name;
    img.loading = "lazy";

    const title = document.createElement("div");
    title.className = "title";
    title.innerText = p.name;

    const price = document.createElement("div");
    price.className = "price";
    price.innerText = p.price;

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerText = "Хочу купить";
    btn.addEventListener("click", () => selectModel(p.name));

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(btn);

    wrap.appendChild(card);
  });
}

// ---------- Navigation functions (must match your HTML onclick calls) ----------
window.showSection = function (id) {
  setStatus("");
  if (id === "catalog") renderCatalog();
  show(id);
};

window.selectModel = function (name) {
  show("form");
  const model = $("model");
  if (model) model.value = name;
  setStatus("");
};

// ---------- Form send ----------
function normalizeContact(value) {
  return String(value || "").trim();
}

function lockButton(btn, locked) {
  if (!btn) return;
  btn.disabled = locked;
  btn.style.opacity = locked ? "0.7" : "1";
}

window.sendForm = function () {
  const name = ($("name")?.value || "").trim();
  const contact = normalizeContact($("contact")?.value);
  const model = ($("model")?.value || "").trim();

  if (!name || !contact || !model) {
    setStatus("Заполните все поля");
    return;
  }

  const payload = {
    name,
    contact,
    model,
    ts: Date.now(), // полезно для логов
  };

  // Кнопка "Отправить" — найдем её по event? нет, поэтому просто попробуем взять первую кнопку формы
  // Если хочешь — дай кнопке id="sendBtn", тогда сделаем идеально
  const sendBtn = document.getElementById("sendBtn");
  lockButton(sendBtn, true);

  if (!isTelegramWebApp()) {
    // В обычном браузере покажем JSON и не падаем
    console.log("DEMO SUBMIT (no Telegram WebApp):", payload);
    setStatus("Демо-режим: заявка сформирована (см. консоль). Открой через Telegram кнопку /app для реальной отправки.");
    lockButton(sendBtn, false);
    return;
  }

  try {
    setStatus("Отправляю…");
    tg.sendData(JSON.stringify(payload));
    // В некоторых клиентах Mini App может закрыться автоматически после sendData — это нормально
    setStatus("✅ Отправлено");
  } catch (e) {
    console.error("sendData error:", e);
    setStatus("❌ Ошибка отправки. Попробуйте ещё раз.");
    lockButton(sendBtn, false);
  }
};

// ---------- Default start ----------
show("home");
