import dotenv from 'dotenv';
dotenv.config();

async function executeAlter() {
  const sql = 'ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT \'公办\'';
  
  const response = await fetch(process.env.SUPABASE_URL + '/rest/v1/rpc/execute_sql', {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: sql })
  });
  
  const result = await response.json();
  console.log('HTTP Status:', response.status);
  console.log('Result:', result);
}

executeAlter().catch(console.error);