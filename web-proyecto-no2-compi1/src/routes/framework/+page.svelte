<script>
	import './framework.css';
	import { frameworkState as fs } from './framework.svelte.js';
	import { slide } from 'svelte/transition';

	/*Modal de nombres*/
	import ModalCrear from './componentes/ModalCrear.svelte';

	/*Modal de confirmacion*/
	import ModalConfirmar from './componentes/ModalConfirmar.svelte';

	/*Modal de mensajes*/
	import ModalMensaje from './componentes/ModalMensaje.svelte';

	/*Metodo para hacer el onLoad*/
	import { onMount } from 'svelte';

	let isResizing = false;
	let consoleBodyRef = $state(null);

	/*Estado reactivo del menu de archivo*/
	let fileMenuOpen = $state(false);

	/*Estado del modal de confirmacion*/
	let modalConfig = $state({
		show: false,
		titulo: '',
		mensaje: '',
		ext: '',
		icon: '',
		type: 'file',
		content: ''
	});

	/*Atributos que permiten redimensionar el arbol de archivos del proyecto*/
	let isResizingX = false;
	let sidebarWidth = $state(250);

	// Atributo que mantiene el estado visual para el Drag and Drop
	let dragOverId = $state(null);

	/*Funcion de redimensionado del apartado del arbol de trabajo*/
	function startResizingSidebar(e) {
		isResizingX = true;
		window.addEventListener('mousemove', handleMouseMoveSidebar);
		window.addEventListener('mouseup', stopResizingSidebar);
		document.body.style.cursor = 'ew-resize';
	}

	//Funcion que permite manejar el estado de mantener estirando el arbol de trabajo
	function handleMouseMoveSidebar(e) {
		if (!isResizingX) return;
		if (e.clientX > 150 && e.clientX < window.innerWidth * 0.4) {
			sidebarWidth = e.clientX;
		}
	}

	/*Funcion que permite parar el estado reactivo de redimensionamiento del arbol*/
	function stopResizingSidebar() {
		isResizingX = false;
		window.removeEventListener('mousemove', handleMouseMoveSidebar);
		window.removeEventListener('mouseup', stopResizingSidebar);
		document.body.style.cursor = 'default';
	}

	// Funcion para invocar el modal con diferentes configuraciones
	function triggerCreateModal(typeInfo, ext, icon, defaultContent) {
		if (fs.files.length === 0) {
			fs.infoModalConfig.titulo = 'CREACION DENEGADA';
			fs.infoModalConfig.mensaje =
				'Debes crear o abrir un proyecto primero para poder crear archivos o carpetas.';
			fs.infoModalConfig.tipo = 'error';
			fs.infoModalConfig.show = true;
			return; 
		}

		modalConfig.titulo = `NUEVO ${typeInfo.toUpperCase()}`;
		modalConfig.mensaje =
			typeInfo === 'carpeta'
				? 'Ingresa el nombre del nuevo directorio.'
				: `Ingresa el nombre. La extensión ${ext} se agregara automaticamente. NO COLOCAR EXTENSION`;
		modalConfig.type = typeInfo === 'carpeta' ? 'folder' : 'file';
		modalConfig.ext = ext;
		modalConfig.icon = icon;
		modalConfig.content = defaultContent;
		modalConfig.show = true;
	}

	/*Funcion que permite mantener el modal abierto y enviar el nombre al backend*/
	function handleModalGuardar(nombre) {
		fs.createFile(nombre, modalConfig.ext, modalConfig.icon, modalConfig.type, modalConfig.content);
		modalConfig.show = false;
	}

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

	/*Funcion que permite dar la animacion de redimensionar a la consola*/
	function handleMouseMove(e) {
		if (!isResizing) return;
		const newHeight = window.innerHeight - e.clientY;
		if (newHeight > 100 && newHeight < window.innerHeight * 0.7) {
			fs.consoleHeight = newHeight;
		}
	}

	/*Funcion que permite parar el redimensionamiento de la consola*/
	function stopResizing() {
		isResizing = false;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', stopResizing);
	}
</script>

