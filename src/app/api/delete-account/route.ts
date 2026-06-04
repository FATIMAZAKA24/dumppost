import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'No user ID' }, { status: 400 });

    // Delete all user data
    await supabaseAdmin.from('interactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId);
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // Delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}