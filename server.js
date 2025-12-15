// ==========================
// CONFIGURACIÓN INICIAL
// ==========================
const express = require("express");
const app = express();
const path = require("path");
const pool = require("./db"); // conexión MySQL
const session = require("express-session");
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // tu carpeta public

// Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mi-secreto-super-seguro-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Cambiar a true si usas HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  })
);

// ==========================
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================
function requiereAutenticacion(req, res, next) {
  if (req.session.userId) {
    next(); // Usuario autenticado, continuar
  } else {
    res.redirect("/login"); // Redirigir al login si no hay sesión
  }
}

// ==========================
// RUTAS HTML DIRECTAS
// ==========================
// Ruta raíz: si no está autenticado, redirigir al login
app.get("/", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Ruta personas: requiere autenticación
app.get("/personas", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/personas.html"));
});

// Ruta doctores: requiere autenticación
app.get("/doctores", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/doctores.html"));
});

// Ruta vista usuario (rol general/paciente)
app.get("/usuario", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/usuario.html"));
});

// Ruta historial: requiere autenticación
app.get("/historial", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/historial.html"));
});

// Ruta usuarios: requiere autenticación
app.get("/usuarios", requiereAutenticacion, (req, res) => {
  res.sendFile(path.join(__dirname, "public/usuarios.html"));
});

// Ruta login: si ya está autenticado, redirigir a la vista principal
app.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/"); // Si ya está logueado, ir a la vista principal
  }
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// ==========================
//  API CRUD PERSONAS (SIN CARPETAS)
// ==========================

// LISTAR PERSONAS
app.get("/api/personas", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_persona, nombres, apellidos, dni, telefono, direccion, fecha_nacimiento FROM Personas ORDER BY id_persona DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error listar personas:", err);
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

// CREAR PERSONA
app.post("/api/personas", async (req, res) => {
  try {
    const { nombres, apellidos, dni, telefono, direccion, fecha_nacimiento } =
      req.body;

    const sql = `
      INSERT INTO Personas (nombres, apellidos, dni, telefono, direccion, fecha_nacimiento)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      nombres,
      apellidos,
      dni,
      telefono,
      direccion,
      fecha_nacimiento,
    ]);

    // devolver la persona creada
    const [row] = await pool.query(
      "SELECT * FROM Personas WHERE id_persona = ?",
      [result.insertId]
    );

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear persona:", err);
    res.status(500).json({ error: "Error al crear persona" });
  }
});

// ACTUALIZAR PERSONA
app.put("/api/personas/:id", async (req, res) => {
  try {
    const { nombres, apellidos, dni, telefono, direccion, fecha_nacimiento } = req.body;
    const id_persona = req.params.id;

    const sql = `
      UPDATE Personas 
      SET nombres = ?, apellidos = ?, dni = ?, telefono = ?, direccion = ?, fecha_nacimiento = ?
      WHERE id_persona = ?
    `;

    await pool.execute(sql, [
      nombres,
      apellidos,
      dni,
      telefono || null,
      direccion || null,
      fecha_nacimiento || null,
      id_persona,
    ]);

    const [row] = await pool.query(
      "SELECT * FROM Personas WHERE id_persona = ?",
      [id_persona]
    );

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar persona:", err);
    res.status(500).json({ error: "Error al actualizar persona" });
  }
});

// ELIMINAR PERSONA
app.delete("/api/personas/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM Personas WHERE id_persona = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar persona:", err);
    res.status(500).json({ error: "Error al eliminar persona" });
  }
});

// ==========================
// API CRUD PACIENTES
// ==========================

// LISTAR PACIENTES
app.get("/api/pacientes", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id_paciente,
        p.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        p.tipo_sangre,
        p.alergias
      FROM Pacientes p
      INNER JOIN Personas per ON p.id_persona = per.id_persona
      ORDER BY p.id_paciente DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error listar pacientes:", err);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
});

// CREAR PACIENTE
app.post("/api/pacientes", async (req, res) => {
  try {
    const { id_persona, tipo_sangre, alergias } = req.body;

    const sql = `
      INSERT INTO Pacientes (id_persona, tipo_sangre, alergias)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      id_persona,
      tipo_sangre || null,
      alergias || null,
    ]);

    const [row] = await pool.query(`
      SELECT 
        p.id_paciente,
        p.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        p.tipo_sangre,
        p.alergias
      FROM Pacientes p
      INNER JOIN Personas per ON p.id_persona = per.id_persona
      WHERE p.id_paciente = ?
    `, [result.insertId]);

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear paciente:", err);
    res.status(500).json({ error: "Error al crear paciente" });
  }
});

