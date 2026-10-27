document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('catalog-container');
  
  const CONFIG = {
    ITEMS_PER_PAGE: 4,
    GRID_CLASS: 'product-grid-4x1',
    MES_CATALOGO: localStorage.getItem('nina_mes_catalogo') || 'Noviembre 2026',
    WHATSAPP_NUMERO: '966090446'
  };

  let seccionesCatalogo = [];

  // Subir archivos a Cloudinary mediante la API del servidor
  async function uploadImageToCloudinary(fileItem) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileItem);
      reader.onload = async () => {
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: reader.result })
          });
          const data = await response.json();
          if (data.success) {
            resolve(data.url);
          } else {
            reject(data.error || 'Error al subir la imagen');
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  // Carga de datos desde Supabase
  async function loadCatalogData() {
    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error('Error en la respuesta del servidor');
      seccionesCatalogo = await response.json();
    } catch (err) {
      console.error('Error al consultar el catálogo en Supabase:', err);
      alert('⚠️ No se pudieron obtener los datos de la base de datos Supabase.');
    }
  }

  // Guardar datos en Supabase
  async function saveCatalogData() {
    try {
      const response = await fetch('/api/save-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seccionesCatalogo)
      });
      const resData = await response.json();
      if (resData.success) {
        renderCatalog();
        renderAdminTable();
        updateBrandSelector();
      } else {
        console.error('Error reportado por Supabase:', resData.error);
        alert('⚠️ No se pudieron sincronizar los cambios con Supabase.');
      }
    } catch (err) {
      console.error('Error enviando petición a Supabase:', err);
      alert('⚠️ Error de red al intentar guardar en Supabase.');
    }
  }

  // Renderizado del Catálogo
  function renderCatalog() {
    container.innerHTML = '';

    // Portada Principal
    const coverElement = document.createElement('section');
    coverElement.className = 'page cover-page';
    coverElement.innerHTML = `
      <div style="height: 1px;"></div>
      <div class="cover-content">
        <div class="cover-logo-wrapper" style="width: 680px;">
          <img src="./asetts/img/vector.svg" alt="Logo NINA" onerror="this.style.display='none'">
        </div>
        <h1 class="cover-title">Catálogo ${CONFIG.MES_CATALOGO}</h1>
        <span class="cover-subtitle">Filtros y Repuestos Industriales</span>
      </div>
      <footer class="cover-footer">
        <div class="whatsapp-contact">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Contacto WhatsApp: ${CONFIG.WHATSAPP_NUMERO}</span>
        </div>
      </footer>
    `;
    container.appendChild(coverElement);

    // Secciones y Productos
    seccionesCatalogo.forEach(seccion => {
      const dividerPage = document.createElement('section');
      dividerPage.className = 'page brand-divider-page';
      dividerPage.innerHTML = `
        <header class="brand-divider-header">
          <h2 class="brand-divider-title">${seccion.marca}</h2>
          <span class="brand-divider-subtitle">${seccion.subtitulo || ''}</span>
        </header>
        <main class="brand-divider-body">
          <div class="brand-banner-box">
            <img src="${seccion.banner || ''}" alt="Banner ${seccion.marca}" onerror="this.style.display='none'">
          </div>
          <div class="brand-hero-box">
            <img src="${seccion.hero || ''}" alt="Línea ${seccion.marca}" onerror="this.style.display='none'">
          </div>
        </main>
        <footer class="page-footer">
          <span>NINA - Distribuidor Oficial | ${seccion.marca}</span>
          <span>&nbsp; Sección Especial</span>
        </footer>
      `;
      container.appendChild(dividerPage);

      const productos = seccion.productos || [];
      const totalPages = Math.ceil(productos.length / CONFIG.ITEMS_PER_PAGE) || 1;

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageProducts = productos.slice(
          pageIndex * CONFIG.ITEMS_PER_PAGE, 
          (pageIndex + 1) * CONFIG.ITEMS_PER_PAGE
        );
        
        const pageElement = document.createElement('section');
        pageElement.className = 'page';
        
        pageElement.innerHTML = `
          <header class="page-header">
            <div class="brand-area">
              <div class="brand-logo-box">
                <img src="./asetts/img/vector.svg" alt="Logo NINA" onerror="this.style.display='none'">
              </div>
              <div class="brand-title">
                <h1>NINA</h1>
                <span>FILTROS Y REPUESTOS</span>
              </div>
            </div>
            <div class="header-tag">${seccion.marca}</div>
          </header>

          <main class="${CONFIG.GRID_CLASS}">
            ${pageProducts.map((prod, index) => {
              const esAgotado = prod.estado && prod.estado.toLowerCase().includes('agotado');
              const isReverse = index % 2 !== 0 ? 'card-reverse' : '';
              
              return `
                <article class="card ${isReverse} ${esAgotado ? 'is-out-of-stock' : ''}">
                  ${esAgotado ? '<div class="stamp-agotado">AGOTADO</div>' : ''}
                  
                  <div class="card-img-wrapper">
                    <img src="${prod.imagen}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/400x300?text=Sin+Imagen'">
                  </div>
                  <div class="card-body">
                    <div>
                      <span class="badge ${prod.categoria && prod.categoria.toLowerCase() === 'repuestos' ? 'badge-blue' : ''}">${prod.categoria || 'Filtros'}</span>
                      <h2 class="card-title">${prod.nombre}</h2>
                      <div class="card-code">Código: <span>${prod.codigo}</span></div>
                      
                      <div class="card-detail-row">
                        ${Array.isArray(prod.descripcion) 
                          ? `<ul class="description-list">
                              ${prod.descripcion.map(item => `<li>${item}</li>`).join('')}
                            </ul>`
                          : `<p class="card-description">${prod.descripcion || 'Sin descripción disponible.'}</p>`
                        }
                      </div>
                    </div>

                    <div class="card-info-grid">
                      <div><strong>Aplicación:</strong> ${prod.aplicacion || 'N/A'}</div>
                      <div><strong>Rendimiento:</strong> ${prod.eficiencia || 'N/A'}</div>
                      <div><strong>Estado:</strong> <span style="${esAgotado ? 'color: #dc2626; font-weight: bold;' : ''}">${prod.estado || 'Disponible'}</span></div>
                      <div><strong>Garantía:</strong> Cobertura NINA</div>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </main>

          <footer class="page-footer">
            <span>NINA - ${seccion.marca} | Soluciones Industriales Tlf: ${CONFIG.WHATSAPP_NUMERO}</span>
            <span>Página ${pageIndex + 1} de ${totalPages}</span>
          </footer>
        `;
        container.appendChild(pageElement);
      }
    });
  }

  // Inyección de Interfaces UI (Botones flotantes y Modales de Admin)
  function injectAdminUI() {
    const adminHTML = `
      <style>
        @media print {
          #global-download-pdf-btn,
          #mobile-admin-trigger-btn {
            display: none !important;
          }
        }
        /* Ocultar botón de admin móvil en pantallas de PC */
        @media (min-width: 769px) {
          #mobile-admin-trigger-btn {
            display: none !important;
          }
        }
      </style>

      <!-- Botón Flotante Público para Descargar PDF (Visible para todos, se oculta al imprimir) -->
      <button id="global-download-pdf-btn" title="Descargar o Imprimir Catálogo en PDF" style="position: fixed; top: 20px; right: 20px; background: #dc2626; color: white; border: none; padding: 10px 18px; border-radius: 30px; cursor: pointer; font-weight: bold; z-index: 9998; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 8px; font-family: var(--font-main);">
        <i class="fa-solid fa-file-pdf"></i> <span>Descargar PDF</span>
      </button>

      <!-- Botón Flotante Exclusivo Móvil para abrir Panel de Admin -->
      <button id="mobile-admin-trigger-btn" title="Panel Administrador" style="position: fixed; bottom: 20px; left: 20px; background: #0047AB; color: white; border: none; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; z-index: 99998; box-shadow: 0 4px 14px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
        ⚙️
      </button>

      <!-- Modal de Login (Administrador) -->
      <div id="login-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); z-index: 10002; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
        <div style="background: #ffffff; width: 100%; max-width: 380px; border-radius: 12px; padding: 28px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); font-family: var(--font-main); text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🔒</div>
          <h3 style="margin: 0 0 8px 0; color: #0047AB; font-size: 1.3rem;">Acceso de Administrador</h3>
          <p style="color: #666; font-size: 0.85rem; margin-bottom: 20px;">Ingresa tu clave secreta para gestionar el catálogo.</p>
          
          <form id="login-form">
            <input type="password" id="admin-password-input" placeholder="Contraseña secreta" required style="width: 100%; padding: 10px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box; margin-bottom: 15px; outline: none;">
            <div id="login-error-msg" style="color: #dc2626; font-size: 0.8rem; margin-bottom: 12px; display: none; font-weight: bold;"></div>
            <div style="display: flex; gap: 10px;">
              <button type="button" id="close-login-btn" style="flex: 1; background: #eee; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; color: #333;">Cancelar</button>
              <button type="submit" style="flex: 1; background: #0047AB; border: none; color: white; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;">Ingresar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Principal del Panel CRUD -->
      <div id="admin-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center; padding: 20px;">
        <div style="background: #ffffff; width: 100%; max-width: 950px; max-height: 90vh; border-radius: 12px; padding: 24px; overflow-y: auto; color: #111; font-family: var(--font-main); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F08B43; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #0047AB; font-size: 1.4rem;">⚙️ Gestor de Catálogo por Marcas</h2>
            <button id="close-admin-btn" style="background: #dc2626; border: none; color: white; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">✕ Cerrar</button>
          </div>

          <!-- Barra de Configuración de Portada -->
          <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <label style="font-weight: bold; font-size: 0.85rem; color: #333;">📅 Portada (Mes y Año):</label>
            <input type="text" id="input-mes-catalogo" value="${CONFIG.MES_CATALOGO}" placeholder="Ej: Noviembre 2026" style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; width: 220px; font-size: 0.85rem;">
            <button id="btn-save-mes" style="background: #0047AB; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">Actualizar Portada</button>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button id="tab-stock-btn" style="background: #0047AB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">📦 Listar Stock por Marca</button>
            <button id="tab-add-btn" style="background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">➕ Nuevo Producto</button>
            <button id="export-json-btn" style="background: #25D366; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-left: auto;">💾 Sincronizar con Supabase</button>
          </div>

          <!-- Tabla de Productos con Buscador y Scroll Interno -->
          <div id="view-stock">
            <div style="margin-bottom: 15px;">
              <input type="text" id="admin-search-input" placeholder="🔍 Buscar por marca, código o nombre de producto..." style="width: 100%; padding: 9px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.9rem; outline: none; box-sizing: border-box;">
            </div>
            
            <div style="max-height: 450px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                <thead>
                  <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd; position: sticky; top: 0; z-index: 2;">
                    <th style="padding: 10px; background: #f8f9fa;">Marca / Sección</th>
                    <th style="padding: 10px; background: #f8f9fa;">Código</th>
                    <th style="padding: 10px; background: #f8f9fa;">Nombre</th>
                    <th style="padding: 10px; background: #f8f9fa;">Estado</th>
                    <th style="padding: 10px; text-align: center; background: #f8f9fa;">Acciones</th>
                  </tr>
                </thead>
                <tbody id="admin-product-table-body"></tbody>
              </table>
            </div>
          </div>

          <!-- Formulario Agregar -->
          <div id="view-add-product" style="display: none;">
            <form id="add-product-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="grid-column: span 2;">
                <label style="font-weight: bold; font-size: 0.85rem;">Seleccionar Marca / Sección:*</label>
                <select id="new-seccion" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;"></select>
              </div>

              <div id="nueva-marca-box" style="display: none; grid-column: span 2; background: #f0f7ff; padding: 15px; border-radius: 6px; border: 1px dashed #0047AB;">
                <h4 style="margin: 0 0 10px 0; color: #0047AB; font-size: 0.95rem;">✨ Datos de la Nueva Marca / Página Divisoria</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <label style="font-size: 0.8rem; font-weight: bold;">Nombre de la Marca:*</label>
                    <input type="text" id="brand-nombre" placeholder="Ej: DONALDSON" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                  </div>
                  <div>
                    <label style="font-size: 0.8rem; font-weight: bold;">Subtítulo:*</label>
                    <input type="text" id="brand-subtitulo" placeholder="Ej: LÍNEA PESADA INDUSTRIAL" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                  </div>
                  
                  <div>
                    <label style="font-size: 0.8rem; font-weight: bold;">Banner de Marca:*</label>
                    <input type="file" id="file-brand-banner" accept="image/*" style="font-size: 0.75rem; width: 100%; margin-top: 4px;">
                    <input type="hidden" id="brand-banner" value="">
                    <div id="status-brand-banner" style="font-size: 0.75rem; color: #0047AB; margin-top: 2px;"></div>
                    <img id="preview-brand-banner" src="" style="max-height: 50px; margin-top: 4px; display: none; border-radius: 4px;" />
                  </div>

                  <div>
                    <label style="font-size: 0.8rem; font-weight: bold;">Hero de Marca:*</label>
                    <input type="file" id="file-brand-hero" accept="image/*" style="font-size: 0.75rem; width: 100%; margin-top: 4px;">
                    <input type="hidden" id="brand-hero" value="">
                    <div id="status-brand-hero" style="font-size: 0.75rem; color: #0047AB; margin-top: 2px;"></div>
                    <img id="preview-brand-hero" src="" style="max-height: 50px; margin-top: 4px; display: none; border-radius: 4px;" />
                  </div>
                </div>
              </div>

              <div>
                <label style="font-weight: bold; font-size: 0.85rem;">Código del Producto:*</label>
                <input type="text" id="new-codigo" required placeholder="Ej: FS20182" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              <div>
                <label style="font-weight: bold; font-size: 0.85rem;">Nombre del Producto:*</label>
                <input type="text" id="new-nombre" required placeholder="Ej: Filtro de combustible" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              <div>
                <label style="font-weight: bold; font-size: 0.85rem;">Categoría:*</label>
                <select id="new-categoria" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                  <option value="Filtros">Filtros</option>
                  <option value="Repuestos">Repuestos</option>
                </select>
              </div>
              <div>
                <label style="font-weight: bold; font-size: 0.85rem;">Estado Inicial:*</label>
                <select id="new-estado" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                  <option value="Disponible">Disponible</option>
                  <option value="Agotado">Agotado</option>
                </select>
              </div>

              <div style="grid-column: span 2;">
                <label style="font-weight: bold; font-size: 0.85rem;">Imagen del Producto (Subir a la nube):*</label>
                <input type="file" id="file-new-imagen" accept="image/*" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 100%; margin-top: 4px; background: #f8f9fa;">
                <input type="hidden" id="new-imagen" required value="">
                <div id="status-new-imagen" style="font-size: 0.8rem; color: #0047AB; margin-top: 4px; font-weight: bold;"></div>
                <img id="preview-new-imagen" src="" style="max-height: 80px; margin-top: 6px; display: none; border-radius: 4px; border: 1px solid #ddd;" />
              </div>

              <div style="grid-column: span 2;">
                <label style="font-weight: bold; font-size: 0.85rem;">Descripciones / Medidas (Separadas por comas):</label>
                <textarea id="new-descripcion" rows="3" placeholder="Diámetro Externo: 110 mm, Altura: 283 mm" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
              </div>
              <div style="grid-column: span 2;">
                <label style="font-weight: bold; font-size: 0.85rem;">Aplicación:</label>
                <input type="text" id="new-aplicacion" placeholder="Flotas SINOTRUK, Foton..." style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              <div style="grid-column: span 2;">
                <label style="font-weight: bold; font-size: 0.85rem;">Eficiencia / Rendimiento:</label>
                <input type="text" id="new-eficiencia" placeholder="Eficiencia del 98.7%..." style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
              </div>
              <div style="grid-column: span 2; text-align: right; margin-top: 10px;">
                <button type="submit" style="background: #F08B43; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">➕ Guardar Producto</button>
              </div>
            </form>
          </div>

        </div>
      </div>

      <!-- Modal Editar -->
      <div id="edit-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 10001; justify-content: center; align-items: center; padding: 20px;">
        <div style="background: #ffffff; width: 100%; max-width: 800px; max-height: 90vh; border-radius: 12px; padding: 24px; overflow-y: auto; color: #111; font-family: var(--font-main);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0047AB; padding-bottom: 10px; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #0047AB;">✏️ Editar Producto</h3>
            <button id="close-edit-btn" style="background: #dc2626; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">✕</button>
          </div>
          <form id="edit-product-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <input type="hidden" id="edit-sec-idx">
            <input type="hidden" id="edit-prod-idx">
            
            <div style="grid-column: span 2;">
              <label style="font-weight: bold; font-size: 0.85rem;">Marca / Sección:*</label>
              <select id="edit-seccion" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;"></select>
            </div>

            <div>
              <label style="font-weight: bold; font-size: 0.85rem;">Código:*</label>
              <input type="text" id="edit-codigo" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="font-weight: bold; font-size: 0.85rem;">Nombre:*</label>
              <input type="text" id="edit-nombre" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="font-weight: bold; font-size: 0.85rem;">Categoría:*</label>
              <select id="edit-categoria" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="Filtros">Filtros</option>
                <option value="Repuestos">Repuestos</option>
              </select>
            </div>
            <div>
              <label style="font-weight: bold; font-size: 0.85rem;">Estado:*</label>
              <select id="edit-estado" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="Disponible">Disponible</option>
                <option value="Agotado">Agotado</option>
              </select>
            </div>

            <div style="grid-column: span 2;">
              <label style="font-weight: bold; font-size: 0.85rem;">Imagen del Producto (Actualizar en Cloudinary):*</label>
              <input type="file" id="file-edit-imagen" accept="image/*" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 100%; margin-top: 4px; background: #f8f9fa;">
              <input type="hidden" id="edit-imagen" required value="">
              <div id="status-edit-imagen" style="font-size: 0.8rem; color: #0047AB; margin-top: 4px; font-weight: bold;"></div>
              <img id="preview-edit-imagen" src="" style="max-height: 80px; margin-top: 6px; border-radius: 4px; border: 1px solid #ddd;" />
            </div>

            <div style="grid-column: span 2;">
              <label style="font-weight: bold; font-size: 0.85rem;">Descripción / Medidas (Separadas por comas):</label>
              <textarea id="edit-descripcion" rows="3" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
            </div>
            <div style="grid-column: span 2;">
              <label style="font-weight: bold; font-size: 0.85rem;">Aplicación:</label>
              <input type="text" id="edit-aplicacion" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="grid-column: span 2;">
              <label style="font-weight: bold; font-size: 0.85rem;">Eficiencia / Rendimiento:</label>
              <input type="text" id="edit-eficiencia" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="grid-column: span 2; text-align: right; margin-top: 10px;">
              <button type="submit" style="background: #0047AB; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">💾 Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', adminHTML);
  }

  function updateBrandSelector() {
    const select = document.getElementById('new-seccion');
    if (!select) return;

    let optionsHTML = seccionesCatalogo.map((sec, idx) => `<option value="${idx}">${sec.marca}</option>`).join('');
    optionsHTML += `<option value="nueva" style="font-weight: bold; color: #0047AB;">➕ [ Registrar nueva marca... ]</option>`;
    select.innerHTML = optionsHTML;
  }

  function renderAdminTable() {
    const tbody = document.getElementById('admin-product-table-body');
    if (!tbody) return;

    let rowsHTML = '';
    seccionesCatalogo.forEach((seccion, secIdx) => {
      seccion.productos.forEach((prod, prodIdx) => {
        const esAgotado = prod.estado && prod.estado.toLowerCase().includes('agotado');
        rowsHTML += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #F08B43;">${seccion.marca}</td>
            <td style="padding: 10px; font-weight: bold; color: #0047AB;">${prod.codigo}</td>
            <td style="padding: 10px;">${prod.nombre}</td>
            <td style="padding: 10px;">
              <span style="background: ${esAgotado ? '#fee2e2' : '#dcfce7'}; color: ${esAgotado ? '#991b1b' : '#166534'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                ${esAgotado ? 'AGOTADO' : 'DISPONIBLE'}
              </span>
            </td>
            <td style="padding: 10px; text-align: center; display: flex; gap: 6px; justify-content: center;">
              <button onclick="window.toggleStock(${secIdx}, ${prodIdx})" style="background: ${esAgotado ? '#166534' : '#dc2626'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">
                ${esAgotado ? 'Disponible' : 'Agotado'}
              </button>
              <button onclick="window.openEditModal(${secIdx}, ${prodIdx})" style="background: #0047AB; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;" title="Editar">
                ✏️ Editar
              </button>
              <button onclick="window.deleteProduct(${secIdx}, ${prodIdx})" style="background: #333; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        `;
      });
    });
    tbody.innerHTML = rowsHTML;
  }

  // Funciones Globales CRUD
  window.toggleStock = function(secIdx, prodIdx) {
    const current = seccionesCatalogo[secIdx].productos[prodIdx].estado;
    seccionesCatalogo[secIdx].productos[prodIdx].estado = (current && current.toLowerCase().includes('agotado')) ? 'Disponible' : 'Agotado';
    saveCatalogData();
  };

  window.deleteProduct = function(secIdx, prodIdx) {
    if (confirm(`¿Estás seguro de eliminar este producto?`)) {
      seccionesCatalogo[secIdx].productos.splice(prodIdx, 1);
      saveCatalogData();
    }
  };

  window.openEditModal = function(secIdx, prodIdx) {
    const prod = seccionesCatalogo[secIdx].productos[prodIdx];
    document.getElementById('edit-sec-idx').value = secIdx;
    document.getElementById('edit-prod-idx').value = prodIdx;
    
    // Cargar selector de marcas con la marca actual seleccionada
    const editSeccionSelect = document.getElementById('edit-seccion');
    if (editSeccionSelect) {
      editSeccionSelect.innerHTML = seccionesCatalogo.map((sec, idx) => 
        `<option value="${idx}" ${idx === secIdx ? 'selected' : ''}>${sec.marca}</option>`
      ).join('');
    }

    document.getElementById('edit-codigo').value = prod.codigo || '';
    document.getElementById('edit-nombre').value = prod.nombre || '';
    document.getElementById('edit-categoria').value = prod.categoria || 'Filtros';
    document.getElementById('edit-estado').value = prod.estado || 'Disponible';
    
    document.getElementById('edit-imagen').value = prod.imagen || '';
    const prevImg = document.getElementById('preview-edit-imagen');
    if (prod.imagen) {
      prevImg.src = prod.imagen;
      prevImg.style.display = 'block';
    } else {
      prevImg.style.display = 'none';
    }

    document.getElementById('edit-aplicacion').value = prod.aplicacion || '';
    document.getElementById('edit-eficiencia').value = prod.eficiencia || '';

    if (Array.isArray(prod.descripcion)) {
      document.getElementById('edit-descripcion').value = prod.descripcion.join(', ');
    } else {
      document.getElementById('edit-descripcion').value = prod.descripcion || '';
    }

    document.getElementById('edit-modal').style.display = 'flex';
  };

  // Lógica de Autenticación con Modal UI
  function initLoginEvents() {
    const loginModal = document.getElementById('login-modal');
    const adminModal = document.getElementById('admin-modal');
    const loginForm = document.getElementById('login-form');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const errorMsg = document.getElementById('login-error-msg');
    const passwordInput = document.getElementById('admin-password-input');

    // Atajo de teclado PC: Ctrl + Shift + A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        openAdminAuth();
      }
    });

    // Evento para el botón flotante de móvil
    const mobileAdminBtn = document.getElementById('mobile-admin-trigger-btn');
    if (mobileAdminBtn) {
      mobileAdminBtn.addEventListener('click', openAdminAuth);
    }

    function openAdminAuth() {
      if (sessionStorage.getItem('nina_admin_authenticated') === 'true') {
        renderAdminTable();
        updateBrandSelector();
        adminModal.style.display = 'flex';
      } else {
        errorMsg.style.display = 'none';
        passwordInput.value = '';
        loginModal.style.display = 'flex';
        passwordInput.focus();
      }
    }

    closeLoginBtn.addEventListener('click', () => {
      loginModal.style.display = 'none';
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput.value.trim();

      try {
        const response = await fetch('/api/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await response.json();

        if (data.success) {
          sessionStorage.setItem('nina_admin_authenticated', 'true');
          loginModal.style.display = 'none';
          renderAdminTable();
          updateBrandSelector();
          adminModal.style.display = 'flex';
        } else {
          errorMsg.textContent = '❌ Contraseña incorrecta.';
          errorMsg.style.display = 'block';
        }
      } catch (err) {
        console.error('Error de autenticación:', err);
        errorMsg.textContent = '❌ Error de red con el servidor.';
        errorMsg.style.display = 'block';
      }
    });
  }

  // Eventos generales del Panel Administrador y Botón PDF Público
  function initAdminEvents() {
    const adminModal = document.getElementById('admin-modal');
    const editModal = document.getElementById('edit-modal');
    const closeAdmin = document.getElementById('close-admin-btn');
    const closeEdit = document.getElementById('close-edit-btn');
    const tabStock = document.getElementById('tab-stock-btn');
    const tabAdd = document.getElementById('tab-add-btn');
    const viewStock = document.getElementById('view-stock');
    const viewAdd = document.getElementById('view-add-product');
    const exportBtn = document.getElementById('export-json-btn');
    const addForm = document.getElementById('add-product-form');
    const editForm = document.getElementById('edit-product-form');
    const selectSeccion = document.getElementById('new-seccion');
    const nuevaMarcaBox = document.getElementById('nueva-marca-box');
    const btnSaveMes = document.getElementById('btn-save-mes');
    const globalDownloadBtn = document.getElementById('global-download-pdf-btn');

    closeAdmin.addEventListener('click', () => {
      adminModal.style.display = 'none';
    });

    closeEdit.addEventListener('click', () => {
      editModal.style.display = 'none';
    });

    // Lógica del Buscador en tiempo real en el Panel de Administración
    const adminSearchInput = document.getElementById('admin-search-input');
    if (adminSearchInput) {
      adminSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#admin-product-table-body tr');
        
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          if (text.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Evento del Botón Público para Descargar PDF
    globalDownloadBtn.addEventListener('click', () => {
      const originalTitle = document.title;
      document.title = 'catalogo_nina';
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    });

    // Actualizar Fecha / Mes de la Portada
    btnSaveMes.addEventListener('click', () => {
      const nuevoMes = document.getElementById('input-mes-catalogo').value.trim();
      if (!nuevoMes) {
        alert('Por favor, ingresa el mes y año.');
        return;
      }
      CONFIG.MES_CATALOGO = nuevoMes;
      localStorage.setItem('nina_mes_catalogo', nuevoMes);
      renderCatalog();
      alert(`✅ Portada actualizada a: "Catálogo ${nuevoMes}"`);
    });

    selectSeccion.addEventListener('change', (e) => {
      if (e.target.value === 'nueva') {
        nuevaMarcaBox.style.display = 'block';
      } else {
        nuevaMarcaBox.style.display = 'none';
      }
    });

    tabStock.addEventListener('click', () => {
      viewStock.style.display = 'block';
      viewAdd.style.display = 'none';
      tabStock.style.background = '#0047AB';
      tabStock.style.color = 'white';
      tabAdd.style.background = '#eee';
      tabAdd.style.color = '#333';
    });

    tabAdd.addEventListener('click', () => {
      viewStock.style.display = 'none';
      viewAdd.style.display = 'block';
      tabAdd.style.background = '#0047AB';
      tabAdd.style.color = 'white';
      tabStock.style.background = '#eee';
      tabStock.style.color = '#333';
    });

    // Subida de archivos a Cloudinary
    document.getElementById('file-brand-banner').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('status-brand-banner');
      const prevEl = document.getElementById('preview-brand-banner');
      try {
        statusEl.textContent = '⏳ Subiendo banner a Cloudinary...';
        const url = await uploadImageToCloudinary(file);
        document.getElementById('brand-banner').value = url;
        statusEl.textContent = '✅ ¡Banner cargado!';
        prevEl.src = url;
        prevEl.style.display = 'block';
      } catch (err) {
        statusEl.textContent = '❌ Error al subir banner.';
      }
    });

    document.getElementById('file-brand-hero').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('status-brand-hero');
      const prevEl = document.getElementById('preview-brand-hero');
      try {
        statusEl.textContent = '⏳ Subiendo hero a Cloudinary...';
        const url = await uploadImageToCloudinary(file);
        document.getElementById('brand-hero').value = url;
        statusEl.textContent = '✅ ¡Hero cargado!';
        prevEl.src = url;
        prevEl.style.display = 'block';
      } catch (err) {
        statusEl.textContent = '❌ Error al subir hero.';
      }
    });

    document.getElementById('file-new-imagen').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('status-new-imagen');
      const prevEl = document.getElementById('preview-new-imagen');
      try {
        statusEl.textContent = '⏳ Subiendo producto a Cloudinary...';
        const url = await uploadImageToCloudinary(file);
        document.getElementById('new-imagen').value = url;
        statusEl.textContent = '✅ ¡Imagen subida y lista!';
        prevEl.src = url;
        prevEl.style.display = 'block';
      } catch (err) {
        statusEl.textContent = '❌ Error al subir imagen.';
      }
    });

    document.getElementById('file-edit-imagen').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('status-edit-imagen');
      const prevEl = document.getElementById('preview-edit-imagen');
      try {
        statusEl.textContent = '⏳ Actualizando en Cloudinary...';
        const url = await uploadImageToCloudinary(file);
        document.getElementById('edit-imagen').value = url;
        statusEl.textContent = '✅ ¡Imagen actualizada!';
        prevEl.src = url;
        prevEl.style.display = 'block';
      } catch (err) {
        statusEl.textContent = '❌ Error al subir imagen.';
      }
    });

    // Guardar Nuevo Producto
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const secValue = document.getElementById('new-seccion').value;
      const rawDesc = document.getElementById('new-descripcion').value;
      const descArray = rawDesc ? rawDesc.split(',').map(s => s.trim()) : ["Sin descripción."];
      const imagenUrl = document.getElementById('new-imagen').value;

      if (!imagenUrl) {
        alert('Por favor, selecciona una imagen y espera a que suba a Cloudinary.');
        return;
      }

      let targetSecIdx;

      if (secValue === 'nueva') {
        const brandNombre = document.getElementById('brand-nombre').value.toUpperCase().trim();
        const brandSubtitulo = document.getElementById('brand-subtitulo').value.toUpperCase().trim();
        const brandBanner = document.getElementById('brand-banner').value.trim();
        const brandHero = document.getElementById('brand-hero').value.trim();

        if (!brandNombre) {
          alert('Ingresa el nombre de la nueva marca.');
          return;
        }

        const nuevaSeccion = {
          marca: brandNombre,
          subtitulo: brandSubtitulo || 'SOLUCIONES INDUSTRIALES',
          banner: brandBanner || '',
          hero: brandHero || '',
          productos: []
        };

        seccionesCatalogo.push(nuevaSeccion);
        targetSecIdx = seccionesCatalogo.length - 1;
      } else {
        targetSecIdx = parseInt(secValue);
      }

      const newProd = {
        codigo: document.getElementById('new-codigo').value,
        nombre: document.getElementById('new-nombre').value,
        categoria: document.getElementById('new-categoria').value,
        estado: document.getElementById('new-estado').value,
        imagen: imagenUrl,
        descripcion: descArray,
        aplicacion: document.getElementById('new-aplicacion').value || "N/A",
        eficiencia: document.getElementById('new-eficiencia').value || "N/A"
      };

      seccionesCatalogo[targetSecIdx].productos.push(newProd);
      await saveCatalogData();
      
      addForm.reset();
      nuevaMarcaBox.style.display = 'none';
      document.getElementById('preview-new-imagen').style.display = 'none';
      document.getElementById('status-new-imagen').textContent = '';
      
      alert('¡Producto guardado directamente en Supabase!');
      tabStock.click();
    });

    // Guardar Edición de Producto (Soporta cambio de marca / sección)
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldSecIdx = parseInt(document.getElementById('edit-sec-idx').value);
      const prodIdx = parseInt(document.getElementById('edit-prod-idx').value);
      const newSecIdx = parseInt(document.getElementById('edit-seccion').value);
      
      const rawDesc = document.getElementById('edit-descripcion').value;
      const descArray = rawDesc ? rawDesc.split(',').map(s => s.trim()) : ["Sin descripción."];

      const updatedProd = {
        codigo: document.getElementById('edit-codigo').value,
        nombre: document.getElementById('edit-nombre').value,
        categoria: document.getElementById('edit-categoria').value,
        estado: document.getElementById('edit-estado').value,
        imagen: document.getElementById('edit-imagen').value,
        descripcion: descArray,
        aplicacion: document.getElementById('edit-aplicacion').value || "N/A",
        eficiencia: document.getElementById('edit-eficiencia').value || "N/A"
      };

      if (oldSecIdx === newSecIdx) {
        seccionesCatalogo[oldSecIdx].productos[prodIdx] = updatedProd;
      } else {
        seccionesCatalogo[oldSecIdx].productos.splice(prodIdx, 1);
        seccionesCatalogo[newSecIdx].productos.push(updatedProd);
      }

      await saveCatalogData();
      editModal.style.display = 'none';
      alert('¡Producto y marca actualizados en Supabase!');
    });

    exportBtn.addEventListener('click', async () => {
      await saveCatalogData();
      alert('✅ Catálogo sincronizado con Supabase');
    });
  }

  // Ejecución principal
  await loadCatalogData();
  renderCatalog();
  injectAdminUI();
  initLoginEvents();
  initAdminEvents();
});