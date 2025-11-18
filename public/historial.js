// public/historial.js

// Verificar sesión al cargar la página
(async function verificarSesion() {
  try {
    const res = await fetch('/api/auth-check', { credentials: 'same-origin' });
    const data = await res.json();
    if (!data.ok) {
      window.location.href = '/login';
      return;
    }
    // Si hay sesión, continuar con la inicialización
    inicializarApp();
  } catch (err) {
    window.location.href = '/login';
    return;
  }
})();

function inicializarApp() {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarEventos);
  } else {
    configurarEventos();
  }
}

function configurarEventos() {
  // Cargar datos iniciales
  cargarPacientes();
  cargarDoctores();
  cargarHistorial();
  
  // Configurar botón refrescar
  const btnRefrescar = document.getElementById('btnRefrescar');
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', () => {
      cargarPacientes();
      cargarDoctores();
      cargarHistorial();
    });
  }
  
  // Configurar formulario
  const btnGuardarHistorial = document.getElementById('btnGuardarHistorial');
  if (btnGuardarHistorial) {
    btnGuardarHistorial.addEventListener('click', async () => {
      const id = document.getElementById('edit_id').value;
      const payload = {
        id_paciente: document.getElementById('selectPaciente').value,
        id_doctor: document.getElementById('selectDoctor').value,
        fecha: document.getElementById('fecha').value,
        diagnostico: document.getElementById('diagnostico').value.trim(),
        tratamiento: document.getElementById('tratamiento').value.trim() || null,
        receta: document.getElementById('receta').value.trim() || null
      };
      if (!payload.id_paciente || !payload.id_doctor || !payload.fecha || !payload.diagnostico) {
        return alert('Paciente, doctor, fecha y diagnóstico son obligatorios.');
      }

      try {
        if (id) {
          await actualizarHistorial(id, payload);
          alert('Registro de historial actualizado');
        } else {
          await crearHistorial(payload);
          alert('Registro de historial creado');
        }
        // limpiar form
        document.getElementById('edit_id').value = '';
        document.getElementById('selectPaciente').value = '';
        document.getElementById('selectDoctor').value = '';
        document.getElementById('fecha').value = '';
        document.getElementById('diagnostico').value = '';
        document.getElementById('tratamiento').value = '';
        document.getElementById('receta').value = '';
        await cargarHistorial();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Error al guardar');
      }
    });
  }
  
  // Configurar botón cancelar
  const btnCancelarEdit = document.getElementById('btnCancelarEdit');
  if (btnCancelarEdit) {
    btnCancelarEdit.addEventListener('click', () => {
      document.getElementById('edit_id').value = '';
      document.getElementById('selectPaciente').value = '';
      document.getElementById('selectDoctor').value = '';
      document.getElementById('fecha').value = '';
      document.getElementById('diagnostico').value = '';
      document.getElementById('tratamiento').value = '';
      document.getElementById('receta').value = '';
    });
  }
}

// helpers
function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function cargarPacientes() {
  const selectPaciente = document.getElementById('selectPaciente');
  selectPaciente.innerHTML = '<option value="">Cargando pacientes...</option>';
  try {
    const res = await fetch('/api/pacientes');
    if (!res.ok) throw new Error('Error al obtener pacientes');
    const data = await res.json();
    selectPaciente.innerHTML = '<option value="">-- Seleccione paciente --</option>';
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id_paciente;
      opt.textContent = `${p.nombres} ${p.apellidos} (DNI: ${p.dni})`;
      selectPaciente.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectPaciente.innerHTML = '<option value="">Error cargando pacientes</option>';
  }
}

async function cargarDoctores() {
  const selectDoctor = document.getElementById('selectDoctor');
  selectDoctor.innerHTML = '<option value="">Cargando doctores...</option>';
  try {
    const res = await fetch('/api/doctores');
    if (!res.ok) throw new Error('Error al obtener doctores');
    const data = await res.json();
    selectDoctor.innerHTML = '<option value="">-- Seleccione doctor --</option>';
    data.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id_doctor;
      opt.textContent = `Dr. ${d.nombres} ${d.apellidos} - ${d.especialidad}`;
      selectDoctor.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectDoctor.innerHTML = '<option value="">Error cargando doctores</option>';
  }
}

