import { useEffect, useState } from "react";
import {
  getMySubscription,
  subscribeToPlan,
} from "../services/subscriptionService";
import { getActivePlans } from "../services/planService";
import { Icon } from "../components/Icon";

export default function MySubscription() {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [subResult, plansResult] = await Promise.all([
        getMySubscription(),
        getActivePlans(),
      ]);
      setSubscription(subResult.data.data);
      setPlans(plansResult.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChangePlan = async (e) => {
    e.preventDefault();
    setChangeError("");

    if (!selectedPlanId) {
      setChangeError("Choose a plan first.");
      return;
    }

    try {
      setChanging(true);
      const result = await subscribeToPlan({
        planId: selectedPlanId,
        billingCycle,
      });
      setSubscription(result.data.data);
      setSelectedPlanId("");
    } catch (err) {
      setChangeError(
        err.response?.data?.message || err.message || "Failed to change plan",
      );
    } finally {
      setChanging(false);
    }
  };

  const plan = subscription?.planId;

  return (
    <>
      <div className="welcome-row">
        <div className="welcome-text">
          <h1>
            <Icon name="list" size={22} className="crown-icon" /> Subscription
          </h1>
          <p>Your plan, usage, and billing.</p>
        </div>
      </div>

      {loading ? (
        <section className="panel">
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading subscription...
          </div>
        </section>
      ) : error ? (
        <section className="panel">
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h2>
                <Icon name="list" size={16} /> Current Plan
              </h2>
              <span
                className={`badge ${subscription.status === "active" ? "success" : "warning"}`}
              >
                {subscription.status}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
                padding: "16px 0",
              }}
            >
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Plan
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {plan?.name || "-"}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Active Employees
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {subscription.employeeCount}
                  {plan?.maxEmployees ? ` / ${plan.maxEmployees}` : ""}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Billing Cycle
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    textTransform: "capitalize",
                  }}
                >
                  {subscription.billingCycle}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Current Price
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {plan?.isCustomPricing
                    ? "Custom pricing"
                    : `${subscription.currency} ${subscription.totalAmount.toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Renews
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {subscription.nextBillingDate
                    ? new Date(
                        subscription.nextBillingDate,
                      ).toLocaleDateString()
                    : "Never (Free plan)"}
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="plusCircle" size={16} /> Upgrade / Change Plan
              </h2>
            </div>

            <form onSubmit={handleChangePlan} style={{ padding: "16px 0" }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 2, minWidth: 220 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 12.5,
                    }}
                  >
                    Plan
                  </label>
                  <select
                    className="search-box"
                    style={{ width: "100%", padding: "9px 12px" }}
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    <option value="">Select a plan</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                        {p.isCustomPricing
                          ? " — Custom pricing"
                          : ` — NPR ${p.monthlyPricePerEmployee}/employee/mo`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 12.5,
                    }}
                  >
                    Billing Cycle
                  </label>
                  <select
                    className="search-box"
                    style={{ width: "100%", padding: "9px 12px" }}
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (~17% off)</option>
                  </select>
                </div>
              </div>

              {changeError && (
                <p
                  style={{
                    color: "var(--red)",
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {changeError}
                </p>
              )}

              <button
                type="submit"
                disabled={changing}
                className="quick-btn blue"
                style={{
                  width: "auto",
                  flexDirection: "row",
                  padding: "9px 16px",
                }}
              >
                {changing ? "Updating..." : "Confirm Plan Change"}
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