// ACTUALIZAR PACIENTE
app.put("/api/pacientes/:id", async (req, res) => {
  try {
    const { id_persona, tipo_sangre, alergias } = req.body;
    const id_paciente = req.params.id;

    const sql = `
      UPDATE Pacientes 
      SET id_persona = ?, tipo_sangre = ?, alergias = ?
      WHERE id_paciente = ?
    `;

    await pool.execute(sql, [
      id_persona,
      tipo_sangre || null,
      alergias || null,
      id_paciente,
    ]);

    const [row] = await pool.query(`
      SELECT 
        p.id_paciente,
        p.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        p.tipo_sangre,
        p.alergias
      FROM Pacientes p
      INNER JOIN Personas per ON p.id_persona = per.id_persona
      WHERE p.id_paciente = ?
    `, [id_paciente]);

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar paciente:", err);
    res.status(500).json({ error: "Error al actualizar paciente" });
  }
});

// ELIMINAR PACIENTE
app.delete("/api/pacientes/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM Pacientes WHERE id_paciente = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar paciente:", err);
    res.status(500).json({ error: "Error al eliminar paciente" });
  }
});

// ==========================
// API CRUD DOCTORES
// ==========================

// LISTAR DOCTORES
app.get("/api/doctores", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.id_doctor,
        d.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        d.especialidad,
        d.nro_colegiatura
      FROM Doctores d
      INNER JOIN Personas per ON d.id_persona = per.id_persona
      ORDER BY d.id_doctor DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error listar doctores:", err);
    res.status(500).json({ error: "Error al obtener doctores" });
  }
});

