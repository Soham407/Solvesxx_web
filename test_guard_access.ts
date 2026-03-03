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
    return;
  }
  
  console.log("Logged in as", session?.user.id);
  
  const { data, error } = await supabase.from("visitors").select("*").limit(1);
  console.log("Visitors error:", error);
  
  const { data: alerts, error: alertsErr } = await supabase.from("panic_alerts").select("*").limit(1);
  console.log("Alerts Error:", alertsErr);
}

run();
