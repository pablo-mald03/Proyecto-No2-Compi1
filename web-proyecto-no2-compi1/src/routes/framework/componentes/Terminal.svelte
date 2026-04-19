<script>
	import { slide } from 'svelte/transition';
	import { tick } from 'svelte';

	/*Atributos de interaccion con el JS del framework*/
	let { fs, startResizing } = $props();

	/*Atributos de interaccion con el JS del framework*/
	let consoleBodyRef = $state();

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
			<div class="terminal-line">
				{#if line.type === 'input'}
					<span class="prompt">yfera@workspace:~$</span>
					<span class="text-white">{line.text}</span>
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