// CREAR DOCTOR
app.post("/api/doctores", async (req, res) => {
  try {
    const { id_persona, especialidad, nro_colegiatura } = req.body;

    if (!id_persona || !especialidad || !nro_colegiatura) {
      return res.status(400).json({ error: "id_persona, especialidad y nro_colegiatura son requeridos" });
    }

    const sql = `
      INSERT INTO Doctores (id_persona, especialidad, nro_colegiatura)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      id_persona,
      especialidad,
      nro_colegiatura,
    ]);

    const [row] = await pool.query(`
      SELECT 
        d.id_doctor,
        d.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        d.especialidad,
        d.nro_colegiatura
      FROM Doctores d
      INNER JOIN Personas per ON d.id_persona = per.id_persona
      WHERE d.id_doctor = ?
    `, [result.insertId]);

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear doctor:", err);
    res.status(500).json({ error: "Error al crear doctor" });
  }
});

// ACTUALIZAR DOCTOR
app.put("/api/doctores/:id", async (req, res) => {
  try {
    const { id_persona, especialidad, nro_colegiatura } = req.body;
    const id_doctor = req.params.id;

    if (!id_persona || !especialidad || !nro_colegiatura) {
      return res.status(400).json({ error: "id_persona, especialidad y nro_colegiatura son requeridos" });
    }

    const sql = `
      UPDATE Doctores 
      SET id_persona = ?, especialidad = ?, nro_colegiatura = ?
      WHERE id_doctor = ?
    `;

    await pool.execute(sql, [
      id_persona,
      especialidad,
      nro_colegiatura,
      id_doctor,
    ]);

    const [row] = await pool.query(`
      SELECT 
        d.id_doctor,
        d.id_persona,
        per.nombres,
        per.apellidos,
        per.dni,
        d.especialidad,
        d.nro_colegiatura
      FROM Doctores d
      INNER JOIN Personas per ON d.id_persona = per.id_persona
      WHERE d.id_doctor = ?
    `, [id_doctor]);

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar doctor:", err);
    res.status(500).json({ error: "Error al actualizar doctor" });
  }
});

// ELIMINAR DOCTOR
app.delete("/api/doctores/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM Doctores WHERE id_doctor = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar doctor:", err);
    res.status(500).json({ error: "Error al eliminar doctor" });
  }
});

// ==========================
// API CRUD CITAS
// ==========================

// LISTAR CITAS
app.get("/api/citas", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_doctor,
        c.fecha,
        c.hora,
        c.motivo,
        c.estado,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Citas c
      INNER JOIN Pacientes pac ON c.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON c.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      ORDER BY c.fecha DESC, c.hora DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error listar citas:", err);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// CREAR CITA
app.post("/api/citas", async (req, res) => {
  try {
    const { id_paciente, id_doctor, fecha, hora, motivo } = req.body;

    const sql = `
      INSERT INTO Citas (id_paciente, id_doctor, fecha, hora, motivo, estado)
      VALUES (?, ?, ?, ?, ?, 'Programada')
    `;

    const [result] = await pool.execute(sql, [
      id_paciente,
      id_doctor,
      fecha,
      hora,
      motivo || null,
    ]);

    const [row] = await pool.query(`
      SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_doctor,
        c.fecha,
        c.hora,
        c.motivo,
        c.estado,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Citas c
      INNER JOIN Pacientes pac ON c.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON c.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      WHERE c.id_cita = ?
    `, [result.insertId]);

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear cita:", err);
    res.status(500).json({ error: "Error al crear cita" });
  }
});

// ACTUALIZAR CITA
app.put("/api/citas/:id", async (req, res) => {
  try {
    const { id_paciente, id_doctor, fecha, hora, motivo, estado } = req.body;
    const id_cita = req.params.id;

    const sql = `
      UPDATE Citas 
      SET id_paciente = ?, id_doctor = ?, fecha = ?, hora = ?, motivo = ?, estado = COALESCE(?, estado)
      WHERE id_cita = ?
    `;

    await pool.execute(sql, [
      id_paciente,
      id_doctor,
      fecha,
      hora,
      motivo || null,
      estado || null,
      id_cita,
    ]);

    const [row] = await pool.query(`
      SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_doctor,
        c.fecha,
        c.hora,
        c.motivo,
        c.estado,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Citas c
      INNER JOIN Pacientes pac ON c.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON c.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      WHERE c.id_cita = ?
    `, [id_cita]);

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar cita:", err);
    res.status(500).json({ error: "Error al actualizar cita" });
  }
});

// ELIMINAR CITA
app.delete("/api/citas/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM Citas WHERE id_cita = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar cita:", err);
    res.status(500).json({ error: "Error al eliminar cita" });
  }
});

// ==========================
// API AUTENTICACIÓN Y USUARIOS
// ==========================

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    // Buscar usuario en la base de datos
    const [rows] = await pool.query(
      `SELECT 
        u.id_usuario,
        u.usuario,
        u.contraseña,
        u.rol,
        u.id_persona,
        p.nombres,
        p.apellidos
      FROM Usuarios u
      LEFT JOIN Personas p ON u.id_persona = p.id_persona
      WHERE u.usuario = ?`,
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    const user = rows[0];

    // Verificar contraseña (comparación simple - en producción usar bcrypt)
    if (user.contraseña !== contraseña) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Crear sesión con datos básicos del usuario
    req.session.userId = user.id_usuario;
    req.session.usuario = user.usuario;
    req.session.rol = user.rol;
    req.session.id_persona = user.id_persona || null;
    req.session.nombres = user.nombres || null;
    req.session.apellidos = user.apellidos || null;

    res.json({
      ok: true,
      usuario: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        rol: user.rol,
        nombres: user.nombres,
        apellidos: user.apellidos,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// VERIFICAR SESIÓN
app.get("/api/auth-check", (req, res) => {
  if (req.session.userId) {
    res.json({
      ok: true,
      usuario: {
        id_usuario: req.session.userId,
        usuario: req.session.usuario,
        rol: req.session.rol,
        id_persona: req.session.id_persona || null,
        nombres: req.session.nombres || null,
        apellidos: req.session.apellidos || null,
      },
    });
  } else {
    res.json({ ok: false });
  }
});

// LOGOUT
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al cerrar sesión" });
    }
    res.json({ ok: true });
  });
});

// ==========================
// API CRUD USUARIOS
// ==========================

// LISTAR USUARIOS (requiere autenticación)
app.get("/api/usuarios", async (req, res) => {
  try {
    // Verificar sesión
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const [rows] = await pool.query(
      `SELECT 
        u.id_usuario,
        u.usuario,
        u.rol,
        u.id_persona,
        p.nombres,
        p.apellidos,
        p.dni
      FROM Usuarios u
      LEFT JOIN Personas p ON u.id_persona = p.id_persona
      ORDER BY u.id_usuario DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error listar usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// CREAR USUARIO
app.post("/api/usuarios", async (req, res) => {
  try {
    // Verificar sesión
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { id_persona, usuario, contraseña, rol } = req.body;

    if (!id_persona || !usuario || !contraseña || !rol) {
      return res.status(400).json({ error: "id_persona, usuario, contraseña y rol son requeridos" });
    }

    const sql = `
      INSERT INTO Usuarios (id_persona, usuario, contraseña, rol)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      id_persona,
      usuario,
      contraseña,
      rol,
    ]);

    const [row] = await pool.query(
      `SELECT 
        u.id_usuario,
        u.usuario,
        u.rol,
        u.id_persona,
        p.nombres,
        p.apellidos,
        p.dni
      FROM Usuarios u
      LEFT JOIN Personas p ON u.id_persona = p.id_persona
      WHERE u.id_usuario = ?`,
      [result.insertId]
    );

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ACTUALIZAR USUARIO
app.put("/api/usuarios/:id", async (req, res) => {
  try {
    // Verificar sesión
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { id_persona, usuario, contraseña, rol } = req.body;
    const id_usuario = req.params.id;

    if (!id_persona || !usuario || !rol) {
      return res.status(400).json({ error: "id_persona, usuario y rol son requeridos" });
    }

    let sql, params;
    if (contraseña) {
      sql = `
        UPDATE Usuarios 
        SET id_persona = ?, usuario = ?, contraseña = ?, rol = ?
        WHERE id_usuario = ?
      `;
      params = [id_persona, usuario, contraseña, rol, id_usuario];
    } else {
      sql = `
        UPDATE Usuarios 
        SET id_persona = ?, usuario = ?, rol = ?
        WHERE id_usuario = ?
      `;
      params = [id_persona, usuario, rol, id_usuario];
    }

    await pool.execute(sql, params);

    const [row] = await pool.query(
      `SELECT 
        u.id_usuario,
        u.usuario,
        u.rol,
        u.id_persona,
        p.nombres,
        p.apellidos,
        p.dni
      FROM Usuarios u
      LEFT JOIN Personas p ON u.id_persona = p.id_persona
      WHERE u.id_usuario = ?`,
      [id_usuario]
    );

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ELIMINAR USUARIO
app.delete("/api/usuarios/:id", async (req, res) => {
  try {
    // Verificar sesión
    if (!req.session.userId) {
      return res.status(401).json({ error: "No autorizado" });
    }

    await pool.execute("DELETE FROM Usuarios WHERE id_usuario = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar usuario:", err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// ==========================
// API CRUD HISTORIAL MÉDICO
// ==========================

// LISTAR HISTORIAL MÉDICO
app.get("/api/historial", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        h.id_historial,
        h.id_paciente,
        h.id_doctor,
        h.fecha,
        h.diagnostico,
        h.tratamiento,
        h.receta,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Historial_medico h
      INNER JOIN Pacientes pac ON h.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON h.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      ORDER BY h.fecha DESC, h.id_historial DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error listar historial:", err);
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

// CREAR HISTORIAL MÉDICO
app.post("/api/historial", async (req, res) => {
  try {
    const { id_paciente, id_doctor, fecha, diagnostico, tratamiento, receta } = req.body;

    if (!id_paciente || !id_doctor || !fecha || !diagnostico) {
      return res.status(400).json({ error: "id_paciente, id_doctor, fecha y diagnostico son requeridos" });
    }

    const sql = `
      INSERT INTO Historial_medico (id_paciente, id_doctor, fecha, diagnostico, tratamiento, receta)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      id_paciente,
      id_doctor,
      fecha,
      diagnostico,
      tratamiento || null,
      receta || null,
    ]);

    const [row] = await pool.query(`
      SELECT 
        h.id_historial,
        h.id_paciente,
        h.id_doctor,
        h.fecha,
        h.diagnostico,
        h.tratamiento,
        h.receta,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Historial_medico h
      INNER JOIN Pacientes pac ON h.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON h.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      WHERE h.id_historial = ?
    `, [result.insertId]);

    res.status(201).json(row[0]);
  } catch (err) {
    console.error("Error crear historial:", err);
    res.status(500).json({ error: "Error al crear historial" });
  }
});

// ACTUALIZAR HISTORIAL MÉDICO
app.put("/api/historial/:id", async (req, res) => {
  try {
    const { id_paciente, id_doctor, fecha, diagnostico, tratamiento, receta } = req.body;
    const id_historial = req.params.id;

    if (!id_paciente || !id_doctor || !fecha || !diagnostico) {
      return res.status(400).json({ error: "id_paciente, id_doctor, fecha y diagnostico son requeridos" });
    }

    const sql = `
      UPDATE Historial_medico 
      SET id_paciente = ?, id_doctor = ?, fecha = ?, diagnostico = ?, tratamiento = ?, receta = ?
      WHERE id_historial = ?
    `;

    await pool.execute(sql, [
      id_paciente,
      id_doctor,
      fecha,
      diagnostico,
      tratamiento || null,
      receta || null,
      id_historial,
    ]);

    const [row] = await pool.query(`
      SELECT 
        h.id_historial,
        h.id_paciente,
        h.id_doctor,
        h.fecha,
        h.diagnostico,
        h.tratamiento,
        h.receta,
        per_pac.nombres AS paciente_nombres,
        per_pac.apellidos AS paciente_apellidos,
        per_doc.nombres AS doctor_nombres,
        per_doc.apellidos AS doctor_apellidos
      FROM Historial_medico h
      INNER JOIN Pacientes pac ON h.id_paciente = pac.id_paciente
      INNER JOIN Personas per_pac ON pac.id_persona = per_pac.id_persona
      INNER JOIN Doctores doc ON h.id_doctor = doc.id_doctor
      INNER JOIN Personas per_doc ON doc.id_persona = per_doc.id_persona
      WHERE h.id_historial = ?
    `, [id_historial]);

    res.json(row[0]);
  } catch (err) {
    console.error("Error actualizar historial:", err);
    res.status(500).json({ error: "Error al actualizar historial" });
  }
});

// ELIMINAR HISTORIAL MÉDICO
app.delete("/api/historial/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM Historial_medico WHERE id_historial = ?", [
      req.params.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminar historial:", err);
    res.status(500).json({ error: "Error al eliminar historial" });
  }
});

// ==========================
// INICIAR SERVIDOR
// ==========================
app.listen(3000, () =>
  console.log("Servidor corriendo en http://localhost:3000")
);
