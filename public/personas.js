// public/personas.js

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
  
  // Configurar botón refrescar
  const btnRefrescar = document.getElementById('btnRefrescar');
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', cargarPersonas);
  }
  
  // Configurar formulario
  const btnGuardarPersona = document.getElementById('btnGuardarPersona');
  if (btnGuardarPersona) {
    btnGuardarPersona.addEventListener('click', async () => {
      const id = document.getElementById('edit_id').value;
      const payload = {
        nombres: document.getElementById('nombres').value.trim(),
        apellidos: document.getElementById('apellidos').value.trim(),
        dni: document.getElementById('dni').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        fecha_nacimiento: document.getElementById('fecha_nacimiento').value || null
      };
      if (!payload.nombres || !payload.apellidos || !payload.dni) {
        return alert('Nombres, apellidos y DNI son obligatorios.');
      }

      try {
        if (id) {
          await actualizarPersona(id, payload);
          alert('Persona actualizada');
        } else {
          await crearPersona(payload);
          alert('Persona creada');
        }
        // limpiar form
        document.getElementById('edit_id').value = '';
        document.getElementById('nombres').value = '';
        document.getElementById('apellidos').value = '';
        document.getElementById('dni').value = '';
        document.getElementById('telefono').value = '';
        document.getElementById('direccion').value = '';
        document.getElementById('fecha_nacimiento').value = '';
        await cargarPersonas();
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
      document.getElementById('nombres').value = '';
      document.getElementById('apellidos').value = '';
      document.getElementById('dni').value = '';
      document.getElementById('telefono').value = '';
      document.getElementById('direccion').value = '';
      document.getElementById('fecha_nacimiento').value = '';
    });
  }
  
  // Configurar botón cerrar sesión
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
}

// helpers
function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function cargarPersonas() {
  const tbody = document.querySelector('#tablaPersonas tbody');
  tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/personas');
    if (!res.ok) throw new Error('Error al obtener personas');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No hay personas registradas</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id_persona}</td>
        <td>${escapeHtml(p.nombres)}</td>
        <td>${escapeHtml(p.apellidos)}</td>
        <td>${escapeHtml(p.dni)}</td>
        <td>${escapeHtml(p.telefono || '')}</td>
        <td>${escapeHtml(p.direccion || '')}</td>
        <td>${p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : ''}</td>
        <td>
          <button class="btn btn-sm btn-light btn-edit" data-id="${p.id_persona}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${p.id_persona}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8">Error cargando personas</td></tr>';
  }
}

// crear nueva persona
async function crearPersona(payload) {
  const res = await fetch('/api/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error creando persona');
  }
  return res.json();
}

// actualizar persona
async function actualizarPersona(id, payload) {
  const res = await fetch(`/api/personas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error actualizando persona');
  }
  return res.json();
}

// eliminar
async function eliminarPersona(id) {
  if (!confirm('¿Eliminar esta persona?')) return;
  const res = await fetch(`/api/personas/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error eliminando');
  await cargarPersonas();
}

// UI actions
document.addEventListener('click', async (e) => {
  const el = e.target;
  // editar
  if (el.matches('.btn-edit')) {
    const id = el.dataset.id;
    // pedir datos del servidor para seguridad (o buscar en tabla si lo prefieres)
    try {
      const resp = await fetch('/api/personas');
      const data = await resp.json();
      const p = data.find(x => String(x.id_persona) === String(id));
      if (!p) return alert('Persona no encontrada');
      document.getElementById('edit_id').value = p.id_persona;
      document.getElementById('nombres').value = p.nombres || '';
      document.getElementById('apellidos').value = p.apellidos || '';
      document.getElementById('dni').value = p.dni || '';
      document.getElementById('telefono').value = p.telefono || '';
      document.getElementById('direccion').value = p.direccion || '';
      document.getElementById('fecha_nacimiento').value = p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '';
      // scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error al cargar persona');
    }
  }

  // eliminar
  if (el.matches('.btn-delete')) {
    const id = el.dataset.id;
    try {
      await eliminarPersona(id);
    } catch (err) {
      console.error(err); alert('No se pudo eliminar');
    }
  }
});

