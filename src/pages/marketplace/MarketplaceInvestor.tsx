import { Navigate } from "react-router-dom";

/** Le marketplace investisseur est fusionné dans le hub unifié /investisseur. */
export default function MarketplaceInvestor() {
  return <Navigate to="/investisseur" replace />;
}
