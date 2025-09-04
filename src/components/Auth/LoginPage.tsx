"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Clock,
  Heart,
  Brain,
} from "lucide-react";

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setError(null);
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setError(error.message);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div className="z-10 w-full max-w-6xl">
        <div className="bg-white/50  overflow-hidden rounded-[40px] shadow-2xl">
          <div className="grid min-h-[700px] lg:grid-cols-2">
            {/* Left Side */}
            <div className="brand-side relative m-4 rounded-3xl bg-[url('/login-bg.jpg')] bg-cover p-12 text-white">
              <div>
                <div className="text-white mb-12 text-lg font-semibold uppercase">
                  Astra
                </div>
                <h1 className="text-white mb-4  md:text-6xl text-4xl font-medium">
                  Welcome back!
                </h1>
                <p className="text-white mb-12 text-xl opacity-80">
                  Continue your confidential, supportive conversations with
                  Astra — anytime, anywhere.
                </p>

                <div className="space-y-6">
                  {[
                    {
                      icon: <ShieldCheck size={16} />,
                      title: "Safe & Confidential",
                      desc: "Private, secure conversations you can trust",
                    },
                    {
                      icon: <Clock size={16} />,
                      title: "24/7 Availability",
                      desc: "Support whenever you need it, day or night",
                    },
                    {
                      icon: <Heart size={16} />,
                      title: "Personalized Support",
                      desc: "AI-powered guidance tailored to your needs",
                    },
                    {
                      icon: <Brain size={16} />,
                      title: "Evidence-Based Approach",
                      desc: "Techniques grounded in therapeutic practices",
                    },
                  ].map(({ icon, title, desc }, i) => (
                    <div
                      key={i}
                      className="feature-item animate-fadeInUp flex items-center"
                      style={{ animationDelay: `${0.2 * (i + 1)}s` }}
                    >
                      <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
                        {icon}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{title}</div>
                        <div className="text-sm opacity-70 text-white">
                          {desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center p-12">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-light uppercase">
                    Welcome back
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Login, let's pick up from where we left from :)
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium uppercase"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register("email")}
                        type="email"
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-3 pl-10 text-sm"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium uppercase"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-12 pl-10 text-sm"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer login-btn relative flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="ml-2">Authenticating...</span>
                      </>
                    ) : (
                      "Sign in to your account"
                    )}
                  </button>

                  <div className="relative text-center text-sm text-stone-500">
                    <div className="absolute inset-0 flex items-center">
                      <div className="border-border w-full border-t"></div>
                    </div>
                    <span className="relative px-2">Or continue with</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleGoogleSignIn}
                      type="button"
                      className="border-border bg-white text-foreground hover:bg-white/80 flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm shadow-sm"
                    >
                      <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        className="h-5 w-5"
                        alt="Google"
                      />
                      <span className="ml-2">Google</span>
                    </button>
                  </div>
                </form>

                <div className="text-muted-foreground mt-8 text-center text-sm">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-grey/80"
                  >
                    Sign up for free!
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
