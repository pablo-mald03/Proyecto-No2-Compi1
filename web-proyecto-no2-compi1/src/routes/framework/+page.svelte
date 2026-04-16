<script>
	import './framework.css';
	import { frameworkState as fs } from './framework.svelte.js';
	import { slide } from 'svelte/transition';

	let isResizing = false;

	function startResizing(e) {
		isResizing = true;
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', stopResizing);
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
	<header class="ide-header d-flex align-items-center px-4 py-2 justify-content-between">
		<div class="d-flex align-items-center gap-3">
			<button
				class="btn-icon"
				onclick={() => (fs.showSidebar = !fs.showSidebar)}
				aria-label="Ocultar Barra lateral"
			>
				<i class="bi bi-list"></i>
			</button>
			<span class="badge-new">YFERA Workspace</span>
		</div>
		<div class="d-flex gap-3">
			<button class="btn-compile fw-bold px-4">COMPILAR</button>
			<button
				class="btn-icon"
				onclick={() => (fs.showConsole = !fs.showConsole)}
				aria-label="compilar archivos"
			>
				<i class="bi bi-terminal"></i>
			</button>
		</div>
	</header>

	<div class="d-flex flex-grow-1 overflow-hidden">
		{#if fs.showSidebar}
			<aside class="ide-sidebar" transition:slide={{ axis: 'x' }}>
				<div class="sidebar-header p-3 d-flex justify-content-between">
					<small>EXPLORADOR</small>
					<button
						onclick={() => fs.addFile('nuevo.js', 'bi-filetype-js')}
						class="btn-mini-ui"
						aria-label="Nuevo Archivo"
					>
						<i class="bi bi-file-earmark-plus"></i>
					</button>
				</div>
				<div class="file-tree p-2">
					{#each fs.files as file}
						<button
							class="file-item {fs.activeFileId === file.id ? 'active' : ''}"
							onclick={() => fs.selectFile(file.id)}
						>
							<i class="bi {file.icon}"></i> <span>{file.name}</span>
						</button>
					{/each}
				</div>
			</aside>
		{/if}

		<main class="editor-area d-flex flex-column flex-grow-1">
			<div class="tabs-container d-flex">
				{#each fs.files as file}
					<button
						type="button"
						class="tab {fs.activeFileId === file.id ? 'active' : ''}"
						onclick={() => fs.selectFile(file.id)}
					>
						<i class="bi {file.icon} me-2"></i>
						{file.name}
						<i class="bi bi-x ms-2 close-tab"></i>
					</button>
				{/each}
			</div>

			<div class="editor-wrapper flex-grow-1 p-3">
				<textarea class="code-input" bind:value={fs.activeFile.content}></textarea>
			</div>

			{#if fs.showConsole}
				<button class="resizer-y" onmousedown={startResizing} aria-label="Redimensionar terminal"
				></button>

				<section
					class="console-panel"
					style="height: {fs.consoleHeight}px;"
					transition:slide={{ axis: 'y' }}
				>
					<div class="console-header px-3 py-1 d-flex justify-content-between">
						<small>TERMINAL</small>
						<button
							class="btn-icon"
							onclick={() => (fs.showConsole = false)}
							aria-label="Ocultar consola"
						>
							<i class="bi bi-chevron-down"></i>
						</button>
					</div>
					<div class="console-body p-3">
						<div class="text-cyan">YFERA Core v1.0 initialized...</div>
					</div>
				</section>
			{/if}
		</main>
	</div>
</div>
