<script>
	import './framework.css';
	import { frameworkState as fs } from './framework.svelte.js';
	import { slide } from 'svelte/transition';

    /*Metodo para hacer el onLoad*/
    import { onMount } from 'svelte';

	let isResizing = false;
	let consoleBodyRef = $state(null);

    /*Estado reactivo del menu de archivo*/
    let fileMenuOpen = $state(false);

    /*Carga la base de datos*/
    onMount(() => {
        fs.loadWorkspace();
    });

	$effect(() => {
		if (fs.commandHistory && consoleBodyRef) {
			consoleBodyRef.scrollTop = consoleBodyRef.scrollHeight;
		}
	});

	// --- Logica del Resizer ---
	function startResizing(e) {
		isResizing = true;
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', stopResizing);
	}
    //Funcion par ejecutar la accion del menu
    function handleMenuAction(action) {
        fs.triggerMenuAction(action);
        fileMenuOpen = false;
    }

	function handleMouseMove(e) {
		if (!isResizing) return;
		const newHeight = window.innerHeight - e.clientY;
		if (newHeight > 100 && newHeight < window.innerHeight * 0.7) {
			fs.consoleHeight = newHeight;
		}
	}

	function stopResizing() {
		isResizing = false;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', stopResizing);
	}
</script>

<div class="ide-container d-flex flex-column">
    
    <nav class="ide-menu-bar px-3 py-1 d-flex gap-3 fs-7 align-items-center">
        <div class="dropdown" style="position: relative;">
            <button class="menu-item cursor-pointer" onclick={() => fileMenuOpen = !fileMenuOpen} aria-label = "Menu archivo">
                Archivo
            </button>
            
            {#if fileMenuOpen}
                <ul class="dropdown-menu dropdown-menu-dark custom-dropdown show" 
                    style="display: block; position: absolute; top: 100%; left: 0; margin-top: 4px;">
                    <li><button class="dropdown-item" onclick={() => handleMenuAction('Nuevo Proyecto')}>Nuevo Proyecto</button></li>
                    <li><button class="dropdown-item" onclick={() => handleMenuAction('Abrir Proyecto')}>Abrir Proyecto...</button></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" onclick={() => handleMenuAction('Exportar Workspace')}>Exportar Workspace</button></li>
                </ul>
            {/if}
        </div>
        <button class="menu-item cursor-pointer">Vista</button>
        <button class="menu-item cursor-pointer">Ayuda</button>
    </nav>

    <header class="ide-header d-flex align-items-center px-4 py-2 justify-content-between">
        <div class="d-flex align-items-center gap-3">
            <button class="btn-icon" onclick={() => (fs.showSidebar = !fs.showSidebar)} aria-label="Ocultar Barra">
                <i class="bi bi-list"></i>
            </button>
            <span class="badge-new text-info">YFERA Workspace</span>
        </div>
        <div class="d-flex gap-2 align-items-center">
            <button class="btn-preview fw-bold px-3" onclick={() => fs.triggerMenuAction('Iniciando Preview')}>
                <i class="bi bi-play-fill"></i> PREVIEW
            </button>
            <button class="btn-compile fw-bold px-4" onclick={() => fs.triggerMenuAction('Compilando')}>COMPILAR</button>
            <button class="btn-icon ms-2" onclick={() => (fs.showConsole = !fs.showConsole)} aria-label = "Abrir terminal">
                <i class="bi bi-terminal"></i>
            </button>
        </div>
    </header>

    <div class="d-flex flex-grow-1 overflow-hidden">
        {#if fs.showSidebar}
            <aside class="ide-sidebar" transition:slide={{ axis: 'x' }}>
                <div class="sidebar-header p-2 d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-center px-1">
                        <small class="fw-bold">EXPLORADOR</small>
                        <button class="btn-mini-ui" aria-label="Nueva Carpeta"><i class="bi bi-folder-plus"></i></button>
                    </div>
                    
                    <div class="d-flex gap-1 justify-content-around action-bar-files p-1 rounded">
                        <button class="btn-action-file" title="Nueva Lógica (.y)" onclick={() => fs.addFile('nuevo.y', 'bi-braces', '// Lógica YFERA')}>
                            <i class="bi bi-braces text-warning"></i> .y
                        </button>
                        <button class="btn-action-file" title="Nuevo Componente (.comp)" onclick={() => fs.addFile('nuevo.comp', 'bi-box', '')}>
                            <i class="bi bi-box text-info"></i> .comp
                        </button>
                        <button class="btn-action-file" title="Nuevos Estilos (.styles)" onclick={() => fs.addFile('nuevo.styles', 'bi-palette', '/* Estilos */')}>
                            <i class="bi bi-palette text-danger"></i> .styles
                        </button>
                    </div>
                </div>
                
                <div class="file-tree p-2">
                    {#each fs.files as file}
                        <button class="file-item {fs.activeFileId === file.id ? 'active' : ''}" onclick={() => fs.selectFile(file.id)}>
                            <i class="bi {file.icon}"></i> <span>{file.name}</span>
                        </button>
                    {/each}
                </div>
            </aside>
        {/if}

        <main class="editor-area d-flex flex-column flex-grow-1">
            <div class="tabs-container d-flex">
                {#each fs.files.filter(f => f.type === 'file') as file}
                    <button type="button" class="tab {fs.activeFileId === file.id ? 'active' : ''}" onclick={() => fs.selectFile(file.id)}>
                        <i class="bi {file.icon} me-2"></i>{file.name}<i class="bi bi-x ms-2 close-tab"></i>
                    </button>
                {/each}
            </div>

            <div class="editor-wrapper flex-grow-1 p-3">
                {#if fs.activeFile}
                    <textarea class="code-input" bind:value={fs.activeFile.content}></textarea>
                {/if}
            </div>

            {#if fs.showConsole}
                <button class="resizer-y" onmousedown={startResizing} aria-label = "Ajustar consola"></button>
                <section class="console-panel" style="height: {fs.consoleHeight}px;" transition:slide={{ axis: 'y' }}>
                    <div class="console-header px-3 py-1 d-flex justify-content-between align-items-center fw-bold">
                        <small>TERMINAL</small>
                        <div class="d-flex gap-2">
                            <button class="btn-icon" onclick={() => fs.clearConsole()} title="Limpiar Consola">
                                <i class="bi bi-trash"></i>
                            </button>
                            <button class="btn-icon" onclick={() => (fs.showConsole = false)} aria-label = "Ocultar consola">
                                <i class="bi bi-chevron-down"></i>
                            </button>
                        </div>
                    </div>

                    <div class="console-body p-3" bind:this={consoleBodyRef}>
                        {#each fs.commandHistory as line}
                            <div class="terminal-line">
                                {#if line.type === 'input'}
                                    <span class="prompt">yfera@workspace:~$</span>
                                    <span class="text-white">{line.text}</span>
                                {:else if line.type === 'system'}
                                    <span class="text-cyan">{line.text}</span>
                                {:else}
                                    <span class="text-slate-300">{line.text}</span>
                                {/if}
                            </div>
                        {/each}

                        <div class="terminal-line active-input">
                            <span class="prompt">yfera@workspace:~$</span>
                            <input type="text" class="terminal-input" bind:value={fs.currentCommand} onkeydown={(e) => fs.handleCommand(e)} autocomplete="off" />
                        </div>
                    </div>
                </section>
            {/if}
        </main>
    </div>
</div>

{#if fileMenuOpen}
    <button 
        class="menu-backdrop" 
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1040; background: transparent; border: none; padding: 0; margin: 0; cursor: default;" 
        onclick={() => fileMenuOpen = false}
        aria-label="Cerrar menú">
    </button>
{/if}