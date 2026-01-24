const tg = window.Telegram.WebApp;
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
    document.getElementById("status").innerText = "Нажал отправить…";

  const name = document.getElementById("name").value;
  const contact = document.getElementById("contact").value;
  const model = document.getElementById("model").value;

  if (!name || !contact || !model) {
    document.getElementById("status").innerText = "Заполните все поля";
    return;
  }

  const data = {
    name,
    contact,
    model
  };

  tg.sendData(JSON.stringify(data));
  document.getElementById("status").innerText = "sendData вызван ✅";

}
