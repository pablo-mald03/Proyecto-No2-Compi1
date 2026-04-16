<script>
    import "./framework.css";
   // import {frameworkState} from "./framework.svelte.js";
    import { slide } from 'svelte/transition';

    let showSidebar = $state(true);
    let showConsole = $state(true);

    let files = $state([
        { id: 1, name: 'gramatica.jison', type: 'file', icon: 'bi-file-earmark-code' },
        { id: 2, name: 'index.html', type: 'file', icon: 'bi-filetype-html' },
        { id: 3, name: 'script.js', type: 'file', icon: 'bi-filetype-js' }
    ]);
    let activeFileId = $state(1);
    let codeContent = $state('/* \n * Bienvenido a YFERA Framework \n * Escribe tu gramática aquí... \n */\n');

    function toggleSidebar() { showSidebar = !showSidebar; }
    function toggleConsole() { showConsole = !showConsole; }

</script>


<div class="ide-container d-flex flex-column text-white">
    
    <header class="ide-toolbar d-flex align-items-center px-3 py-2 border-bottom border-secondary shadow-sm">
        <button class="btn btn-sm btn-dark me-3" onclick={toggleSidebar} title="Alternar Explorador">
            <i class="bi bi-layout-sidebar"></i>
        </button>
        
        <div class="d-flex align-items-center gap-2 flex-grow-1">
            <span class="badge bg-primary text-uppercase px-2 py-1">YFERA Workspace</span>
        </div>

        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success fw-bold px-3">
                <i class="bi bi-play-fill me-1"></i> COMPILAR
            </button>
            <button class="btn btn-sm btn-dark" onclick={toggleConsole} title="Alternar Consola">
                <i class="bi bi-terminal"></i>
            </button>
        </div>
    </header>

    <div class="d-flex flex-grow-1 overflow-hidden">
        
        {#if showSidebar}
            <aside class="ide-sidebar border-end border-secondary d-flex flex-column" transition:slide={{ axis: 'x', duration: 300 }}>
                <div class="p-2 border-bottom border-secondary d-flex justify-content-between align-items-center bg-dark">
                    <small class="fw-bold text-secondary">EXPLORADOR</small>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-link text-white p-0"
                         aria-label="archivo"><i class="bi bi-file-earmark-plus"></i></button>
                        <button class="btn btn-sm btn-link text-white p-0" aria-label="folder"><i class="bi bi-folder-plus"></i></button>
                    </div>
                </div>
                
                <div class="file-tree flex-grow-1 overflow-auto p-2">
                    {#each files as file}
                        <div 
                            class="file-item px-2 py-1 rounded cursor-pointer {activeFileId === file.id ? 'active' : ''}"
                            onclick={() => activeFileId = file.id}
                        >
                            <i class="bi {file.icon} me-2 {activeFileId === file.id ? 'text-info' : 'text-secondary'}"></i>
                            <span style="font-size: 0.9rem;">{file.name}</span>
                        </div>
                    {/each}
                </div>
            </aside>
        {/if}

        <main class="d-flex flex-column flex-grow-1 bg-editor position-relative">
            
            <div class="ide-tabs border-bottom border-secondary d-flex bg-dark">
                {#each files as file}
                    {#if activeFileId === file.id}
                        <div class="tab-item active px-3 py-2 border-end border-secondary d-flex align-items-center gap-2">
                            <i class="bi {file.icon} text-info"></i>
                            <small>{file.name}</small>
                            <i class="bi bi-x cursor-pointer ms-2 text-secondary hover-text-white"></i>
                        </div>
                    {/if}
                {/each}
            </div>

            <div class="editor-container flex-grow-1 position-relative p-3">
                <textarea 
                    class="form-control w-100 h-100 bg-transparent text-white border-0 font-monospace shadow-none p-0" 
                    bind:value={codeContent}
                    style="resize: none; outline: none; font-size: 15px;"
                    spellcheck="false"
                ></textarea>
            </div>

            {#if showConsole}
                <section class="ide-console border-top border-secondary d-flex flex-column" transition:slide={{ axis: 'y', duration: 300 }}>
                    <div class="console-header bg-dark p-1 px-3 border-bottom border-secondary d-flex justify-content-between align-items-center">
                        <small class="fw-bold text-secondary">TERMINAL / REPORTES</small>
                        <button class="btn btn-sm btn-link text-secondary p-0" aria-label="reportes" onclick={toggleConsole}><i class="bi bi-x-lg"></i></button>
                    </div>
                    <div class="console-body p-3 overflow-auto font-monospace text-success" style="font-size: 0.85rem;">
                        <div> YFERA Core v1.0 initialized...</div>
                        <div> Ready to compile Jison grammars.</div>
                        <div class="text-secondary"> Esperando ejecución...</div>
                    </div>
                </section>
            {/if}
            
        </main>
    </div>
</div>