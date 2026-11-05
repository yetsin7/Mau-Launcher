# Estado e instrucciones de Mau Launcher

**Mau Launcher 0.2** es un centro de aplicaciones para tus proyectos de escritorio con una interfaz propia inspirada en el concepto de catálogo de ArtCraft.

## Funciones disponibles
- Catálogo de programas, categorías, búsqueda y enlaces a GitHub.
- Consulta de **GitHub Releases** para identificar versiones con instaladores de tu plataforma y arquitectura.
- Descarga integrada a una ruta elegida por ti, con progreso y comprobación de SHA-256 cuando GitHub publica la huella `sha256:...`.
- Registro manual del ejecutable de un programa ya instalado mediante **Vincular** y botón **Abrir**.
- Las rutas vinculadas se almacenan únicamente en el perfil local de Mau Launcher.
- Sin ejecución automática de instaladores. Los archivos se guardan para su revisión e instalación manual.
- Las aplicaciones sin un instalador válido no muestran el botón de descarga activado.

**Limitaciones:** Vincular no es detección automática. Abrir usa el ejecutable registrado y no comprueba el estado de una instalación del sistema. La descarga no ejecuta instalaciones ni aplica actualizaciones automáticamente. En Linux/macOS hay que probar los tipos de ejecutable específicos. El catálogo puede incluir proyectos cuya distribución binaria aún no está lista.

## Descargar y ejecutar desde código
Necesitas Node.js 22 o superior y npm.

```bash
git clone https://github.com/yetsin7/Mau-Launcher.git
cd Mau-Launcher
npm install
npm run check
npm start
```

Para generar un instalador en tu sistema:

```bash
npm run dist
```

Los trabajos de GitHub Actions construyen paquetes para Windows, macOS y Linux, y los guardan como artefactos de las ejecuciones. Un artefacto de Actions **no equivale a una publicación pública en GitHub Releases**.

## Preparar programas para el lanzador
Cada app pública necesita un repositorio fuente y un `Release` público con instaladores reales, nombrados para el sistema y arquitectura. Mau Launcher no puede instalar código fuente directamente; tampoco puede acceder a repositorios privados desde una aplicación distribuida públicamente.

El catálogo se encuentra en `src/catalog.json`. Para cada entrada, configura ID único, nombre, repositorio, categoría, descripción y sistemas admitidos.

## Seguridad y distribución
- Descargas por HTTPS desde assets de GitHub Releases, con redirecciones restringidas a hosts esperados.
- Si GitHub aporta un SHA-256, una discrepancia elimina la descarga.
- Sin SHA-256 publicado por GitHub, la huella calculada sirve como referencia, **no** como prueba de autenticidad del archivo.
- No hay actualización desatendida, firma de código ni confianza automática en archivos descargados.
- Nunca pongas tokens ni URLs privadas en el catálogo público.

## Por completar
- Revisar los repositorios públicos: incluir únicamente aplicaciones utilizables en escritorio (no datasets, librerías ni ejemplos de cursos).
- Publicar GitHub Releases multiplataforma para cada app compatible.
- Instalación guiada, detección por sistema operativo, verificación de actualización y desinstalación.
- Firmar paquetes y verificar en hardware real.
- Autoactualización del propio Mau Launcher y bandeja del sistema.
