# User-Agent Changer - Extensión para Chrome

Una extensión profesional para Google Chrome que permite cambiar el User-Agent del navegador de manera rápida y sencilla.

## 🌟 Características

- **Interfaz intuitiva**: Popup con lista de User-Agents configurados para cambio rápido
- **Badge personalizado**: Muestra el alias del User-Agent activo en el icono de la extensión
  - Sin badge cuando está activo el User-Agent por defecto
  - Badge personalizable con colores de texto y fondo para cada User-Agent
- **Dos modos de operación**:
  - **Reemplazar**: Sustituye completamente el User-Agent del navegador
  - **Agregar**: Añade texto al final del User-Agent actual
- **Página de gestión completa**: Interfaz en pestaña separada para gestionar User-Agents
  - Agregar nuevos User-Agents con alias personalizados (máx. 4 caracteres)
  - Eliminar User-Agents personalizados
  - Selector de colores para badge (texto y fondo)
  - Vista previa en tiempo real del badge
- **User-Agents predefinidos**:
  - Por defecto (Chrome) - Sin badge
  - iPhone 14 - Badge: "iOS" (azul)
  - Android - Badge: "AND" (verde)

## 📦 Instalación

1. Descarga o clona este repositorio
2. Abre Google Chrome y ve a `chrome://extensions/`
3. Activa el **Modo de desarrollador** (esquina superior derecha)
4. Haz clic en **Cargar extensión sin empaquetar**
5. Selecciona la carpeta del proyecto `UserAgentChanger`
6. ¡Listo! El icono de la extensión aparecerá en la barra de herramientas

## 🚀 Uso

### Cambiar User-Agent:
1. Haz clic en el icono de la extensión en la barra de herramientas
2. Selecciona el User-Agent que deseas activar de la lista
3. El badge en el icono mostrará el alias del User-Agent activo (o ninguno si es el por defecto)
4. El User-Agent se aplicará automáticamente a todas las peticiones

### Gestionar User-Agents:
1. Haz clic en el icono de la extensión
2. Haz clic en el botón **"⚙️ Gestionar User-Agents"**
3. Se abrirá una nueva pestaña con la interfaz de gestión
4. En la interfaz podrás:
   - Agregar nuevos User-Agents con nombre, alias, modo y string personalizado
   - Elegir colores personalizados para el badge (texto y fondo)
   - Ver vista previa del badge en tiempo real
   - Ver todos los User-Agents configurados con sus detalles
   - Eliminar User-Agents personalizados (excepto el por defecto)

## 🎨 Personalización del Badge

Cada User-Agent puede tener su propio estilo de badge:
- **Color de texto**: Elige el color del texto del badge (hex)
- **Color de fondo**: Elige el color de fondo del badge (hex)
- **Vista previa**: Visualiza cómo se verá el badge antes de guardarlo

**Nota**: Chrome determina automáticamente el color del texto del badge basándose en el color de fondo para garantizar la legibilidad. Los colores personalizados se aplicarán lo más posible dentro de las limitaciones de la API de Chrome.

## 📁 Estructura del Proyecto

```
UserAgentChanger/
├── manifest.json          # Configuración de la extensión
├── popup.html            # HTML del popup (lista de User-Agents)
├── popup.js              # Lógica del popup
├── options.html          # HTML de la página de opciones/gestión
├── options.js            # Lógica de la página de opciones
├── options.css           # Estilos de la página de opciones
├── background.js         # Service worker (cambio de User-Agent y badge)
├── styles.css            # Estilos del popup
├── icons/                # Iconos de la extensión
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # Este archivo
```

## 🔧 Tecnologías Utilizadas

- **Manifest V3**: Última versión del sistema de extensiones de Chrome
- **declarativeNetRequest API**: Para modificar headers de las peticiones HTTP
- **Chrome Storage API**: Para persistir configuraciones
- **Chrome Badge API**: Para mostrar indicadores en el icono
- **HTML5/CSS3/JavaScript**: Interfaz moderna y responsive

## ⚙️ Permisos Necesarios

- `declarativeNetRequest`: Para modificar el User-Agent header
- `declarativeNetRequestWithHostAccess`: Para aplicar cambios en todos los sitios
- `storage`: Para guardar configuraciones
- `tabs`: Para abrir la página de opciones en nueva pestaña
- `<all_urls>`: Para aplicar el User-Agent en todos los sitios web

## 💡 Casos de Uso

1. **Desarrollo web**: Probar cómo se ve tu sitio en diferentes dispositivos
2. **Testing**: Verificar comportamiento específico por User-Agent
3. **Web scraping**: Simular diferentes navegadores o dispositivos
4. **Privacidad**: Modificar tu huella digital del navegador
5. **Acceso a contenido**: Algunos sitios muestran diferente contenido según el dispositivo

## 🛡️ Privacidad

- Todos los datos se almacenan localmente en tu navegador
- No se envía información a servidores externos
- No se recopilan datos de navegación
- Código abierto y auditable

## 📝 Notas Técnicas

- El User-Agent se aplica a todas las peticiones HTTP/HTTPS
- Los cambios son inmediatos sin necesidad de recargar pestañas
- El modo "Agregar" usa como base el User-Agent de Chrome actual
- El User-Agent por defecto no muestra badge en el icono
- Los colores del badge se personalizan por User-Agent

## 👨‍💻 Autor

**Trystan4861**
- GitHub: [@Trystan4861](https://github.com/Trystan4861)
- Repositorio: [UserAgentSwitcher](https://github.com/Trystan4861/UserAgentSwitcher.git)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si encuentras algún bug o tienes una sugerencia:

1. Abre un issue en el [repositorio de GitHub](https://github.com/Trystan4861/UserAgentSwitcher/issues)
2. Si quieres contribuir con código, haz un fork y crea un pull request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:
- Revisa que la extensión esté habilitada en `chrome://extensions/`
- Verifica que tienes permisos suficientes
- Comprueba la consola de errores de la extensión

## 🔄 Actualizaciones

**Versión 1.0.0**
- Lanzamiento inicial
- Cambio de User-Agent con dos modos (reemplazar/agregar)
- Badge personalizado por User-Agent
- Página de opciones en pestaña separada
- Colores personalizables para badges
- User-Agents predefinidos
- Sin badge para User-Agent por defecto

---

Desarrollado con ❤️ para facilitar el desarrollo y testing web.
