<script>
	/*Modal que permite preguntarle al usuario si desea ejecutar una accion*/
	import { fade, scale } from 'svelte/transition';

	let {
		show = false,
		titulo = 'Confirmar Acción',
		mensaje = '¿Estas seguro?',
		textoConfirmar = 'Si, continuar',
		textoCancelar = 'Cancelar',
		tipo = 'danger',
		onConfirmar,
		onCancelar
	} = $props();

	//Iconos programados segun el tipo
	const iconos = {
		danger: 'bi-exclamation-triangle text-danger',
		warning: 'bi-exclamation-circle text-warning',
		info: 'bi-info-circle text-info'
	};
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-overlay d-flex align-items-center justify-content-center"
		transition:fade={{ duration: 150 }}
		onclick={onCancelar}
	>
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="custom-modal-card shadow-lg"
			style="width: 400px;"
			transition:scale={{ duration: 200, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			aria-describedby="modal-description"
		>
			<div class="modal-header-custom p-3 d-flex align-items-center justify-content-between">
				<div class="d-flex align-items-center gap-2">
					<i class={iconos[tipo]}></i>
					<span id="modal-title" class="fw-bold text-white letter-spacing-1 text-uppercase">
						{titulo}
					</span>
				</div>
				<button
					type="button"
					class="btn-close-modal"
					onclick={onCancelar}
					aria-label="Cerrar modal"
				>
					<i class="bi bi-x-lg"></i>
				</button>
			</div>

			<div class="modal-body-custom p-4">
				<p id="modal-description" class="m-0 text-slate-300 fs-7 lh-base">
					{mensaje}
				</p>
			</div>

			<div
				class="modal-footer-custom p-3 d-flex justify-content-end gap-2 border-top border-secondary border-opacity-10"
			>
				<button type="button" class="btn-modal-secondary" onclick={onCancelar}>
					{textoCancelar}
				</button>

				<button
					type="button"
					class="btn-modal-primary {tipo === 'danger' ? 'btn-danger-gradient' : ''}"
					onclick={onConfirmar}
				>
					{textoConfirmar}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(3, 7, 18, 0.85);
		backdrop-filter: blur(8px);
		z-index: 3000;
	}

	.custom-modal-card {
		background-color: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
	}

	.modal-header-custom {
		background-color: var(--sidebar-bg);
		border-bottom: 1px solid var(--border-color);
	}

	.modal-body-custom {
		background-color: #020617;
	}

	.letter-spacing-1 {
		letter-spacing: 1px;
		font-size: 0.75rem;
	}

	.fs-7 {
		font-size: 0.9rem;
	}

	.btn-modal-primary {
		background: linear-gradient(135deg, var(--cyan-neon), var(--purple-neon));
		color: #000;
		border: none;
		padding: 6px 16px;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.75rem;
		transition: all 0.2s;
		text-transform: uppercase;
	}

	.btn-danger-gradient {
		background: linear-gradient(135deg, #ff4d4d, #990000);
		color: white;
	}

	.btn-modal-primary:hover {
		transform: translateY(-1px);
		filter: brightness(1.2);
		box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
	}

	.btn-modal-secondary {
		background: transparent;
		color: var(--slate-400);
		border: 1px solid var(--border-color);
		padding: 6px 16px;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.75rem;
		transition: 0.2s;
		text-transform: uppercase;
	}

	.btn-modal-secondary:hover {
		color: white;
		background: rgba(255, 255, 255, 0.05);
	}

	.btn-close-modal {
		background: transparent;
		border: none;
		color: var(--slate-500);
		font-size: 0.8rem;
		transition: 0.2s;
	}

	.btn-close-modal:hover {
		color: white;
	}
</style>
