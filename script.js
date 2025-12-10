const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
if (
  !currentUser &&
  !location.pathname.includes("login") &&
  !location.pathname.includes("register") &&
  !location.pathname.includes("reset")
) {
  window.location.href = "login.html";
}

window.addEventListener("DOMContentLoaded", () => { 
  const customerName = document.getElementById("customerName");
  const customerEmail = document.getElementById("customerEmail");
  const weightInput = document.getElementById("weight");
  const laundryType = document.getElementById("laundryType");
  window.customerName = customerName;
  window.customerEmail = customerEmail;
  window.weightInput = weightInput;
  window.laundryType = laundryType;
  window.clothesBar = document.getElementById("clothesBar");
  window.sheetsBar = document.getElementById("sheetsBar");
  window.comforterBar = document.getElementById("comforterBar");

  const lbl = document.getElementById("currentUserLabel");
  if (lbl && currentUser) lbl.textContent = `${currentUser.name} (${currentUser.role})`;


  document.getElementById("btnLogout")?.addEventListener("click", logout);


  document.addEventListener("click", (e) => {
    const card = e.target.closest(".nav-card");
    if (card) showPage(card.dataset.target);

    const btn = e.target.closest(".nav-btn");
    if (btn) showPage(btn.dataset.target);
  });


  document.getElementById("btnAddTransaction")?.addEventListener("click", addTransaction);
  document.getElementById("btnExport")?.addEventListener("click", exportBackup);
  document.getElementById("importFile")?.addEventListener("change", handleImport);
  document.getElementById("btnReset")?.addEventListener("click", resetSystem);
  document.getElementById("btnClearLogs")?.addEventListener("click", clearLogs);

  enforceOwnerUI();

  updateInfo();
  renderRecords();
  renderDashboard();
  renderActivity();
});


function showPage(id) {

  if (currentUser.role === "worker") {
    if (["dashboardPage", "activityPanel"].includes(id)) {
      return alert("Access denied. Owner only.");
    }
  }

  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const pg = document.getElementById(id);
  if (pg) {
    pg.classList.add("active");
    pg.style.display = "block";
  }

  const titleMap = {
    homePage: "HOME",
    calculationPage: "NEW ORDER",
    transactionsPage: "RECORDS",
    dashboardPage: "OVERVIEW",
    activityPanel: "ACTIVITY LOG"
  };

  document.getElementById("pageTitle").textContent = titleMap[id] || "HOME";

  if (id === "transactionsPage") renderRecords();
  if (id === "dashboardPage") renderDashboard();
  if (id === "activityPanel") renderActivity();
}


function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}


function getSettings() {
  return {
    pricePerLoad: 170,
    priceComforter: 150,
    clothesKg: 7,
    sheetsKg: 6
  };
}


function getData() {
  return {
    trans: JSON.parse(localStorage.getItem("trans") || "[]"),
    loads: JSON.parse(localStorage.getItem("loads") || "{}")
  };
}

function saveData(t, l) {
  localStorage.setItem("trans", JSON.stringify(t));
  localStorage.setItem("loads", JSON.stringify(l));
}


function logAction(user, action, details) {
  const logs = JSON.parse(localStorage.getItem("activity") || "[]");
  logs.unshift({
    when: new Date().toLocaleString(),
    user: user.name,
    action,
    details
  });
  localStorage.setItem("activity", JSON.stringify(logs));
}


function calcLoads(type, weight) {
  const s = getSettings();
  if (type === "Clothes") return Math.ceil(weight / s.clothesKg);
  if (type === "Sheets") return Math.ceil(weight / s.sheetsKg);
  return Math.ceil(weight); 
}

function calcPrice(type, loads) {
  const s = getSettings();
  return type === "Comforter"
    ? s.priceComforter * loads
    : s.pricePerLoad * loads;
}

function updateInfo() {
  const type = laundryType.value;
  const info = document.getElementById("info");
  const s = getSettings();

  if (type === "Clothes") info.textContent = `Max: ${s.clothesKg}kg per load`;
  else if (type === "Sheets") info.textContent = `Max: ${s.sheetsKg}kg per load`;
  else info.textContent = "Max: 1pc per load";
}


