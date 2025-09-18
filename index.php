<?php require __DIR__ . '/includes/functions.php'; ?>
<?php ag_render_head('AuzGuard — Sovereign AI Gateway'); ?>
<body class="app">
	<header class="topbar">
		<div class="topbar__brand"><span class="brand">AuzGuard</span></div>
		<nav class="topbar__actions">
			<a class="topbar__link" href="/dashboard.php?view=logs" title="Immutable Logging"><span class="icon" aria-hidden="true">🕑</span><span class="hide-sm">Logs</span></a>
		</nav>
	</header>
	<main class="main">
		<section class="hero">
			<div class="hero__content">
				<div class="hero__badge">
					<span class="hero__badge-icon">🛡️</span>
					<span class="hero__badge-text">Enterprise Security</span>
				</div>
				<h1 class="hero__brand">AuzGuard</h1>
				<p class="hero__tagline">Sovereign AI Gateway for Regulated Industries</p>
				<p class="hero__description">The only AI gateway that ensures compliance by default, maintains data sovereignty, and provides immutable audit trails for regulated industries.</p>
				
				<div class="hero__cta">
					<a class="btn btn--primary btn--large" href="/dashboard.php?view=overview">
						<span class="btn__icon">🚀</span>
						<span class="btn__text">Access Dashboard</span>
					</a>
					<div class="hero__trust">
						<span class="trust__text">Trusted by</span>
						<div class="trust__badges">
							<span class="trust__badge">APRA CPS 234</span>
							<span class="trust__badge">SOCI Act</span>
							<span class="trust__badge">Privacy Act 2025</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="process">
			<div class="container">
				<div class="process__header">
					<h2 class="process__title">How It Works</h2>
					<p class="process__subtitle">Every request flows through our comprehensive compliance and security pipeline</p>
				</div>
				
				<div class="pipeline">
					<div class="pipeline__row">
						<div class="step step--first">
							<div class="step__icon">📋</div>
							<div class="step__content">
								<h3 class="step__title">Most Current Laws</h3>
								<p class="step__description">CPS 234 • SOCI • Privacy 2025</p>
							</div>
						</div>
						<div class="arrow">
							<div class="arrow__line"></div>
							<div class="arrow__head">→</div>
						</div>
						<div class="step">
							<div class="step__icon">⚙️</div>
							<div class="step__content">
								<h3 class="step__title">Your Policies &amp; Rules</h3>
								<p class="step__description">Org • Project • Team</p>
							</div>
						</div>
						<div class="arrow">
							<div class="arrow__line"></div>
							<div class="arrow__head">→</div>
						</div>
						<div class="step">
							<div class="step__icon">🔐</div>
							<div class="step__content">
								<h3 class="step__title">API Gateway</h3>
								<p class="step__description">Keyed • TLS</p>
							</div>
						</div>
						<div class="arrow">
							<div class="arrow__line"></div>
							<div class="arrow__head">→</div>
						</div>
						<div class="step">
							<div class="step__icon">🌱</div>
							<div class="step__content">
								<h3 class="step__title">Model Garden</h3>
								<p class="step__description">Routed • AU-only pref</p>
							</div>
						</div>
						<div class="arrow">
							<div class="arrow__line"></div>
							<div class="arrow__head">→</div>
						</div>
						<div class="step">
							<div class="step__icon">✅</div>
							<div class="step__content">
								<h3 class="step__title">Response</h3>
								<p class="step__description">Validated</p>
							</div>
						</div>
						<div class="arrow">
							<div class="arrow__line"></div>
							<div class="arrow__head">→</div>
						</div>
						<div class="step step--last">
							<div class="step__icon">📊</div>
							<div class="step__content">
								<h3 class="step__title">Logs &amp; Reports</h3>
								<p class="step__description">Append-only</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="features">
			<div class="container">
				<div class="features__header">
					<h2 class="features__title">Platform Features</h2>
					<p class="features__subtitle">Built-in compliance and security for enterprise AI</p>
				</div>
				<div class="features__grid">
					<div class="feature">
						<div class="feature__icon">
							<span class="feature__check">✓</span>
						</div>
						<div class="feature__content">
							<h3 class="feature__title">Compliant by Default</h3>
							<p class="feature__description">Every request automatically checked against current regulations</p>
						</div>
					</div>
					<div class="feature">
						<div class="feature__icon">
							<span class="feature__check">✓</span>
						</div>
						<div class="feature__content">
							<h3 class="feature__title">Sovereign</h3>
							<p class="feature__description">Data stays within Australian jurisdiction at all times</p>
						</div>
					</div>
					<div class="feature">
						<div class="feature__icon">
							<span class="feature__check">✓</span>
						</div>
						<div class="feature__content">
							<h3 class="feature__title">Your Rules &amp; Policies</h3>
							<p class="feature__description">Custom compliance rules tailored to your organization</p>
						</div>
					</div>
					<div class="feature">
						<div class="feature__icon">
							<span class="feature__check">✓</span>
						</div>
						<div class="feature__content">
							<h3 class="feature__title">Cost Controls</h3>
							<p class="feature__description">Granular spending limits and budget management</p>
						</div>
					</div>
					<div class="feature">
						<div class="feature__icon">
							<span class="feature__check">✓</span>
						</div>
						<div class="feature__content">
							<h3 class="feature__title">Immutable Audit</h3>
							<p class="feature__description">Tamper-proof logs for regulatory compliance</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="benefits">
			<div class="container">
				<div class="benefits__header">
					<h2 class="benefits__title">Why Choose AuzGuard</h2>
					<p class="benefits__subtitle">The only AI gateway designed specifically for regulated industries</p>
				</div>
				<div class="benefits__grid">
					<div class="benefit">
						<div class="benefit__icon">
							<span class="benefit__check">✓</span>
						</div>
						<div class="benefit__content">
							<h3 class="benefit__title">Compliance First</h3>
							<p class="benefit__description">Built-in compliance checking ensures you never violate regulations</p>
						</div>
					</div>
					<div class="benefit">
						<div class="benefit__icon">
							<span class="benefit__check">✓</span>
						</div>
						<div class="benefit__content">
							<h3 class="benefit__title">Sovereignty Guaranteed</h3>
							<p class="benefit__description">Australian data sovereignty with geo-fencing and routing controls</p>
						</div>
					</div>
					<div class="benefit">
						<div class="benefit__icon">
							<span class="benefit__check">✓</span>
						</div>
						<div class="benefit__content">
							<h3 class="benefit__title">Immutable Logging</h3>
							<p class="benefit__description">Blockchain-style audit trails that cannot be modified or deleted</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="cta">
			<div class="container">
				<div class="cta__content">
					<h2 class="cta__title">Ready to Secure Your AI?</h2>
					<p class="cta__description">Join regulated industries already using AuzGuard for compliant AI operations</p>
					<a class="btn btn--primary btn--large" href="/dashboard.php?view=overview">
						<span class="btn__icon">🚀</span>
						<span class="btn__text">Get Started Now</span>
					</a>
				</div>
			</div>
		</section>
	</main>
</body>
</html>


