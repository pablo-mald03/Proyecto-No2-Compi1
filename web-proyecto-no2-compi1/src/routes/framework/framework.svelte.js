import Dexie from "dexie";

/*Inicializar instancia de dixie (Se comunica con la base de datos) */
export const db = new Dexie('YferaWorkspace');

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
        { type: 'system', text: 'Escribe "help" para ver los comandos.' }
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

        /*Getters y Stters de los estados reactivos de expansion del arbol de trabajo */
        get expandedFolders() { return _expandedFolders; },
        get selectedFolderId() { return _selectedFolderId; },
        set selectedFolderId(val) { _selectedFolderId = val; },

        /*Metodo que devuelve los objetos completos de los archivos abiertos */
        get openFiles() {
            return _openFileIds.map(id => _files.find(f => f.id === id)).filter(Boolean);
        },
        //Marca el archivo activo
        get activeFile() {
            return _files.find(f => f.id === _activeFileId);
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

                this.systemLog(`> Elemento movido con éxito.`);
            } catch (error) {
                this.systemLog(`> Error al mover elemento: ${error.message}`);
            }
        },

        /*Metodo integrado para poder crear un archivo o folder*/
        async createFile(rawName, extension, icon, type = 'file', content = '') {
            let safeName = rawName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const finalName = type === 'folder' ? safeName : `${safeName}${extension}`;

            /*LOGICA DE DIRECTORIO DEFAULT*/
            let targetParentId = _selectedFolderId;
            if (targetParentId === null) {
                const srcFolder = _files.find(f => f.name === 'src' && f.type === 'folder');
                targetParentId = srcFolder ? srcFolder.id : null;
            }

            const parentId = targetParentId;

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

                this.systemLog(`> Creado exitosamente: ${finalName}`);
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
                this.systemLog(`> Error cargando workspace: ${error.message}`);
            }
        },
        //Metodo que crea la estructura inicial de un Nuevo Proyecto
        async createNewProject() {
            this.systemLog('> Creando nuevo proyecto...');

            try {
                await db.files.clear();
                _files = [];
                _activeFileId = null;

                //Archivo raiz sql
                await db.files.add({ parentId: null, name: 'database.sqlite', type: 'file', icon: 'bi-database', content: '' });

                //Carpeta src
                const srcId = await db.files.add({ parentId: null, name: 'src', type: 'folder', icon: 'bi-folder-fill' });

                //Archivos iniciales en src
                await db.files.add({ parentId: srcId, name: 'main.y', type: 'file', icon: 'bi-braces', content: '// Lógica YFERA' });
                await db.files.add({ parentId: srcId, name: 'main.comp', type: 'file', icon: 'bi-box', content: '' });
                await db.files.add({ parentId: srcId, name: 'main.styles', type: 'file', icon: 'bi-palette', content: '/* Estilos CSS */' });
                //Se recarga la ui
                await this.loadWorkspace();

                _expandedFolders = [srcId];
                _selectedFolderId = srcId;
                this.systemLog('> Estructura creada con exito.');

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
            else if (action === 'Cerrar_Proyecto') {
                _confirmModalConfig = {
                    show: true,
                    titulo: 'Cerrar Proyecto',
                    mensaje: '¿Estas seguro de que deseas cerrar el proyecto?',
                    tipo: 'danger',
                    textoConfirmar: 'Si, Cerrar',
                    onConfirmar: async () => {
                        await this.resetDatabase();
                        _confirmModalConfig.show = false;
                    }
                };
            }
            else {
                this.systemLog(`> Acción "${action}" no implementada aún.`);
            }
        },
        /*Metodo que permite ejecutar un comando en la consola*/
        handleCommand(event) {
            if (event.key === 'Enter') {
                const cmd = _currentCommand.trim();
                if (cmd) {
                    _commandHistory.push({ type: 'input', text: cmd });

                    if (cmd === 'clear') {
                        this.clearConsole();
                        _currentCommand = '';
                        return;
                    }

                    _commandHistory.push({ type: 'output', text: `Comando ejecutado: ${cmd}` });
                }
                _currentCommand = '';
            }
        }
    };
}

export const frameworkState = createFrameworkState();