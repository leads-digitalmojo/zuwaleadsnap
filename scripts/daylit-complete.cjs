const { execSync } = require('child_process');

async function sync() {
  const key = execSync("powershell -Command \"[System.Environment]::GetEnvironmentVariable('DAYLIT_API_KEY', 'User')\"", { encoding: 'utf8' }).trim();
  if (!key) {
    console.error('No DAYLIT_API_KEY found');
    return;
  }

  const headers = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  const taskId = '48edfd0c-a0f8-4c7d-9d67-453af0167f56';
  const res = await fetch(`https://daylit.apxero.dev/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'done' })
  });
  console.log('PATCH task status:', res.status);

  await fetch(`https://daylit.apxero.dev/api/v1/tasks/${taskId}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'Successfully implemented LeadSnap 1:1 parity with enhanced UI/UX: 1) DataForSEO low balance watchdog ($15 threshold) polling every 4 hours and emailing srishti@digitalmojo.in via Zoho ZeptoMail with direct recharge link; 2) Header balance pill showing real-time balance; 3) Exact metrics: AGR, ATGR, Top 3%, Top 10%, Market Share, Quadrants (NW, NE, SW, SE); 4) 60/40 Split desktop layout; 5) Zero-API instant Flip the Grid projection for all competitors; 6) Expanded grid sizes from 3x3 up to 15x15.'
    })
  });
  console.log('Daylit completion note logged.');
}

sync().catch(console.error);
