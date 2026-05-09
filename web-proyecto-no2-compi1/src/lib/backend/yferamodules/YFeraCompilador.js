import parserYfera from "$lib/analizador/compiler/yfera-config";

import { ModuloYFera } from "./ModuloYFera";

import { ValidadorSemanticoYfera } from "./ValidadorSemanticoYfera";

import { RecursoImportado } from "../semanticsyfera/RecursoImportado";

import { ValidadorSemanticoStyles } from "../stylesmodules/ValidadorSemanticoStyles";

import { ValidadorSemanticoComponentes } from "../componentsmodules/ValidadorSemanticoComponentes";

import { ValidadorCuerpoMain } from "./ValidadorCuerpoMain";

import { TranspiladorYFeraJS } from "./TranspiladorYFeraJS";

/*Clase Delegada para manejar toda la logica principal para poder generar el analisis sintactico del lenguaje orquestador*/
export class YFeraCompilador {

    /*Constructor que permite obteber los datos para operar con la base de datos */
    constructor(db, fs, manejadorDb) {
        this.dataBase = db;
        this.frontState = fs;

        this.modulosCache = new Map();
        this.erroresGlobales = [];
        this.arbolEjecucion = null;

        this.manejadorDatabase = manejadorDb;
        this.mapaRutas = null;
    }

    /*Metodo que permite compilar el proyecto*/
    async compilarProyecto() {
        this.frontState.systemLog('> Iniciando proceso de compilacion...');
        this.erroresGlobales = [];
        this.frontState.notificarErrores([]);

        /*Primera fase de compilacion : Busqueda de la raiz*/
        const mainFile = await this.buscarArchivoRaiz();

        if (!mainFile) {
            this.agregarError('Compilacion', 'error', 'Compilacion', 'No se encontro un archivo .y en la raiz del proyecto.');
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }

        this.frontState.systemLog(`> Archivo raiz detectado: ${mainFile.name}`);

        /*Segunda fase de compilacion: Busqueda de imports y loads */
        this.arbolEjecucion = await this.procesarModuloY(mainFile);

        if (!this.arbolEjecucion) {
            this.agregarError('Compilacion', 'error', 'Compilacion', 'No se pudo construir el árbol de ejecución.');
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }

        console.log('=== MÓDULOS HIJOS ===');
        const listarHijos = (mod, nivel = 0) => {
            console.log(`${'  '.repeat(nivel)}${mod.nombre} -> compiledYFera: ${mod.compiledYFera ? 'SÍ' : 'NO'} (${mod.compiledYFera?.length || 0} chars)`);
            for (const h of mod.modulosHijos) listarHijos(h, nivel + 1);
        };
        listarHijos(this.arbolEjecucion);

        /*Tercera fase de compilacion: Donde se compilan y se evaluan todos los archivos .styles */
        const validadorStyles = new ValidadorSemanticoStyles(this, this.manejadorDatabase);
        await validadorStyles.validarEstilos(this.arbolEjecucion);

        if (this.erroresGlobales.length > 0) {
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }

        const validadorComponentes = new ValidadorSemanticoComponentes(this, this.manejadorDatabase);
        await validadorComponentes.validarComponentes(this.arbolEjecucion);

        if (this.erroresGlobales.length > 0) {
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }

        /*Cuarta fase de compilacion: Validacion semantica del cuerpo main y llamadas */

        const validadorCuerpo = new ValidadorCuerpoMain(this, this.manejadorDatabase);
        await validadorCuerpo.validarCuerpoMain(this.arbolEjecucion);

        if (this.erroresGlobales.length > 0) {
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }


        /*Quinta fase de compilacion: Transpilacion a JavaScript */
        this.frontState.systemLog('> Armando codigo compilado...');

        const transpilador = new TranspiladorYFeraJS(this, this.manejadorDatabase);

        const dbFile = await this.buscarBaseDatos();
        if (dbFile) {
            const binarioBase64 = await this.fileToBase64(dbFile);
            transpilador.sqliteBase64 = binarioBase64;
        }

        await transpilador.transpilarModulo(this.arbolEjecucion);

        this.mapaRutas = new Map();
        const rutasModulos = new Map();

        const recolectarRutas = async (modulo) => {
            if (!modulo || !modulo.compiledYFera) return;
            const rutaCompleta = await this.obtenerRutaRelativaCompleta(modulo.id);
            const nombreHTML = rutaCompleta.replace(/\.y$/, '.html');
            rutasModulos.set(modulo, nombreHTML);
            for (const hijo of modulo.modulosHijos) {
                await recolectarRutas(hijo);
            }
        };
        await recolectarRutas(this.arbolEjecucion);

        for (const [modulo, nombreHTML] of rutasModulos) {
            const blob = new Blob([modulo.compiledYFera], { type: 'text/html' });
            this.mapaRutas.set(nombreHTML, URL.createObjectURL(blob));
        }

        const routesDict = JSON.stringify(Object.fromEntries(this.mapaRutas));

        const reemplazarYActualizar = (modulo) => {
            if (!modulo || !modulo.compiledYFera) return;
            modulo.compiledYFera = modulo.compiledYFera.replace(
                '// __YFERA_ROUTES_DICT__',
                `window.__YFERA_ROUTES__ = ${routesDict};`
            );
            const nombreHTML = rutasModulos.get(modulo);
            if (nombreHTML) {
                const blob = new Blob([modulo.compiledYFera], { type: 'text/html' });
                this.mapaRutas.set(nombreHTML, URL.createObjectURL(blob));
            }
            for (const hijo of modulo.modulosHijos) reemplazarYActualizar(hijo);
        };
        reemplazarYActualizar(this.arbolEjecucion);

        const rutaRaiz = await this.obtenerRutaRelativaCompleta(this.arbolEjecucion.id);
        const raizHTML = rutaRaiz.replace(/\.y$/, '.html');
        window.open(this.mapaRutas.get(raizHTML), '_blank');

    }

