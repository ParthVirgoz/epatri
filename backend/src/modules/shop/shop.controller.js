export async function getShopController(req, reply) {
    try {
        const { username } = req.params;

        const { data, error } = await req.server.supabaseAdmin
            .from("profiles")
            .select("shop_name, id")
            .eq("shop_username", username)
            .single();

        if (error || !data) {
            return reply.code(404).send({ message: "Shop not found" });
        }

        const { data: menu } = await req.server.supabaseAdmin
            .from("menus")
            .select("pdf_url")
            .eq("user_id", data.id)
            .single();

        return {
            shop_name: data.shop_name,
            pdf_url: menu?.pdf_url || null,
        };
    } catch (err) {
        return reply.code(500).send({ message: err.message });
    }
}