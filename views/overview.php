<section class="grid grid--2">
	<div class="card">
		<h3 class="card__title">Compliance Status</h3>
		<div class="card__body">
			<div class="badge badge--ok">Compliant • 98%</div>
			<p class="muted">APRA CPS 234 • SOCI Act • Privacy Act 2025</p>
			<p><a href="/dashboard.php?view=compliance">View Exceptions</a></p>
		</div>
	</div>
	<div class="card">
		<h3 class="card__title">Sovereignty Assurance</h3>
		<div class="card__body">
			<div class="badge badge--ok">AU Only</div>
			<div class="placeholder mt-10">Jurisdiction lock visual</div>
		</div>
	</div>
</section>

<section class="card mt-16">
	<h3 class="card__title">Pipeline</h3>
	<div class="card__body">
		<div class="pipeline">
			<div class="pipeline__row">
				<div class="step">Inbound Call<br><small class="muted">TLS, API key</small></div>
				<div class="arrow">→</div>
				<div class="step">Rules Applied<br><small class="muted">CPS 234, SOCI, Privacy</small></div>
				<div class="arrow">→</div>
				<div class="step">Model Garden<br><small class="muted">Routed per policy</small></div>
				<div class="arrow">→</div>
				<div class="step">Response<br><small class="muted">Signed & logged</small></div>
			</div>
		</div>
	</div>
</section>

<section class="grid grid--2 mt-16">
	<div class="card">
		<h3 class="card__title">Model Garden</h3>
		<div class="card__body">
			<div class="controls mb-10">
				<label>
					<span class="muted">Routing Priority</span>
					<select class="select">
						<option>Compliance</option>
						<option>Sovereignty</option>
						<option>Performance</option>
						<option>Cost</option>
					</select>
				</label>
			</div>
			<div class="grid grid--3">
				<div class="card"><div class="card__title">Model A</div><div class="card__body">AU Support • $$ • A+ Compliance</div></div>
				<div class="card"><div class="card__title">Model B</div><div class="card__body">AU Only • $$$ • A Compliance</div></div>
				<div class="card"><div class="card__title">Model C</div><div class="card__body">Global • $ • B Compliance</div></div>
			</div>
			<p class="mt-10"><a href="/dashboard.php?view=models">Open Model Garden</a></p>
		</div>
	</div>
	<div class="card">
		<h3 class="card__title">Spend & Org Oversight</h3>
		<div class="card__body">
			<div class="placeholder">Budget vs Actual chart</div>
			<p class="mt-10"><a href="/dashboard.php?view=spend">View Allocation & Roles</a></p>
		</div>
	</div>
</section>


