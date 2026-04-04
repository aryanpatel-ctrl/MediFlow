import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import toast from "react-hot-toast";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, user, isAuthenticated, clearAuthError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect all authenticated users to dashboard
    if (isAuthenticated && user) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearAuthError();
    }
  }, [error, clearAuthError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (!result.error) {
      toast.success("Login successful!");
      // Navigation will happen via useEffect when user state updates
    }
  };

  // Auto-fill demo credentials
  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    toast.success("Credentials filled! Click Login to continue.");
  };

  return (
    <main className="signup-page login-page">
      <section className="signup-promo login-promo">
        <div className="signup-brand">MediFlow</div>
        <div className="signup-promo__copy">
          <h1>Smart Healthcare Scheduling</h1>
          <p>AI-powered triage, real-time queue tracking, and intelligent appointment management for modern hospitals.</p>
        </div>
        <div className="signup-monitor-scene login-scene" aria-hidden="true">
          <div className="login-laptop">
            <div className="login-laptop__screen" />
          </div>
          <div className="login-phone">
            <div className="login-phone__screen" />
          </div>
        </div>
        <footer className="signup-footer">
          <span>Built for CRAFATHON'26</span>
          <div>
            <span>Privacy Policy</span>
            <span>Terms & Conditions</span>
          </div>
        </footer>
      </section>

      <section className="signup-form-panel">
        <div className="signup-form-card">
          <div className="signup-form-card__head">
            <h2>Welcome Back to MediFlow</h2>
            <p>Sign in to manage appointments, track queues, and access AI-powered healthcare tools.</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <label className="signup-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="signup-field">
              <span>Password</span>
              <div className="signup-password">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "○" : "●"}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="signup-check">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>
              <a href="/signup">Forgot Password?</a>
            </div>

            <button className="signup-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <p className="signup-login-link">
              New to MediFlow? <a href="/signup">Create an account</a>
            </p>
          </form>

          {/* Demo Credentials - Clickable */}
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p
              className="demo-credential-item"
              onClick={() => fillCredentials("rahul@example.com", "patient123")}
            >
              Patient: rahul@example.com / patient123
            </p>
            <p
              className="demo-credential-item"
              onClick={() => fillCredentials("dr.rajesh@cityhospital.com", "doctor123")}
            >
              Doctor: dr.rajesh@cityhospital.com / doctor123
            </p>
            <p
              className="demo-credential-item"
              onClick={() => fillCredentials("cityhospital@mediflow.ai", "hospital123")}
            >
              Admin: cityhospital@mediflow.ai / hospital123
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
