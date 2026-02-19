/**
 * setupDatabase.js
 * Run once to create the 'invoices' table in Supabase.
 * Usage: npm run setup-db
 */
const { supabase } = require('./services/supabaseClient');

async function setupDatabase() {
    console.log('🔧 Setting up PayPilot database tables...\n');

    // Create invoices table using Supabase's SQL RPC
    // NOTE: You can also create this table via the Supabase Dashboard SQL Editor.
    const { error } = await supabase.rpc('exec_sql', {
        query: `
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                customer_name TEXT NOT NULL,
                amount NUMERIC(12, 2) NOT NULL,
                description TEXT,
                due_date TIMESTAMPTZ,
                status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
                user_phone TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Index for scheduler queries on status + due_date
            CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices (status, due_date);

            -- Index for user_phone lookups
            CREATE INDEX IF NOT EXISTS idx_invoices_user_phone ON invoices (user_phone);
        `
    });

    if (error) {
        // RPC might not exist, show manual SQL instructions
        console.log('⚠️  Could not auto-create table via RPC (this is normal).');
        console.log('   Please run the following SQL in your Supabase Dashboard SQL Editor:\n');
        console.log(`
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    user_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scheduler queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices (status, due_date);

-- Index for user_phone lookups
CREATE INDEX IF NOT EXISTS idx_invoices_user_phone ON invoices (user_phone);
        `);
        console.log('\n📋 After running the SQL above, your database is ready!');
    } else {
        console.log('✅ Table "invoices" created successfully!');
    }

    // Verify connection by attempting a simple query
    console.log('\n🔍 Verifying database connection...');
    const { data, error: testError } = await supabase
        .from('invoices')
        .select('id')
        .limit(1);

    if (testError) {
        console.error('❌ Connection test failed:', testError.message);
        console.log('   Make sure the "invoices" table exists and RLS policies allow access.');
    } else {
        console.log('✅ Database connection verified! Found', data.length, 'existing invoices.');
        console.log('\n🚀 PayPilot is ready to go!');
    }
}

setupDatabase().catch(err => {
    console.error('Fatal error during setup:', err);
    process.exit(1);
});
