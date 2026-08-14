'use client';

import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Terminal, KeyRound, Sparkles, Mail, RefreshCw, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setSuccess('Registration successful! Please check your email inbox to verify your account.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Try native anonymous sign-in first
      const { data, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && data?.session) {
        router.push('/');
        router.refresh();
        return;
      }

      // 2. Fallback: sign up a random guest email
      const randomId = Math.random().toString(36).substring(2, 10);
      const guestEmail = `guest-${randomId}@devflow.ai`;
      const guestPassword = `GuestPassword-${randomId}-123`;

      const signUpRes = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });

      if (signUpRes.error) {
        setError('Failed to enter as guest: ' + signUpRes.error.message);
      } else if (signUpRes.data?.session) {
        router.push('/');
        router.refresh();
      } else {
        setError('Failed to enter as guest. Please create a regular account or enable anonymous sign-ins in Supabase Auth settings.');
      }
    } catch (err) {
      setError('Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#06080c] flex items-center justify-center relative overflow-hidden font-sans select-none">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 dify-grid-bg pointer-events-none opacity-30" />

      {/* Premium Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-indigo z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-purple z-0" />

      {/* Main glass card container */}
      <div className="w-full max-w-sm p-8 bg-[#0e121a]/85 border border-white/[0.05] rounded-2xl shadow-2xl backdrop-blur-xl relative z-10 space-y-6">

        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Terminal size={20} className="text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DevFlow AI
            </h1>
            <p className="text-[10px] text-muted-foreground/60 font-mono">Console Orchestration Gateway</p>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-2.5 rounded bg-destructive/10 border border-destructive/25 text-destructive text-[10px] text-center font-medium">
            {error}
          </div>
        )}

        {/* Success alert */}
        {success && (
          <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] text-center font-medium">
            {success}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-foreground">
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/80 flex items-center gap-1">
              <Mail size={10} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full text-xs px-3 py-2 rounded bg-[#07090d]/80 border border-white/[0.06] focus:border-indigo-500/50 focus:outline-none transition-colors font-medium text-slate-200 placeholder-muted-foreground/30"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/80 flex items-center gap-1">
              <KeyRound size={10} />
              {isSignUp ? 'Password (min 6 characters)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs px-3 py-2 rounded bg-[#07090d]/80 border border-white/[0.06] focus:border-indigo-500/50 focus:outline-none transition-colors font-medium text-slate-200 placeholder-muted-foreground/30"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-indigo-500/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] hover:shadow-[0_0_18px_rgba(99,102,241,0.35)] active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus size={12} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn size={12} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-between text-[8px] text-muted-foreground/40 uppercase tracking-wider font-bold select-none">
          <div className="w-1/3 h-px bg-white/[0.05]" />
          <span>Or</span>
          <div className="w-1/3 h-px bg-white/[0.05]" />
        </div>

        {/* Guest Account Button */}
        <button
          onClick={handleGuestLogin}
          type="button"
          disabled={loading}
          className="w-full py-1.5 px-4 rounded bg-[#111522] hover:bg-[#151a2c] border border-white/[0.05] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Sparkles size={11} className="text-primary" />
          <span>Continue as Guest</span>
        </button>

      </div>
    </div>
  );
}
