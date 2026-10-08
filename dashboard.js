const ESTADO_CLASS = {
  "Listo": "listo",
  "Pendiente": "pendiente",
  "En preparación": "preparacion",
};

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function formatMoney(n) {
  return "$" + Number(n).toLocaleString("es-AR");
}

function renderPedidos(pedidos) {
  const tbody = document.getElementById("pedidosBody");

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay pedidos próximos.</td></tr>`;
    return;
  }

  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>${p.cliente}</td>
      <td>${p.fechaEntrega}</td>
      <td><span class="badge ${ESTADO_CLASS[p.estado] || ""}">${p.estado}</span></td>
      <td>${formatMoney(p.total)}</td>
    </tr>
  `).join("");
}

async function cargarDashboard() {
  const token = getToken();

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };

    const [resResumen, resPedidos] = await Promise.all([
      fetch("/api/dashboard/resumen", { headers }),
      fetch("/api/pedidos?estado=proximos", { headers }),
    ]);

    if (!resResumen.ok || !resPedidos.ok) throw new Error();

    const resumen = await resResumen.json();
    const pedidos = await resPedidos.json();

    document.getElementById("userName").textContent = resumen.usuario?.nombre || "Marita Had";
    document.getElementById("saludo").textContent = `¡Buenos días, ${resumen.usuario?.nombre?.split(" ")[0] || ""}!`;

    document.getElementById("statClientes").textContent = resumen.clientes;
    document.getElementById("statPedidos").textContent = resumen.pedidosPendientes;
    document.getElementById("statStock").textContent = resumen.productosStock;
    document.getElementById("statStockBajo").textContent = resumen.stockBajo;

    renderPedidos(pedidos);
  } catch (err) {
    document.getElementById("pedidosBody").innerHTML =
      `<tr><td colspan="5">No se pudo cargar la información.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarDashboard);