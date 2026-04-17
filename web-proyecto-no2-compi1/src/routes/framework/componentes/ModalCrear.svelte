<script>
	/* Comunicación con el modal para integrar la funcionalidad de crear archivos con nombres */
	let { show, titulo, mensaje, onCancelar, onGuardar } = $props();
	// Estado interno del modal para el input
	let nombreInput = $state('');

	$effect(() => {
		if (show) nombreInput = '';
	});

	//Funcion que permite manejar el cierre con la tecla Escape
	function handleKeyDown(e) {
		if (e.key === 'Escape') onCancelar();
		if (e.key === 'Enter' && nombreInput.trim() !== '') onGuardar(nombreInput);
	}
</script>

<svelte:window onkeydown={handleKeyDown} />
{#if show}
	<div
		class="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
	>
		<div class="custom-modal-card shadow-lg" style="width: 420px;">
			<div class="modal-header-custom p-3 d-flex align-items-center justify-content-between">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-file-earmark-plus-fill text-cyan"></i>
					<h6 class="mb-0 fw-bold text-uppercase letter-spacing-1">{titulo}</h6>
				</div>
				<button class="btn-close-modal" onclick={onCancelar} aria-label="Boton cancelar"
					><i class="bi bi-x-lg"></i></button
				>
			</div>

			<div class="modal-body-custom p-4">
				<p class="small text-slate-400 mb-4">{mensaje}</p>

				<div class="input-wrapper">
					<label for="nombreArchivo" class="input-label">NOMBRE DEL ELEMENTO</label>
					<div class="input-group-custom">
						<input
							type="text"
							id="nombreArchivo"
							class="custom-input"
							placeholder="ej. mi_logica"
							bind:value={nombreInput}
							autocomplete="off"
						/>
						<div class="input-focus-border"></div>
					</div>
				</div>
			</div>

			<div class="modal-footer-custom p-3 d-flex justify-content-end gap-2">
				<button class="btn-modal-secondary" onclick={onCancelar}> CANCELAR </button>
				<button
					class="btn-modal-primary"
					onclick={() => onGuardar(nombreInput)}
					disabled={nombreInput.trim() === ''}
				>
					<i class="bi bi-plus-lg me-1"></i> CREAR ARCHIVO
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		background-color: rgba(3, 7, 18, 0.85);
		backdrop-filter: blur(8px);
		z-index: 2000;
	}

	.custom-modal-card {
		background-color: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
		animation: modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.modal-header-custom {
		background-color: var(--sidebar-bg);
		border-bottom: 1px solid var(--border-color);
	}

	.letter-spacing-1 {
		letter-spacing: 1px;
		font-size: 0.85rem;
	}

	.modal-body-custom {
		background-color: var(--dark-bg);
	}

	.input-label {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--cyan-neon);
		margin-bottom: 8px;
		display: block;
		font-family: 'Inter', sans-serif;
	}

	.input-group-custom {
		position: relative;
	}

	.custom-input {
		width: 100%;
		background-color: #020617;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 10px 12px;
		color: white;
		font-family: 'Fira Code', monospace;
		font-size: 0.9rem;
		outline: none;
		transition: all 0.2s;
	}

	.input-focus-border {
		position: absolute;
		bottom: 0;
		left: 50%;
		width: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--cyan-neon), var(--purple-neon));
		transition: all 0.3s ease;
		transform: translateX(-50%);
	}

	.custom-input:focus + .input-focus-border {
		width: 100%;
	}

	.btn-modal-primary {
		background: linear-gradient(135deg, var(--cyan-neon), var(--purple-neon));
		color: #000;
		border: none;
		padding: 8px 20px;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.8rem;
		transition: 0.2s;
	}

	.btn-modal-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.btn-modal-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
	}

	.btn-modal-secondary {
		background: transparent;
		color: var(--slate-400);
		border: 1px solid var(--border-color);
		padding: 8px 20px;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.8rem;
		transition: 0.2s;
	}

	.btn-modal-secondary:hover {
		color: white;
		background: rgba(255, 255, 255, 0.05);
	}

	.btn-close-modal {
		background: transparent;
		border: none;
		color: var(--slate-500);
		transition: 0.2s;
	}

	.btn-close-modal:hover {
		color: var(--cyan-neon);
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.text-cyan {
		color: var(--cyan-neon);
	}
	.text-slate-400 {
		color: var(--slate-400);
	}
</style>
