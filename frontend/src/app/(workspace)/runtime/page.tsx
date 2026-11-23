import { Suspense } from "react";
import RuntimeDemo from "./runtime-demo";

// RuntimeDemo đọc ?scenario=sse|approval|cancel bằng useSearchParams(); Next.js yêu cầu
// Suspense bao quanh để phần còn lại của page vẫn prerender được khi build.
export default function RuntimePage() {
  return (
    <Suspense>
      <RuntimeDemo />
    </Suspense>
  );
}
