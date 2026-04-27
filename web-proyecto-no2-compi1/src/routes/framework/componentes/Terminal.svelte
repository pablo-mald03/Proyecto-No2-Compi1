<script>
	import { slide } from 'svelte/transition';
	import { tick } from 'svelte';

	/*Comunicacion con el pintado dinamico de la consola*/
	import { SintaxisManager } from '$lib/modules/SintaxisManager';

	/*Atributos de interaccion con el JS del framework*/
	let { fs, startResizing } = $props();

	/*Atributos de interaccion con el JS del framework*/
	let consoleBodyRef = $state();

	/*conexion con el manejador del pintado dinamico*/
	const manager = new SintaxisManager();

	/*Pintado dinamico de la terminal*/
	let highlightedCommand = $derived(manager.highlight(fs.currentCommand || '', 'terminal'));

	/*Atributos de interaccion con el JS del framework*/
	$effect(() => {
		if (fs.commandHistory.length && consoleBodyRef) {
			tick().then(() => {
				consoleBodyRef.scrollTop = consoleBodyRef.scrollHeight;
			});
		}
	});
</script>

<div
	role="button"
	tabindex="-1"
	class="resizer-y"
	onmousedown={startResizing}
	aria-label="Ajustar consola"
></div>

<section
    class="console-panel"
    style="height: {fs.consoleHeight}px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden;"
    transition:slide={{ axis: 'y' }}
>
    <div
        class="console-header px-3 py-1 d-flex justify-content-between align-items-center fw-bold"
        style="flex-shrink: 0;"
    >
        <small>YFERA TERMINAL</small>
        <div class="d-flex gap-2">
            <button class="btn-icon" onclick={() => fs.clearConsole()} title="Limpiar Consola">
                <i class="bi bi-trash"></i>
            </button>
            <button
                class="btn-icon"
                onclick={() => (fs.showConsole = false)}
                aria-label="Ocultar consola"
            >
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
    </div>

    <div
        class="console-body p-3"
        bind:this={consoleBodyRef}
        style="flex-grow: 1; overflow-y: auto; min-height: 0;"
    >
        {#each fs.commandHistory as line}
            <div class="terminal-line d-flex">
                {#if line.type === 'input'}
                    <span class="prompt me-2">yfera@workspace:~$</span>
                    <span class="command-history-text">
                        {@html manager.highlight(line.text, 'terminal')}
                    </span>
                {:else if line.type === 'system'}
                    <span class="text-cyan">{line.text}</span>
                {:else if line.type === 'error'}
                    <span class="text-danger">{line.text}</span>
                {:else if line.type === 'advise'}
                    <span class="text-warning">{line.text}</span>
                {:else}
                    <span class="text-slate-300">{line.text}</span>
                {/if}
            </div>
        {/each}

        <div class="terminal-line active-input d-flex mt-1">
            <span class="prompt me-2">yfera@workspace:~$</span>
            
            <div class="input-overlay-container">
                <span class="ghost-highlight" aria-hidden="true">{@html highlightedCommand}</span>
                
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    type="text"
                    class="terminal-input invisible-input"
                    bind:value={fs.currentCommand}
                    onkeydown={(e) => fs.handleCommand(e)}
                    autocomplete="off"
                    spellcheck="false"
                    autofocus
                />
            </div>
        </div>
    </div>
</section>


<style>
    .terminal-line {
        font-family: 'Fira Code', 'Cascadia Code', monospace; 
        font-size: 14px;
        line-height: 20px;
    }
    .prompt {
        color: #30f10a; 
        white-space: nowrap;
    }

    .input-overlay-container {
        position: relative;
        flex-grow: 1;
        display: flex;
        align-items: center;
    }

    .ghost-highlight {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        white-space: pre; 
        color: #abb2bf;
        margin: 0;
        padding: 0;
    }
    .invisible-input {
        width: 100%;
        background: transparent;
        color: transparent; 
        caret-color: #22d3ee;
        border: none;
        outline: none;
        margin: 0;
        padding: 0;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
    }

		:global([class^='token-']) {
		color: #eee9a4;
	}
	:global(.token-espacio) {
		background: transparent;
	}
	:global(.token-reservada) {
		color: #c678dd;
		font-weight: bold;
	}
	:global(.token-literal),
	:global(.token-numero) {
		color: #74e1f0;
	}
	:global(.token-cadena) {
		color: #f3a704;
	}
	:global(.token-cadena_interpolacion) {
		color: #fae206;
	}
	:global(.token-variable),
	:global(.token-propiedad) {
		color: #a89556;
	}
	:global(.token-identificador) {
		color: #ffffff;
	}
	:global(.token-delimitador) {
		color: #3a7cf7;
	}
	:global(.token-puntuacion) {
		color: #eee9a4;
	}
	:global(.token-operador) {
		color: #30f10a;
	}
	:global(.token-comentario) {
		color: #898f9b;
		font-style: italic;
	}
	:global(.token-error) {
		color: #ef4444;
		border-bottom: 2px wavy #ef4444;
	}

</style>
