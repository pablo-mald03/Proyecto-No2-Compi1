import parserYfera from "$lib/analizador/compiler/yfera-config";

/*Clase Delegada para manejar toda la logica principal para poder generar el analisis sintactico del lenguaje orquestador*/

export class YFeraCompilador {

    /*Constructor que permite obteber los datos para operar con la base de datos */
    constructor(db, fs) {
        this.dataBase = db;
        this.frontState = fs;

        this.archivosVisitados = new Set();

        this.erroresGlobales = [];

        this.recursosGlobales = {
            componentes: "",
            estilos: ""
        };
    }

    /*Metodo que permite compilar el proyecto*/
    async compilarProyecto() {
        this.frontState.systemLog('> Iniciando proceso de compilacion...');
        this.erroresGlobales = [];
        this.frontState.notificarErrores([]);

        //Buscar el archivo .y en la raiz del proyecto
        const mainFile = await this.buscarArchivoRaiz();

        if (!mainFile) {
            this.frontState.notificarErrores([{ origen: 'Compilacion', lexema: 'error', tipo: 'Estructural', linea: -1, columna: -1, descripcion: 'No se encontro un archivo .y en la raiz del proyecto.' }]);
            return;
        }

        this.frontState.systemLog(`> Archivo raiz detectado: ${mainFile.name}`);

        await this.faseRecolectarImports(mainFile);

        if (this.erroresGlobales.length > 0) {
            this.frontState.notificarErrores(this.erroresGlobales);
            this.frontState.systemLog('> Compilacion abortada por errores.');
            return;
        }

        // PENDIENTE LA SEGUNDA PASADA
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
    async faseRecolectarImports(archivoY) {
        if (this.archivosVisitados.has(archivoY.id)) {
            return;
        }
        this.archivosVisitados.add(archivoY.id);

        try {
            parserYfera.yy.errores = [];
            const ast = parserYfera.parse(archivoY.content || "");

            if (parserYfera.yy.errores && parserYfera.yy.errores.length > 0) {
                const reporte = parserYfera.yy.errores.map(err => ({
                    origen: archivoY.name,
                    lexema: err.lexema || 'N/A',
                    tipo: err.tipo,
                    linea: err.fila,
                    columna: err.columna,
                    descripcion: err.descripcion
                }));
                this.agregarErrores(reporte);
                return;
            }

            const nodosImport = ast.filter(n => n.tipo === 'INSTRUCCION_IMPORT');

            for (const nodo of nodosImport) {
                const rutaLimpia = nodo.ruta.valor.trim();
                const archivoImportado = await this.resolverPathRelativo(rutaLimpia, archivoY.parentId);

                if (!archivoImportado) {
                    this.agregarError(archivoY.name, rutaLimpia, 'Semantico', `No se encontro el archivo para importar.`, nodo.linea, nodo.columna);
                    continue;
                }

                if (archivoImportado.name.endsWith('.styles')) {
                    this.recursosGlobales.estilos += `\n/* source: ${rutaLimpia} */\n${archivoImportado.content}\n`;
                } else if (archivoImportado.name.endsWith('.comp')) {
                    this.recursosGlobales.componentes += `\n/* source: ${rutaLimpia} */\n${archivoImportado.content}\n`;
                }
            }

            // PENDIENTE LA SEGUNDA PASADA
            //await this.buscarLoadsRecursivos(ast, archivoY);

        } catch (error) {

            this.agregarError(archivoY.name, 'N/A', 'Compilacion', error.message);
        }
    }

    /* Método para navegar el AST buscando instrucciones 'load' */
    async buscarLoadsRecursivos(nodos, archivoPadre) {
        if (!nodos || !Array.isArray(nodos)) return;

        for (const nodo of nodos) {
            if (!nodo) continue;

            if (nodo.tipo === 'LOAD_ARCHIVO') {
                const rutaLoad = nodo.uri.valor.trim();

                const archivoSiguiente = await this.resolverPathRelativo(rutaLoad, archivoPadre.parentId);

                if (archivoSiguiente) {
                    this.frontState.systemLog(`> Orquestando: ${archivoPadre.name} -> ${archivoSiguiente.name}`);

                    await this.faseRecolectarImports(archivoSiguiente);
                } else {
                    this.frontState.notificarErrores([{
                        origen: archivoPadre.name,
                        lexema: rutaLoad,
                        tipo: 'Semantico',
                        linea: nodo.linea,
                        columna: nodo.columna,
                        descripcion: `Error de Load: No se encontró el archivo '${rutaLoad}'.`
                    }]);
                }
            }

            /*if (nodo.tipo === 'DEFINICION_FUNCION' && nodo.cuerpo) {
                await this.buscarLoadsRecursivos(nodo.cuerpo, archivoPadre);
            }

            // 3. Si tienes IFs o WHILEs en el futuro, también deberías entrar en sus bloques
            if (nodo.instrucciones_if) await this.buscarLoadsRecursivos(nodo.instrucciones_if, archivoPadre);
            if (nodo.instrucciones_else) await this.buscarLoadsRecursivos(nodo.instrucciones_else, archivoPadre);*/
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