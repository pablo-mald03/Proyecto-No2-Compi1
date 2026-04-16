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
        }
    };
}

export const frameworkState = createFrameworkState();