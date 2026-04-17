//Clase delegada para trabajar con esa interaccion por detras para poder dar las funcionalidades a la UI
export function createFrameworkState() {

    let _files = $state([
        { id: 1, parentId: null, name: 'src', type: 'folder', icon: 'bi-folder-fill' },
        { id: 2, parentId: 1, name: 'logica.y', type: 'file', icon: 'bi-braces', content: '// Lógica YFERA' },
        { id: 3, parentId: 1, name: 'boton.comp', type: 'file', icon: 'bi-box', content: '' },
        { id: 4, parentId: null, name: 'tema.styles', type: 'file', icon: 'bi-palette', content: '/* Estilos CSS */' },
        { id: 5, parentId: null, name: 'gramatica.jison', type: 'file', icon: 'bi-file-earmark-code', content: '// Gramática Jison' }
    ]);

    let _activeFileId = $state(5);
    let _showSidebar = $state(true);
    let _showConsole = $state(true);
    let _consoleHeight = $state(200);


    let _commandHistory = $state([
        { type: 'system', text: 'YFERA Core v1.0 initialized...' },
        { type: 'system', text: 'Escribe "help" para ver los comandos.' }
    ]);

    let _currentCommand = $state('');

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

        //Marca el archivo activo
        get activeFile() {
            return _files.find(f => f.id === _activeFileId);
        },

        selectFile(id) {
            _activeFileId = id;
        },


        // Método mejorado para recibir contenido inicial
        addFile(name, icon, content = '') {
            const id = Math.max(..._files.map(f => f.id), 0) + 1;
            _files.push({ id, parentId: null, name, type: 'file', icon, content });
        },

        clearConsole() {
            _commandHistory = [];
        },

        systemLog(message) {
            _commandHistory.push({ type: 'system', text: message });
        },

        // Simulación de acciones de Menú
        triggerMenuAction(action) {
            this.systemLog(`> Ejecutando acción: ${action}...`);
            this.showConsole = true;
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