export async function uploadMenuService(fastify, req) {
    const user = req.user;

    const file = await req.file();

    if (!file) {
        throw new Error("No file uploaded");
    }

    // validate type
    if (file.mimetype !== "application/pdf") {
        throw new Error("Only PDF allowed");
    }

    const buffer = await file.toBuffer();

    // get shop_username
    const { data: profile } = await fastify.supabaseAdmin
        .from("profiles")
        .select("shop_username")
        .eq("id", user.id)
        .single();

    const filePath = `${profile.shop_username}/menu.pdf`;

    // upload to storage
    const { error: uploadError } = await fastify.supabaseAdmin.storage
        .from("menus")
        .upload(filePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
        });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    // get public URL
    const { data } = fastify.supabaseAdmin.storage
        .from("menus")
        .getPublicUrl(filePath);

    // save in DB
    const { error: dbError } = await fastify.supabaseAdmin
        .from("menus")
        .upsert({
            user_id: user.id,
            pdf_url: data.publicUrl,
        });

    if (dbError) {
        throw new Error(dbError.message);
    }

    return {
        message: "Menu uploaded successfully",
        url: data.publicUrl,
    };
}