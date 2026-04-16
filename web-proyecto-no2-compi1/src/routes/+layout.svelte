<script>
	import favicon from '$lib/assets/favicon.svg';

	/*librerias de bootstrap*/
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>YFERA</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="container-fluid p-0">
	{@render children()}
</div>

<style>
	:global(body, html) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
