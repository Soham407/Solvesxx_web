import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

function createServiceRoleClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Missing SUPABASE environment variables.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getRoleId(supabaseAdmin: any, roleName: string) {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_name", roleName)
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`Role "${roleName}" not found`);
  }

  return String(data.id);
}

async function seed() {
  console.log('🚀 Starting client data seed...');
  const supabase = createServiceRoleClient();

  try {
    // 1. Get society_manager role
    const managerRoleId = await getRoleId(supabase, 'society_manager');

    // 2. Find or create a society manager
    let authUserId: string;
    let employeeId: string | null = null;
    const managerEmail = 'manager.aadish@solvesxx.com';

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, employee_id')
      .eq('email', managerEmail)
      .maybeSingle();

    if (userData) {
      authUserId = userData.id;
      employeeId = userData.employee_id;
      console.log(`✅ Using existing manager user: ${managerEmail} (Auth: ${authUserId})`);
    } else {
      console.log(`Creating new manager auth: ${managerEmail}`);
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: managerEmail,
        password: 'Password@123',
        email_confirm: true,
        user_metadata: { role: 'society_manager' }
      });

      if (authError) throw authError;
      authUserId = authUser.user.id;
    }

    // 2b. Ensure employee record exists
    if (!employeeId) {
      console.log(`Creating employee record for manager...`);
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .insert({
          employee_code: `EMP-MGR-${Date.now().toString(36).toUpperCase()}`,
          first_name: 'Aadish',
          last_name: 'Manager',
          email: managerEmail,
          auth_user_id: authUserId,
          is_active: true,
          date_of_joining: new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single();

      if (empError) throw empError;
      employeeId = empData.id;

      // Update public.users entry
      await supabase.from('users').upsert({
        id: authUserId,
        employee_id: employeeId,
        full_name: 'Aadish Manager',
        email: managerEmail,
        role_id: managerRoleId,
        username: `aadish_mgr_${Date.now().toString(36)}`,
        is_active: true
      }, { onConflict: 'id' });
      
      console.log(`✅ Linked manager to employee: ${employeeId}`);
    }

    // 3. Create Aadish Society
    const societyName = 'Aadish Society';
    const societyCode = 'AADISH-01';

    const { data: society, error: societyError } = await supabase
      .from('societies')
      .upsert({
        society_name: societyName,
        society_code: societyCode,
        society_manager_id: employeeId,
        address: '123 Aadish Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        is_active: true
      }, { onConflict: 'society_code' })
      .select()
      .single();

    if (societyError) throw societyError;
    console.log(`✅ Society "${societyName}" ready.`);

    // 4. Create Buildings
    const buildings = [
      { name: 'Tower A', code: 'T-A' },
      { name: 'Tower B', code: 'T-B' }
    ];

    for (const b of buildings) {
      const { data: building, error: bError } = await supabase
        .from('buildings')
        .upsert({
          society_id: society.id,
          building_name: b.name,
          building_code: b.code,
          total_floors: 10,
          total_flats: 40,
          is_active: true
        }, { onConflict: 'society_id,building_code' })
        .select()
        .single();

      if (bError) throw bError;
      console.log(`✅ Building "${b.name}" ready.`);

      // 5. Create Flats (5 per building)
      const flats = [];
      for (let i = 1; i <= 5; i++) {
        flats.push({
          building_id: building.id,
          flat_number: `${b.code.split('-')[1]}${100 + i}`,
          floor_number: 1,
          is_occupied: false,
          is_active: true
        });
      }

      const { error: fError } = await supabase
        .from('flats')
        .upsert(flats, { onConflict: 'building_id,flat_number' });

      if (fError) throw fError;
      console.log(`✅ 5 flats created for ${b.name}.`);
    }

    console.log('\n=== SEED SUMMARY ===');
    console.log(`Society: ${societyName}`);
    console.log(`Manager: ${managerEmail}`);
    console.log(`Buildings: ${buildings.length}`);
    console.log(`Total Flats: ${buildings.length * 5}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
  }
}

seed();