{#if fileMenuOpen}
	<button
		class="menu-backdrop"
		style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1040; background: transparent; border: none;"
		onclick={() => (fileMenuOpen = false)}
		tabindex="-1"
		aria-hidden="true"
	>
	</button>
{/if}

<ModalCrear
	show={modalConfig.show}
	titulo={modalConfig.titulo}
	mensaje={modalConfig.mensaje}
	onCancelar={() => (modalConfig.show = false)}
	onGuardar={handleModalGuardar}
/>

<ModalConfirmar
	show={fs.confirmModalConfig.show}
	titulo={fs.confirmModalConfig.titulo}
	mensaje={fs.confirmModalConfig.mensaje}
	tipo={fs.confirmModalConfig.tipo}
	textoConfirmar={fs.confirmModalConfig.textoConfirmar}
	onConfirmar={fs.confirmModalConfig.onConfirmar}
	onCancelar={() => fs.closeConfirmModal()}
/>

<ModalMensaje
	show={fs.infoModalConfig.show}
	tipo={fs.infoModalConfig.tipo}
	titulo={fs.infoModalConfig.titulo}
	mensaje={fs.infoModalConfig.mensaje}
	onAceptar={() => fs.closeInfoModal()}
/>

<div class="ide-container d-flex flex-column">
	<nav class="ide-menu-bar px-3 py-1 d-flex gap-3 fs-7 align-items-center">
		<div class="dropdown" style="position: relative;">
			<button
				class="menu-item cursor-pointer"
				onclick={() => (fileMenuOpen = !fileMenuOpen)}
				aria-label="Menu archivo"
			>
				Archivo
			</button>

			{#if fileMenuOpen}
				<ul
					class="dropdown-menu dropdown-menu-dark custom-dropdown show"
					style="display: block; position: absolute; top: 100%; left: 0; margin-top: 4px;"
				>
					<li>
						<button class="dropdown-item" onclick={() => handleMenuAction('Nuevo_Proyecto')}
							>Nuevo Proyecto</button
						>
					</li>
					<li>
						<button class="dropdown-item" onclick={() => handleMenuAction('Abrir_Proyecto')}
							>Abrir Proyecto...</button
						>
					</li>
					<li>
						<button class="dropdown-item" onclick={() => handleMenuAction('Cerrar_Proyecto')}
							>Cerrar Proyecto...</button
						>
					</li>
					<li><hr class="dropdown-divider" /></li>
					<li>
						<button class="dropdown-item" onclick={() => handleMenuAction('Exportar Workspace')}
							>Exportar Workspace</button
						>
					</li>
				</ul>
			{/if}
		</div>
		<button class="menu-item cursor-pointer">Vista</button>
		<button class="menu-item cursor-pointer">Ayuda</button>
	</nav>

	<header class="ide-header d-flex align-items-center px-4 py-2 justify-content-between">
		<div class="d-flex align-items-center gap-3">
			<button
				class="btn-icon"
				onclick={() => (fs.showSidebar = !fs.showSidebar)}
				aria-label="Ocultar Barra"
			>
				<i class="bi bi-list"></i>
			</button>
			<span class="badge-new text-info">YFERA Workspace</span>
		</div>
		<div class="d-flex gap-2 align-items-center">
			<button
				class="btn-preview fw-bold px-3"
				onclick={() => fs.triggerMenuAction('Iniciando Preview')}
			>
				<i class="bi bi-play-fill"></i> PREVIEW
			</button>
			<button class="btn-compile fw-bold px-4" onclick={() => fs.triggerMenuAction('Compilando')}
				>COMPILAR</button
			>
			<button
				class="btn-icon ms-2"
				onclick={() => (fs.showConsole = !fs.showConsole)}
				aria-label="Abrir terminal"
			>
				<i class="bi bi-terminal"></i>
			</button>
		</div>
	</header>

	<div class="d-flex flex-grow-1 overflow-hidden">
		{#if fs.showSidebar}
			<aside
				class="ide-sidebar d-flex flex-column"
				style="width: {sidebarWidth}px; flex-shrink: 0;"
				transition:slide={{ axis: 'x' }}
			>
				<div class="sidebar-header p-2 d-flex flex-column gap-2">
					<div class="d-flex justify-content-between align-items-center px-1">
						<small class="fw-bold">EXPLORADOR</small>
						<button
							class="btn-mini-ui"
							aria-label="Nueva Carpeta"
							onclick={() => triggerCreateModal('carpeta', '', 'bi-folder-fill', '')}
						>
							<i class="bi bi-folder-plus"></i>
						</button>
					</div>

					<div class="d-flex gap-1 justify-content-around action-bar-files p-1 rounded">
						<button
							class="btn-action-file"
							title="Nueva Lógica (.y)"
							onclick={() =>
								triggerCreateModal('archivo YFERA', '.y', 'bi-braces', '// Lógica YFERA')}
						>
							<i class="bi bi-braces text-warning"></i> .y
						</button>
						<button
							class="btn-action-file"
							title="Nuevo Componente (.comp)"
							onclick={() => triggerCreateModal('componente', '.comp', 'bi-box', '')}
						>
							<i class="bi bi-box text-info"></i> .comp
						</button>
						<button
							class="btn-action-file"
							title="Nuevos Estilos (.styles)"
							onclick={() => triggerCreateModal('estilo', '.styles', 'bi-palette', '/* Estilos */')}
						>
							<i class="bi bi-palette text-danger"></i> .styles
						</button>
					</div>
				</div>

				{#snippet renderTree(parentId, depth)}
					{#each fs.files.filter((f) => f.parentId === parentId) as file}
						{#if file.type === 'folder'}
							<button
								draggable="true"
								ondragstart={(e) => e.dataTransfer.setData('itemId', file.id.toString())}
								ondragover={(e) => e.preventDefault()}
								ondragenter={(e) => {
									e.preventDefault();
									dragOverId = file.id;
								}}
								ondragleave={() => {
									dragOverId = null;
								}}
								ondrop={(e) => {
									e.preventDefault();
									e.stopPropagation();
									dragOverId = null;
									const draggedId = parseInt(e.dataTransfer.getData('itemId'));
									if (!isNaN(draggedId)) fs.moveItem(draggedId, file.id);
								}}
								class="file-item w-100 text-start {fs.selectedFolderId === file.id
									? 'active-folder'
									: ''} {dragOverId === file.id ? 'drag-over-active' : ''}"
								style="padding-left: {0.5 + depth * 1}rem;"
								onclick={(e) => {
									e.stopPropagation();
									fs.toggleFolder(file.id);
								}}
							>
								<i
									class="bi {fs.expandedFolders.includes(file.id)
										? 'bi-chevron-down'
										: 'bi-chevron-right'} me-1"
									style="font-size: 0.7rem; color: var(--slate-400);"
								></i>
								<i class="bi {file.icon} text-info"></i> <span>{file.name}</span>
							</button>

							{#if fs.expandedFolders.includes(file.id)}
								{@render renderTree(file.id, depth + 1)}
							{/if}
						{:else}
							<button
								draggable="true"
								ondragstart={(e) => e.dataTransfer.setData('itemId', file.id.toString())}
								class="file-item w-100 text-start {fs.activeFileId === file.id ? 'active' : ''}"
								style="padding-left: {1.8 + depth * 1}rem;"
								onclick={(e) => {
									e.stopPropagation();
									fs.selectedFolderId = file.parentId;
									fs.selectFile(file.id);
								}}
							>
								<i class="bi {file.icon}"></i> <span>{file.name}</span>
							</button>
						{/if}
					{/each}
				{/snippet}

				<div
					class="file-tree flex-grow-1 overflow-auto p-2 {dragOverId === 'root'
						? 'root-drag-over'
						: ''}"
					onclick={() => (fs.selectedFolderId = null)}
					ondragover={(e) => e.preventDefault()}
					ondragenter={(e) => {
						e.preventDefault();
						dragOverId = 'root';
					}}
					ondragleave={() => {
						dragOverId = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						dragOverId = null;
						const draggedId = parseInt(e.dataTransfer.getData('itemId'));
						if (!isNaN(draggedId)) fs.moveItem(draggedId, null);
					}}
					aria-hidden="true"
				>
					{@render renderTree(null, 0)}
				</div>
			</aside>

			<div
				role="button"
				tabindex="-1"
				class="resizer-x"
				onmousedown={startResizingSidebar}
				aria-label="Ajustar ancho del explorador"
			></div>
		{/if}

		<main class="editor-area d-flex flex-column flex-grow-1" style="min-width: 0;">
			<div class="tabs-container d-flex">
				{#each fs.openFiles as file}
					<button
						type="button"
						class="tab {fs.activeFileId === file.id ? 'active' : ''}"
						onclick={() => fs.selectFile(file.id)}
						onauxclick={(e) => {
							if (e.button === 1) {
								e.preventDefault();
								fs.closeTab(file.id, e);
							}
						}}
					>
						<i class="bi {file.icon} me-2"></i>
						{file.name}

						<span
							role="button"
							tabindex="0"
							class="ms-2 close-tab-wrapper"
							onclick={(e) => {
								e.stopPropagation();
								fs.closeTab(file.id, e);
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.stopPropagation();
									fs.closeTab(file.id, e);
								}
							}}
							aria-label="Cerrar pestaña"
						>
							<i class="bi bi-x close-tab"></i>
						</span>
					</button>
				{/each}
			</div>

			<div class="editor-wrapper flex-grow-1 p-3">
				{#if fs.activeFile}
					<textarea class="code-input" bind:value={fs.activeFile.content}></textarea>
				{:else}
					<div class="d-flex h-100 justify-content-center align-items-center text-slate-500">
						<div class="text-center">
							<i class="bi bi-code-slash fs-1"></i>
							<h5 class="mt-2 text-uppercase letter-spacing-1">YFERA FRAMEWORK</h5>
						</div>
					</div>
				{/if}
			</div>

			{#if fs.showConsole}
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
					<div
						class="console-header px-3 py-1 d-flex justify-content-between align-items-center fw-bold"
					>
						<small>TERMINAL</small>
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
								{:else}
									<span class="text-slate-300">{line.text}</span>
								{/if}
							</div>
						{/each}

						<div class="terminal-line active-input">
							<span class="prompt">yfera@workspace:~$</span>
							<input
								type="text"
								class="terminal-input"
								bind:value={fs.currentCommand}
								onkeydown={(e) => fs.handleCommand(e)}
								autocomplete="off"
							/>
						</div>
					</div>
				</section>
			{/if}
		</main>
	</div>
</div>
