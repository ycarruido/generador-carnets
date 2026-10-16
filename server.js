const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento temporal en memoria para procesar el Excel sin saturar el disco
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

// Base de datos temporal indexada en memoria
let baseDatosCarnets = {};

// Endpoint para procesar el archivo Excel subido por el diseñador
app.post('/api/cargar-excel', upload.single('excel'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ exito: false, mensaje: 'No se subió ningún archivo' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        baseDatosCarnets = {}; // Limpiar datos previos

        data.forEach(row => {
            // Normalizar claves a minúsculas para evitar fallos de formato
            const registro = {};
            Object.keys(row).forEach(key => {
                registro[key.trim().toLowerCase()] = String(row[key]).trim();
            });

            // Extraer la cédula/ID
            const cedula = registro.cedula || registro.ci || registro.id || registro.identificacion;
            if (cedula) {
                baseDatosCarnets[cedula] = {
                    nombre: registro.nombre || registro.nombres || '',
                    apellido: registro.apellido || registro.apellidos || '',
                    cargo: registro.cargo || registro.puesto || '',
                    departamento: registro.departamento || registro.area || '',
                    cedula: cedula
                };
            }
        });

        const totalCargados = Object.keys(baseDatosCarnets).length;
        console.log(`Excel procesado con éxito. Total registros: ${totalCargados}`);

        res.json({
            exito: true,
            mensaje: `Se cargaron ${totalCargados} registros correctamente.`,
            registros: totalCargados
        });

    } catch (error) {
        console.error('Error al procesar el Excel:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al leer el archivo Excel.' });
    }
});

// Endpoint para buscar datos de una persona por Cédula
app.get('/api/persona/:cedula', (req, res) => {
    const cedula = req.params.cedula.trim();
    const persona = baseDatosCarnets[cedula];

    if (persona) {
        res.json({ exito: true, datos: persona });
    } else {
        res.status(404).json({ exito: false, mensaje: 'Cédula no encontrada en el registro actual.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});