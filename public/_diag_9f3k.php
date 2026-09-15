<?php
/* 임시 진단 — 전 라우트 500 원인 확인용(2026-09-15). 확인 후 즉시 삭제. 비밀값은 출력하지 않는다. */
if (($_GET['k'] ?? '') !== 'mk9f3k-2026') { http_response_code(404); exit; }
header('Content-Type: text/plain; charset=UTF-8');
ini_set('display_errors', '1');
error_reporting(E_ALL);
register_shutdown_function(static function () {
    $e = error_get_last();
    if ($e) echo "\n[shutdown] {$e['type']} {$e['message']} @ {$e['file']}:{$e['line']}\n";
});
echo 'php ', PHP_VERSION, "\n";
$root = dirname(__DIR__);
echo 'vendor/autoload: ', is_file($root . '/vendor/autoload.php') ? 'ok' : 'MISSING', "\n";
echo 'system dir: ';
$sys = $root . '/vendor/codeigniter4/framework/system';
echo is_dir($sys) ? 'vendor' : (is_dir($root . '/system') ? 'root/system' : 'MISSING'), "\n";
echo '.env: ', is_file($root . '/.env') ? 'exists ' . filesize($root . '/.env') . 'B' : 'MISSING', "\n";
if (is_file($root . '/.env')) {
    foreach (file($root . '/.env', FILE_IGNORE_NEW_LINES) as $i => $l) {
        $t = trim($l);
        if ($t === '' || $t[0] === '#') continue;
        $k = trim(explode('=', $t, 2)[0]);
        $v = trim(explode('=', $t, 2)[1] ?? '');
        printf("  L%d %s = <%d chars>%s%s\n", $i + 1, $k, strlen($v), str_contains($v, ' ') ? ' HAS-SPACE' : '', preg_match('/^["\']/', $v) ? ' quoted' : '');
    }
}
foreach (['writable', 'writable/cache', 'writable/logs', 'writable/session'] as $d) {
    echo $d, ': ', is_dir($root . '/' . $d) ? (is_writable($root . '/' . $d) ? 'writable' : 'NOT-WRITABLE') : 'MISSING', "\n";
}
$logs = glob($root . '/writable/logs/log-*.log') ?: [];
rsort($logs);
if ($logs) {
    echo "\n--- latest log tail (", basename($logs[0]), ") ---\n";
    $lines = file($logs[0]);
    echo implode('', array_slice($lines, -25));
}
echo "\n--- boot attempt ---\n";
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(FCPATH);
try {
    require FCPATH . '../app/Config/Paths.php';
    $paths = new Config\Paths();
    echo 'systemDirectory: ', $paths->systemDirectory, ' ', is_dir($paths->systemDirectory) ? 'ok' : 'MISSING', "\n";
    require $paths->systemDirectory . '/Boot.php';
    ob_start();
    $code = CodeIgniter\Boot::bootWeb($paths);
    $out = ob_get_clean();
    echo 'bootWeb returned ', var_export($code, true), ', output ', strlen($out), " bytes\n";
} catch (Throwable $e) {
    while (ob_get_level()) ob_end_clean();
    echo get_class($e), ': ', $e->getMessage(), ' @ ', $e->getFile(), ':', $e->getLine(), "\n";
    echo substr($e->getTraceAsString(), 0, 1500), "\n";
}
