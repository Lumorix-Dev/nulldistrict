import { PRODUCT_NAME, VERSION } from "@nulldistrict/shared";

export function SplashScreen() {
  return (
    <main className="splash-screen">
      <div className="brand-mark">LX</div>
      <div>
        <p className="kicker">Lumorix flagship beta</p>
        <h1>{PRODUCT_NAME}</h1>
        <span className="version-pill">{VERSION}</span>
      </div>
    </main>
  );
}
