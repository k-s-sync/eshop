const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key is missing from .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'eshop'
    }
});

module.exports = supabase;
