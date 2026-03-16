const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL or SUPABASE_KEY is missing from environment variables. Please check your Render dashboard settings.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'eshop'
    }
});

module.exports = supabase;
