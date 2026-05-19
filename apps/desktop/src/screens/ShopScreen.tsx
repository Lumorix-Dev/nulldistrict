import { useEffect, useState } from "react";
import { BadgeEuro, Check, Gem, ShieldCheck, Sparkles } from "lucide-react";
import type { ShopProduct } from "@nulldistrict/shared";
import { api } from "../api/client";
import { Panel } from "../components/Panel";

export function ShopScreen({ token, premium, onPurchased }: { token: string; premium: number; onPurchased: () => void }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api.shopProducts().then((response) => {
      setProducts(response.products);
      if (response.message) setMessage(response.message);
    });
  }, []);

  async function purchase(slug: string) {
    setLoading(true);
    setMessage("");
    try {
      await api.purchaseTest(token, slug);
      setMessage("Beta test purchase verified. Cosmetic and currency grants are server-side.");
      onPurchased();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Purchase failed.");
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
          </article>
        ))}
      </div>
      {message ? <div className="notice-line">{message}</div> : null}
    </Panel>
  );
}
