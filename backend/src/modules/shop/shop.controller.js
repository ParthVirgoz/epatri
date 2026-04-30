export async function getShopController(req, reply) {
    try {
        const { username } = req.params;

        const { data: business, error } = await req.server.supabaseAdmin
            .from("businesses")
            .select("id, name, slug")
            .eq("slug", username)
            .maybeSingle();

        if (error || !business) {
            return reply.code(404).send({ message: "Shop not found" });
        }

        const { data: primaryLoc } = await req.server.supabaseAdmin
            .from("locations")
            .select("id")
            .eq("business_id", business.id)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        const { data: snapshot } = primaryLoc
            ? await req.server.supabaseAdmin
                .from("menu_snapshots")
                .select("pdf_url")
                .eq("business_id", business.id)
                .eq("location_id", primaryLoc.id)
                .eq("state", "published")
                .eq("menu_type", "pdf")
                .maybeSingle()
            : { data: null };

        return {
            shop_name: business.name,
            pdf_url: snapshot?.pdf_url || null,
        };
    } catch (err) {
        return reply.code(500).send({ message: err.message });
    }
}