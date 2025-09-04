"use client";

import { useState } from "react";
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
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SignUpInput, signUpSchema } from "@/lib/validations/auth";

export default function SignUpPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpInput) => {
    try {
      setLoading(true);
      const { error } = await signUp(data.email, data.password);
      if (error) {
        setFormError("root", {
          type: "manual",
          message: error.message,
        });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setFormError("root", {
        type: "manual",
        message: "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFormError("root", {
          type: "manual",
          message: error.message,
        });
      }
    } catch (err) {
      setFormError("root", {
        type: "manual",
        message: "An unexpected error occurred",
      });
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
              <div className="absolute inset-0 flex-1 bg-black/50 rounded-3xl z-[1]"></div>
              <div className="relative z-[2]">
                <p className="text-white mb-12 text-lg font-semibold uppercase z-[2]">
                  Astra
                </p>
                <h1 className="text-white mb-4 md:text-5xl text-3xl font-medium">
                  Your Companion for Mental Wellness
                </h1>
                <h2 className="text-white mb-12 text-xl opacity-80">
                  Join thousands of people who trust Astra for confidential,
                  supportive conversations anytime, anywhere
                </h2>

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
                  <h2 className="text-3xl font-light uppercase">Hello!</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Sign up to begin your healing journey
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-6"
                  noValidate
                >
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
                        id="email"
                        type="email"
                        {...register("email")}
                        required
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-3 pl-10 text-sm"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">
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
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        required
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
                      <p className="mt-2 text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground flex items-center text-sm">
                      <input
                        type="checkbox"
                        className="border-border text-white h-4 w-4 rounded"
                      />
                      <span className="ml-2">Remember me</span>
                    </label>
                    <a
                      href="#"
                      className="text-white hover:text-white/80 text-sm"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer login-btn relative flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300"
                    disabled={loading || isSubmitting}
                  >
                    {loading || isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="ml-2">
                          Getting you set up in 3...2...1...
                        </span>
                      </>
                    ) : (
                      "Create Account"
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

                {errors.root && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-500">
                      {errors.root.message}
                    </p>
                  </div>
                )}

                <div className="text-muted-foreground mt-8 text-center text-sm">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:text-grey/80">
                    Sign in
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
