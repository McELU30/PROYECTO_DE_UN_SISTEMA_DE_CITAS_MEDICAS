// public/app.js - verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sesión antes de cargar el contenido
  try {
    const res = await fetch('/api/auth-check', { credentials: 'same-origin' });
    const data = await res.json();
    if (!data.ok) {
      window.location.href = '/login';
      return;
    }
  } catch (err) {
    window.location.href = '/login';
    return;
  }

  // Elementos de la vista Citas
  const selectPaciente = document.getElementById('selectPaciente');
  const selectDoctor = document.getElementById('selectDoctor');
  const tablaCitasBody = document.querySelector('#tablaCitas tbody');
  const btnGuardarCita = document.getElementById('btnGuardarCita');
  const btnCancelarCita = document.getElementById('btnCancelarCita');
  const btnRefrescarCitas = document.getElementById('btnRefrescarCitas');
  
  // Elementos de la vista Pacientes
  const selectPersonaPaciente = document.getElementById('selectPersonaPaciente');
  const tablaPacientesBody = document.querySelector('#tablaPacientes tbody');
  const btnGuardarPaciente = document.getElementById('btnGuardarPaciente');
  const btnCancelarPaciente = document.getElementById('btnCancelarPaciente');
  const btnRefrescarPacientes = document.getElementById('btnRefrescarPacientes');
  
  // Botones del sidebar
  const btnNuevoPaciente = document.getElementById('btnNuevoPaciente');
  const btnNuevoDoctor = document.getElementById('btnNuevoDoctor');
  const navCitas = document.getElementById('navCitas');
  const navPacientes = document.getElementById('navPacientes');
  
  // Vistas
  const vistaCitas = document.getElementById('vistaCitas');
  const vistaPacientes = document.getElementById('vistaPacientes');

  // Función para cambiar entre vistas
  function mostrarVista(vista) {
    if (vista === 'citas') {
      vistaCitas.style.display = 'block';
      vistaPacientes.style.display = 'none';
      // Actualizar sidebar activo
      document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
      });
      navCitas.classList.add('active');
    } else if (vista === 'pacientes') {
      vistaCitas.style.display = 'none';
      vistaPacientes.style.display = 'block';
      // Actualizar sidebar activo
      document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
      });
      navPacientes.parentElement.classList.add('active');
      cargarPacientes();
      cargarPersonasParaPaciente();
    }
  }

  // Navegación
  navCitas.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarVista('citas');
  });

  navPacientes.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarVista('pacientes');
  });

  btnNuevoPaciente.addEventListener('click', () => {
    mostrarVista('pacientes');
  });

  // ==================== FUNCIONES CITAS ====================

  async function fetchPacientes() {
    if (!selectPaciente) return;
    selectPaciente.innerHTML = '<option value="">Cargando pacientes...</option>';
    try {
      const res = await fetch('/api/pacientes');
      const data = await res.json();
      selectPaciente.innerHTML = '<option value="">-- Seleccione paciente --</option>';
      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id_paciente;
        opt.textContent = `${p.nombres} ${p.apellidos} (DNI: ${p.dni})`;
        selectPaciente.appendChild(opt);
      });
    } catch (err) {
      selectPaciente.innerHTML = '<option value="">Error cargando pacientes</option>';
    }
  }

  async function fetchDoctores() {
    if (!selectDoctor) return;
    selectDoctor.innerHTML = '<option value="">Cargando doctores...</option>';
    try {
      const res = await fetch('/api/doctores');
      const data = await res.json();
      selectDoctor.innerHTML = '<option value="">-- Seleccione doctor --</option>';
      data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id_doctor;
        opt.textContent = `Dr. ${d.nombres} ${d.apellidos} — ${d.especialidad}`;
        selectDoctor.appendChild(opt);
      });
    } catch (err) {
      selectDoctor.innerHTML = '<option value="">Error cargando doctores</option>';
    }
  }

  async function cargarCitas() {
    if (!tablaCitasBody) return;
    tablaCitasBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/citas');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        tablaCitasBody.innerHTML = '<tr><td colspan="7">No hay citas</td></tr>';
        return;
      }
      tablaCitasBody.innerHTML = '';
      data.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.id_cita}</td>
          <td>${c.fecha}</td>
          <td>${c.hora.substring(0,5)}</td>
          <td>${escapeHtml(c.paciente_nombres || '')} ${escapeHtml(c.paciente_apellidos || '')}</td>
          <td>${escapeHtml(c.doctor_nombres || '')} ${escapeHtml(c.doctor_apellidos || '')}</td>
          <td>${escapeHtml(c.estado)}</td>
          <td>
            <button class="btn btn-sm btn-dark btn-view" data-id="${c.id_cita}">Ver</button>
            <button class="btn btn-sm btn-primary btn-edit" data-id="${c.id_cita}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${c.id_cita}">Eliminar</button>
          </td>
        `;
        tablaCitasBody.appendChild(tr);
      });
    } catch (err) {
      tablaCitasBody.innerHTML = '<tr><td colspan="7">Error cargando citas</td></tr>';
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (m) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
    );
  }

  // Guardar cita
  if (btnGuardarCita) {
    btnGuardarCita.addEventListener('click', async () => {
      const id_cita = document.getElementById('id_cita').value;
      const id_paciente = selectPaciente.value;
      const id_doctor = selectDoctor.value;
      const fecha = document.getElementById('fecha').value;
      const hora = document.getElementById('hora').value;
      const motivo = document.getElementById('motivo').value;

      if (!id_paciente || !id_doctor || !fecha || !hora) {
        alert('Selecciona paciente, doctor, fecha y hora.');
        return;
      }

      const body = { id_paciente, id_doctor, fecha, hora, motivo };

      try {
        if (id_cita) {
          const res = await fetch(`/api/citas/${id_cita}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error('Error actualizando cita');
          alert('Cita actualizada');
        } else {
          const res = await fetch('/api/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error('Error creando cita');
          alert('Cita creada');
        }
        resetFormCita();
        cargarCitas();
        fetchPacientes(); // Actualizar select
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if (btnCancelarCita) {
    btnCancelarCita.addEventListener('click', () => resetFormCita());
  }

  function resetFormCita() {
    document.getElementById('id_cita').value = '';
    document.getElementById('formCita').reset();
  }

  // Delegación tabla citas
  if (tablaCitasBody) {
    tablaCitasBody.addEventListener('click', async (e) => {
      const target = e.target;
      const id = target.dataset.id;
      if (!id) return;

      if (target.classList.contains('btn-delete')) {
        if (!confirm('Eliminar esta cita?')) return;
        await fetch(`/api/citas/${id}`, { method: 'DELETE' });
        cargarCitas();
      } else if (target.classList.contains('btn-edit')) {
        try {
          const res = await fetch('/api/citas');
          const data = await res.json();
          const cita = data.find(x => String(x.id_cita) === String(id));
          if (!cita) return alert('No se encontró la cita');
          document.getElementById('id_cita').value = cita.id_cita;
          selectPaciente.value = cita.id_paciente;
          selectDoctor.value = cita.id_doctor;
          document.getElementById('fecha').value = cita.fecha;
          document.getElementById('hora').value = cita.hora.substring(0,5);
          document.getElementById('motivo').value = cita.motivo || '';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          alert('Error al editar');
        }
      } else if (target.classList.contains('btn-view')) {
        try {
          const res = await fetch('/api/citas');
          const data = await res.json();
          const cita = data.find(x => String(x.id_cita) === String(id));
          if (!cita) return alert('No se encontró la cita');
          alert(`Cita #${cita.id_cita}\nPaciente: ${cita.paciente_nombres} ${cita.paciente_apellidos}\nDoctor: ${cita.doctor_nombres} ${cita.doctor_apellidos}\nFecha: ${cita.fecha} ${cita.hora}\nMotivo: ${cita.motivo || '-'}`);
        } catch (err) {
          alert('Error mostrando detalle');
        }
      }
    });
  }

  if (btnRefrescarCitas) {
    btnRefrescarCitas.addEventListener('click', () => {
      cargarCitas();
      fetchPacientes();
      fetchDoctores();
    });
  }

  // ==================== FUNCIONES PACIENTES ====================

  async function cargarPersonasParaPaciente() {
    if (!selectPersonaPaciente) return;
    selectPersonaPaciente.innerHTML = '<option value="">Cargando personas...</option>';
    try {
      const res = await fetch('/api/personas');
      const data = await res.json();
      selectPersonaPaciente.innerHTML = '<option value="">-- Seleccione persona --</option>';
      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id_persona;
        opt.textContent = `${p.nombres} ${p.apellidos} (DNI: ${p.dni})`;
        selectPersonaPaciente.appendChild(opt);
      });
    } catch (err) {
      selectPersonaPaciente.innerHTML = '<option value="">Error cargando personas</option>';
    }
  }

  async function cargarPacientes() {
    if (!tablaPacientesBody) return;
    tablaPacientesBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/pacientes');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        tablaPacientesBody.innerHTML = '<tr><td colspan="7">No hay pacientes registrados</td></tr>';
        return;
      }
      tablaPacientesBody.innerHTML = '';
      data.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.id_paciente}</td>
          <td>${escapeHtml(p.nombres)}</td>
          <td>${escapeHtml(p.apellidos)}</td>
          <td>${escapeHtml(p.dni)}</td>
          <td>${escapeHtml(p.tipo_sangre || '-')}</td>
          <td>${escapeHtml(p.alergias ? (p.alergias.substring(0, 30) + (p.alergias.length > 30 ? '...' : '')) : '-')}</td>
          <td>
            <button class="btn btn-sm btn-light btn-edit-paciente" data-id="${p.id_paciente}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-paciente" data-id="${p.id_paciente}">Eliminar</button>
          </td>
        `;
        tablaPacientesBody.appendChild(tr);
      });
    } catch (err) {
      tablaPacientesBody.innerHTML = '<tr><td colspan="7">Error cargando pacientes</td></tr>';
    }
  }

  // Guardar paciente
  if (btnGuardarPaciente) {
    btnGuardarPaciente.addEventListener('click', async () => {
      const id_paciente = document.getElementById('edit_id_paciente').value;
      const id_persona = selectPersonaPaciente.value;
      const tipo_sangre = document.getElementById('tipo_sangre').value.trim();
      const alergias = document.getElementById('alergias').value.trim();

      if (!id_persona) {
        alert('Selecciona una persona.');
        return;
      }

      const payload = {
        id_persona,
        tipo_sangre: tipo_sangre || null,
        alergias: alergias || null
      };

      try {
        if (id_paciente) {
          const res = await fetch(`/api/pacientes/${id_paciente}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Error actualizando paciente');
          alert('Paciente actualizado');
        } else {
          const res = await fetch('/api/pacientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Error creando paciente');
          alert('Paciente creado');
        }
        resetFormPaciente();
        cargarPacientes();
        cargarPersonasParaPaciente();
        fetchPacientes(); // Actualizar select en vista citas
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if (btnCancelarPaciente) {
    btnCancelarPaciente.addEventListener('click', () => resetFormPaciente());
  }

  function resetFormPaciente() {
    document.getElementById('edit_id_paciente').value = '';
    document.getElementById('tipo_sangre').value = '';
    document.getElementById('alergias').value = '';
    if (selectPersonaPaciente) selectPersonaPaciente.value = '';
  }

  // Delegación tabla pacientes
  if (tablaPacientesBody) {
    tablaPacientesBody.addEventListener('click', async (e) => {
      const target = e.target;
      const id = target.dataset.id;
      if (!id) return;

      if (target.classList.contains('btn-delete-paciente')) {
        if (!confirm('¿Eliminar este paciente?')) return;
        try {
          const res = await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Error eliminando paciente');
          cargarPacientes();
          fetchPacientes(); // Actualizar select en vista citas
        } catch (err) {
          alert(err.message);
        }
      } else if (target.classList.contains('btn-edit-paciente')) {
        try {
          const res = await fetch('/api/pacientes');
          const data = await res.json();
          const paciente = data.find(x => String(x.id_paciente) === String(id));
          if (!paciente) return alert('Paciente no encontrado');
          document.getElementById('edit_id_paciente').value = paciente.id_paciente;
          selectPersonaPaciente.value = paciente.id_persona;
          document.getElementById('tipo_sangre').value = paciente.tipo_sangre || '';
          document.getElementById('alergias').value = paciente.alergias || '';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          alert('Error al cargar paciente');
        }
      }
    });
  }

  if (btnRefrescarPacientes) {
    btnRefrescarPacientes.addEventListener('click', () => {
      cargarPacientes();
      cargarPersonasParaPaciente();
    });
  }

  // ==================== BOTONES SIDEBAR ====================

  if (btnNuevoDoctor) {
    btnNuevoDoctor.addEventListener('click', async () => {
      const nombres = prompt('Nombres del doctor:');
      if (!nombres) return;
      const apellidos = prompt('Apellidos:') || '';
      const dni = prompt('DNI:') || '';
      const especialidad = prompt('Especialidad:') || '';
      const nro_colegiatura = prompt('Nro. colegiatura:') || '';
      try {
        const res1 = await fetch('/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombres, apellidos, dni })
        });
        const persona = await res1.json();
        const res2 = await fetch('/api/doctores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_persona: persona.id_persona, especialidad, nro_colegiatura })
        });
        await res2.json();
        alert('Doctor creado');
        await fetchDoctores();
      } catch (err) {
        alert('Error creando doctor');
      }
    });
  }

  // ==================== CERRAR SESIÓN ====================
  
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
        // Intentar redirigir de todas formas
        window.location.href = '/login';
      }
    });
  }

  // INICIO: cargar datos iniciales
  (async function init() {
    await Promise.all([fetchPacientes(), fetchDoctores()]);
    await cargarCitas();
  })();
});
