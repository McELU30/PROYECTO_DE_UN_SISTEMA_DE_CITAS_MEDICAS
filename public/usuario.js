// Verificar sesión y cargar datos iniciales
let userSession = null;
let pacienteSesionId = null;

document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
});

async function verificarSesion() {
  try {
    const res = await fetch('/api/auth-check', { credentials: 'same-origin' });
    const data = await res.json();
    if (!data.ok) {
      window.location.href = '/login';
      return;
    }
    userSession = data.usuario || {};
    inicializarVista();
  } catch (err) {
    window.location.href = '/login';
  }
}

function inicializarVista() {
  // Etiquetas de usuario
  document.getElementById('lblUsuario').textContent = userSession.usuario || '-';
  document.getElementById('lblRol').textContent = userSession.rol || '-';

  // Botones
  document.getElementById('btnCerrarSesionUser')?.addEventListener('click', cerrarSesion);
  document.getElementById('btnRefrescarCitasUser')?.addEventListener('click', recargarTodo);
  document.getElementById('btnRefrescarTablaUser')?.addEventListener('click', cargarCitasUsuario);
  document.getElementById('btnCrearCitaUser')?.addEventListener('click', guardarCitaUsuario);

  recargarTodo();

  // Delegación de eventos en la tabla
  const tbody = document.querySelector('#tablaCitasUsuario tbody');
  if (tbody) {
    tbody.addEventListener('click', manejarAccionTabla);
  }
}

async function recargarTodo() {
  await Promise.all([cargarPacientesUsuario(), cargarDoctoresUsuario()]);
  await cargarCitasUsuario();
}

async function cargarPacientesUsuario() {
  const select = document.getElementById('selectPacienteUser');
  select.innerHTML = '<option value="">Cargando pacientes...</option>';
  try {
    const res = await fetch('/api/pacientes');
    const data = await res.json();
    select.innerHTML = '<option value="">-- Seleccione paciente --</option>';

    // Intentar vincular por id_persona de la sesión
    const encontrado = data.find(p => String(p.id_persona) === String(userSession.id_persona));
    if (encontrado) {
      pacienteSesionId = encontrado.id_paciente;
      document.getElementById('lblPacienteInfo').textContent =
        `Paciente: ${escapeHtml(encontrado.nombres)} ${escapeHtml(encontrado.apellidos)} (DNI ${escapeHtml(encontrado.dni)})`;
    } else {
      pacienteSesionId = null;
      document.getElementById('lblPacienteInfo').textContent = 'Paciente no vinculado';
    }

    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id_paciente;
      opt.textContent = `${p.nombres} ${p.apellidos} (DNI: ${p.dni})`;
      select.appendChild(opt);
    });

    if (pacienteSesionId) {
      select.value = pacienteSesionId;
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = '<option value="">Error cargando pacientes</option>';
  }
}

async function cargarDoctoresUsuario() {
  const select = document.getElementById('selectDoctorUser');
  select.innerHTML = '<option value="">Cargando doctores...</option>';
  try {
    const res = await fetch('/api/doctores');
    const data = await res.json();
    select.innerHTML = '<option value="">-- Seleccione doctor --</option>';
    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_doctor;
      opt.textContent = `Dr. ${d.nombres} ${d.apellidos} — ${d.especialidad}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    select.innerHTML = '<option value="">Error cargando doctores</option>';
  }
}

async function cargarCitasUsuario() {
  const tbody = document.querySelector('#tablaCitasUsuario tbody');
  tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/citas');
    const data = await res.json();

    // Filtrar por paciente de la sesión cuando exista
    const citas = pacienteSesionId
      ? data.filter(c => String(c.id_paciente) === String(pacienteSesionId))
      : data;

    if (!citas.length) {
      tbody.innerHTML = '<tr><td colspan="7">No hay citas para mostrar</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    citas.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.id_cita}</td>
        <td>${escapeHtml(c.fecha)}</td>
        <td>${escapeHtml(c.hora?.substring(0,5) || '')}</td>
        <td>${escapeHtml(c.paciente_nombres || '')} ${escapeHtml(c.paciente_apellidos || '')}</td>
        <td>${escapeHtml(c.doctor_nombres || '')} ${escapeHtml(c.doctor_apellidos || '')}</td>
        <td>${escapeHtml(c.estado)}</td>
        <td class="d-flex gap-1">
          <button class="btn btn-sm btn-dark btn-view-user" data-id="${c.id_cita}">Ver</button>
          <button class="btn btn-sm btn-danger btn-cancel-user" data-id="${c.id_cita}">Cancelar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7">Error cargando citas</td></tr>';
  }
}

async function guardarCitaUsuario() {
  const selectPaciente = document.getElementById('selectPacienteUser');
  const id_paciente = pacienteSesionId || selectPaciente.value;
  const id_doctor = document.getElementById('selectDoctorUser').value;
  const fecha = document.getElementById('fechaUser').value;
  const hora = document.getElementById('horaUser').value;
  const motivo = document.getElementById('motivoUser').value.trim();

  if (!id_paciente || !id_doctor || !fecha || !hora) {
    alert('Completa paciente, doctor, fecha y hora.');
    return;
  }

  try {
    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_paciente, id_doctor, fecha, hora, motivo }),
      credentials: 'same-origin'
    });
    if (!res.ok) throw new Error('No se pudo crear la cita');
    alert('Cita creada con éxito');
    document.getElementById('motivoUser').value = '';
    await cargarCitasUsuario();
  } catch (err) {
    alert(err.message || 'Error creando cita');
  }
}

async function manejarAccionTabla(e) {
  const btn = e.target;
  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains('btn-view-user')) {
    await mostrarDetalleCita(id);
  }

  if (btn.classList.contains('btn-cancel-user')) {
    await cancelarCita(id);
  }
}

async function mostrarDetalleCita(id) {
  try {
    const res = await fetch('/api/citas');
    const data = await res.json();
    const cita = data.find(c => String(c.id_cita) === String(id));
    if (!cita) return alert('No se encontró la cita');
    alert(
      `Cita #${cita.id_cita}\n` +
      `Paciente: ${cita.paciente_nombres} ${cita.paciente_apellidos}\n` +
      `Doctor: ${cita.doctor_nombres} ${cita.doctor_apellidos}\n` +
      `Fecha: ${cita.fecha} ${cita.hora}\n` +
      `Motivo: ${cita.motivo || '-'}`
    );
  } catch (err) {
    alert('Error al mostrar el detalle');
  }
}

async function cancelarCita(id) {
  // Evitar que un usuario cancele citas ajenas si está vinculado a un paciente
  if (pacienteSesionId) {
    try {
      const res = await fetch('/api/citas');
      const data = await res.json();
      const cita = data.find(c => String(c.id_cita) === String(id));
      if (cita && String(cita.id_paciente) !== String(pacienteSesionId)) {
        alert('Solo puedes cancelar tus propias citas.');
        return;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!confirm('¿Deseas cancelar esta cita?')) return;
  try {
    const res = await fetch(`/api/citas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    await cargarCitasUsuario();
  } catch (err) {
    alert('No se pudo cancelar la cita');
  }
}

async function cerrarSesion() {
  if (!confirm('¿Cerrar sesión?')) return;
  try {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.ok) {
      window.location.href = '/login';
    } else {
      alert('Error al cerrar sesión');
    }
  } catch (err) {
    window.location.href = '/login';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

