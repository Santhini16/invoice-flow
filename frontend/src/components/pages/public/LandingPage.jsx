import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Zap, Shield, Users, BarChart3, Globe, CheckCircle,
  ArrowRight, Menu, X, Star, ChevronDown, Mail, Phone, MapPin,
  CreditCard, Bell, RefreshCw, Layers
} from 'lucide-react';

const NAV_LINKS = ['Features', 'About', 'Contact'];

const FEATURES = [
  { icon: FileText, title: 'Smart Invoicing', desc: 'Create GST-compliant invoices instantly with auto-calculations for CGST, SGST & IGST. PDF generation built-in.', color: 'blue' },
  { icon: CreditCard, title: 'Online Payments', desc: 'Integrated Razorpay gateway supporting UPI, cards, and net banking. Auto-status updates on payment.', color: 'emerald' },
  { icon: Users, title: 'Team Collaboration', desc: 'Role-based access for admins and employees. Everyone sees only what they need.', color: 'purple' },
  { icon: BarChart3, title: 'Revenue Analytics', desc: 'Real-time dashboards with revenue trends, GST reports, and profit & loss statements.', color: 'amber' },
  { icon: RefreshCw, title: 'Recurring Invoices', desc: 'Set up weekly or monthly auto-invoices. Never miss billing a recurring client again.', color: 'rose' },
  { icon: Bell, title: 'Live Notifications', desc: 'Get notified when a client views or pays an invoice. Track the full lifecycle instantly.', color: 'cyan' },
  { icon: Globe, title: 'Client Portal', desc: 'Clients get a secure link to view, download, and pay invoices — no login required.', color: 'indigo' },
  { icon: Zap, title: 'AI Suggestions', desc: 'Smart item suggestions based on your past invoices. Speed up invoice creation effortlessly.', color: 'orange' },
];

const STATS = [
  { value: '50K+', label: 'Invoices Generated' },
  { value: '₹200Cr+', label: 'Payments Processed' },
  { value: '5K+', label: 'Businesses' },
  { value: '99.9%', label: 'Uptime' },
];

