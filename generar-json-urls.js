require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuración de Cloudinary con tus credenciales del archivo .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Carpeta local temporal donde pondrás tus imágenes para subirlas
const carpetaLocal = path.join(__dirname, 'mis-imagens-locales');
const archivoSalidaJson = path.join(__dirname, 'urls-cloudinary.json');

async function subirYGenerarJson() {
  try {
    if (!fs.existsSync(carpetaLocal)) {
      console.error(`❌ No se encontró la carpeta "${carpetaLocal}". Créala y pon tus imágenes ahí.`);
      return;
    }

    const archivos = fs.readdirSync(carpetaLocal);
    console.log(`🚀 Encontrados ${archivos.length} archivos. Subiendo a Cloudinary...\n`);

    const mapaUrls = {};

    for (const archivo of archivos) {
      // Filtrar solo formatos de imagen válidos
      if (!/\.(jpg|jpeg|png|webp|avif|jfif)$/i.test(archivo)) continue;

      const rutaArchivo = path.join(carpetaLocal, archivo);

      // Subir a Cloudinary manteniendo el nombre del archivo
      const resultado = await cloudinary.uploader.upload(rutaArchivo, {
        folder: 'productos-repuestos',
        use_filename: true,
        unique_filename: false,
      });

      // Guardar la relación nombre_archivo -> url_segura
      mapaUrls[archivo] = resultado.secure_url;
      console.log(`✅ Subido: ${archivo}`);
    }

    // Guardar el resultado en formato JSON limpio
    fs.writeFileSync(archivoSalidaJson, JSON.stringify(mapaUrls, null, 2), 'utf-8');

    console.log(`\n🎉 ¡Listo! Se ha creado el archivo "${archivoSalidaJson}" con todas las URLs en formato JSON.`);
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

subirYGenerarJson();