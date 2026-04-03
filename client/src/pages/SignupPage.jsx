import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import toast from "react-hot-toast";

function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: ""
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, sendOTP, verifyOTP, loading, error, isAuthenticated, otpSent, clearAuthError } = useAuth();
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

  useEffect(() => {
    if (otpSent && step === 1) {
      toast.success("OTP sent to your phone");
      setStep(2);
    }
  }, [otpSent, step]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    await sendOTP(formData.phone, "registration");
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const verifyResult = await verifyOTP(formData.phone, otp, "registration");
    if (!verifyResult.error) {
      const registerResult = await register(formData);
      if (!registerResult.error) {
        toast.success("Registration successful!");
      }
    }
  };

  return (
    <main className="signup-page">
      <section className="signup-promo">
        <div className="signup-brand">MedQueue AI</div>
        <div className="signup-promo__copy">
          <h1>Smart Healthcare Scheduling</h1>
          <p>AI-powered triage, real-time queue tracking, and intelligent appointment management for modern hospitals.</p>
        </div>
        <div className="signup-monitor-scene" aria-hidden="true">
          <div className="signup-monitor">
            <div className="signup-monitor__screen" />
          </div>
          <div className="signup-keyboard" />
          <div className="signup-mouse" />
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
            <h2>{step === 1 ? "Create Your MedQueue Account" : "Verify Your Phone"}</h2>
            <p>
              {step === 1
                ? "Register to access AI-powered healthcare scheduling and real-time queue management."
                : `Enter the OTP sent to ${formData.phone}`
              }
            </p>
          </div>

          {step === 1 ? (
            <form className="signup-form" onSubmit={handleSendOTP}>
              <label className="signup-field">
                <span>Full Name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="signup-field">
                <span>Email Address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="signup-field">
                <span>Phone Number</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 XXXXXXXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="signup-field-grid">
                <label className="signup-field">
                  <span>Date of Birth</span>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="signup-field">
                  <span>Gender</span>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div className="signup-field-grid">
                <label className="signup-field">
                  <span>Password</span>
                  <div className="signup-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      minLength={6}
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

                <label className="signup-field">
                  <span>Confirm Password</span>
                  <div className="signup-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      minLength={6}
                      required
                    />
                  </div>
                </label>
              </div>

              <label className="signup-check">
                <input type="checkbox" required />
                <span>I agree to the Terms &amp; Conditions</span>
              </label>

              <button className="signup-submit" type="submit" disabled={loading === 'sendOTP'}>
                {loading === 'sendOTP' ? "Sending OTP..." : "Continue"}
              </button>

              <p className="signup-login-link">
                Already have an account? <a href="/login">Login</a>
              </p>
            </form>
          ) : (
            <form className="signup-form" onSubmit={handleVerifyAndRegister}>
              <label className="signup-field">
                <span>Enter OTP</span>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                />
              </label>

              <button className="signup-submit" type="submit" disabled={loading === 'verifyOTP' || loading === 'register'}>
                {loading === 'verifyOTP' ? "Verifying..." : loading === 'register' ? "Creating Account..." : "Verify & Create Account"}
              </button>

              <button
                type="button"
                className="signup-back-btn"
                onClick={() => setStep(1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  marginTop: "1rem"
                }}
              >
                ← Back to edit details
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default SignupPage;