function addTransaction() {
  const name = customerName.value.trim();
  const email = customerEmail.value.trim();
  const weight = parseFloat(weightInput.value);
  const type = laundryType.value;

  if (!name) return alert("Customer name required.");
  if (!email.includes("@")) return alert("Valid email required.");
  if (!weight || weight <= 0) return alert("Enter valid weight.");

  const data = getData();
  if (!data.loads[name]) data.loads[name] = 0;

  const loads = calcLoads(type, weight);
  let price = calcPrice(type, loads);

  let free = false;
  if (data.loads[name] + loads >= 10) {
    free = true;
    price -= calcPrice(type, 1);
    data.loads[name] = (data.loads[name] + loads) - 10;
  } else {
    data.loads[name] += loads;
  }

  const now = new Date();
  data.trans.push({
    name,
    email,
    laundryType: type,
    weight,
    total: price,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime(),
    remark: free ? "1 Free Load" : "Regular",
    source: "Local Entry"
  });

  saveData(data.trans, data.loads);
  logAction(currentUser, "Added Transaction", name);

  alert("Transaction added!");

  customerName.value = "";
  customerEmail.value = "";
  weightInput.value = "";

  renderRecords();
  renderDashboard();
}


function renderRecords() {
  const tbody = document.getElementById("tableBody");
  const { trans } = getData();
  tbody.innerHTML = "";

  if (!trans.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No records</td></tr>`;
    return;
  }

  trans
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((t) => {
      const isOwner = currentUser.role === "owner";

      tbody.innerHTML += `
        <tr>
            <td>${t.name}</td>
            <td>${t.email}</td>
            <td>${t.date}</td>
            <td>${t.time}</td>
            <td>${t.laundryType}</td>
            <td>${t.weight}${t.laundryType === "Comforter" ? " pc" : " kg"}</td>
            <td>₱${t.total}</td>
            <td>${calcLoads(t.laundryType, t.weight)}</td>
            <td>${t.remark}</td>
           <td>
              <button class="tool-btn btn-email" data-ts="${t.timestamp}">Email</button>
              <button class="tool-btn" onclick='printReceipt(${JSON.stringify(t)})'>Print</button>
             ${isOwner ? `<button class="delete-btn" onclick="deleteTransaction(${t.timestamp})">Delete</button>` : ""}

            </td>
         </tr>
       `;
    });

let selectedTransaction = null;

document.querySelectorAll(".btn-email").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ts = btn.dataset.ts;
    selectedTransaction = getData().trans.find((x) => x.timestamp == ts);

    document.getElementById("emailModal").style.display = "flex";
    document.getElementById("customerEmail").value =
      selectedTransaction.email || "";
  });
});
}



function deleteTransaction(ts) {
  if (currentUser.role !== "owner") return alert("Owner only.");

  const data = getData();
  const index = data.trans.findIndex((x) => x.timestamp == ts);
  if (index === -1) return;

  if (!confirm("Delete this transaction?")) return;

  const removed = data.trans.splice(index, 1)[0];

  let totalLoads = 0;
  data.trans.forEach((t) => {
    if (t.name === removed.name) {
      totalLoads += calcLoads(t.laundryType, t.weight);
      if (t.remark.includes("Free")) totalLoads -= 1;
    }
  });

  data.loads[removed.name] = totalLoads % 10;

  saveData(data.trans, data.loads);
  logAction(currentUser, "Deleted Transaction", removed.name);

  renderRecords();
  renderDashboard();
}


function buildReceipt(t) {
  const transactionId = "#" + Math.floor(Math.random() * 9000000 + 1000000);

  return `
  <div style="
    width: 320px;
    padding: 25px;
    font-family: 'Courier New', monospace;
    border: 2px solid #000;
  ">

    <h2 style="text-align:center; letter-spacing:1px; margin-bottom:5px;">
      <span style="font-weight:bold;">INDAY</span> LAUNDRY SHOP
    </h2>

    <p style="text-align:center; font-size:13px; margin-bottom:15px;">
      Mamala II, Sariaya, Quezon<br>
      Contact: 0999-578-2872
    </p>

    <div style="border-top:2px dashed #000; margin:10px 0;"></div>

    <p><b>Date:</b> ${t.date}</p>
    <p><b>Time:</b> ${t.time}</p>
    <p><b>Customer:</b> ${t.name}</p>

    <div style="border-top:2px dashed #000; margin:10px 0;"></div>

    <table style="width:100%; font-size:14px;">
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:right;">Amount</th>
      </tr>

      <tr>
        <td>${t.laundryType}</td>
        <td style="text-align:right;">₱${t.total}</td>
      </tr>

      <tr>
        <td>${t.weight} ${t.laundryType === "Comforter" ? "pc" : "kg"}</td>
        <td></td>
      </tr>

      <tr>
        <td style="color:#d9534f;">Discount</td>
        <td style="color:#d9534f; text-align:right;">
          ${t.remark.includes("Free") ? "-₱" + calcPrice(t.laundryType,1) : "-₱0"}
        </td>
      </tr>
    </table>

    <div style="border-top:2px dashed #000; margin:12px 0;"></div>

    <p style="font-size:16px;"><b>TOTAL:</b>
      <span style="float:right;"><b>₱${t.total}</b></span>
    </p>

    <div style="border-top:2px dashed #000; margin:12px 0;"></div>

    <p style="text-align:center; margin-top:10px;">
      ${t.remark}<br><br>
      Thank you for your business!<br>
      Please come again
    </p>

    <p style="text-align:center; margin-top:20px; font-size:11px;">
      Generated by IndaySystem<br>
      Transaction ${transactionId}
    </p>
  </div>
  `;
}

function printReceipt(t) {
  const receiptHTML = buildReceipt(t);

  const win = window.open("", "", "width=400,height=600");
  win.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
          }
        </style>
      </head>
      <body>${receiptHTML}</body>
    </html>
  `);

  win.document.close();
  win.focus();
  win.print();
  win.close();
}



