<script>
	let { fs } = $props();

	/*Estados de referencia hacia el area de trabajo para detectar linea columna*/
	let textareaRef = $state(null);
	let lineNumbersRef = $state(null);
	let cursorRow = $state(1);
	let cursorCol = $state(1);

	/*Estado en el que se permite comparar si se esta en un archivo sqlite*/
	let isSqlite = $derived(fs.activeFile ? fs.activeFile.name.endsWith('.sqlite') : false);

	//Proteccion en contra de edicion del archivo sqlite
	let safeContent = $derived.by(() => {
		if (!fs.activeFile) return '';

		if (isSqlite && fs.activeFile.content instanceof Uint8Array) {
			return `-- Base de Datos SQLite (Archivo Binario) --\n-- Tamaño del archivo: ${fs.activeFile.content.length} bytes --\n-- El framework YFERA administra este archivo --`;
		}

		return String(fs.activeFile.content || '');
	});

	let lines = $derived(safeContent.split('\n'));

	function updateCursor() {
		if (!textareaRef || !fs.activeFile) return;
		const pos = textareaRef.selectionStart;
		const textBeforeCursor = safeContent.substring(0, pos);
		const linesBeforeCursor = textBeforeCursor.split('\n');
		cursorRow = linesBeforeCursor.length;
		cursorCol = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;
	}

	function handleScroll() {
		if (lineNumbersRef && textareaRef) {
			lineNumbersRef.scrollTop = textareaRef.scrollTop;
		}
	}

	/*Funcion que bloquea cualquier opcion para afectar el codigo de la bd*/
	function handleKeyDown(e) {
		if (isSqlite) {
			const allowedKeys = [
				'ArrowUp',
				'ArrowDown',
				'ArrowLeft',
				'ArrowRight',
				'PageUp',
				'PageDown',
				'Home',
				'End',
				'Control',
				'c',
				'C'
			];
			if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				return;
			}
		}
		updateCursor();
	}

	/*Metodo que permite evitar que se pueda escribir dentro del .sqlite*/
	function handleInput(e) {
		if (!isSqlite && fs.activeFile) {
			fs.activeFile.content = e.target.value;
		}
		updateCursor();
	}
</script>

<div class="editor-main-container">
	{#if fs.activeFile}
		{#key fs.activeFile.id}
			<div class="editor-viewport">
				<div bind:this={lineNumbersRef} class="line-numbers-column">
					{#each lines as _, i}
						<div class="line-num">{i + 1}</div>
					{/each}
				</div>

				<!-- svelte-ignore a11y_autofocus -->
				<textarea
					bind:this={textareaRef}
					value={safeContent}
					class="editor-textarea {isSqlite ? 'is-readonly' : ''}"
					wrap="off"
					readonly={isSqlite}
					onclick={updateCursor}
					onkeydown={handleKeyDown}
					oninput={handleInput}
					onscroll={handleScroll}
					spellcheck="false"
					autofocus
				></textarea>
			</div>
		{/key}

		<div class="editor-footer">
			<div class="footer-info">
				{#if isSqlite}
					<span class="readonly-tag"><i class="bi bi-lock-fill"></i> MODO SOLO LECTURA</span
					>
				{/if}
				<span>Ln {cursorRow}, Col {cursorCol}</span>
				<span class="file-type">{fs.activeFile.name.split('.').pop().toUpperCase()}</span>
			</div>
		</div>
	{:else}
		<div class="empty-state">
			<div class="text-center">
				<i class="bi bi-code-slash display-4"></i>
				<h5 class="mt-3 text-uppercase letter-spacing-1">YFERA FRAMEWORK</h5>
			</div>
		</div>
	{/if}
</div>

<style>
	:root {
		--line-height: 22px;
		--font-size: 14px;
		--editor-font: 'Fira Code', 'Cascadia Code', 'Source Code Pro', monospace;
	}

	.editor-main-container {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-height: 0;
		background-color: #030712;
	}

	.editor-viewport {
		display: flex;
		flex-grow: 1;
		overflow: hidden;
		position: relative;
	}

	.line-numbers-column {
		min-width: 50px;
		background-color: #0b1120;
		border-right: 1px solid #1e293b;
		color: #64748b;
		font-family: var(--editor-font);
		font-size: var(--font-size);
		text-align: right;
		padding-top: 1rem;
		padding-bottom: 1rem;
		user-select: none;
		overflow-y: hidden;
	}

	.line-num {
		height: var(--line-height);
		line-height: var(--line-height);
		padding-right: 12px;
	}

	.editor-textarea {
		flex-grow: 1;
		background: transparent;
		color: #f8fafc;
		font-family: var(--editor-font);
		font-size: var(--font-size);
		line-height: var(--line-height);
		padding: 1rem;
		border: none;
		outline: none;
		resize: none;
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}

	.editor-textarea.is-readonly {
		cursor: not-allowed;
		color: #94a3b8;
	}

	.editor-footer {
		background-color: #0b1120;
		border-top: 1px solid #1e293b;
		padding: 4px 16px;
		color: #94a3b8;
		font-size: 0.75rem;
	}

	.footer-info {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 20px;
	}

	.readonly-tag {
		color: #ef4444;
		font-weight: bold;
		letter-spacing: 0.5px;
	}

	.file-type {
		background: #1e293b;
		padding: 2px 8px;
		border-radius: 4px;
		color: #22d3ee;
		font-weight: bold;
	}

	.empty-state {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #64748b;
	}

	.line-numbers-column::-webkit-scrollbar {
		display: none;
	}
</style>
