import { useEffect, useState } from "react";
import { BadgeEuro, Check, ExternalLink, Gem, History, ShieldCheck, Sparkles } from "lucide-react";
import type { PurchaseHistoryEntry, ShopProduct } from "@nulldistrict/shared";
import { api } from "../api/client";
import { Panel } from "../components/Panel";

export function ShopScreen({ token, premium, onPurchased }: { token: string; premium: number; onPurchased: () => void }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHistoryEntry[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api.shopProducts().then((response) => {
      setProducts(response.products);
      if (response.message) setMessage(response.message);
    }).catch((err) => setMessage(err instanceof Error ? err.message : "Could not load shop."));
    void loadHistory().catch((err) => setMessage(err instanceof Error ? err.message : "Could not load purchase history."));
  }, [token]);

  async function loadHistory() {
    const response = await api.purchaseHistory(token);
    setPurchases(response.purchases);
  }

  async function purchase(slug: string) {
    setLoading(true);
    setMessage("");
    try {
      await api.purchaseTest(token, slug);
      setMessage("Beta test purchase verified. Cosmetic and currency grants are server-side.");
      await loadHistory();
      onPurchased();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout(slug: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.createCheckoutSession(token, slug);
      window.open(response.url, "_blank", "noopener,noreferrer");
      setMessage("Stripe checkout opened. Fulfillment happens through the signed webhook.");
      await loadHistory();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Checkout is not enabled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title="Null Market" kicker="Cosmetics only">
      <div className="currency-strip">
        <Gem size={18} />
        <strong>{premium}</strong>
        <span>Null Credits</span>
        <ShieldCheck size={18} />
        <span>No paid power</span>
      </div>

      <div className="shop-grid">
        {products.map((product) => (
          <article className="shop-product" key={product.id}>
            <div className="product-icon">
              {product.productType === "PREMIUM_CURRENCY" ? <Gem /> : product.productType === "FOUNDER_PACK" ? <Sparkles /> : <BadgeEuro />}
            </div>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
            <div className="price-line">
              {product.premiumPrice ? `${product.premiumPrice} credits` : product.priceCents ? `EUR ${(product.priceCents / 100).toFixed(2)} later` : "Beta test"}
            </div>
            <button className="secondary-button" disabled={loading} onClick={() => void purchase(product.slug)}>
              <Check size={16} /> Test purchase
            </button>
            {product.priceCents > 0 ? (
              <button className="secondary-button" disabled={loading} onClick={() => void checkout(product.slug)}>
                <ExternalLink size={16} /> Stripe checkout
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <div className="purchase-history">
        <h3><History size={16} /> Purchase history</h3>
        {purchases.length ? purchases.slice(0, 6).map((purchase) => (
          <div key={purchase.id}>
            <strong>{purchase.productTitle}</strong>
            <span>{purchase.provider} - {purchase.status}</span>
          </div>
        )) : <span>No purchases on this account yet.</span>}
      </div>
      {message ? <div className="notice-line">{message}</div> : null}
    </Panel>
  );
}
