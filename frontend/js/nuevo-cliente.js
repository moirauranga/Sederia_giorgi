/* nuevo-cliente.js — formulario de alta de cliente */
$("#cForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, m = $("#cMsg"); let bad = false;

  $$("#cForm [required]").forEach(i => { const ko = !i.value.trim(); i.classList.toggle("err", ko); if (ko) bad = true; });
  if (bad) { m.textContent = "Completá los campos obligatorios (*)."; return; }
  if (!/^\S+@\S+\.\S+$/.test(f.email.value)) { f.email.classList.add("err"); m.textContent = "El email no es válido."; return; }
  if (!/^[\d+\-\s()]{6,}$/.test(f.telefono.value)) { f.telefono.classList.add("err"); m.textContent = "El teléfono no es válido."; return; }
  if (!/^\d{7,11}$/.test(f.dni.value.replace(/\D/g, ""))) { f.dni.classList.add("err"); m.textContent = "DNI/CUIT inválido (7 a 11 dígitos)."; return; }

  const data = Object.fromEntries(new FormData(f).entries());
  Object.keys(data).forEach(k => data[k] = data[k].trim());

  $("#save").disabled = true; m.textContent = "";
  const res = await api.createClient(data);   // ← acá se conecta el backend
  $("#save").disabled = false;
  if (!res.ok) { m.textContent = res.error; return; }

  toast("Cliente guardado ✓");
  setTimeout(() => location.href = "clientes.html", 700);
});