async function cargarHistorial() {
  const tbody = document.querySelector('#tablaHistorial tbody');
  tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/historial');
    if (!res.ok) throw new Error('Error al obtener historial');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No hay registros de historial</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.id_historial}</td>
        <td>${h.fecha}</td>
        <td>${escapeHtml(h.paciente_nombres)} ${escapeHtml(h.paciente_apellidos)}</td>
        <td>${escapeHtml(h.doctor_nombres)} ${escapeHtml(h.doctor_apellidos)}</td>
        <td>${escapeHtml(h.diagnostico.substring(0, 50))}${h.diagnostico.length > 50 ? '...' : ''}</td>
        <td>${escapeHtml(h.tratamiento ? (h.tratamiento.substring(0, 50) + (h.tratamiento.length > 50 ? '...' : '')) : '-')}</td>
        <td>
          <button class="btn btn-sm btn-light btn-view" data-id="${h.id_historial}">Ver</button>
          <button class="btn btn-sm btn-light btn-edit" data-id="${h.id_historial}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${h.id_historial}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7">Error cargando historial</td></tr>';
  }
}

// crear nuevo historial
async function crearHistorial(payload) {
  const res = await fetch('/api/historial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error creando historial');
  }
  return res.json();
}

// actualizar historial
async function actualizarHistorial(id, payload) {
  const res = await fetch(`/api/historial/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error actualizando historial');
  }
  return res.json();
}

// eliminar
async function eliminarHistorial(id) {
  if (!confirm('¿Eliminar este registro de historial?')) return;
  const res = await fetch(`/api/historial/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error eliminando');
  await cargarHistorial();
}

// Cerrar sesión
document.addEventListener('DOMContentLoaded', () => {
  const btnCerrarSesion = document.getElementById('btnCerrarSesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
      if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) return;
      
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
        console.error(err);
        window.location.href = '/login';
      }
    });
  }
});

// UI actions
document.addEventListener('click', async (e) => {
  const el = e.target;
  // ver
  if (el.matches('.btn-view')) {
    const id = el.dataset.id;
    try {
      const resp = await fetch('/api/historial');
      const data = await resp.json();
      const h = data.find(x => String(x.id_historial) === String(id));
      if (!h) return alert('Registro no encontrado');
      const mensaje = `Historial #${h.id_historial}\n` +
        `Fecha: ${h.fecha}\n` +
        `Paciente: ${h.paciente_nombres} ${h.paciente_apellidos}\n` +
        `Doctor: ${h.doctor_nombres} ${h.doctor_apellidos}\n` +
        `Diagnóstico: ${h.diagnostico}\n` +
        `Tratamiento: ${h.tratamiento || '-'}\n` +
        `Receta: ${h.receta || '-'}`;
      alert(mensaje);
    } catch (err) {
      console.error(err);
      alert('Error al cargar registro');
    }
  }
  
  // editar
  if (el.matches('.btn-edit')) {
    const id = el.dataset.id;
    try {
      const resp = await fetch('/api/historial');
      const data = await resp.json();
      const h = data.find(x => String(x.id_historial) === String(id));
      if (!h) return alert('Registro no encontrado');
      document.getElementById('edit_id').value = h.id_historial;
      document.getElementById('selectPaciente').value = h.id_paciente;
      document.getElementById('selectDoctor').value = h.id_doctor;
      document.getElementById('fecha').value = h.fecha;
      document.getElementById('diagnostico').value = h.diagnostico || '';
      document.getElementById('tratamiento').value = h.tratamiento || '';
      document.getElementById('receta').value = h.receta || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error al cargar registro');
    }
  }

  // eliminar
  if (el.matches('.btn-delete')) {
    const id = el.dataset.id;
    try {
      await eliminarHistorial(id);
    } catch (err) {
      console.error(err); alert('No se pudo eliminar');
    }
  }
});