const PLANS = [
  { name: 'Starter', price: '₹999', period: '/mo', features: ['5 Employees', '500 Invoices/mo', 'Basic Reports', 'Email Support'], popular: false },
  { name: 'Business', price: '₹2,499', period: '/mo', features: ['25 Employees', 'Unlimited Invoices', 'Advanced Analytics', 'GST Reports', 'Priority Support', 'Recurring Invoices'], popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Employees', 'White Labeling', 'API Access', 'Dedicated Manager', 'Custom Integrations'], popular: false },
];

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-orange-50 text-orange-600',
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Invoice<span className="text-primary-600">Flow</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-primary-600 transition-colors">Sign In</Link>
            <Link to="/signup" className="btn-primary text-sm">Get Started <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <button className="md:hidden p-2 rounded-lg" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 animate-slide-up">
            {NAV_LINKS.map(l => <a key={l} href={`#${l.toLowerCase()}`} className="block text-sm font-medium text-gray-700 py-1.5">{l}</a>)}
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="btn-secondary text-sm flex-1 justify-center">Sign In</Link>
              <Link to="/signup" className="btn-primary text-sm flex-1 justify-center">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full text-sm font-semibold text-primary-700 mb-8">
            <Zap className="w-4 h-4" /> GST-Ready • AI-Powered • Team-First
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Invoice smarter,<br />
            <span className="text-gradient">get paid faster</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one finance platform for modern Indian businesses. Create, send, and track invoices — with built-in GST, online payments, and team collaboration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="btn-secondary text-base px-8 py-3.5">
              See Features <ChevronDown className="w-5 h-5" />
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-5">No credit card required • 14-day free trial</p>
        </div>

        {/* Mock Dashboard Preview */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="card p-6 shadow-2xl border-gray-100 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 h-6 bg-gray-100 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[['₹4,82,500', 'Revenue', 'bg-blue-500'], ['₹94,200', 'Outstanding', 'bg-amber-500'], ['247', 'Invoices', 'bg-emerald-500'], ['38', 'Clients', 'bg-purple-500']].map(([v, l, c]) => (
                <div key={l} className="p-4 bg-gray-50 rounded-xl">
                  <div className={`w-8 h-1.5 ${c} rounded-full mb-3`} />
                  <div className="text-xl font-bold text-gray-900">{v}</div>
                  <div className="text-xs text-gray-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[['INV-2401-0012', 'Tata Consultancy', '₹45,000', 'Paid'], ['INV-2401-0011', 'Infosys Ltd', '₹1,20,000', 'Sent'], ['INV-2401-0010', 'Wipro Technologies', '₹78,500', 'Overdue']].map(([inv, client, amt, status]) => (
                <div key={inv} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-mono text-xs text-gray-500">{inv}</span>
                  <span className="font-medium text-gray-800">{client}</span>
                  <span className="font-bold text-gray-900">{amt}</span>
                  <span className={`badge ${status === 'Paid' ? 'badge-green' : status === 'Sent' ? 'badge-blue' : 'badge-red'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-4xl font-extrabold mb-2">{value}</div>
              <div className="text-primary-200 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Everything you need to run your finances</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Powerful features designed for Indian businesses — GST-compliant, team-ready, and built for growth.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card-hover p-6 group">
                <div className={`w-12 h-12 rounded-2xl ${colorMap[color]} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6">Built for teams. Designed for India.</h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">InvoiceFlow was built from the ground up for Indian SMBs who need a powerful, GST-compliant, team-friendly finance platform — without the complexity of enterprise software.</p>
            <div className="space-y-4">
              {['Full GST support — CGST, SGST & IGST auto-calculation', 'Role-based team access — admins and employees', 'Clients pay online via secure portal — no login needed', 'Complete audit trail for every action'].map(f => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['🏆', 'GST Ready', 'Full GSTIN compliance out of the box'], ['⚡', 'Fast Setup', 'Up and running in under 5 minutes'], ['🔒', 'Secure', 'JWT auth, encrypted data, role-based access'], ['📱', 'Mobile Ready', 'Works on any device, any browser']].map(([emoji, t, d]) => (
              <div key={t} className="card p-5">
                <div className="text-3xl mb-3">{emoji}</div>
                <div className="font-bold text-gray-900 mb-1">{t}</div>
                <div className="text-sm text-gray-500">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-500">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map(({ name, price, period, features, popular }) => (
              <div key={name} className={`card p-8 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${popular ? 'border-primary-500 border-2' : ''}`}>
                {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">MOST POPULAR</div>}
                <div className="text-lg font-bold text-gray-900 mb-2">{name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                  <span className="text-gray-400">{period}</span>
                </div>
                <div className="space-y-3 mb-8">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/signup" className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Loved by businesses</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Priya Sharma', role: 'CEO, TechVentures', text: 'InvoiceFlow transformed our billing process. GST compliance is now automatic and our team can collaborate seamlessly.' },
              { name: 'Rahul Mehta', role: 'CFO, RetailPro', text: 'The client portal is a game-changer. Our clients love being able to pay directly from the invoice link — no friction at all.' },
              { name: 'Anita Nair', role: 'Founder, DesignStudio', text: 'Finally, a finance tool built for Indian SMBs. The recurring invoices feature alone saves us hours every month.' },
            ].map(({ name, role, text }) => (
              <div key={name} className="card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{text}"</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{name}</div>
                  <div className="text-xs text-gray-400">{role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Get in touch</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">Have questions? Our team is here to help you get started or answer any questions about InvoiceFlow.</p>
            <div className="space-y-5">
              {[[Mail, 'hello@invoiceflow.in'], [Phone, '+91 98765 43210'], [MapPin, 'Mumbai, Maharashtra, India']].map(([Icon, val]) => (
                <div key={val} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center"><Icon className="w-5 h-5 text-primary-600" /></div>
                  <span className="text-gray-700 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">First Name</label><input className="input-field" placeholder="John" /></div>
                <div><label className="label">Last Name</label><input className="input-field" placeholder="Doe" /></div>
              </div>
              <div><label className="label">Email</label><input className="input-field" type="email" placeholder="john@company.com" /></div>
              <div><label className="label">Message</label><textarea className="input-field" rows={4} placeholder="Tell us how we can help..." /></div>
              <button className="btn-primary w-full justify-center py-3">Send Message</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Start your free trial today</h2>
          <p className="text-primary-100 text-lg mb-8">Join 5,000+ businesses using InvoiceFlow to manage their finances smarter.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all duration-200 text-base">
            Create Free Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
            <span className="text-white font-bold text-lg">InvoiceFlow</span>
          </div>
          <div className="text-sm">© {new Date().getFullYear()} InvoiceFlow. All rights reserved.</div>
          <div className="flex gap-6 text-sm">
            {['Privacy', 'Terms', 'Security'].map(l => <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}