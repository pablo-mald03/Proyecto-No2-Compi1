import parserYfera from "$lib/analizador/compiler/yfera-config";

import { ModuloYFera } from "./ModuloYFera";

import { ValidadorSemanticoYfera } from "./ValidadorSemanticoYfera";

/*Clase Delegada para manejar toda la logica principal para poder generar el analisis sintactico del lenguaje orquestador*/

export class YFeraCompilador {

    /*Constructor que permite obteber los datos para operar con la base de datos */
    constructor(db, fs,manejadorDb) {
        this.dataBase = db;
        this.frontState = fs;

        this.modulosCache = new Map();
        this.erroresGlobales = [];
        this.arbolEjecucion = null;

        this.manejadorDatabase = manejadorDb;
    }

    /*Metodo que permite compilar el proyecto*/
    async compilarProyecto() {
        this.frontState.systemLog('> Iniciando proceso de compilacion...');
        this.erroresGlobales = [];
        this.frontState.notificarErrores([]);

        //Buscar el archivo .y en la raiz del proyecto
        const mainFile = await this.buscarArchivoRaiz();

        if (!mainFile) {
            this.agregarError('Compilacion', 'error', 'Estructural', 'No se encontro un archivo .y en la raiz del proyecto.');
            this.frontState.notificarErrores(this.erroresGlobales);
            return;
        }

        this.frontState.systemLog(`> Archivo raiz detectado: ${mainFile.name}`);

        this.arbolEjecucion = await this.procesarModuloY(mainFile);

        if (this.erroresGlobales.length > 0) {
            this.frontState.notificarErrores(this.erroresGlobales);
            this.frontState.systemLog('> Compilacion abortada por errores.');
            return;
        }

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
                return null;
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
                    moduloActual.recursos.estilos += `\n/* source: ${rutaLimpia} */\n${archivoImportado.content}\n`;
                } else if (archivoImportado.name.endsWith('.comp')) {
                    moduloActual.recursos.componentes += `\n/* source: ${rutaLimpia} */\n${archivoImportado.content}\n`;
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
            return null;
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
}