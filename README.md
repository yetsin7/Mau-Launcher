# Mau Launcher

Centro de aplicaciones de **Mau Software** para Windows, macOS y Linux, inspirado funcionalmente en el catálogo centralizado de ArtCraft Launcher, pero con interfaz y marca propias.

## Estado actual (versión inicial)

- Aplicación de escritorio Electron con catálogo, búsqueda, categorías y enlaces a repositorios.
- Consulta la publicación más reciente en **GitHub Releases** y selecciona archivos de instalador compatibles con el sistema actual.
- Botón **Descargar** que abre la descarga oficial en el navegador. **La instalación manual sigue siendo necesaria.**
- Solo muestra una descarga cuando encuentra un asset compatible; un repositorio sin Releases no se presenta como instalable.
- No detecta aún aplicaciones instaladas, no comprueba checksums, no instala ni actualiza automáticamente.
- **Mau Music** aparece como pendiente hasta que su repositorio se publique y tenga Releases.

## Ejecutar

Requisitos: Node.js 22+ y npm.

```bash
git clone https://github.com/yetsin7/Mau-Launcher.git
cd Mau-Launcher
npm install
npm start
```

Crear un instalador para el sistema donde se ejecuta:

```bash
npm run dist
```

Salida esperada: carpeta `dist/`. La compilación y empaquetado aún deben verificarse en cada sistema operativo.

## Añadir una app

Editar `src/catalog.json` con ID único, nombre, repositorio público (formato `yetsin7/nombre`), categoría, descripción y sistemas admitidos. El repositorio debe publicar instaladores en GitHub Releases para habilitar Descarga; el nombre mostrado y el nombre del repositorio pueden diferir. Nunca exponer URLs privadas ni tokens.

## Seguridad

- Solo se abren enlaces HTTPS de activos oficiales en `github.com`.
- No se ejecutan instaladores descargados automáticamente.
- El código remoto no se ejecuta dentro del renderizador.
- Pendiente: verificación criptográfica SHA-256 de descargas, estado de instalación real, actualizaciones seguras, firma de distribuciones y pruebas completas.

## Próximos hitos

1. Revisar todos los repositorios públicos para separar aplicaciones de escritorio de bibliotecas, cursos, servicios y proyectos móviles.
2. Crear pipelines de compilación y publicación en cada aplicación compatible.
3. Detección nativa de aplicaciones instaladas y versiones.
4. Descarga, verificación SHA-256 e instalación guiada por plataforma.
5. Actualizaciones, apertura desde el launcher, bandeja del sistema y autoactualización de Mau Launcher.

**Aviso:** ArtCraft Launcher es una referencia funcional externa. Mau Launcher es un proyecto independiente y no afirma estar afiliado a ArtCraft.
