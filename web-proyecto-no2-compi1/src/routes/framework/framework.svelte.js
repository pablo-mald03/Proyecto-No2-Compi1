//Clase delegada para trabajar con esa interaccion por detras para poder dar las funcionalidades a la UI
export function createFrameworkState() {

    let _files = $state([
        { id: 1, name: 'gramatica.jison', type: 'file', icon: 'bi-file-earmark-code', content: '// Gramática Jison' },
        { id: 2, name: 'index.html', type: 'file', icon: 'bi-filetype-html', content: '' },
        { id: 3, name: 'script.js', type: 'file', icon: 'bi-filetype-js', content: '// JS Logic' }
    ]);

    let _activeFileId = $state(1);
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

        /*Getters de la terminal de comandos*/
        get commandHistory() { return _commandHistory; },
        set commandHistory(val) { _commandHistory = val; },

        get currentCommand() { return _currentCommand; },
        set currentCommand(val) { _currentCommand = val; },

        //Marca el archivo activo
        get activeFile() {
            return _files.find(f => f.id === _activeFileId);
        },

        //Metodo de accion para poder agregar mas archivos
        addFile(name, icon) {
            const id = Math.max(..._files.map(f => f.id)) + 1;
            _files.push({ id, name, icon, content: '' });
        },

        selectFile(id) {
            _activeFileId = id;
        },
        //----METODOS DE LA TERMINAL DE COMANDOS----
        handleCommand(event) {
            if (event.key === 'Enter') {
                const cmd = _currentCommand.trim();
                
                if (cmd) {
                    _commandHistory.push({ type: 'input', text: cmd });
                    
                    let response = `Comando no reconocido: ${cmd}`;
                    if (cmd === 'help') response = 'Comandos disponibles: help, clear, compile';
                    
                    if (cmd === 'clear') {
                        _commandHistory = []; 
                        _currentCommand = ''; 
                        return;
                    }
                    
                    _commandHistory.push({ type: 'output', text: response });
                }
                
                _currentCommand = '';
            }
        }
    };
}

export const frameworkState = createFrameworkState();