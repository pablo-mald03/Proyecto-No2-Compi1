<script>
    import { slide } from 'svelte/transition';
    import { tick } from 'svelte'; // <--- Importamos tick

    // Atributos del el estado global (fs) y la función de resize del padre
    let { fs, startResizing } = $props();

    // Referencia al contenedor de los mensajes para el auto-scroll
    let consoleBodyRef = $state();

    /*Efecto que permite generar el scroll*/
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
    style="height: {fs.consoleHeight}px;"
    transition:slide={{ axis: 'y' }}
>
    <div class="console-header px-3 py-1 d-flex justify-content-between align-items-center fw-bold">
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

    <div class="console-body p-3" bind:this={consoleBodyRef}>
        {#each fs.commandHistory as line}
            <div class="terminal-line">
                {#if line.type === 'input'}
                    <span class="prompt">yfera@workspace:~$</span>
                    <span class="text-white">{line.text}</span>
                {:else if line.type === 'system'}
                    <span class="text-cyan">{line.text}</span>
                {:else if line.type === 'error'}
                    <span class="text-danger">{line.text}</span>
                {:else}
                    <span class="text-slate-300">{line.text}</span>
                {/if}
            </div>
        {/each}

        <div class="terminal-line active-input">
            <span class="prompt">yfera@workspace:~$</span>
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                class="terminal-input"
                bind:value={fs.currentCommand}
                onkeydown={(e) => fs.handleCommand(e)}
                autocomplete="off"
                autofocus
            />
        </div>
    </div>
</section>