function sendEmailReceipt(to, t) {
  emailjs
    .send("service_t0b77zq", "template_xge1do5", {
      to_email: to,
      customer_name: t.name,
      laundry_type: t.laundryType,
      weight: t.weight,
      total_amount: t.total,
      remarks: t.remark,
      transaction_date: t.date,
      transaction_time: t.time
    })
    .then(() => alert("Email sent!"))
    .catch(() => alert("Email failed."));
}


function renderDashboard() {
  if (!document.getElementById("totalrevenue")) return;

  const { trans } = getData();
  const total = trans.reduce((a, b) => a + b.total, 0);

  const free = trans.filter((t) => t.remark.includes("Free")).length;

  const clothes = trans.filter((t) => t.laundryType === "Clothes").length;
  const sheets = trans.filter((t) => t.laundryType === "Sheets").length;
  const comforter = trans.filter((t) => t.laundryType === "Comforter").length;

  document.getElementById("totalrevenue").textContent = `₱${total}`;
  document.getElementById("totalCount").textContent = trans.length;
  document.getElementById("freeLoads").textContent = free;

  const max = Math.max(clothes, sheets, comforter, 1);

  clothesBar.style.width = (clothes / max) * 100 + "%";
  clothesBar.textContent = clothes;

  sheetsBar.style.width = (sheets / max) * 100 + "%";
  sheetsBar.textContent = sheets;

  comforterBar.style.width = (comforter / max) * 100 + "%";
  comforterBar.textContent = comforter;
}


function renderActivity() {
  const body = document.getElementById("activityBody");
  if (!body) return;

  const logs = JSON.parse(localStorage.getItem("activity") || "[]");

  body.innerHTML = logs
    .map(
      (l) => `
      <tr>
        <td>${l.when}</td>
        <td>${l.user}</td>
        <td>${l.action}</td>
        <td>${l.details}</td>
      </tr>
    `
    )
    .join("");
}

function clearLogs() {
  if (currentUser.role !== "owner") return alert("Owner only.");
  if (!confirm("Clear all logs?")) return;

  localStorage.removeItem("activity");

  renderActivity();
}


