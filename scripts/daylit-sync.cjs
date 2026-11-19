const { execSync } = require('child_process');

async function sync(title, status = 'in_progress', note = '') {
  const key = execSync("powershell -Command \"[System.Environment]::GetEnvironmentVariable('DAYLIT_API_KEY', 'User')\"", { encoding: 'utf8' }).trim();
  if (!key) {
    console.error('No DAYLIT_API_KEY found');
    return;
  }

  const headers = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  const taskRes = await fetch('https://daylit.apxero.dev/api/v1/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      priority: 'high',
      project_slug: 'mojomap',
      status
    })
  });
  const tData = await taskRes.json();
  const task = tData.data || tData;
  console.log('Task created:', task?.id, task?.status);

  if (task?.id && note) {
    await fetch('https://daylit.apxero.dev/api/v1/tasks/' + task.id + '/notes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: note })
    });
    console.log('Daylit note appended successfully.');
  }
  return task?.id;
}

const args = process.argv.slice(2);
const title = args[0] || 'Build LeadSnap Parity: DataForSEO Srishti Alert, AGR/ATGR Metrics & Flip Grid';
const status = args[1] || 'in_progress';
const note = args[2] || 'Started implementation phase with Srishti Ji balance watchdog, AGR/ATGR formulas, and enhanced LeadSnap UI layout.';

sync(title, status, note).catch(console.error);
