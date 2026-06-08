// Anchors arbitrary data hashes onto Polygon Amoy testnet.
// Stores tx hash in blockchain_transactions for traceability.
import { createClient } from "npm:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rpcUrl = Deno.env.get("POLYGON_AMOY_RPC_URL") || "https://rpc-amoy.polygon.technology";
    const privateKey = Deno.env.get("BLOCKCHAIN_PRIVATE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { transaction_type, data, escrow_id } = body;
    if (!transaction_type || !data) {
      return new Response(JSON.stringify({ error: "transaction_type and data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute keccak256 hash of payload
    const payload = JSON.stringify({ type: transaction_type, data, user_id: user.id, ts: Date.now() });
    const hash = ethers.keccak256(ethers.toUtf8Bytes(payload));

    // Send a 0-value self-transaction with hash in calldata to anchor it on-chain
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: hash,
    });

    // Persist with service role
    const admin = createClient(supabaseUrl, supabaseService);
    const { error } = await admin.from("blockchain_transactions").insert({
      hash: tx.hash,
      transaction_type,
      escrow_id: escrow_id ?? null,
      user_id: user.id,
      data: { payload_hash: hash, payload: data, chain: "polygon-amoy", from: wallet.address },
      status: "pending",
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        tx_hash: tx.hash,
        payload_hash: hash,
        explorer_url: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("blockchain-anchor error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});