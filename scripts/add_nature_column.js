import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addNatureColumn() {
  try {
    const { error } = await supabase.rpc('execute_sql', {
      sql: "ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT '公办'"
    });
    if (error) {
      console.log('RPC error:', error.message);
    } else {
      console.log('✅ Nature column added successfully');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

addNatureColumn().catch(console.error);