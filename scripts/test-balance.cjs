const dotenv = require('dotenv');
dotenv.config();

const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
const auth = Buffer.from(`${login}:${password}`).toString('base64');

fetch('https://api.dataforseo.com/v3/appendix/user_data', {
  headers: { 'Authorization': 'Basic ' + auth }
})
.then(res => res.json())
.then(data => {
  console.log('Status Code:', data.status_code);
  console.log('Status Message:', data.status_message);
  console.log('Tasks length:', data.tasks?.length);
  if (data.tasks?.[0]) {
    console.log('Task keys:', Object.keys(data.tasks[0]));
    console.log('Result:', JSON.stringify(data.tasks[0].result, null, 2));
  }
})
.catch(console.error);
