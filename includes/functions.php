<?php

function ag_get_current_view(): string {
	$allowedViews = [
		'overview',
		'compliance',
		'sovereignty',
		'pipeline',
		'models',
		'spend',
		'logs',
		'api',
	];
	$view = isset($_GET['view']) ? strtolower(trim($_GET['view'])) : 'overview';
	return in_array($view, $allowedViews, true) ? $view : 'overview';
}

function ag_render_head(string $title = 'AuzGuard'): void {
	echo "<!doctype html>\n";
	echo "<html lang=\"en\">\n";
	echo "<head>\n";
	echo "\t<meta charset=\"utf-8\">\n";
	echo "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n";
	echo "\t<title>" . htmlspecialchars($title) . "</title>\n";
	echo "\t<link rel=\"stylesheet\" href=\"/css/style.css\">\n";
	echo "</head>\n";
}

function ag_render_topbar(): void {
	echo "<header class=\"topbar\">\n";
	echo "\t<div class=\"topbar__brand\"><a class=\"brand\" href=\"/dashboard.php?view=overview\">AuzGuard</a></div>\n";
	echo "\t<nav class=\"topbar__actions\">\n";
	echo "\t\t<a class=\"topbar__link\" href=\"/dashboard.php?view=logs\" title=\"Immutable Logging\">\n";
	echo "\t\t\t<span class=\"icon\" aria-hidden=\"true\">🕑</span> <span class=\"hide-sm\">Logs</span>\n";
	echo "\t\t</a>\n";
	echo "\t</nav>\n";
	echo "</header>\n";
}

function ag_render_sidebar(string $currentView): void {
	$items = [
		'overview' => 'Overview',
		'compliance' => 'Compliance',
		'sovereignty' => 'Sovereignty',
		'pipeline' => 'Pipeline',
		'models' => 'Model Garden',
		'api' => 'API',
		'spend' => 'Spend & Org',
		'logs' => 'Logs',
	];

	echo "<aside class=\"sidebar\">\n";
	echo "\t<div class=\"sidebar__title\">Menu</div>\n";
	echo "\t<ul class=\"nav\">\n";
	foreach ($items as $view => $label) {
		$active = $currentView === $view ? ' is-active' : '';
		echo "\t\t<li class=\"nav__item$active\"><a href=\"/dashboard.php?view=$view\">" . htmlspecialchars($label) . "</a></li>\n";
	}
	echo "\t</ul>\n";
	echo "</aside>\n";
}

function ag_start_app_shell(string $pageTitle, string $currentView): void {
	ag_render_head($pageTitle);
	echo "<body class=\"app\">\n";
	ag_render_topbar();
	echo "<div class=\"layout\">\n";
	ag_render_sidebar($currentView);
	echo "\t<main class=\"main\">\n";
}

function ag_end_app_shell(): void {
	echo "\t</main>\n";
	echo "</div>\n";
	echo "</body>\n";
	echo "</html>\n";
}


