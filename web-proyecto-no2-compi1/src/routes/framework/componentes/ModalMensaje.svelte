<script>
	/*Modal que permite dar mensajes al usuario por cualquier accion*/
	let { tipo = 'exito', titulo, mensaje, onAceptar } = $props();

	let esExito = $derived(tipo === 'exito');
	let colorBorde = $derived(esExito ? 'border-success' : 'border-danger');
	let colorTexto = $derived(esExito ? 'text-success' : 'text-danger');
	let icono = $derived(esExito ? 'bi-check-circle-fill' : 'bi-x-circle-fill');
</script>

<div
	class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
	style="background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 1060;"
>
	<div
		class="card shadow-lg bg-dark text-white {colorBorde}"
		style="width: 400px; animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);"
	>
		<div
			class="card-header d-flex align-items-center border-secondary"
			style="background-color: #1e293b;"
		>
			<i class="bi {icono} {colorTexto} me-2 fs-5"></i>
			<h5 class="mb-0 fw-bold">{titulo}</h5>
		</div>

		<div class="card-body text-center py-4" style="background-color: #0f172a;">
			<p class="text-light-50 mb-0">{mensaje}</p>
		</div>

		<div class="card-footer border-secondary text-center" style="background-color: #1e293b;">
			<button class="btn {esExito ? 'btn-success' : 'btn-danger'} px-5" onclick={onAceptar}>
				Aceptar
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes popIn {
		0% {
			opacity: 0;
			transform: scale(0.8);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
