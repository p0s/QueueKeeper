import { BuyerDemo } from "../../components/buyer-demo";
import { sampleJob } from "../../lib/sample-data";

export default function BuyerPage() {
  return <BuyerDemo initialJob={sampleJob} />;
}
