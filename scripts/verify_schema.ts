import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";

for (const line of env.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
    supabaseUrl = line.split("=")[1].trim();
  }
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
    supabaseKey = line.split("=")[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: "guard1@test.com",
    password: "password123",
  });
  
  if (authErr) {
    console.error("Auth Error:", authErr.message);
  } else {
    console.log("Logged in as", session?.user.id);
  }
  
  // Fetch columns via a simple select
  const { data: q1, error: e1 } = await supabase.from("daily_checklists").select("*").limit(1);
  console.log("daily_checklists:* error:", e1?.message);
  if(q1 && q1.length > 0) console.log("daily_checklists cols:", Object.keys(q1[0]));

  const { data: q2, error: e2 } = await supabase.from("attendance_logs").select("*").limit(1);
  console.log("attendance_logs:* error:", e2?.message);
  if(q2 && q2.length > 0) console.log("attendance_logs cols:", Object.keys(q2[0]));

  const { data: q3, error: e3 } = await supabase.rpc('hello_world'); // just to hit something else
}

run();