    /*Metodo que permite buscar la base de datos en la raiz */
    async buscarBaseDatos() {
        const todosLosSQLite = await this.dataBase.files
            .filter(f => f.type === 'file' && f.name.endsWith('.sqlite'))
            .toArray();

        if (todosLosSQLite.length === 0) return null;

        const conProfundidad = await Promise.all(todosLosSQLite.map(async (file) => {
            let profundidad = 0;
            let actualParentId = file.parentId;
            while (actualParentId !== null) {
                const folder = await this.dataBase.files.get(actualParentId);
                if (!folder) break;
                actualParentId = folder.parentId;
                profundidad++;
            }
            return { file, profundidad };
        }));

        conProfundidad.sort((a, b) => a.profundidad - b.profundidad);
        return conProfundidad[0]?.file || null;
    }

    /* Busca un archivo .y el primero que se atraviesa para poder usarlo como orquestador */
    async buscarArchivoRaiz() {

        const todosLosY = await this.dataBase.files
            .filter(f => f.type === 'file' && f.name.endsWith('.y'))
            .toArray();

        if (todosLosY.length === 0) return null;

        const archivosConProfundidad = await Promise.all(todosLosY.map(async (file) => {
            let profundidad = 0;
            let actualParentId = file.parentId;

            while (actualParentId !== null) {
                const folder = await this.dataBase.files.get(actualParentId);
                if (!folder) break;
                actualParentId = folder.parentId;
                profundidad++;
            }

            return { file, profundidad };
        }));

        archivosConProfundidad.sort((a, b) => a.profundidad - b.profundidad);

        const orquestador = archivosConProfundidad[0].file;
        const nivel = archivosConProfundidad[0].profundidad;

        return orquestador;
    }

