require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname)));

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función de Migración Inteligente e Inicial desde productos.json (en la raíz) a Supabase
async function syncInitialJSONToSupabase() {
  try {
    const { count, error } = await supabase.from('secciones').select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('⚠️ Error al consultar Supabase (revisa tus claves en .env):', error.message);
      return;
    }

    const jsonPath = path.join(__dirname, 'productos.json');
    if (!fs.existsSync(jsonPath)) {
      console.log('⚠️ No se encontró el archivo productos.json en la raíz del proyecto.');
      return;
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const seccionesCatalogo = JSON.parse(rawData);

    // Si Supabase está completamente vacío (0 secciones) o forzamos la carga inicial
    if (count === 0) {
      console.log('📦 Supabase está vacío. Iniciando volcado masivo desde productos.json...');
      
      for (const sec of seccionesCatalogo) {
        const { data: secData, error: secErr } = await supabase
          .from('secciones')
          .insert([{ marca: sec.marca, subtitulo: sec.subtitulo, banner: sec.banner, hero: sec.hero }])
          .select()
          .single();

        if (secErr) {
          console.error(`Error al insertar marca ${sec.marca}:`, secErr.message);
          continue;
        }

        if (sec.productos && sec.productos.length > 0) {
          const productosToInsert = sec.productos.map(prod => ({
            seccion_id: secData.id,
            codigo: prod.codigo,
            nombre: prod.nombre,
            categoria: prod.categoria,
            estado: prod.estado,
            imagen: prod.imagen,
            descripcion: Array.isArray(prod.descripcion) ? prod.descripcion.join(', ') : prod.descripcion,
            aplicacion: prod.aplicacion,
            eficiencia: prod.eficiencia
          }));

          const { error: prodErr } = await supabase.from('productos').insert(productosToInsert);
          if (prodErr) {
            console.error(`Error al insertar productos de ${sec.marca}:`, prodErr.message);
          }
        }
      }
      console.log('✅ ¡Migración inicial desde productos.json a Supabase completada con éxito!');
    } else {
      console.log('📦 Supabase ya contiene datos activos. Operando normalmente.');
    }
  } catch (err) {
    console.error('Error en la sincronización:', err.message);
  }
}

// 1. API: Obtener todo el catálogo desde Supabase
app.get('/api/catalog', async (req, res) => {
  try {
    const { data: secciones, error: errSec } = await supabase.from('secciones').select('*');
    if (errSec) throw errSec;

    const { data: productos, error: errProd } = await supabase.from('productos').select('*');
    if (errProd) throw errProd;

    const resultado = secciones.map(sec => ({
      ...sec,
      productos: productos
        .filter(p => p.seccion_id === sec.id)
        .map(p => ({
          ...p,
          descripcion: p.descripcion ? p.descripcion.split(',').map(s => s.trim()) : []
        }))
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. API: Guardar / Sincronizar catálogo completo en Supabase
app.post('/api/save-catalog', async (req, res) => {
  try {
    const seccionesCatalogo = req.body;

    await supabase.from('productos').delete().neq('id', 0);
    await supabase.from('secciones').delete().neq('id', 0);

    for (const sec of seccionesCatalogo) {
      const { data: secData, error: secErr } = await supabase
        .from('secciones')
        .insert([{ marca: sec.marca, subtitulo: sec.subtitulo, banner: sec.banner, hero: sec.hero }])
        .select()
        .single();

      if (secErr) throw secErr;

      if (sec.productos && sec.productos.length > 0) {
        const productosToInsert = sec.productos.map(prod => ({
          seccion_id: secData.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          categoria: prod.categoria,
          estado: prod.estado,
          imagen: prod.imagen,
          descripcion: Array.isArray(prod.descripcion) ? prod.descripcion.join(', ') : prod.descripcion,
          aplicacion: prod.aplicacion,
          eficiencia: prod.eficiencia
        }));

        await supabase.from('productos').insert(productosToInsert);
      }
    }

    res.json({ success: true, message: 'Guardado en Supabase con éxito.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. API: Subir imágenes directamente a Cloudinary
app.post('/api/upload-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen.' });
    }

    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
      folder: 'catalogo_nina',
      transformation: [{ width: 800, crop: 'limit' }]
    });

    res.json({ success: true, url: uploadResult.secure_url });
  } catch (error) {
    console.error('Error al subir a Cloudinary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. API: Validar contraseña de Administrador
app.post('/api/admin-login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en: http://localhost:${PORT}`);
  syncInitialJSONToSupabase();
});