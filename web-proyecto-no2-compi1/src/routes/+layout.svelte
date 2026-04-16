<script>
	import favicon from '$lib/assets/iconYF.png';

	/*librerias de bootstrap*/
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.css';
	import { page } from '$app/stores';

	let { children } = $props();

	let isEditor = $derived($page.url.pathname.startsWith('/framework'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>YFERA Framework</title>
</svelte:head>

<nav class="navbar navbar-expand-lg sticky-top custom-nav">
	<div class="container-fluid px-4">
		<a class="navbar-brand fw-black text-white d-flex align-items-center" href="/">
			<img src={favicon} alt="Logo" style="height: 1.5rem; width: auto;" class="me-2 align-middle" />
			YFERA <span class="text-cyan ms-1">FRAMEWORK</span>
		</a>

		<button
			class="navbar-toggler border-0 text-white"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarNav"
			aria-label="navbar"
		>
			<i class="bi bi-list fs-2"></i>
		</button>

		<div class="collapse navbar-collapse" id="navbarNav">
			<ul class="navbar-nav ms-auto align-items-center">
				<li class="nav-item">
					<a class="nav-link {$page.url.pathname === '/' ? 'active' : ''}" href="/">INICIO</a>
				</li>
				<li class="nav-item ms-lg-3">
					<a class="btn btn-outline-cyan px-4 rounded-pill fw-bold" href="/framework">
						ABRIR FRAMEWORK
					</a>
				</li>
			</ul>
		</div>
	</div>
</nav>

<main class={isEditor ? 'editor-mode' : 'content-mode'}>
	{@render children()}
</main>

{#if !isEditor}
	<footer class="custom-footer border-top border-dark">
		<div class="container py-5">
			<div class="row g-4">
				<div class="col-lg-4">
					<h4 class="fw-bold text-white mb-3">YFERA <span class="text-cyan">FRAMEWORK</span></h4>
					<p class="text-slate-400">
						Creado para tus Apps web que desees hacer y comercializarlas.
					</p>
				</div>
				<div class="col-lg-2 ms-auto">
					<h6 class="text-white fw-bold mb-3">RECURSOS</h6>
					<ul class="list-unstyled text-slate-500">
						<li><p class="footer-link">JavaScript</p></li>
						<li><p class="footer-link">Jison</p></li>
						<li><p class="footer-link">Esfuerzo</p></li>
					</ul>
				</div>
				<div class="col-lg-3">
					<h6 class="text-white fw-bold mb-3">COMUNIDAD</h6>
					<div class="d-flex gap-3 fs-4">
						<i class="bi bi-github footer-icon"></i>
						<i class="bi bi-discord footer-icon"></i>
						<i class="bi bi-linkedin footer-icon"></i>
					</div>
				</div>
			</div>
			<div class="text-center mt-5 pt-4 border-top border-dark-subtle text-slate-500">
				<small>&copy; 2026 YFERA Framework. Made by Pablo-dev &bull; Final Project</small>
			</div>
		</div>
	</footer>
{/if}

<style>
	:root {
		--dark-bg: #030712;
		--nav-bg: rgba(3, 7, 18, 0.8);
		--cyan-neon: #22d3ee;
		--slate-400: #94a3b8;
	}

	:global(body) {
		background-color: var(--dark-bg);
		color: #f8fafc;
		margin: 0;
		padding: 0;
	}

	.custom-nav {
		background: var(--nav-bg);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		z-index: 1050;
	}

	.fw-black {
		font-weight: 900;
		letter-spacing: -1px;
	}
	.text-cyan {
		color: var(--cyan-neon);
	}

	.nav-link {
		color: var(--slate-400) !important;
		font-weight: 600;
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--cyan-neon) !important;
	}

	.btn-outline-cyan {
		color: var(--cyan-neon);
		border: 1px solid var(--cyan-neon);
		transition: all 0.3s ease;
	}

	.btn-outline-cyan:hover {
		background: var(--cyan-neon);
		color: #000;
		box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
	}

	.custom-footer {
		background: #020617;
	}

	.text-slate-400 {
		color: #94a3b8;
	}
	.text-slate-500 {
		color: #64748b;
	}

	.footer-link {
		text-decoration: none;
		color: inherit;
		transition: color 0.2s;
	}

	.footer-link:hover {
		color: var(--cyan-neon);
	}

	.footer-icon {
		cursor: pointer;
		transition:
			transform 0.2s,
			color 0.2s;
	}

	.footer-icon:hover {
		color: var(--cyan-neon);
		transform: scale(1.2);
	}

	.editor-mode {
		height: calc(100vh - 60px);
		overflow: hidden;
	}

	.content-mode {
		min-height: 80vh;
	}
</style>
