# 📖 Catálogo Digital NINA - Filtros y Repuestos

Sistema modular de generación de catálogos en formato impreso/PDF (A4) desarrollado con HTML5, CSS3 y JavaScript moderno (ES6+). Diseñado para escalar eficientemente a 20+ páginas manteniéndola consistencia visual de la marca y optimización de impresión offset/digital.

---

## 🛠️ Arquitectura del Proyecto

```text
nina-catalogo/
├── README.md                 # Documentación principal del proyecto
├── index.html                # Punto de entrada principal (Documento multipágina)
├── assets/
│   ├── css/
│   │   ├── variables.css     # Design Tokens (Colores corporativos, tipografía, espaciado)
│   │   ├── base.css          # Reset CSS y distribución del lienzo A4
│   │   ├── components.css    # Header, tarjetas 3x3, badges y footer
│   │   └── print.css         # Reglas de impresión (@page, print-color-adjust)
│   ├── js/
│   │   └── app.js            # Renderizado dinámico de páginas e inyección de datos
│   └── img/
│       ├── logo.png          # Isotipo / Logotipo vectorizado transparente
│       └── productos/        # Base de imágenes de catálogo
└── data/
    └── productos.json        # Archivo maestro con la base de datos de repuestos