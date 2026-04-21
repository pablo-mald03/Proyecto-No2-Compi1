<script>
	let { onInsert, onClose } = $props();

	let colorHex = $state('#22d3ee');
	let format = $state('hex');
	let selectedPreset = $state(''); 

	const presets = {
		blue: '#0000ff',
		white: '#ffffff',
		red: '#ff0000',
		green: '#00ff00',
		violet: '#ee82ee',
		gray: '#808080',
		black: '#000000',
		lightgray: '#d3d3d3'
	};

	function hexToRgb(hex) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgb(${r}, ${g}, ${b})`;
	}

	function handleInsert() {
		let textToInsert;
		if (selectedPreset && presets[selectedPreset] === colorHex) {
			textToInsert = selectedPreset;
		} else {
			textToInsert = format === 'hex' ? colorHex : hexToRgb(colorHex);
		}

		onInsert(textToInsert);
		onClose();
	}

	function selectPreset(name, hex) {
		colorHex = hex;
		selectedPreset = name;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={onClose} role="button" tabindex="0">
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div class="color-picker-pro" onclick={(e) => e.stopPropagation()} role="dialog">
		<div class="pro-header">
			<div class="d-flex align-items-center">
				<i class="bi bi-palette2 me-2 text-info"></i>
				<span>ASIGNADOR DE COLOR</span>
			</div>
			<button class="btn-close-pro" onclick={onClose} aria-label="cerrar picker" ><i class="bi bi-x-lg"></i></button>
		</div>

		<div class="pro-body">
			<div class="main-selection-row mb-4">
				<div class="color-input-group">
					<input
						type="color"
						bind:value={colorHex}
						oninput={() => (selectedPreset = '')}
						class="pro-native-input"
					/>
					<div class="input-label">Picker</div>
				</div>

				<div class="preview-display" style="border-bottom-color: {colorHex};">
					<div class="preview-label">Salida:</div>
					<div class="preview-value">
						{selectedPreset && presets[selectedPreset] === colorHex
							? selectedPreset.toUpperCase()
							: format === 'hex'
								? colorHex.toUpperCase()
								: hexToRgb(colorHex)}
					</div>
				</div>
			</div>

			<div class="section-title">PRESETS:</div>
			<div class="presets-container mb-4">
				<div class="presets-list">
					{#each Object.entries(presets) as [name, hex]}
						<button
							class="preset-item {selectedPreset === name ? 'active' : ''}"
							onclick={() => selectPreset(name, hex)}
						>
							<span class="color-indicator" style="background-color: {hex};"></span>
							<span class="preset-name">{name}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="footer-controls">
				<div class="format-container">
					<span class="format-label">Formato:</span>
					<div class="format-btns">
						<button
							class:active={format === 'hex'}
							onclick={() => {
								format = 'hex';
								selectedPreset = '';
							}}>HEX</button
						>
						<button
							class:active={format === 'rgb'}
							onclick={() => {
								format = 'rgb';
								selectedPreset = '';
							}}>RGB</button
						>
					</div>
				</div>

				<button class="btn-insert-pro" onclick={handleInsert}>
					<i class="bi bi-plus-circle-fill me-2"></i>INSERTAR
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(2, 6, 23, 0.8);
		backdrop-filter: blur(4px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 3000;
	}

	.color-picker-pro {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 12px;
		width: 480px; 
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
		overflow: hidden;
	}

	.pro-header {
		background: #1e293b;
		padding: 12px 16px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 1.5px;
		color: #f1f5f9;
		border-bottom: 1px solid #334155;
	}

	.btn-close-pro {
		background: none;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		transition: 0.2s;
	}
	.btn-close-pro:hover {
		color: #ef4444;
		transform: rotate(90deg);
	}

	.pro-body {
		padding: 24px;
	}

	.main-selection-row {
		display: flex;
		gap: 20px;
		align-items: flex-end;
	}

	.color-input-group {
		text-align: center;
	}
	.pro-native-input {
		width: 80px;
		height: 80px;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
	}
	.pro-native-input::-webkit-color-swatch {
		border-radius: 10px;
		border: 3px solid #334155;
	}

	.input-label {
		font-size: 0.65rem;
		color: #64748b;
		margin-top: 4px;
		font-weight: bold;
	}

	.preview-display {
		flex-grow: 1;
		height: 80px;
		background: #020617;
		border-bottom: 4px solid;
		border-radius: 8px 8px 0 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0 20px;
	}

	.preview-label {
		font-size: 0.6rem;
		color: #475569;
		font-weight: 800;
	}
	.preview-value {
		font-family: 'Fira Code', monospace;
		font-size: 1.2rem;
		color: #f8fafc;
		font-weight: bold;
	}


	.section-title {
		font-size: 0.65rem;
		color: #94a3b8;
		font-weight: 800;
		margin-bottom: 12px;
		letter-spacing: 0.5px;
	}

	.presets-list {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.preset-item {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.preset-item:hover {
		background: #334155;
		border-color: #475569;
	}
	.preset-item.active {
		border-color: #22d3ee;
		background: #0f172a;
		box-shadow: 0 0 10px rgba(34, 211, 238, 0.2);
	}

	.color-indicator {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.preset-name {
		color: #cbd5e1;
		font-size: 0.75rem;
		font-family: 'Fira Code', monospace;
	}

	.footer-controls {
		margin-top: 30px;
		padding-top: 20px;
		border-top: 1px solid #1e293b;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.format-container {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.format-label {
		font-size: 0.7rem;
		color: #64748b;
		font-weight: bold;
	}
	.format-btns {
		display: flex;
		background: #020617;
		padding: 3px;
		border-radius: 6px;
	}
	.format-btns button {
		border: none;
		background: none;
		color: #475569;
		font-size: 0.65rem;
		padding: 4px 10px;
		border-radius: 4px;
		font-weight: bold;
		cursor: pointer;
	}
	.format-btns button.active {
		background: #1e293b;
		color: #22d3ee;
	}

	.btn-insert-pro {
		background: #22d3ee;
		color: #020617;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		font-weight: 800;
		font-size: 0.75rem;
		cursor: pointer;
		transition: 0.2s;
	}
	.btn-insert-pro:hover {
		background: #67e8f9;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(34, 211, 238, 0.3);
	}
</style>