function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (ev) => {
    try {
      const backup = JSON.parse(ev.target.result);
      if (!backup.trans || !backup.loads) return alert("Invalid file.");

      if (!confirm("Replace all current data?")) return;

      localStorage.setItem("trans", JSON.stringify(backup.trans));
      localStorage.setItem("loads", JSON.stringify(backup.loads));
      localStorage.setItem("settings", JSON.stringify(backup.settings || {}));
      localStorage.setItem("activity", JSON.stringify(backup.activity || []));
      localStorage.setItem("users", JSON.stringify(backup.users || []));

      logAction(currentUser, "Imported Backup", "All data replaced");

      alert("Import successful!");

      renderRecords();
      renderDashboard();
      renderActivity();
    } catch (e) {
      alert("Invalid JSON file.");
    }
  };

  reader.readAsText(file);
}


function resetSystem() {
  if (currentUser.role !== "owner") return alert("Owner only.");
  if (!confirm("Erase ALL data?")) return;

  localStorage.removeItem("trans");
  localStorage.removeItem("loads");
  localStorage.removeItem("settings");
  localStorage.removeItem("activity");
  document.getElementById("importFile").value = "";


  logAction(currentUser, "System Reset", "All data cleared");

  alert("System reset complete.");

  renderRecords();
  renderDashboard();
  renderActivity();
}


async function exportBackup() {
  const data = {
    trans: JSON.parse(localStorage.getItem("trans") || "[]"),
    loads: JSON.parse(localStorage.getItem("loads") || "{}"),
    settings: JSON.parse(localStorage.getItem("settings") || "{}"),
    activity: JSON.parse(localStorage.getItem("activity") || "[]"),
    users: JSON.parse(localStorage.getItem("users") || "[]"),
    exportedAt: new Date().toLocaleString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "instawash_backup.json",
        types: [{
          description: "Backup File",
          accept: { "application/json": [".json"] }
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      alert("Backup saved!");
      return;

    } catch (err) {
      if (err.name === "AbortError") {
        console.log("User cancelled save dialog.");
        return;
      }
      console.warn("Save dialog failed, using fallback...");
    }
  }

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "instawash_backup.json";
  a.click();
}

function openEmailModal() {
  document.getElementById("emailModal").style.display = "flex";
}

function closeEmailModal() {
  document.getElementById("emailModal").style.display = "none";
}

window.addEventListener("click", function(e) {
  const modal = document.getElementById("emailModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

function enforceOwnerUI() {
  const isOwner = currentUser.role === "owner";

  document.querySelectorAll(".owner-only").forEach((el) => {
    if (el.classList.contains("nav-card") || el.classList.contains("nav-btn") || el.id === "btnReset") {
      el.style.display = isOwner ? "inline-flex" : "none";
    }
  });


  const btnExport = document.getElementById("btnExport");
  if (btnExport) btnExport.style.display = "inline-block";


  const importBtn = document.querySelector(".import-btn");
  if (importBtn) importBtn.style.display = "inline-block";


  const resetBtn = document.getElementById("btnReset");
  if (resetBtn) resetBtn.style.display = isOwner ? "inline-block" : "none";
}


let selectedTransaction = null;
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-email")) {
    const ts = e.target.dataset.ts;
    selectedTransaction = getData().trans.find(x => x.timestamp == ts);

    document.getElementById("emailToSend").value =
      selectedTransaction?.email || "";

    document.getElementById("emailModal").style.display = "flex";
  }
});
function sendEmail() {
  if (!selectedTransaction) return alert("No transaction selected");

  const email = document.getElementById("emailToSend").value;
  const message = document.getElementById("emailMessage").value;

  if (!email) return alert("Enter email");

  let discountValue = selectedTransaction.remark.includes("Free")
    ? calcPrice(selectedTransaction.laundryType, 1)
    : 0;

  const transactionId = "#" + Math.floor(Math.random() * 9000000 + 1000000);

  emailjs.send("service_t0b77zq", "template_xge1do5", {
    to_email: email,
    customer_name: selectedTransaction.name,
    laundry_type: selectedTransaction.laundryType,
    weight: selectedTransaction.weight,
    total_amount: selectedTransaction.total,
    remarks: selectedTransaction.remark,
    transaction_date: selectedTransaction.date,
    transaction_time: selectedTransaction.time,
    discount: discountValue,
    transaction_id: transactionId,
    additional_message: message
  })
  .then(() => {
    alert("Email sent!");
    closeEmailModal();
  })
  .catch(() => alert("Failed to send email"));
}

