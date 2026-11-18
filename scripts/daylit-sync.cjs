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

  const pRes = await fetch('https://daylit.apxero.dev/api/v1/projects', { headers });
  const pData = await pRes.json();
  const list = pData.data || pData;
  let proj = Array.isArray(list) ? list.find(p => p.slug === 'mojomap') : null;

  if (!proj) {
    const createRes = await fetch('https://daylit.apxero.dev/api/v1/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'MojoMap', slug: 'mojomap', description: 'GBP Geo-Grid Rank Intelligence' })
    });
    const cData = await createRes.json();
    proj = cData.data || cData;
  }
  console.log('Project:', proj?.id || proj);

  const taskRes = await fetch('https://daylit.apxero.dev/api/v1/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Comprehensive Production QA Suite & System Verification',
      priority: 'high',
      project_slug: 'mojomap',
      status: 'done'
    })
  });
  const tData = await taskRes.json();
  const task = tData.data || tData;
  console.log('Task created:', task?.id, task?.status);

  if (task?.id) {
    await fetch('https://daylit.apxero.dev/api/v1/tasks/' + task.id + '/notes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: '12/12 Automated QA checks passed on https://rankmap.digitalmojo.in. Resolved Ubuntu 24.04 Chromium library dependencies (libatk, libgbm, libcups, libasound2t64). Verified SQLite schema, Places API, Puppeteer headless scraper, zero console errors, zero mobile overflow (375px).'
      })
    });
    console.log('Daylit note appended successfully.');
  }
}

sync().catch(console.error);
