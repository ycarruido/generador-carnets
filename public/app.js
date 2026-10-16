const canvas = document.getElementById('canvasCarnet');
const ctx = canvas.getContext('2d');

let imgPlantilla = new Image();
let imgFoto = new Image();

// Configuración de coordenadas exactas en píxeles para la plantilla (638 x 1012 px)
const CONFIG = {
    foto: { x: 169, y: 200, ancho: 300, alto: 380 },
    nombre: { x: 319, y: 640, maxAncho: 550, fontSize: 34, font: 'Bold Arial' },
    cargo: { x: 319, y: 700, maxAncho: 550, fontSize: 26, font: 'Arial' },
    depto: { x: 319, y: 750, maxAncho: 550, fontSize: 22, font: 'Arial' },
    cedula: { x: 319, y: 810, maxAncho: 550, fontSize: 22, font: 'Bold Arial' }
};

// 1. Cargar archivo Excel
document.getElementById('excelFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excel', file);

    const res = await fetch('/api/cargar-excel', { method: 'POST', body: formData });
    const data = await res.json();

    const estadoEl = document.getElementById('estadoExcel');
    if (data.exito) {
        estadoEl.innerText = `✓ ${data.mensaje}`;
    } else {
        estadoEl.innerText = `✗ ${data.mensaje}`;
        estadoEl.style.color = 'red';
    }
});

// 2. Cargar Plantilla personalizada
document.getElementById('selectPlantilla').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        imgPlantilla.src = evt.target.result;
        imgPlantilla.onload = renderizarCarnet;
    };
    reader.readAsDataURL(file);
});

// 3. Cargar Foto y autocompletar por nombre de archivo (Cédula)
document.getElementById('inputFoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Extraer nombre del archivo descartando la extensión (Ej: "12345678.jpg" -> "12345678")
    const cedula = file.name.split('.')[0].trim();
    document.getElementById('inputCedula').value = cedula;

    // Buscar en el backend los datos del Excel
    try {
        const res = await fetch(`/api/persona/${cedula}`);
        const data = await res.json();

        if (data.exito) {
            document.getElementById('inputNombre').value = `${data.datos.nombre} ${data.datos.apellido}`.trim();
            document.getElementById('inputCargo').value = data.datos.cargo;
            document.getElementById('inputDepto').value = data.datos.departamento;
        }
    } catch (err) {
        console.log('Cédula no encontrada en el Excel cargado.');
    }

    // Renderizar la foto en el canvas
    const reader = new FileReader();
    reader.onload = (evt) => {
        imgFoto.src = evt.target.result;
        imgFoto.onload = renderizarCarnet;
    };
    reader.readAsDataURL(file);
});

// 4. Dibujar el Carnet completo
function renderizarCarnet() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo / Plantilla
    if (imgPlantilla.complete && imgPlantilla.src) {
        ctx.drawImage(imgPlantilla, 0, 0, canvas.width, canvas.height);
    } else {
        // Fondo por defecto en caso de no haber cargado imagen de plantilla
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dibujar Foto (Ajuste proporcional tipo 'cover')
    if (imgFoto.complete && imgFoto.src) {
        const { x, y, ancho, alto } = CONFIG.foto;
        const aspectFoto = imgFoto.width / imgFoto.height;
        const aspectMarco = ancho / alto;

        let renderW = ancho;
        let renderH = alto;

        if (aspectFoto > aspectMarco) {
            renderW = alto * aspectFoto;
        } else {
            renderH = ancho / aspectFoto;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ancho, alto);
        ctx.clip();
        ctx.drawImage(imgFoto, x + (ancho - renderW) / 2, y + (alto - renderH) / 2, renderW, renderH);
        ctx.restore();
    }

    // Textos
    const nombre = document.getElementById('inputNombre').value;
    const cargo = document.getElementById('inputCargo').value;
    const depto = document.getElementById('inputDepto').value;
    const cedula = document.getElementById('inputCedula').value;

    dibujarTextoAjustado(nombre, CONFIG.nombre);
    dibujarTextoAjustado(cargo, CONFIG.cargo);
    dibujarTextoAjustado(depto, CONFIG.depto);
    if (cedula) dibujarTextoAjustado(`C.I: ${cedula}`, CONFIG.cedula);
}

// Escalar tamaño de fuente si excede el ancho disponible
function dibujarTextoAjustado(texto, cfg) {
    if (!texto) return;

    let fontSize = cfg.fontSize;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';

    do {
        ctx.font = `${fontSize}px ${cfg.font}`;
        var anchoActual = ctx.measureText(texto).width;
        if (anchoActual > cfg.maxAncho) {
            fontSize -= 1;
        }
    } while (anchoActual > cfg.maxAncho && fontSize > 10);

    ctx.fillText(texto, cfg.x, cfg.y);
}

// Reactividad al escribir manualmente
['inputNombre', 'inputCargo', 'inputDepto', 'inputCedula'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderizarCarnet);
});

// Imprimir / Exportar
document.getElementById('btnImprimir').addEventListener('click', () => {
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
            <head><title>Imprimir Carnet</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
                <img src="${canvas.toDataURL('image/png')}" style="width:85.6mm; height:53.98mm;" />
                <script>
                    window.onload = () => { window.print(); window.close(); };
                <\/script>
            </body>
        </html>
    `);
});

renderizarCarnet();