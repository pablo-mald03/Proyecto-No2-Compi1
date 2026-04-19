<script>
	let { fs } = $props();

	//Referencias para sincronizar el scroll
	let textareaRef = $state(null);
	let lineNumbersRef = $state(null);

	// Estados del cursor
	let cursorRow = $state(1);
	let cursorCol = $state(1);

	//Atributos reactivos para determinar si es sqlite par bloquear la edicion
	let lines = $derived(fs.activeFile ? fs.activeFile.content.split('\n') : []);
	let isSqlite = $derived(fs.activeFile ? fs.activeFile.name.endsWith('.sqlite') : false);

	// Funcion para calcular fila y columna exactas del cursor
	function updateCursor() {
		if (!textareaRef || !fs.activeFile) return;

		const pos = textareaRef.selectionStart;

		const textBeforeCursor = fs.activeFile.content.substring(0, pos);

		const linesBeforeCursor = textBeforeCursor.split('\n');

		cursorRow = linesBeforeCursor.length;

		cursorCol = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;
	}

	// Funcion que sincroniza el scroll vertical entre el textarea y los numeros
	function handleScroll() {
		if (lineNumbersRef && textareaRef) {
			lineNumbersRef.scrollTop = textareaRef.scrollTop;
		}
	}
</script>

<div
	class="editor-wrapper flex-grow-1 d-flex flex-column"
	style="min-height: 0; background: var(--dark-bg);"
>
	{#if fs.activeFile}
		<div class="code-area-container flex-grow-1 d-flex" style="overflow: hidden;">
			<div
				bind:this={lineNumbersRef}
				class="line-numbers text-slate-500 text-end pe-2 pt-3 pb-3"
				style="overflow-y: hidden; min-width: 45px; background: var(--sidebar-bg); border-right: 1px solid var(--border-color); font-family: monospace; font-size: 14px; user-select: none;"
			>
				{#each lines as _, i}
					<div class="line-number">{i + 1}</div>
				{/each}
			</div>

			<!-- svelte-ignore a11y_autofocus -->
			<textarea
				bind:this={textareaRef}
				bind:value={fs.activeFile.content}
				class="code-input flex-grow-1 p-3 m-0 border-0"
				style="resize: none; outline: none; background: transparent; color: var(--text-main); font-family: monospace; font-size: 14px; white-space: pre; overflow-wrap: normal; overflow-x: auto;"
				wrap="off"
				readonly={isSqlite}
				onclick={updateCursor}
				onkeyup={updateCursor}
				oninput={updateCursor}
				onscroll={handleScroll}
				spellcheck="false"
				autofocus
			></textarea>
		</div>

		<div
			class="editor-statusbar d-flex justify-content-end px-3 py-1"
			style="background: var(--sidebar-bg); border-top: 1px solid var(--border-color); font-size: 0.8rem; color: var(--slate-400);"
		>
			<div class="d-flex align-items-center gap-3">
				{#if isSqlite}
					<span class="text-danger fw-bold">
						<i class="bi bi-lock-fill me-1"></i> Solo Lectura
					</span>
				{/if}
				<span>Lin {cursorRow}, Col {cursorCol}</span>
				<span>{fs.activeFile.name.split('.').pop().toUpperCase()}</span>
			</div>
		</div>
	{:else}
		<div class="d-flex h-100 justify-content-center align-items-center text-slate-500">
			<div class="text-center">
				<i class="bi bi-code-slash fs-1"></i>
				<h5 class="mt-2 text-uppercase letter-spacing-1">YFERA FRAMEWORK</h5>
			</div>
		</div>
	{/if}
</div>

<style>
	.line-numbers::-webkit-scrollbar {
		display: none;
	}
	.line-numbers {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.line-number {
		line-height: normal;
	}
</style>
