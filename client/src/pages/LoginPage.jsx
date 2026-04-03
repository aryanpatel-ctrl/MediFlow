import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import toast from "react-hot-toast";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, isAuthenticated, clearAuthError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

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
    }
  };

  return (
    <main className="signup-page login-page">
      <section className="signup-promo login-promo">
        <div className="signup-brand">MedQueue AI</div>
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
            <h2>Welcome Back to MedQueue</h2>
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
              {loading === 'login' ? "Signing in..." : "Login"}
            </button>

            <p className="signup-login-link">
              New to MedQueue? <a href="/signup">Create an account</a>
            </p>
          </form>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Patient: rahul@example.com / patient123</p>
            <p>Doctor: dr.rajesh@cityhospital.com / doctor123</p>
            <p>Admin: cityhospital@medqueue.ai / hospital123</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
