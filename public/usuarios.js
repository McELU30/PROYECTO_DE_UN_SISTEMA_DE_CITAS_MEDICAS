// public/usuarios.js

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
  cargarUsuarios();
  
  // Configurar botón refrescar
  const btnRefrescar = document.getElementById('btnRefrescar');
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', () => {
      cargarPersonas();
      cargarUsuarios();
    });
  }
  
  // Configurar formulario
  const btnGuardarUsuario = document.getElementById('btnGuardarUsuario');
  if (btnGuardarUsuario) {
    btnGuardarUsuario.addEventListener('click', async () => {
      const id = document.getElementById('edit_id').value;
      const payload = {
        id_persona: document.getElementById('selectPersona').value,
        usuario: document.getElementById('usuario').value.trim(),
        contraseña: document.getElementById('contraseña').value.trim(),
        rol: document.getElementById('selectRol').value
      };
      if (!payload.id_persona || !payload.usuario || !payload.rol) {
        return alert('Persona, usuario y rol son obligatorios.');
      }
      // Si no hay contraseña y es edición, no incluirla
      if (!payload.contraseña && id) {
        delete payload.contraseña;
      }
      // Si es creación y no hay contraseña, mostrar error
      if (!id && !payload.contraseña) {
        return alert('La contraseña es obligatoria al crear un usuario.');
      }

      try {
        if (id) {
          await actualizarUsuario(id, payload);
          alert('Usuario actualizado');
        } else {
          await crearUsuario(payload);
          alert('Usuario creado');
        }
        // limpiar form
        document.getElementById('edit_id').value = '';
        document.getElementById('selectPersona').value = '';
        document.getElementById('usuario').value = '';
        document.getElementById('contraseña').value = '';
        document.getElementById('selectRol').value = '';
        await cargarUsuarios();
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
      document.getElementById('usuario').value = '';
      document.getElementById('contraseña').value = '';
      document.getElementById('selectRol').value = '';
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

async function cargarUsuarios() {
  const tbody = document.querySelector('#tablaUsuarios tbody');
  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  try {
    const res = await fetch('/api/usuarios', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Error al obtener usuarios');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay usuarios registrados</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id_usuario}</td>
        <td>${escapeHtml(u.usuario)}</td>
        <td>${escapeHtml(u.nombres || '')} ${escapeHtml(u.apellidos || '')}</td>
        <td>${escapeHtml(u.dni || '')}</td>
        <td>${escapeHtml(u.rol)}</td>
        <td>
          <button class="btn btn-sm btn-light btn-edit" data-id="${u.id_usuario}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${u.id_usuario}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6">Error cargando usuarios</td></tr>';
  }
}

// crear nuevo usuario
async function crearUsuario(payload) {
  const res = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin'
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error creando usuario');
  }
  return res.json();
}

// actualizar usuario
async function actualizarUsuario(id, payload) {
  const res = await fetch(`/api/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin'
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({error:'Error'}));
    throw new Error(e.error || 'Error actualizando usuario');
  }
  return res.json();
}

// eliminar
async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const res = await fetch(`/api/usuarios/${id}`, { 
    method: 'DELETE',
    credentials: 'same-origin'
  });
  if (!res.ok) throw new Error('Error eliminando');
  await cargarUsuarios();
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
      const resp = await fetch('/api/usuarios', { credentials: 'same-origin' });
      const data = await resp.json();
      const u = data.find(x => String(x.id_usuario) === String(id));
      if (!u) return alert('Usuario no encontrado');
      document.getElementById('edit_id').value = u.id_usuario;
      document.getElementById('selectPersona').value = u.id_persona || '';
      document.getElementById('usuario').value = u.usuario || '';
      document.getElementById('contraseña').value = ''; // No mostrar contraseña
      document.getElementById('selectRol').value = u.rol || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error al cargar usuario');
    }
  }

  // eliminar
  if (el.matches('.btn-delete')) {
    const id = el.dataset.id;
    try {
      await eliminarUsuario(id);
    } catch (err) {
      console.error(err); alert('No se pudo eliminar');
    }
  }
});

