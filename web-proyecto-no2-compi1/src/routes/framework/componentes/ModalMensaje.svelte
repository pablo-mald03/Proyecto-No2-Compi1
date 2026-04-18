<script>
	import { fade, scale } from 'svelte/transition';

	/*Modal que permite dar mensajes al usuario por cualquier accion*/
	let { show = false, tipo = 'exito', titulo = 'Notificación', mensaje = '', onAceptar } = $props();

	let esExito = $derived(tipo === 'exito');
    let icono = $derived(esExito ? 'bi-check-circle-fill' : 'bi-exclamation-octagon-fill');
    let colorIcono = $derived(esExito ? 'var(--cyan-neon)' : '#ff4d4d');
</script>

{#if show}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-overlay d-flex align-items-center justify-content-center"
        transition:fade={{ duration: 150 }}
        onclick={onAceptar}
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="custom-modal-card shadow-lg"
            style="width: 380px;"
            transition:scale={{ duration: 250, start: 0.9, opacity: 0 }}
            onclick={(e) => e.stopPropagation()}
            role="alert"
            aria-live="polite"
        >
            <div class="modal-header-custom p-3 d-flex align-items-center gap-2">
                <i class="bi {icono}" style="color: {colorIcono};"></i>
                <span class="fw-bold text-white letter-spacing-1 text-uppercase fs-xs">{titulo}</span>
            </div>

            <div class="modal-body-custom p-4 text-center">
                <p class="m-0 text-slate-300 fs-7 lh-base font-fira">
                    {mensaje}
                </p>
            </div>

            <div class="modal-footer-custom p-3 d-flex justify-content-center">
                <button 
                    type="button" 
                    class="btn-yfera-action {esExito ? 'btn-cyan' : 'btn-danger'}" 
                    onclick={onAceptar}
                >
                    CONTINUAR
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
        z-index: 4000; 
    }

    .custom-modal-card {
        background-color: var(--card-bg, #0f172a);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        overflow: hidden;
    }

    .modal-header-custom {
        background-color: var(--sidebar-bg, #1e293b);
        border-bottom: 1px solid var(--border-color);
    }

    .modal-body-custom {
        background-color: #020617; 
    }

    .modal-footer-custom {
        background-color: var(--sidebar-bg);
        border-top: 1px solid var(--border-color);
    }


    .letter-spacing-1 { letter-spacing: 1px; }
    .fs-xs { font-size: 0.75rem; }
    .fs-7 { font-size: 0.9rem; }
    .font-fira { font-family: 'Fira Code', monospace; }

    .btn-yfera-action {
        border: none;
        padding: 8px 30px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 0.7rem;
        letter-spacing: 1px;
        transition: all 0.2s;
        width: 100%;
    }

    .btn-cyan {
        background: linear-gradient(135deg, var(--cyan-neon, #22d3ee), var(--purple-neon, #a855f7));
        color: #000;
    }

    .btn-danger {
        background: linear-gradient(135deg, #ff4d4d, #990000);
        color: white;
    }

    .btn-yfera-action:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
</style>
