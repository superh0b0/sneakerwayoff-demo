console.log("APP_VERSION_1");
alert("APP_VERSION_1");

const tg = window.Telegram?.WebApp;

let pendingPayload = null;

function setStatus(t) {
  const el = document.getElementById("status");
  if (el) el.innerText = t;
}

if (!tg) {
  alert("Telegram WebApp не найден. Открой через кнопку /app.");
} else {
  tg.ready();
  tg.expand();

  // Вешаем обработчик ОДИН РАЗ
  tg.onEvent("mainButtonClicked", () => {
    if (!pendingPayload) {
      setStatus("Нет данных для отправки");
      return;
    }
    setStatus("Клик по MainButton ✅ отправляю…");
    tg.sendData(pendingPayload);
  });
}

tg.ready();
tg.expand();

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function selectModel(name) {
  showSection("form");
  document.getElementById("model").value = name;
}

function sendForm() {
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const model = document.getElementById("model").value.trim();

  if (!name || !contact || !model) {
    setStatus("Заполните все поля");
    return;
  }

  if (!tg) {
    setStatus("Открой Mini App через /app в Telegram");
    return;
  }

  pendingPayload = JSON.stringify({ name, contact, model });

  setStatus("Нажми большую кнопку Telegram внизу 👇");
  tg.MainButton.setText("Подтвердить отправку");
  tg.MainButton.enable();
  tg.MainButton.show();
}

tg.MainButton.onClick(() => {
  tg.sendData(payload);
});

  
  document.getElementById("status").innerText = "sendData вызван ✅";


