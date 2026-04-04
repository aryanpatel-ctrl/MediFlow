import { Link } from 'react-router-dom';
import { MessageSquare, Clock, Brain, Shield, ArrowRight } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI-Powered Triage',
      description: 'Chat with our intelligent assistant in any language. Get routed to the right specialist instantly.'
    },
    {
      icon: Clock,
      title: 'Real-Time Queue',
      description: 'Track your position live. Know exactly when it\'s your turn with accurate wait time predictions.'
    },
    {
      icon: Brain,
      title: 'Smart Scheduling',
      description: 'ML-powered no-show prediction optimizes appointments. Less waiting, more caring.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is encrypted and protected. HIPAA-compliant infrastructure.'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Healthcare Appointments, <span className="text-primary-200">Reimagined</span>
              </h1>
              <p className="mt-6 text-lg text-primary-100">
                Experience the future of hospital visits. AI-powered triage, real-time queue tracking,
                and smart scheduling - all in one platform.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="btn bg-white text-primary-600 hover:bg-primary-50 flex items-center justify-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="btn border-2 border-white text-white hover:bg-white/10 text-center"
                >
                  Login
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">AI</span>
                    </div>
                    <div className="bg-white/20 rounded-2xl rounded-tl-none p-4 max-w-xs">
                      <p className="text-sm">Hello! I'm MediFlow. How can I help you today?</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-primary-500 rounded-2xl rounded-tr-none p-4 max-w-xs">
                      <p className="text-sm">I have a severe headache for 2 days</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">AI</span>
                    </div>
                    <div className="bg-white/20 rounded-2xl rounded-tl-none p-4 max-w-xs">
                      <p className="text-sm">I recommend seeing a Neurologist. Would you like to book an appointment?</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why Choose MediFlow?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              We're transforming the healthcare experience with cutting-edge technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="text-primary-600" size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                1
              </div>
              <h3 className="mt-6 font-semibold text-lg">Describe Symptoms</h3>
              <p className="mt-2 text-gray-600">
                Chat with our AI in any language. Describe what's bothering you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                2
              </div>
              <h3 className="mt-6 font-semibold text-lg">Get Matched</h3>
              <p className="mt-2 text-gray-600">
                AI triages your symptoms and recommends the right specialist.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                3
              </div>
              <h3 className="mt-6 font-semibold text-lg">Book & Track</h3>
              <p className="mt-2 text-gray-600">
                Book instantly and track your queue position in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Transform Your Healthcare Experience?</h2>
          <p className="mt-4 text-primary-100">
            Join thousands of patients who've made their hospital visits stress-free.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center space-x-2 btn bg-white text-primary-600 hover:bg-primary-50"
          >
            <span>Start Now - It's Free</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
