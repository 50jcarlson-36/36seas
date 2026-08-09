type ServiceOrder = {
  id: string;
  status: string;
  member_tier: string;
  amount_total: number | null;
  currency: string | null;
  created_at: string;
  metadata: { title?: string; wordCount?: number } | null;
};

type ServiceRequest = {
  id: string;
  status: string;
  member_tier: string;
  discount_percent: number;
  genre: string | null;
  target_word_count: number | null;
  brief: string;
  created_at: string;
};

export default function ServiceAdminPanel({
  orders,
  requests,
}: {
  orders: ServiceOrder[];
  requests: ServiceRequest[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <h3 className="font-display text-lg">Human evaluations</h3>
        <div className="mt-3 space-y-3">
          {orders.length === 0 && <p className="text-sm text-muted">No human evaluation orders yet.</p>}
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-display text-lg">{order.metadata?.title || "Untitled manuscript"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {order.metadata?.wordCount?.toLocaleString() || "Unknown"} words · {order.member_tier} member
                  </p>
                </div>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                  {order.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-4 text-xs text-muted">
                {order.amount_total != null
                  ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "usd" }).format(order.amount_total / 100)} paid`
                  : "Checkout not completed"}
                {" · "}{new Date(order.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg">Managed writing inquiries</h3>
        <div className="mt-3 space-y-3">
          {requests.length === 0 && <p className="text-sm text-muted">No managed writing requests yet.</p>}
          {requests.map((request) => (
            <article key={request.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-display text-lg">{request.genre || "Genre not specified"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {request.target_word_count?.toLocaleString() || "Unknown"} words · {request.member_tier} member · {request.discount_percent}% rate savings
                  </p>
                </div>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                  {request.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{request.brief}</p>
              <p className="mt-3 text-xs text-muted">Received {new Date(request.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
