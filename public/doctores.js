// public/doctores.js

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
  cargarPersonas();
  cargarDoctores();
  
  // Configurar botón refrescar
  const btnRefrescar = document.getElementById('btnRefrescar');
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', () => {
      cargarPersonas();
      cargarDoctores();
    });
  }
  
  // Configurar formulario
  const btnGuardarDoctor = document.getElementById('btnGuardarDoctor');
  if (btnGuardarDoctor) {
    btnGuardarDoctor.addEventListener('click', async () => {
      const id = document.getElementById('edit_id').value;
      const payload = {
        id_persona: document.getElementById('selectPersona').value,
        especialidad: document.getElementById('especialidad').value.trim(),
        nro_colegiatura: document.getElementById('nro_colegiatura').value.trim()
      };
      if (!payload.id_persona || !payload.especialidad || !payload.nro_colegiatura) {
        return alert('Persona, especialidad y número de colegiatura son obligatorios.');
      }

      try {
        if (id) {
          await actualizarDoctor(id, payload);
          alert('Doctor actualizado');
        } else {
          await crearDoctor(payload);
          alert('Doctor creado');
        }
        // limpiar form
        document.getElementById('edit_id').value = '';
        document.getElementById('selectPersona').value = '';
        document.getElementById('especialidad').value = '';
        document.getElementById('nro_colegiatura').value = '';
        await cargarDoctores();
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
      document.getElementById('selectPersona').value = '';
      document.getElementById('especialidad').value = '';
      document.getElementById('nro_colegiatura').value = '';
    });
  }
}

// helpers
function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function cargarPersonas() {
  const selectPersona = document.getElementById('selectPersona');
  selectPersona.innerHTML = '<option value="">Cargando personas...</option>';
  try {
    const res = await fetch('/api/personas');
    if (!res.ok) throw new Error('Error al obtener personas');
    const data = await res.json();
    selectPersona.innerHTML = '<option value="">-- Seleccione persona --</option>';
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id_persona;
      opt.textContent = `${p.nombres} ${p.apellidos} (DNI: ${p.dni})`;
      selectPersona.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    selectPersona.innerHTML = '<option value="">Error cargando personas</option>';
  }
}

async function cargarDoctores() {
  const tbody = document.querySelector('#tablaDoctores tbody');
  tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/doctores');
    if (!res.ok) throw new Error('Error al obtener doctores');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No hay doctores registrados</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.id_doctor}</td>
        <td>${escapeHtml(d.nombres)}</td>
        <td>${escapeHtml(d.apellidos)}</td>
        <td>${escapeHtml(d.dni)}</td>
        <td>${escapeHtml(d.especialidad)}</td>
        <td>${escapeHtml(d.nro_colegiatura)}</td>
        <td>
          <button class="btn btn-sm btn-light btn-edit" data-id="${d.id_doctor}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${d.id_doctor}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7">Error cargando doctores</td></tr>';
  }
}

// crear nuevo doctor
async function crearDoctor(payload) {
  const res = await fetch('/api/doctores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error creando doctor');
  }
  return res.json();
}

// actualizar doctor
async function actualizarDoctor(id, payload) {
  const res = await fetch(`/api/doctores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error actualizando doctor');
  }
  return res.json();
}

// eliminar
async function eliminarDoctor(id) {
  if (!confirm('¿Eliminar este doctor?')) return;
  const res = await fetch(`/api/doctores/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error eliminando');
  await cargarDoctores();
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
  // editar
  if (el.matches('.btn-edit')) {
    const id = el.dataset.id;
    try {
      const resp = await fetch('/api/doctores');
      const data = await resp.json();
      const d = data.find(x => String(x.id_doctor) === String(id));
      if (!d) return alert('Doctor no encontrado');
      document.getElementById('edit_id').value = d.id_doctor;
      document.getElementById('selectPersona').value = d.id_persona;
      document.getElementById('especialidad').value = d.especialidad || '';
      document.getElementById('nro_colegiatura').value = d.nro_colegiatura || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error al cargar doctor');
    }
  }

  // eliminar
  if (el.matches('.btn-delete')) {
    const id = el.dataset.id;
    try {
      await eliminarDoctor(id);
    } catch (err) {
      console.error(err); alert('No se pudo eliminar');
    }
  }
});

