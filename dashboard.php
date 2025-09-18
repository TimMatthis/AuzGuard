<?php
require __DIR__ . '/includes/functions.php';
$view = ag_get_current_view();

ag_start_app_shell('AuzGuard Dashboard', $view);
?>
	<h1 class="page-title">Dashboard — <?php echo htmlspecialchars(ucwords(str_replace(['-', '_'], ' ', $view))); ?></h1>
	<?php
	$path = __DIR__ . '/views/' . $view . '.php';
	if (is_file($path)) {
		include $path;
	} else {
		include __DIR__ . '/views/overview.php';
	}
	?>
<?php ag_end_app_shell();


