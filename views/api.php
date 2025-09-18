<section class="grid grid--2">
	<div class="card">
		<h3 class="card__title">API Access</h3>
		<div class="card__body">
			<div class="controls mb-10">
				<input class="input" type="text" value="sk_live_****************" readonly />
				<button class="btn">Regenerate</button>
			</div>
			<p class="muted">Use this key to authenticate requests to the AuzGuard Gateway.</p>
		</div>
	</div>
	<div class="card">
		<h3 class="card__title">Usage</h3>
		<div class="card__body">
			<div class="grid">
				<div class="placeholder">Requests today: 12,345</div>
				<div class="placeholder">Rate limit: 120 rpm</div>
			</div>
		</div>
	</div>
</section>

<section class="grid grid--2 mt-16">
	<div class="card">
		<h3 class="card__title">Endpoints</h3>
		<div class="card__body">
			<ul>
				<li>POST /v1/chat/completions</li>
				<li>POST /v1/completions</li>
				<li>POST /v1/embeddings</li>
				<li>GET /v1/models</li>
			</ul>
			<p class="muted">All traffic is evaluated for compliance and sovereignty before routing.</p>
		</div>
	</div>
	<div class="card">
		<h3 class="card__title">Quickstart</h3>
		<div class="card__body">
			<div class="placeholder">curl -H "Authorization: Bearer sk_live_..." -H "Content-Type: application/json" -d '{"model":"auzguard:preferred","messages":[{"role":"user","content":"Hello"}]}' https://api.auzguard.local/v1/chat/completions</div>
		</div>
	</div>
</section>


