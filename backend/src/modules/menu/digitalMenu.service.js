import { assertCanAccessLocation } from "../../services/tenantScope.service.js";
import { getMenuByIdAdmin, assertCanAccessMenu } from "./menu.admin.service.js";
import { validateDigitalMenuPayload } from "./digitalMenu.validation.js";

function clientError(message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

/**
 * Save structured digital menu JSON for a menu row (optional menu_id) or default menu for primary location.
 */
export async function updateDigitalMenuService(fastify, user, digital_menu, menuId) {
  if (digital_menu === undefined || typeof digital_menu !== "object" || Array.isArray(digital_menu)) {
    throw new Error("digital_menu must be a JSON object");
  }
  validateDigitalMenuPayload(digital_menu);

  const { data: profile, error: pErr } = await fastify.supabaseAdmin
    .from("profiles")
    .select("primary_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);

  if (menuId) {
    const menu = await getMenuByIdAdmin(fastify, menuId);
    await assertCanAccessMenu(fastify, user.id, menu);
    if (menu.status === 'published') {
      throw clientError(
        'Published menus are locked. Create a new draft version before saving interactive changes.',
        400,
      );
    }

    let { error } = await fastify.supabaseAdmin
      .from("menus")
      .update({ digital_menu, pdf_url: "", status: "draft", display_as: "interactive" })
      .eq("id", menuId);

    if (error && String(error.message || "").toLowerCase().includes("display_as")) {
      ({ error } = await fastify.supabaseAdmin
        .from("menus")
        .update({ digital_menu, pdf_url: "", status: "draft" })
        .eq("id", menuId));
    }

    if (error) throw new Error(error.message);
    return { message: "Digital menu saved", menu_id: menuId };
  }

  const { data: existing, error: e0 } = await fastify.supabaseAdmin
    .from("menus")
    .select("id, pdf_url, location_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (e0) throw new Error(e0.message);

  if (profile?.primary_location_id) {
    await assertCanAccessLocation(fastify, user.id, profile.primary_location_id);

    const { data: locMenu } = await fastify.supabaseAdmin
      .from("menus")
      .select("id, pdf_url")
      .eq("location_id", profile.primary_location_id)
      .eq("is_default", true)
      .maybeSingle();

    const { data: firstAlt } = await fastify.supabaseAdmin
      .from("menus")
      .select("id, pdf_url")
      .eq("location_id", profile.primary_location_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const target = locMenu || firstAlt;

    if (target?.id) {
      const targetMenu = await getMenuByIdAdmin(fastify, target.id);
      if (targetMenu?.status === 'published') {
        throw clientError(
          'Published menus are locked. Create a new draft version before saving interactive changes.',
          400,
        );
      }
      const patch = { digital_menu, pdf_url: "", status: "draft", display_as: "interactive" };
      let { error } = await fastify.supabaseAdmin.from("menus").update(patch).eq("id", target.id);
      if (error && String(error.message || "").toLowerCase().includes("display_as")) {
        const { display_as: _d, ...rest } = patch;
        ({ error } = await fastify.supabaseAdmin.from("menus").update(rest).eq("id", target.id));
      }
      if (error) throw new Error(error.message);
      return { message: "Digital menu saved", menu_id: target.id };
    }
  }

  const patch = { digital_menu, pdf_url: "", status: "draft", display_as: "interactive" };

  if (existing) {
    let { error } = await fastify.supabaseAdmin.from("menus").update(patch).eq("user_id", user.id);
    if (error && String(error.message || "").toLowerCase().includes("display_as")) {
      const { display_as: _d, ...rest } = patch;
      ({ error } = await fastify.supabaseAdmin.from("menus").update(rest).eq("user_id", user.id));
    }
    if (error) throw new Error(error.message);
  } else {
    const insert = { user_id: user.id, digital_menu, pdf_url: '' };
    if (profile?.primary_location_id) insert.location_id = profile.primary_location_id;
    const { error } = await fastify.supabaseAdmin.from("menus").insert(insert);
    if (error) throw new Error(error.message);
  }

  return { message: "Digital menu saved" };
}
