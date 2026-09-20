import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      console.log("API Response:", result);

      if (!response.ok) {
        setError(result.message || "Login failed");
        return;
      }

      // Save authentication tokens
      localStorage.setItem("accessToken", result.data.accessToken);

      localStorage.setItem("refreshToken", result.data.refreshToken);

      // Save logged-in user
      localStorage.setItem("user", JSON.stringify(result.data.user));

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      {/* LEFT PANEL */}
      <section className="panel-left">
        <div className="brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3.2" fill="#ffffff" />

              <path
                d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <circle
                cx="17"
                cy="7.5"
                r="2.6"
                fill="#ffffff"
                fillOpacity="0.7"
              />

              <path
                d="M14.5 19c.2-2.8 2-5 4.7-5.2"
                stroke="#ffffff"
                strokeOpacity="0.7"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="brand-text">
            <h1>HRMS</h1>
            <p>Human Resource Management System</p>
          </div>
        </div>

        <div className="hero">
          <h2>
            Better People.
            <br />
            Stronger Teams.
            <br />A Brighter Future.
          </h2>

          <p>
            Manage your workforce, track performance, and build a better
            tomorrow — all in one place.
          </p>
        </div>

        <div className="feature-row">
          <div className="feature">
            <div className="icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3" fill="#2952E3" />

                <path
                  d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
                  stroke="#2952E3"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                <circle
                  cx="16.5"
                  cy="7.5"
                  r="2.4"
                  fill="#2952E3"
                  fillOpacity="0.55"
                />

                <path
                  d="M14.5 19c.1-2.6 1.9-4.6 4.4-4.8"
                  stroke="#2952E3"
                  strokeOpacity="0.55"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <span>Employees</span>
          </div>

          <div className="feature">
            <div className="icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3.5"
                  y="4.5"
                  width="17"
                  height="16"
                  rx="3"
                  stroke="#2952E3"
                  strokeWidth="1.7"
                />

                <path d="M3.5 9.5h17" stroke="#2952E3" strokeWidth="1.7" />

                <path
                  d="M8 3v3M16 3v3"
                  stroke="#2952E3"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                <rect
                  x="7"
                  y="12"
                  width="3"
                  height="3"
                  rx="0.6"
                  fill="#2952E3"
                />
              </svg>
            </div>

            <span>Attendance</span>
          </div>

          <div className="feature">
            <div className="icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="13"
                  width="3.2"
                  height="7"
                  rx="0.6"
                  fill="#2952E3"
                  fillOpacity="0.55"
                />

                <rect
                  x="10.4"
                  y="9"
                  width="3.2"
                  height="11"
                  rx="0.6"
                  fill="#2952E3"
                  fillOpacity="0.8"
                />

                <rect
                  x="16.8"
                  y="5"
                  width="3.2"
                  height="15"
                  rx="0.6"
                  fill="#2952E3"
                />
              </svg>
            </div>

            <span>Performance</span>
          </div>

          <div className="feature">
            <div className="icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="4"
                  width="14"
                  height="17"
                  rx="2.2"
                  stroke="#2952E3"
                  strokeWidth="1.7"
                />

                <rect
                  x="8.5"
                  y="2.6"
                  width="7"
                  height="3.2"
                  rx="1"
                  fill="#2952E3"
                />

                <path
                  d="M8.2 11h7.6M8.2 14.3h7.6M8.2 17.6h4.8"
                  stroke="#2952E3"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <span>Leave &amp; Payroll</span>
          </div>
        </div>

        {/* Illustration */}
        <svg
          className="illustration"
          viewBox="0 0 420 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="210" cy="270" rx="160" ry="14" fill="#dbe6f7" />

          {/* Plant */}
          <g>
            <path
              d="M60 210c-8-16-2-32 10-38 4 14-2 30-10 38z"
              fill="#3a6b52"
            />

            <path
              d="M60 210c4-18 18-28 32-26-2 16-16 28-32 26z"
              fill="#4c8768"
            />

            <rect
              x="44"
              y="208"
              width="34"
              height="30"
              rx="4"
              fill="#ffffff"
              stroke="#c9d6ea"
              strokeWidth="2"
            />
          </g>

          {/* Desk */}
          <rect x="30" y="238" width="330" height="10" rx="3" fill="#c9d6ea" />

          <rect x="45" y="248" width="8" height="34" fill="#c9d6ea" />

          <rect x="330" y="248" width="8" height="34" fill="#c9d6ea" />

          {/* Mug */}
          <path
            d="M300 214h20v18a10 10 0 0 1-10 10h0a10 10 0 0 1-10-10v-18z"
            fill="#33436b"
          />

          <path
            d="M320 220c6-1 10 2 10 7s-4 8-10 7"
            stroke="#33436b"
            strokeWidth="3"
            fill="none"
          />

          {/* Chair */}
          <path d="M150 300l6-60c1-8 8-14 16-14h6l6 74z" fill="#101B39" />

          <rect x="150" y="196" width="70" height="16" rx="6" fill="#101B39" />

          {/* Laptop */}
          <g>
            <rect
              x="215"
              y="150"
              width="105"
              height="72"
              rx="4"
              fill="#ffffff"
              stroke="#c9d6ea"
              strokeWidth="2"
            />

            <circle cx="240" cy="172" r="10" fill="#2952E3" />

            <path
              d="M228 196c2-9 8-14 12-14s10 5 12 14"
              stroke="#2952E3"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />

            <rect x="262" y="164" width="42" height="4" rx="2" fill="#dbe6f7" />

            <rect x="262" y="174" width="42" height="4" rx="2" fill="#dbe6f7" />

            <rect x="262" y="184" width="30" height="4" rx="2" fill="#dbe6f7" />

            <path
              d="M210 222h130l6 10H204z"
              fill="#e3ecfb"
              stroke="#c9d6ea"
              strokeWidth="2"
            />
          </g>

          {/* Person */}
          <g>
            <path
              d="M118 300l4-70c1-24 20-42 44-42h4c24 0 43 18 44 42l4 70z"
              fill="#2952E3"
            />

            <path
              d="M148 190c0-14 8-24 22-24s22 10 22 24l-4 20h-36z"
              fill="#2952E3"
            />

            <circle cx="170" cy="158" r="26" fill="#f3b48a" />

            <path
              d="M144 150c0-20 12-32 26-32s26 12 26 32c0-4-6-10-12-8-2-8-10-10-14-10s-10 4-12 10c-8-4-14 2-14 8z"
              fill="#101B39"
            />

            <path
              d="M205 220c10 4 22 6 34 4"
              stroke="#f3b48a"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <circle cx="243" cy="222" r="8" fill="#f3b48a" />
          </g>
        </svg>

        <div className="footer-tag">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l8 3.5v6c0 5-3.5 8.7-8 10.5-4.5-1.8-8-5.5-8-10.5v-6L12 2z"
              fill="#2952E3"
            />

            <path
              d="M9 12l2 2 4-5"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>
            Secure
            <span className="dot"></span>
            Reliable
            <span className="dot"></span>
            Built for Your Team
          </span>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section className="panel-right">
        <h2>Welcome Back</h2>

        <p className="sub">Sign in to your HRMS account</p>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="field">
            <label htmlFor="email">Email Address</label>

            <div className="input-wrap">
              <svg
                className="leading"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M3.5 6.5l8.5 6 8.5-6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label htmlFor="password">Password</label>

            <div className="input-wrap">
              <svg
                className="leading"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="5"
                  y="10.5"
                  width="14"
                  height="9.5"
                  rx="2.2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <span
                className="toggle-eye"
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  {!showPassword && (
                    <path
                      d="M3 3l18 18"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              style={{
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "15px",
              }}
            >
              {error}
            </p>
          )}

          {/* Remember + Forgot */}
          <div className="row-between">
            <label className="remember">
              <input type="checkbox" defaultChecked />
              Remember me
            </label>

            <a href="#" className="link" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}

            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <div className="divider">OR</div>

          {/* Google */}
          <button
            type="button"
            className="btn-google"
            onClick={() => alert("Google login is not configured yet.")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
              />

              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.5 0-14 4.1-17.7 10.7z"
              />

              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.5 5C9.9 39.8 16.4 44 24 44z"
              />

              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-5.3 6.9-5.3 6.9l6.2 5.2C39.5 37.4 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            Contact your administrator
          </a>
        </p>
      </section>
    </div>
  );
}

export default Login;