    /*Metodo recursivo que lee cada archivo buscando los imports y generando el merge*/
    async procesarModuloY(archivoY) {

        if (this.modulosCache.has(archivoY.id)) {
            return this.modulosCache.get(archivoY.id);
        }

        this.modulosCache.set(archivoY.id, null);

        try {
            parserYfera.yy.errores = [];
            const ast = parserYfera.parse(archivoY.content || "");

            if (parserYfera.yy.errores.length > 0) {
                const reporte = parserYfera.yy.errores.map(err => ({
                    origen: archivoY.name,
                    lexema: err.lexema || 'N/A',
                    tipo: err.tipo,
                    linea: err.fila,
                    columna: err.columna,
                    descripcion: err.descripcion
                }));
                this.agregarErrores(reporte);
                const moduloError = new ModuloYFera(archivoY, []);
                this.modulosCache.set(archivoY.id, moduloError);
                return moduloError;
            }

            const moduloActual = new ModuloYFera(archivoY, ast);
            this.modulosCache.set(archivoY.id, moduloActual);

            const nodosImport = ast.filter(n => n.tipo === 'INSTRUCCION_IMPORT');

            for (const nodo of nodosImport) {
                const rutaLimpia = nodo.ruta.valor.trim();
                const archivoImportado = await this.resolverPathRelativo(rutaLimpia, archivoY.parentId);

                if (!archivoImportado) {
                    this.agregarError(archivoY.name, rutaLimpia, 'Semantico', `No se encontro el archivo para importar.`, nodo.linea, nodo.columna);
                    continue;
                }

                if (moduloActual.importsVisitados.has(archivoImportado.id)) continue;
                moduloActual.importsVisitados.add(archivoImportado.id);

                if (archivoImportado.name.endsWith('.styles')) {
                    moduloActual.recursos.estilos.push(
                        new RecursoImportado(archivoImportado.name, rutaLimpia, archivoImportado.content, archivoImportado.id)
                    );
                } else if (archivoImportado.name.endsWith('.comp')) {
                    moduloActual.recursos.componentes.push(
                        new RecursoImportado(archivoImportado.name, rutaLimpia, archivoImportado.content, archivoImportado.id)
                    );
                }
            }

            //DELEGACION A LA VALIDACION SEMANTICA DE TIPOS Y LOADS (PATRON EXPERTO)
            const validador = new ValidadorSemanticoYfera(this, moduloActual, this.manejadorDatabase);
            await validador.analizar();

            // En procesarModuloY, antes de cargar un módulo hijo:
            for (const loadObj of validador.loadsDetectados) {
                const archivoSiguiente = await this.resolverPathRelativo(loadObj.ruta, archivoY.parentId);

                if (archivoSiguiente) {

                    if (archivoSiguiente.id === archivoY.id) {
                        this.agregarError(
                            archivoY.name,
                            loadObj.ruta,
                            'Semantico',
                            `Load cíclico detectado: '${loadObj.ruta}' carga el mismo archivo.`,
                            loadObj.linea,
                            loadObj.columna
                        );
                        continue;
                    }

                    const moduloHijo = await this.procesarModuloY(archivoSiguiente);
                    if (moduloHijo) {
                        moduloActual.modulosHijos.push(moduloHijo);
                    }
                } else {
                    this.agregarError(
                        archivoY.name,
                        loadObj.ruta,
                        'Semantico',
                        `Error de Load: No se encontro el archivo '${loadObj.ruta}'.`,
                        loadObj.linea,
                        loadObj.columna
                    );
                }
            }

            return moduloActual;

        } catch (error) {
            this.agregarError(archivoY.name, 'N/A', 'Compilacion', error.message);
            const moduloError = new ModuloYFera(archivoY, []);
            this.modulosCache.set(archivoY.id, moduloError);
            return moduloError;
        }
    }

    /*Metodo que permite navegar por la base de datos para poder encontrar archivos en la base de datos (base interna IndexDB)*/
    async resolverPathRelativo(ruta, parentIdActual) {
        const segmentos = ruta.split('/');
        let folderActualId = parentIdActual;

        for (let i = 0; i < segmentos.length - 1; i++) {
            const seg = segmentos[i];

            if (seg === '.') continue;

            if (seg === '..') {
                if (folderActualId !== null) {
                    const folder = await this.dataBase.files.get(folderActualId);
                    folderActualId = folder ? folder.parentId : null;
                }
            } else {
                const subFolder = await this.dataBase.files
                    .where('parentId').equals(folderActualId || null)
                    .filter(f => f.name === seg && f.type === 'folder')
                    .first();

                if (!subFolder) return null;
                folderActualId = subFolder.id;
            }
        }

        const fileName = segmentos[segmentos.length - 1];
        return await this.dataBase.files
            .where('parentId').equals(folderActualId || null)
            .filter(f => f.name === fileName && f.type === 'file')
            .first();
    }

    /*Metodo que permite agregar un error a la lista */
    agregarError(origenArchivo, lexemaError, tipo, descripcion, fila = -1, columna = -1) {
        this.erroresGlobales.push({
            origen: origenArchivo,
            lexema: lexemaError,
            tipo: tipo,
            linea: fila,
            columna: columna,
            descripcion: descripcion
        });
    }

    /*Metodo que permite ir agregando los errores*/
    agregarErrores(nuevos) {
        this.erroresGlobales = [...this.erroresGlobales, ...nuevos];
    }

    /*Metodo que permite convertir a base 64 la informacion de la db */
    async fileToBase64(file) {
        if (file.content instanceof ArrayBuffer) {
            return this.arrayBufferToBase64(file.content);
        }
        const encoder = new TextEncoder();
        const bytes = encoder.encode(file.content);
        return this.arrayBufferToBase64(bytes.buffer);
    }

    /*Buffer de la base de datos */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async obtenerRutaRelativaCompleta(archivoId, proyectoRaizParentId = null) {
        if (proyectoRaizParentId === null) {
            const raiz = this.arbolEjecucion;
            proyectoRaizParentId = raiz.parentId;
        }

        const partes = [];
        let currentId = archivoId;
        while (currentId !== null && currentId !== proyectoRaizParentId) {
            const file = await this.dataBase.files.get(currentId);
            if (!file) break;
            partes.unshift(file.name);
            currentId = file.parentId;
        }
        return partes.join('/');
    }
}