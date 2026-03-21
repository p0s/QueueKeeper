import { BuyerDemo } from "../../components/buyer-demo";
import { getDefaultBuyerFormInput } from "../../lib/demo-data";

export const dynamic = "force-dynamic";

export default function BuyerPage() {
  return <BuyerDemo initialDraft={getDefaultBuyerFormInput()} initialJob={null} />;
}
