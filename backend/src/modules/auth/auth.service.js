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
  const { data } = await fastify.supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function forgotPassword(fastify, email) {
  const { error } = await fastify.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:5173/reset-password",
  });

  if (error) throw new Error(error.message);

  return { message: "Reset email sent" };
}

export async function resetPassword(fastify, password, access_token) {
  const { error } = await fastify.supabase.auth.updateUser({
    password,
  });

  if (error) throw new Error(error.message);

  return { message: "Password updated" };
}