<script>
	import { SintaxisManager } from '$lib/modules/SintaxisManager';
	let { fs } = $props();

	/*Instancia activa del manejador de los lexers*/
	const manager = new SintaxisManager();

	/*Estados de referencia hacia el area de trabajo para detectar linea columna*/
	let textareaRef = $state(null);
	let highlightRef = $state(null);
	let lineNumbersRef = $state(null);
	let cursorRow = $state(1);
	let cursorCol = $state(1);

	/*Estado en el que se permite comparar si se esta en un archivo sqlite*/
	let isSqlite = $derived(fs.activeFile ? fs.activeFile.name.endsWith('.sqlite') : false);

	//Obtener extension del archivo
	let fileExtension = $derived(
		fs.activeFile ? fs.activeFile.name.split('.').pop().toLowerCase() : ''
	);

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

	let highlightedCode = $derived(manager.highlight(safeContent, fileExtension));

	/*Metodo que permite sincronizar el scroll de los colores lineas y textarea*/
	function handleScroll() {
		if (textareaRef) {
			if (lineNumbersRef) lineNumbersRef.scrollTop = textareaRef.scrollTop;
			if (highlightRef) {
				highlightRef.scrollTop = textareaRef.scrollTop;
				highlightRef.scrollLeft = textareaRef.scrollLeft;
			}
		}
	}

	/*Funcion que bloquea cualquier opcion para afectar el codigo de la bd*/
	function handleKeyDown(e) {
		if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
			e.preventDefault();
			fs.saveActiveFile();
			return;
		}

		if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
			e.preventDefault();
			fs.formatearArchivo();
			return;
		}

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

	/*Funcion que permite que el padre pueda modificar cosas dentro del texto actual*/
	export function insertarEnCaret(textoAInsertar) {
		if (!textareaRef || !fs.activeFile || isSqlite) {
			return;
		}

		const posCaret = textareaRef.selectionStart;
		const contenidoOriginal = String(fs.activeFile.content || '');

		const nuevoContenido =
			contenidoOriginal.substring(0, posCaret) +
			textoAInsertar +
			contenidoOriginal.substring(textareaRef.selectionEnd);

		fs.activeFile.content = nuevoContenido;

		setTimeout(() => {
			textareaRef.focus();
			const nuevaPos = posCaret + textoAInsertar.length;
			textareaRef.setSelectionRange(nuevaPos, nuevaPos);
			updateCursor();
		}, 0);
	}
</script>

<div class="editor-main-container">
	{#if fs.activeFile}
		{#key fs.activeFile.id}
			<div class="editor-viewport" style="position: relative;">
				<div bind:this={lineNumbersRef} class="line-numbers-column">
					{#each lines as _, i}
						<div class="line-num">{i + 1}</div>
					{/each}
				</div>

				<pre bind:this={highlightRef} class="editor-highlight" aria-hidden="true"><code
						class="language-{fileExtension}">{@html highlightedCode}</code
					></pre>

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
	{/if}
</div>

<style>
	:root {
		--line-height: 22px;
		--font-size: 14px;
		--editor-font: 'Fira Code', 'Cascadia Code', monospace;
		--padding-top: 1rem;
		--left-gutter: 55px;
	}

	.editor-main-container {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-height: 0;
		background-color: #030712;
		height: 100%;
	}

	.editor-viewport {
		display: flex;
		flex-grow: 1;
		position: relative;
		overflow: hidden;
	}

	.line-numbers-column {
		width: var(--left-gutter);
		min-width: var(--left-gutter);
		background-color: #0b1120;
		border-right: 1px solid #1e293b;
		color: #64748b;
		font-family: var(--editor-font);
		font-size: var(--font-size);
		text-align: right;
		padding-top: var(--padding-top);
		padding-bottom: var(--padding-top);
		user-select: none;
		z-index: 10;
		overflow: hidden;
	}

	.line-num {
		height: var(--line-height);
		line-height: var(--line-height);
		padding-right: 12px;
	}

	.editor-highlight,
	.editor-textarea {
		position: absolute;
		top: 0;
		left: var(--left-gutter);
		right: 0;
		bottom: 0;
		margin: 0;
		padding: var(--padding-top) 1rem;
		border: none;

		font-family: var(--editor-font);
		font-size: var(--font-size);
		line-height: var(--line-height);
		white-space: pre;
		tab-size: 4;
		-moz-tab-size: 4;
		overflow: auto;
	}
	.editor-highlight {
		z-index: 1;
		pointer-events: none;
		color: #abb2bf;
		background: transparent;
	}

	.editor-highlight code {
		font-family: inherit;
	}
	.editor-textarea {
		z-index: 2;
		background: transparent;
		color: transparent;
		caret-color: #22d3ee;
		outline: none;
		resize: none;
		width: calc(100% - var(--left-gutter));
	}

	.editor-textarea.is-readonly {
		cursor: not-allowed;
	}

	.editor-footer {
		background-color: #0b1120;
		border-top: 1px solid #1e293b;
		padding: 4px 16px;
		color: #94a3b8;
		font-size: 0.75rem;
		z-index: 20;
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
	}

	.file-type {
		background: #1e293b;
		padding: 2px 8px;
		border-radius: 4px;
		color: #22d3ee;
		font-weight: bold;
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

	:global(.token-literal) {
		color: #74e1f0;
	}

	:global(.token-cadena) {
		color: #f3a704;
	}
	:global(.token-cadena_interpolacion) {
		color: #fae206;
	}

	:global(.token-numero) {
		color: #74e1f0;
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
	.editor-textarea::-webkit-scrollbar {
		width: 10px;
		height: 10px;
	}
	.editor-textarea::-webkit-scrollbar-thumb {
		background: #1e293b;
		border-radius: 5px;
	}
</style>
