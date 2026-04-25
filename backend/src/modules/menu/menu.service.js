import { assertCanAccessLocation } from "../../services/tenantScope.service.js";
import { assertCanAccessMenu, getMenuByIdAdmin } from "./menu.admin.service.js";
import { MAX_PDF_UPLOAD_BYTES } from "./menu.constants.js";
import { uuidParamSchema } from "./menu.schema.js";

function clientError(message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

async function updateMenuPdfFields(supa, menuId, userId, publicUrl) {
  const patch = {
    pdf_url: publicUrl,
    digital_menu: { categories: [] },
    status: "draft",
    user_id: userId,
    display_as: "pdf",
  };
  let { error } = await supa.from("menus").update(patch).eq("id", menuId);
  if (error && String(error.message || "").toLowerCase().includes("display_as")) {
    ({ error } = await supa
      .from("menus")
      .update({ pdf_url: publicUrl, digital_menu: { categories: [] }, status: "draft", user_id: userId })
      .eq("id", menuId));
  }
  if (error) throw new Error(error.message);
}

export async function uploadMenuService(fastify, req) {
  const user = req.user;

  let menuIdOpt =
    req.query?.menu_id != null && String(req.query.menu_id).trim() !== ""
      ? String(req.query.menu_id).trim()
      : null;
  let fileBuffer = null;
  let mimetype = null;

  for await (const part of req.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "file") continue;
      mimetype = part.mimetype;
      fileBuffer = await part.toBuffer();
    } else if (part.type === "field" && part.fieldname === "menu_id" && part.value != null) {
      const v = String(part.value).trim();
      if (v) menuIdOpt = v;
    }
  }

  if (!fileBuffer) {
    throw new Error("No file uploaded");
  }

  if (fileBuffer.length > MAX_PDF_UPLOAD_BYTES) {
    throw new Error(`PDF must be at most ${Math.floor(MAX_PDF_UPLOAD_BYTES / (1024 * 1024))} MB`);
  }

  if (mimetype !== "application/pdf") {
    throw new Error("Only PDF allowed");
  }

  if (menuIdOpt) {
    const ok = uuidParamSchema.safeParse(menuIdOpt);
    if (!ok.success) {
      throw new Error(ok.error.issues[0]?.message || "Invalid menu_id");
    }
  }

  const { data: profile, error: profErr } = await fastify.supabaseAdmin
    .from("profiles")
    .select("shop_username, primary_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) throw new Error(profErr.message);
  if (!profile?.shop_username) {
    throw new Error("Profile is missing a public shop username. Finish signup or contact support.");
  }

  const filePath = menuIdOpt
    ? `${profile.shop_username}/menu-${menuIdOpt}.pdf`
    : `${profile.shop_username}/menu.pdf`;

  const { error: uploadError } = await fastify.supabaseAdmin.storage
    .from("menus")
    .upload(filePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = fastify.supabaseAdmin.storage.from("menus").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  if (menuIdOpt) {
    const menu = await getMenuByIdAdmin(fastify, menuIdOpt);
    await assertCanAccessMenu(fastify, user.id, menu);
    if (menu.status === "published") {
      throw clientError(
        "Published menus are locked. Create a new draft version before uploading a PDF.",
        400,
      );
    }

    await updateMenuPdfFields(fastify.supabaseAdmin, menuIdOpt, user.id, publicUrl);

    return {
      message: "Menu uploaded successfully",
      url: publicUrl,
    };
  }

  if (profile?.primary_location_id) {
    await assertCanAccessLocation(fastify, user.id, profile.primary_location_id);

    const { data: loc } = await fastify.supabaseAdmin
      .from("locations")
      .select("business_id")
      .eq("id", profile.primary_location_id)
      .maybeSingle();

    const { data: defMenu } = await fastify.supabaseAdmin
      .from("menus")
      .select("id")
      .eq("location_id", profile.primary_location_id)
      .eq("is_default", true)
      .maybeSingle();

    const { data: firstMenu } = await fastify.supabaseAdmin
      .from("menus")
      .select("id")
      .eq("location_id", profile.primary_location_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const menuId = defMenu?.id || firstMenu?.id;

    if (menuId) {
      const targetMenu = await getMenuByIdAdmin(fastify, menuId);
      if (targetMenu?.status === "published") {
        throw clientError(
          "Published menus are locked. Create a new draft version before uploading a PDF.",
          400,
        );
      }
      await updateMenuPdfFields(fastify.supabaseAdmin, menuId, user.id, publicUrl);
    } else {
      const insert = {
        user_id: user.id,
        pdf_url: publicUrl,
        location_id: profile.primary_location_id,
        business_id: loc?.business_id ?? null,
        title: "Menu",
        status: "published",
        is_default: true,
        digital_menu: {},
      };
      const { error: insErr } = await fastify.supabaseAdmin.from("menus").insert(insert);
      if (insErr) throw new Error(insErr.message);
    }
  } else {
    const menuRow = {
      user_id: user.id,
      pdf_url: publicUrl,
    };

    const { error: dbError } = await fastify.supabaseAdmin.from("menus").upsert(menuRow);

    if (dbError) {
      throw new Error(dbError.message);
    }
  }

  return {
    message: "Menu uploaded successfully",
    url: publicUrl,
  };
}
