#!/usr/bin/env node
/**
 * Set a user's password directly (admin). Useful to regain access when you don't
 * remember the password and don't want to wait on a reset email.
 *
 *   export SUPABASE_URL=https://<ref>.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=...           # secret / service_role key
 *   node scripts/set-password.mjs you@example.com 'YourNewPassword'
 */

import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const [, , email, newPassword] = process.argv;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
if (!email || !newPassword) {
  console.error("Usage: node scripts/set-password.mjs <email> <new-password>");
  process.exit(1);
}
if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find the user by email (paginate a little to be safe).
let user = null;
for (let page = 1; page <= 10 && !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("listUsers:", error.message);
    process.exit(1);
  }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
  if (data.users.length < 200) break;
}

if (!user) {
  console.error(`No user found with email ${email}.`);
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword,
  email_confirm: true,
});
if (error) {
  console.error("updateUser:", error.message);
  process.exit(1);
}

console.log(`Password updated for ${email}. You can log in now.`);
