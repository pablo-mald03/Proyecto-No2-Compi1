<script>
    // Aquí podrías añadir lógica de entrada con Svelte 5 si quisieras animar al cargar
</script>

<div class="hero-container container py-5">
    <section class="main-hero text-center p-5 mb-5 mt-3 position-relative overflow-hidden">
        <div class="glow-element"></div>
        
        <div class="row py-lg-5 position-relative">
            <div class="col-lg-8 col-md-10 mx-auto">
                <div class="badge-new mb-3">v1.0 - Svelte 5 Powered</div>
                <h1 class="fw-black display-2 text-white main-title">
                    YFERA <span class="text-cyan">FRAMEWORK</span>
                </h1>
                <p class="lead text-slate-300 mt-4 fs-4 px-lg-5">
                    El framework para desarrollo web ideal y moderno para tus apps
                    que desees comercializar. Usando un LALR como <strong>Jison</strong> 
                    y la reactividad de <strong>Svelte</strong>.
                </p>
                
                <div class="d-flex justify-content-center gap-3 mt-5">
                    <a href="/framework" class="btn btn-cyan btn-lg px-5 py-3 fw-bold">
                        <i class="bi bi-cpu-fill me-2"></i> LANZAR EDITOR
                    </a>
                </div>
            </div>
        </div>
    </section>

    <div id="features" class="row g-4 py-5">
        <div class="col-md-4">
            <div class="tech-card h-100 p-4">
                <div class="icon-box bg-cyan">
                    <i class="bi bi-braces fs-2"></i>
                </div>
                <h3 class="fw-bold text-white mt-4">YFERA DSL</h3>
                <p class="text-slate-400">Diseñado para crear cualquier web de la forma mas intuitiva posible y practica</p>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="tech-card h-100 p-4">
                <div class="icon-box bg-purple">
                    <i class="bi bi-diagram-3-fill fs-2"></i>
                </div>
                <h3 class="fw-bold text-white mt-4">LALR Parsing</h3>
                <p class="text-slate-400">Implementacion de alto rendimiento basada en Jison 0.4.18 para el manejo de árboles de sintaxis y compilacion de codigo.</p>
            </div>
        </div>

        <div class="col-md-4">
            <div class="tech-card h-100 p-4 border-cyan-glow">
                <div class="icon-box bg-blue">
                    <i class="bi bi-database-fill-check fs-2"></i>
                </div>
                <h3 class="fw-bold text-white mt-4">Cloud Nativo</h3>
                <p class="text-slate-400">Persistencia local inmediata de tus archivos y sincronización para desarrollo persistente.</p>
            </div>
        </div>
    </div>

    <footer class="pt-5 my-5 text-slate-500 border-top border-dark text-center">
        <p>&copy; 2026 YFERA Framework &bull; Created by <span class="text-white">Pablo-dev</span></p>
        <div class="social-links fs-4">
            <i class="bi bi-github mx-2"></i>
            <i class="bi bi-linkedin mx-2"></i>
        </div>
    </footer>
</div>

<style>
    :root {
        --dark-bg: #030712;
        --card-bg: #0f172a;
        --cyan-neon: #22d3ee;
        --purple-neon: #a855f7;
    }

    :global(body) {
        background-color: var(--dark-bg);
        color: #f8fafc;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .text-cyan { color: var(--cyan-neon); }
    .text-slate-300 { color: #94a3b8; }
    .text-slate-400 { color: #64748b; }
    .text-slate-500 { color: #475569; }

    .main-hero {
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(10px);
        border: 1px solid #1e293b;
        border-radius: 2rem;
    }

    .glow-element {
        position: absolute;
        top: -50%;
        left: -20%;
        width: 150%;
        height: 150%;
        background: radial-gradient(circle, rgba(34, 211, 238, 0.05) 0%, transparent 70%);
        pointer-events: none;
    }

    .fw-black { font-weight: 900; letter-spacing: -2px; }

    .badge-new {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: rgba(34, 211, 238, 0.1);
        color: var(--cyan-neon);
        border: 1px solid rgba(34, 211, 238, 0.2);
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: bold;
        text-transform: uppercase;
    }

    .btn-cyan {
        background-color: var(--cyan-neon);
        color: #000;
        transition: all 0.3s ease;
        border: none;
    }

    .btn-cyan:hover {
        background-color: #fff;
        box-shadow: 0 0 25px rgba(34, 211, 238, 0.5);
        transform: scale(1.05);
    }

    .tech-card {
        background: var(--card-bg);
        border: 1px solid #1e293b;
        border-radius: 1.5rem;
        transition: all 0.4s ease;
    }

    .tech-card:hover {
        transform: translateY(-12px);
        border-color: var(--cyan-neon);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .icon-box {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 1rem;
    }

    .bg-cyan { background: linear-gradient(135deg, #0891b2, #22d3ee); }
    .bg-purple { background: linear-gradient(135deg, #7e22ce, #a855f7); }
    .bg-blue { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
</style>