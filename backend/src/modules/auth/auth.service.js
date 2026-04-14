import { env } from '../../config/env.js';

export async function registerUser(fastify, data) {
  const { email, password, shop_username, shop_name } = data;

  const { data: existing } = await fastify.supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("shop_username", shop_username)
    .single();

  if (existing) {
    throw new Error("Shop username already taken");
  }

  const { data: authData, error } =
    await fastify.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (error) throw new Error(error.message);

  const user = authData.user;

  await fastify.supabaseAdmin.from("profiles").insert({
    id: user.id,
    shop_username,
    shop_name,
    role: "branch_admin",
  });

  return { message: "Account created successfully" };
}

export async function loginUser(fastify, data) {
  const { email, password } = data;
  fastify.log.info('[loginUser] attempt', { email });

  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  try {
    const { data: loginData, error } =
      await fastify.supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      fastify.log.error('[loginUser] supabase login error', error);
      const err = new Error(error.message || 'Login failed');
      err.status = 401;
      throw err;
    }

    if (!loginData?.session || !loginData?.user) {
      const err = new Error('Login failed: invalid credentials or session');
      err.status = 401;
      throw err;
    }

    return {
      access_token: loginData.session.access_token,
      user: loginData.user,
    };
  } catch (err) {
    fastify.log.error('[loginUser] exception', err);
    throw err;
  }
}

export async function getCurrentUser(fastify, user) {
  const { data: profile, error } = await fastify.supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  const { data: menu } = await fastify.supabaseAdmin
    .from("menus")
    .select("pdf_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    ...profile,
    pdf_url: menu?.pdf_url ?? null,
  };
}

export async function forgotPassword(fastify, email) {
  const redirectTo = `${env.ADMIN_FRONTEND_URL.replace(/\/$/, '')}/reset-password`;
  const { error } = await fastify.supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw new Error(error.message);

  return { message: "Reset email sent" };
}

/** Body must include `password` and `access_token` from the Supabase recovery link (hash → SPA). */
export async function resetPassword(fastify, { password, access_token: accessToken }) {
  if (!password || !accessToken) {
    throw new Error('Password and access_token are required');
  }

  const { data: userData, error: userErr } = await fastify.supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    const err = new Error('Invalid or expired recovery token');
    err.status = 401;
    throw err;
  }

  const { error } = await fastify.supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
    password,
  });

  if (error) throw new Error(error.message);

  return { message: "Password updated" };
}