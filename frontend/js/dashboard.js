/* dashboard.js — pantalla de inicio */
(async function () {
  const clients = await api.getClients();
  $("#sClientes").textContent = clients.length;
  $("#ordersBody").innerHTML = orders.map(o =>
    `<tr><td>${o[0]}</td><td>${o[1]}</td><td>${o[2]}</td>
     <td><span class="pill ${o[3] === "En preparación" ? "prep" : o[3]}">${o[3]}</span></td><td>${o[4]}</td></tr>`).join("");
})();
