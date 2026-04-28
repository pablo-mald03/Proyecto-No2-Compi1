<script>
	/*Tabla de errores que representa a todos esos errores de compilacion*/
	let { fs, startResizing } = $props();
</script>

<div class="error-panel d-flex flex-column">
	<div
		role="button"
		tabindex="-1"
		class="resizer-y"
		onmousedown={startResizing}
		aria-label="Ajustar alto del panel de errores"
	></div>

	<div class="panel-header d-flex justify-content-between align-items-center px-3 py-1">
		<span class="fw-bold text-danger" style="font-size: 0.8rem; letter-spacing: 1px;">
			<i class="bi bi-bug-fill me-2"></i> REPORTE DE ERRORES ({fs.errores.length})
		</span>
		<button
			class="btn-close-panel"
			onclick={() => (fs.showErrores = false)}
			aria-label="Cerrar panel"
		>
			<i class="bi bi-x-lg"></i>
		</button>
	</div>

	<div class="table-container flex-grow-1 overflow-auto">
		<table class="ide-table w-100">
			<thead>
				<tr>
				    <th class="text-white" style="width: 20%;">ORIGEN</th>
					<th class="text-white" style="width: 20%;">LEXEMA</th>
					<th class="text-white" style="width: 10%;">LINEA</th>
					<th class="text-white" style="width: 10%;">COLUMNA</th>
					<th class="text-white" style="width: 15%;">TIPO</th>
					<th class="text-white" style="width: 45%;">DESCRIPCION</th>
				</tr>
			</thead>
			<tbody>
				{#if fs.errores.length === 0}
					<tr>
						<td colspan="5" class="text-center text-success py-4">
							<i class="bi bi-check-circle-fill me-2"></i> No se encontraron errores.
						</td>
					</tr>
				{:else}
					{#each fs.errores as error}
						<tr class="error-row">
							<td class="font-code text-warning fw-bold">{error.origen}</td>
							<td class="font-code text-info fw-bold">{error.lexema}</td>
							<td class="font-code">{error.linea}</td>
							<td class="font-code">{error.columna}</td>
                            <td>
								<span
									class="badge {error.tipo.toLowerCase() === 'lexico'
										? 'bg-warning text-dark'
										: 'bg-danger'}"
								>
									{error.tipo.toUpperCase()}
								</span>
							</td>
							<td class="text-slate-300">{error.descripcion}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.error-panel {
		background: #0f172a;
		border-top: 1px solid #334155;
		height: 100%;
		min-height: 150px;
	}

	.resizer-y {
		height: 4px;
		background: transparent;
		cursor: ns-resize;
		transition: background 0.2s;
	}
	.resizer-y:hover {
		background: #ef4444;
	}

	.panel-header {
		background: #1e293b;
		border-bottom: 1px solid #334155;
	}

	.btn-close-panel {
		background: transparent;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		font-size: 0.9rem;
		transition: 0.2s;
	}
	.btn-close-panel:hover {
		color: #ef4444;
	}

	.table-container {
		background: #020617;
	}

	.ide-table {
		border-collapse: collapse;
		text-align: left;
		font-size: 0.85rem;
	}

	.ide-table th {
		background: #0f172a;
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 1px;
		padding: 8px 12px;
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 1px solid #334155;
	}

	.ide-table td {
		padding: 8px 12px;
		border-bottom: 1px solid rgba(51, 65, 85, 0.4);
		vertical-align: middle;
	}

	.error-row:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.font-code {
		font-family: 'Fira Code', monospace;
	}
</style>
