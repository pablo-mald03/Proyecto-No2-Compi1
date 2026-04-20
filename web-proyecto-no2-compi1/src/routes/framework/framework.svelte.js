/*Libreria de indexedDb */
import Dexie from "dexie";

/*Libreria de zips */
import JSZip from "jszip";

/*Inicializar instancia de dixie (Se comunica con la base de datos) */
export const db = new Dexie('YferaWorkspace');

/*Manejador de la base de datos sqlite */
import { dbManejador } from "$lib/modules/SqliteManager";

/*Definicion de la base de datos que se utilizara para definir el storage donde se mantendra la persistencia temporal del proyecto */
/*
 * Detalles: 
 * 
 * ++id es la integracion de ID autoincremental
 * parentId utiliza la misma tecnica de tener una tabla que en sus atributos hace referencia a si misma
 */
db.version(1).stores({
    files: '++id, parentId, name, type'
});


//Clase delegada para trabajar con esa interaccion por detras para poder dar las funcionalidades a la UI
export function createFrameworkState() {

    /*Estado reactivo del arbol de trabajo */
    let _files = $state([]);

    /*Estado reactivo que detecta windows abiertas */
    let _openFileIds = $state([]);

    /*Atributos para la logica de archivo seleccionado */
    let _activeFileId = $state(5);
    let _showSidebar = $state(true);
    let _showConsole = $state(true);
    let _consoleHeight = $state(200);

    /*Atributos reactivos para la implementacion del colapso de carpetas */
    let _expandedFolders = $state([]);
    let _selectedFolderId = $state(null);

    let _commandHistory = $state([
        { type: 'system', text: 'YFERA Terminal initialized...' },
        { type: 'advise', text: 'Escribe "manual" para ver lista de comandos.' }
    ]);

    let _currentCommand = $state('');

    /*Estado inicial del modal de confirmacion*/
    let _confirmModalConfig = $state({
        show: false,
        titulo: '',
        mensaje: '',
        tipo: 'danger',
        textoConfirmar: 'Confirmar',
        onConfirmar: () => { }
    });

    /*Atributo del modal informativo */
    let _infoModalConfig = $state({
        show: false,
        tipo: 'exito',
        titulo: '',
        mensaje: ''
    });

    /*Atributo que permite manejar a la base de datos */
    let _activeDB = null;

    return {
        get files() { return _files; },

        get activeFileId() { return _activeFileId; },

        set activeFileId(val) { _activeFileId = val; },

        get showSidebar() { return _showSidebar; },

        set showSidebar(val) { _showSidebar = val; },

        get showConsole() { return _showConsole; },

        set showConsole(val) { _showConsole = val; },

        get consoleHeight() { return _consoleHeight; },

        set consoleHeight(val) { _consoleHeight = val; },

        get commandHistory() { return _commandHistory; },

        set commandHistory(val) { _commandHistory = val; },

        get currentCommand() { return _currentCommand; },
        set currentCommand(val) { _currentCommand = val; },

        /*Getter del estado del modal de confirmacion */
        get confirmModalConfig() { return _confirmModalConfig; },

        /*Getter del modal de informacion */
        get infoModalConfig() { return _infoModalConfig; },

        /*Getters y Stters de los estados reactivos de expansion del arbol de trabajo */
        get expandedFolders() { return _expandedFolders; },
        get selectedFolderId() { return _selectedFolderId; },
        set selectedFolderId(val) { _selectedFolderId = val; },

        /*Metodo que permite inicializar la aplicacion */
        async iniciarFramework() {
            await this.loadWorkspace();

            if (_files && _files.length > 0) {
                await this.iniciarBaseDeDatos();
            }
        },

        /*Metodo que devuelve los objetos completos de los archivos abiertos */
        get openFiles() {
            return _openFileIds.map(id => _files.find(f => f.id === id)).filter(Boolean);
        },
        //Marca el archivo activo
        get activeFile() {
            return _files.find(f => f.id === _activeFileId);
        },
        /*Metodo para cerrar el modal de informacion */
        closeInfoModal() {
            _infoModalConfig.show = false;
        },
        /*Metodo principal que permite reiniciar la base de datos */
        async resetDatabase() {
            await db.delete();
            await db.open();
            _files = [];
            _openFileIds = [];
            _activeFileId = null;
        },
        // Metodo para cerrar el modal desde fuera
        closeConfirmModal() {
            _confirmModalConfig.show = false;
        },
        /*Metodo que permite elegir el  folder o directorio actual*/
        toggleFolder(id) {
            _selectedFolderId = id;
            if (_expandedFolders.includes(id)) {
                _expandedFolders = _expandedFolders.filter(fId => fId !== id);
            } else {
                _expandedFolders.push(id);
            }
        },
        /*Metodo que integra las windows/pestanias abiertas */
        openTab(id) {
            if (!_openFileIds.includes(id)) {
                _openFileIds.push(id);
            }
            _activeFileId = id;
        },
        /*Metodo que integra el cierre de pestanias/windows */
        closeTab(id, event) {
            if (event) event.stopPropagation();
            _openFileIds = _openFileIds.filter(fId => fId !== id);

            if (_activeFileId === id) {
                _activeFileId = _openFileIds.length > 0 ? _openFileIds[_openFileIds.length - 1] : null;
            }
        },
        /*Metodo que permite seleccionar una archivo actual */
        selectFile(id) {
            const file = _files.find(f => f.id === id);
            if (file && file.type === 'file') {
                this.openTab(id);
            } else if (file && file.type === 'folder') {
                this.systemLog(`> Seleccionaste carpeta: ${file.name}`);
            }
        },
        /*Metodo que permite generar la respuesta drag para poder arrastrar y soltar carpetas dentro de otras */
        async moveItem(draggedId, targetFolderId) {
            if (draggedId === targetFolderId) return;

            try {
                await db.files.update(draggedId, { parentId: targetFolderId });
                await this.loadWorkspace();

                if (targetFolderId !== null && !_expandedFolders.includes(targetFolderId)) {
                    _expandedFolders.push(targetFolderId);
                }
            } catch (error) {
                this.systemLog(`> Error al mover elemento: ${error.message}`);
            }
        },

        /*Metodo integrado para poder crear un archivo o folder*/
        /*LA ER NO TIENE NADA QUE VER CON HERRAMIENTAS LEXICAS Y SINTACTICAS */
        async createFile(rawName, extension, icon, type = 'file', content = '') {
            let safeName = rawName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const finalName = type === 'folder' ? safeName : `${safeName}${extension}`;

            /*LOGICA DE DIRECTORIO DEFAULT*/
            let parentId = _selectedFolderId;

            try {
                const newId = await db.files.add({ parentId, name: finalName, type, icon, content });
                await this.loadWorkspace();

                if (type === 'file') {
                    this.openTab(newId);
                } else if (type === 'folder') {
                    this.toggleFolder(newId);
                }

                // Si lo creamos en una carpeta, asegurarnos de que esté expandida para verlo
                if (parentId !== null && !_expandedFolders.includes(parentId)) {
                    _expandedFolders.push(parentId);
                }

                this.systemLog(`> Se ha creado exitosamente: ${finalName}`);
            } catch (error) {
                this.systemLog(`> Error al crear: ${error.message}`);
            }
        },
        /* Metodo para reiniciar por completo el Framework (Cerrar Proyecto) */
        async resetDatabase() {
            try {
                await db.files.clear();
                _files = [];
                _openFileIds = [];
                _activeFileId = null;
                _selectedFolderId = null;
                _expandedFolders = [];

                _commandHistory = [
                    { type: 'system', text: 'YFERA Terminal initialized...' },
                ];
            } catch (error) {
                this.systemLog(`> Error al cerrar el proyecto: ${error.message}`);
            }
        },
        // Método mejorado para recibir contenido inicial
        addFile(name, icon, content = '') {
            const id = Math.max(..._files.map(f => f.id), 0) + 1;
            _files.push({ id, parentId: null, name, type: 'file', icon, content });
        },
        /*Metodo que permite limpiar la consola */
        clearConsole() {
            _commandHistory = [];
        },
        /*Log de los mensajes dentro de la consola */
        systemLog(message) {
            _commandHistory.push({ type: 'system', text: message });
        },
        //Metodo que carga los archivos desde IndexedDB al iniciar la app
        async loadWorkspace() {
            try {
                _files = await db.files.toArray();

            } catch (error) {
                this.systemLog(`> Error cargando area de trabajo: ${error.message}`);
            }
        },
        //Metodo que crea la estructura inicial de un Nuevo Proyecto
        async createNewProject() {
            this.systemLog('> Creando nuevo proyecto...');

            try {
                await db.files.clear();
                _files = [];
                _activeFileId = null;
                _openFileIds = [];

                //Archivo raiz sql
                await db.files.add({ parentId: null, name: 'database.sqlite', type: 'file', icon: 'bi-database text-white', content: '' });

                //Carpeta src
                const srcId = await db.files.add({ parentId: null, name: 'src', type: 'folder', icon: 'bi-folder-fill' });

                //Archivos iniciales en src
                await db.files.add({ parentId: srcId, name: 'main.y', type: 'file', icon: 'bi-braces text-warning', content: '// Logica .y' });
                await db.files.add({ parentId: srcId, name: 'main.comp', type: 'file', icon: 'bi-box text-info', content: ' /*Compontentes del proyecto*/' });
                await db.files.add({ parentId: srcId, name: 'main.styles', type: 'file', icon: 'bi-palette text-danger', content: '/* Estilos del componente */' });
                //Se recarga la ui
                await this.loadWorkspace();
                await this.iniciarBaseDeDatos();

                _expandedFolders = [srcId];
                _selectedFolderId = srcId;
                this.systemLog('> Estructura inicial creada con exito.');

            } catch (error) {
                this.systemLog(`> Error al crear proyecto: ${error.message}`);
            }
        },
        //Metodo que permite tener el controlador central de las acciones del menu
        triggerMenuAction(action) {
            this.showConsole = true;

            if (action === 'Nuevo_Proyecto') {
                this.createNewProject();
            }
            else if (action === 'Abrir_Proyecto') {
                /*Si hay un proyecto abierto se avisa para evitar que se pierda informacion */
                if (_files.length > 0) {
                    _confirmModalConfig = {
                        show: true,
                        titulo: 'SOBREESCRIBIR AREA DE TRABAJO',
                        mensaje: 'Ya hay un proyecto abierto. Si abres uno nuevo, perderas los cambios no exportados. ¿Deseas continuar?',
                        tipo: 'warning',
                        textoConfirmar: 'Sí, abrir proyecto',
                        onConfirmar: async () => {
                            _confirmModalConfig.show = false;
                            await this.openLocalProject();
                        }
                    };
                } else {
                    /*Area de trabajo vacio */
                    this.openLocalProject();
                }
            }
            else if (action === 'Cerrar_Proyecto') {
                if (_files.length === 0) {
                    // Si no hay archivos se muestra alerta
                    _infoModalConfig = {
                        show: true,
                        tipo: 'error',
                        titulo: 'ERROR DE ACCION',
                        mensaje: 'No se puede cerrar el proyecto porque el area de trabajo ya esta vacia.'
                    };
                } else {
                    //Si hay archivos se pide confirmacion
                    _confirmModalConfig = {
                        show: true,
                        titulo: 'Cerrar Proyecto',
                        mensaje: '¿Estás seguro de que deseas cerrar el proyecto? Se borrarán todos los archivos de la memoria local.',
                        tipo: 'danger',
                        textoConfirmar: 'Sí, cerrar todo',
                        onConfirmar: async () => {
                            await this.resetDatabase();
                            _confirmModalConfig.show = false;
                        }
                    };
                }
            }
            else {
                this.systemLog(`> Acción "${action}" no implementada.`);
            }
        },
        /*Metodo que permite ejecutar un comando en la consola*/
        async handleCommand(event) {
            if (event.key === 'Enter') {
                const cmd = _currentCommand.trim();
                if (cmd) {
                    _commandHistory.push({ type: 'input', text: cmd });

                    if (cmd === 'clear') {
                        this.clearConsole();
                        _currentCommand = '';
                        return;
                    }

                    if (cmd === 'db-status') {
                        try {
                            const res = dbManejador.execute("SELECT sqlite_version();");
                            this.systemLog(`> Base de datos SQLite Activa. Version: ${res[0].values[0][0]}`);
                        } catch (e) {
                            _commandHistory.push({ type: 'error', text: `> Base de datos inactiva: ${e.message}` });
                        }
                        _currentCommand = '';
                        return;
                    }
                    //PENDIENTE INTEGRAR LA RESPUESTA REAL DEL PARSER 'yfera run'
                    if (cmd.toLowerCase().startsWith('sql ')) {
                        //Extraccion del prefijo
                        const query = cmd.substring(4).trim();
                        await this._ejecutarComandoSQL(query);
                    } else {
                        _commandHistory.push({ type: 'advise', text: `Comando no reconocido: '${cmd}'. Escribe 'manual' para ver lista de comandos.` });
                    }
                }
                _currentCommand = '';
            }
        },
        /* Metodo encargado de correr los comandos sql e irlos registrando directamente en el archivo sql*/
        async _ejecutarComandoSQL(query) {
            try {
                const result = dbManejador.execute(query);

                //Verificacion de instrucciones que modifican
                const upperQuery = query.toUpperCase();
                const esMutacion = upperQuery.startsWith('CREATE') || 
                                   upperQuery.startsWith('INSERT') || 
                                   upperQuery.startsWith('UPDATE') || 
                                   upperQuery.startsWith('DELETE') || 
                                   upperQuery.startsWith('DROP')   || 
                                   upperQuery.startsWith('ALTER');

                //Si cambio la base de datos se actualiza
                if (esMutacion) {
                    await this.guardarBaseDeDatos();
                    _commandHistory.push({ type: 'system', text: `> Comando ejecutado correctamente.` });
                }

                //Implementacion del select base
                if (result && result.length > 0) {
                    const { columns, values } = result[0];
                    
                    _commandHistory.push({ type: 'system', text: `> Resultados:` });
                    
                    _commandHistory.push({ type: 'output', text: `| ${columns.join(' | ')} |` });
                    _commandHistory.push({ type: 'output', text: `|` + columns.map(() => '---').join('|') + `|` });

                    values.forEach(row => {
                        _commandHistory.push({ type: 'output', text: `| ${row.join(' | ')} |` });
                    });

                } else if (!esMutacion) {
                    _commandHistory.push({ type: 'system', text: `> Resultado vacio. (0 filas devueltas)` });
                }

            } catch (error) {
                _commandHistory.push({ type: 'error', text: `> Error ejecucion de comando SQL: ${error.message}` });
            }
        },
        /*Metodo para poder notificar mensajes al usuario */
        notifyMessages(titulo, mensaje, tipo = 'exito') {
            _infoModalConfig = {
                show: true,
                titulo,
                mensaje,
                tipo
            };
        },
        /*===========Apartado de metodos utilizados para poder leer un arbol de trabajo===========*/
        /*Metodo que permite validar los datos importados (IMPORTANTE: PRIMERO SE CARGA PARA CERRAR LO MAS RAPIDO POSIBLE LA LECTURA)*/
        async _validarWorkSpaceImportado() {
            await this.loadWorkspace();

            /*Busqueda de archivo sqlite en la raiz */
            const rootSqlites = _files.filter(f => f.parentId === null && f.name.endsWith('.sqlite'));

            if (rootSqlites.length === 0) {
                await this.resetDatabase();
                this.notifyMessages('PROYECTO INVALIDO', 'El directorio seleccionado debe contener exactamente un archivo .sqlite en la raiz.', 'error');
                return false;
            }

            /*Permite saber si hay mas de una base de datos por proyecto */
            if (rootSqlites.length > 1) {
                const toDelete = rootSqlites.slice(1);

                for (const file of toDelete) {
                    await db.files.delete(file.id);
                }

                await this.loadWorkspace();
                await this.iniciarBaseDeDatos();
            }

            return true;
        },

        /*Metodo que permite leer un arbol de trabajo cargado (METODO RECURSIVO)*/
        async _procesarDirectorio(dirHandle, currentParentId = null) {

            for await (const entry of dirHandle.values()) {

                // Se ignoran ciertos archivos pesados posibles
                if (entry.name === '.git' || entry.name === 'node_modules') continue;

                if (entry.kind === 'directory') {
                    // Si es una carpeta se agrega directamente.
                    const newFolderId = await db.files.add({
                        parentId: currentParentId,
                        name: entry.name,
                        type: 'folder',
                        icon: 'bi-folder-fill',
                        content: ''
                    });

                    await this._procesarDirectorio(entry, newFolderId);

                } else if (entry.kind === 'file') {
                    /* FILTRO DE ARCHIVOS ACEPTADOS*/
                    const validExtensions = ['.y', '.comp', '.styles', '.sqlite'];
                    const isValid = validExtensions.some(ext => entry.name.endsWith(ext));

                    if (!isValid) continue;

                    /* Reconocimiento recursivo de archivos */
                    const fileHandle = await entry.getFile();
                    let content = '';

                    try {
                        content = await fileHandle.text();
                    } catch (e) {
                        content = '// Archivo binario o no legible por texto';
                    }

                    let icon = 'bi-file-earmark-code';
                    if (entry.name.endsWith('.y')) icon = 'bi-braces text-warning';
                    else if (entry.name.endsWith('.comp')) icon = 'bi-box text-info';
                    else if (entry.name.endsWith('.styles')) icon = 'bi-palette text-danger';
                    else if (entry.name.endsWith('.sqlite')) icon = 'bi-database text-white';

                    await db.files.add({
                        parentId: currentParentId,
                        name: entry.name,
                        type: 'file',
                        icon: icon,
                        content: content
                    });
                }
            }
        },

        /* Metodo que permite abrir el gestor de archivos local para poder cargar un proyecto */
        async openLocalProject() {
            try {
                if (window.showDirectoryPicker) {
                    // Se le pide al usuario la carpeta raiz
                    const directoryHandle = await window.showDirectoryPicker();

                    // Se limpia el espacio de trabajo actual
                    await this.resetDatabase();

                    // Se arranca el buscador recursivo
                    await this._procesarDirectorio(directoryHandle, null);

                    //VALIDACION DESPUES DE IMPORTAR TODO EL PROYECTO
                    const isValid = await this._validarWorkSpaceImportado();

                    if (isValid) {
                        this.notifyMessages('PROYECTO CARGADO', `Se ha importado el proyecto con exito.`, 'exito');
                    }
                } else {
                    /* Caso en el que no se soporta la API del navegador */
                    await this._importUsingFallback();
                }

            } catch (error) {
                if (error.name === 'AbortError') {
                    this.systemLog('> Importacion cancelada por el usuario.');
                } else {
                    this.systemLog(`> Error al leer archivos: ${error.message}`);
                    this.notifyMessages('ERROR DE LECTURA', 'Ocurrio un error al intentar leer el arbol de directorios.', 'error');
                }
            }
        },

        /* Metodo en el caso de que no se pueda importar con la API MODERNA de archivos de JS.*/
        async _importUsingFallback() {
            return new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.directory = true;
                input.multiple = true;

                input.onchange = async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return resolve();

                    try {
                        await this.resetDatabase();

                        const folderMap = new Map();

                        for (const file of files) {
                            if (file.webkitRelativePath.includes('/node_modules/') ||
                                file.webkitRelativePath.includes('/.git/')) {
                                continue;
                            }

                            const pathParts = file.webkitRelativePath.split('/');
                            const fileName = pathParts[pathParts.length - 1];

                            /*FILTROS DE ACEPTACION DE EXTENSIONES*/
                            const validExtensions = ['.y', '.comp', '.styles', '.sqlite'];
                            const isValid = validExtensions.some(ext => fileName.endsWith(ext));
                            if (!isValid) continue;

                            let currentPath = '';
                            let parentId = null;

                            for (let i = 1; i < pathParts.length - 1; i++) {
                                const folderName = pathParts[i];
                                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                                if (!folderMap.has(currentPath)) {
                                    const newFolderId = await db.files.add({
                                        parentId: parentId,
                                        name: folderName,
                                        type: 'folder',
                                        icon: 'bi-folder-fill',
                                        content: ''
                                    });
                                    folderMap.set(currentPath, newFolderId);
                                }
                                parentId = folderMap.get(currentPath);
                            }

                            let content = '';
                            try {
                                content = await file.text();
                            } catch (err) {
                                content = '// Archivo binario o no legible';
                            }

                            let icon = 'bi-file-earmark-code';
                            if (fileName.endsWith('.y')) icon = 'bi-braces text-warning';
                            else if (fileName.endsWith('.comp')) icon = 'bi-box text-info';
                            else if (fileName.endsWith('.styles')) icon = 'bi-palette text-danger';
                            else if (fileName.endsWith('.sqlite')) icon = 'bi-database text-white';

                            await db.files.add({
                                parentId: parentId,
                                name: fileName,
                                type: 'file',
                                icon: icon,
                                content: content
                            });
                        }

                        //VALIDACION DESPUES DE IMPORTAR TODO EL PROYECTO
                        const isProjectValid = await this._validarWorkSpaceImportado();

                        if (isProjectValid) {
                            this.notifyMessages('PROYECTO CARGADO', `Se ha importado el proyecto con exito.`, 'exito');
                        }

                        resolve();

                    } catch (err) {
                        reject(err);
                    }
                };

                input.click();
            });
        },
        /*===========Apartado de metodos utilizados para poder exportar un arbol de trabajo===========*/
        /* Motor recursivo que lee de IndexedDB y mete los archivos al ZIP */
        async _construirZipFolder(parentId, currentZipFolder) {

            const children = _files.filter(f => f.parentId === parentId);

            for (const child of children) {
                if (child.type === 'folder') {
                    const newZipFolder = currentZipFolder.folder(child.name);
                    await this._construirZipFolder(child.id, newZipFolder);
                } else if (child.type === 'file') {
                    currentZipFolder.file(child.name, child.content);
                }
            }
        },
        /*Metodo que permite exportar el area de trabajo como un zip */
        async exportarWorkspaceZip(projectName) {
            try {
                this.systemLog(`> Comprimiendo archivos del proyecto ${projectName}.zip...`);

                //Objeto zip
                const zip = new JSZip();

                await this._construirZipFolder(null, zip);

                //Generacion de formato zip como blob
                const zipContent = await zip.generateAsync({ type: 'blob' });

                const downloadUrl = window.URL.createObjectURL(zipContent);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${projectName}.zip`;

                document.body.appendChild(a);
                a.click();

                //Flush de la memoria
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                this.notifyMessages('EXPORTACION EXITOSA', `Tu proyecto ha sido exportado correctamente como: ${projectName}.zip`, 'exito');

                this.systemLog(`> Proyecto ${projectName}.zip exportado correctamente`);

            } catch (error) {
                this.notifyMessages('ERROR AL COMPRIMIR', 'Ocurrio un error al intentar generar el archivo .zip', 'error');
            }
        },
        /*METODO ENCARGADO DE INICIALIZAR LA BASE DE DATOS DEL PROYECTO*/
        async iniciarBaseDeDatos() {
            try {
                const dbFile = _files.find(f => f.parentId === null && f.name.endsWith('.sqlite'));

                if (!dbFile) {
                    this.notifyMessages('BASE DE DATOS NO ENCONTRADA', 'El proyecto no contiene una base de datos .sqlite en la raiz.', 'error');
                    return;
                }

                await dbManejador.init(dbFile.content);

                if (!dbFile.content || dbFile.content.length === 0) {
                    await this.guardarBaseDeDatos();
                }
            } catch (error) {
                this.notifyMessages('ERROR EN BASE DE DATOS', `Ha ocurrido un error. ${error.message}`, 'error');
            }
        },
        /*Metodo que permite guardar la base de datos cargada */
        async guardarBaseDeDatos() {
            const binario = dbManejador.exportData();
            if (!binario) return;

            const dbFile = _files.find(f => f.parentId === null && f.name.endsWith('.sqlite'));
            if (dbFile) {
                dbFile.content = binario;
                await db.files.update(dbFile.id, { content: binario });
            }
        }

    };
}

export const frameworkState = createFrameworkState();