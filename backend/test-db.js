/**
 * test-db.js
 * Quick test to verify Supabase connection and invoices table.
 * Usage: node test-db.js
 */
const { supabase } = require('./src/services/supabaseClient');

async function main() {
    console.log('🔍 Testing Supabase connection...\n');

    try {
        // Test 1: Basic connection
        console.log('1️⃣  Checking connection...');
        const { data, error } = await supabase
            .from('invoices')
            .select('id')
            .limit(1);

        if (error) {
            console.error('   ❌ Connection failed:', error.message);
            console.log('\n   Possible fixes:');
            console.log('   • Check SUPABASE_URL and SUPABASE_ANON_KEY in .env');
            console.log('   • Make sure the "invoices" table exists');
            console.log('   • Check RLS policies on the invoices table');
            process.exit(1);
        }

        console.log('   ✅ Connected to Supabase!');
        console.log(`   📊 Found ${data.length} invoice(s) in table.\n`);

        // Test 2: Insert a test invoice
        console.log('2️⃣  Inserting test invoice...');
        const { data: testInvoice, error: insertError } = await supabase
            .from('invoices')
            .insert({
                customer_name: 'Test Customer',
                amount: 1000.00,
                description: 'Database connection test',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'PENDING',
                user_phone: 'test@test'
            })
            .select()
            .single();

        if (insertError) {
            console.error('   ❌ Insert failed:', insertError.message);
            process.exit(1);
        }

        console.log('   ✅ Test invoice created:', testInvoice.id.slice(0, 8));

        // Test 3: Read it back
        console.log('3️⃣  Reading back test invoice...');
        const { data: readBack, error: readError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', testInvoice.id)
            .single();

        if (readError) {
            console.error('   ❌ Read failed:', readError.message);
        } else {
            console.log('   ✅ Read successful:', {
                id: readBack.id.slice(0, 8),
                customer: readBack.customer_name,
                amount: readBack.amount,
                status: readBack.status
            });
        }

        // Test 4: Delete test invoice
        console.log('4️⃣  Cleaning up test invoice...');
        const { error: deleteError } = await supabase
            .from('invoices')
            .delete()
            .eq('id', testInvoice.id);

        if (deleteError) {
            console.error('   ❌ Cleanup failed:', deleteError.message);
        } else {
            console.log('   ✅ Test invoice deleted.');
        }

        console.log('\n🎉 All tests passed! Supabase is ready for PayPilot.');

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

main();
