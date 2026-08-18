const { spawn } = require('child_process');

const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Speech')
try {
  $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  Write-Host "SAPI_AVAILABLE:TRUE"
} catch {
  Write-Host "SAPI_ERR:$($_.Exception.Message)"
}
`;

const proc = spawn('powershell.exe', [
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  psScript,
]);

proc.stdout.on('data', (d) => {
  console.log('[SAPI STDOUT]:', d.toString().trim());
});

proc.stderr.on('data', (d) => {
  console.log('[SAPI STDERR]:', d.toString().trim());
});

proc.on('close', (code) => {
  console.log('[SAPI Finished with code]:', code);
});
