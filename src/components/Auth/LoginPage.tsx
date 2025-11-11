"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setFormError(null);
      setLoading(true);
      const { error } = await signIn(values.email, values.password);
      if (error) {
        setFormError(error.message);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setFormError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-Sans relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div className="z-10 w-full max-w-6xl">
        <div className="bg-white/50  overflow-hidden rounded-[40px] shadow-2xl">
          <div className="grid min-h-[700px] lg:grid-cols-2">
            <div className="brand-side md:block hidden relative m-4 rounded-3xl bg-[url('/login-bg.webp')] bg-cover p-12 text-white">
              <div className="absolute inset-0 flex-1 bg-black/50 rounded-3xl z-[1]"></div>
              <div className="relative z-[2]">
                <p className="text-white mb-12 text-lg font-semibold uppercase z-[2]">
                  Astra
                </p>
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
            <div className="flex flex-col justify-center md:p-12 p-6">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-light uppercase">
                    Welcome back
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Hey there, let's pick up from where we left off :)
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
                        aria-invalid={errors.email ? "true" : "false"}
                        {...register("email")}
                        className={`border-border bg-input block w-full rounded-lg border py-3 pr-3 pl-10 text-sm ${
                          errors.email ? "border-red-500" : ""
                        }`}
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
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
                        type="email"
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="username"
                      />
                      <input
                        id="password-field"
                        type={showPassword ? "text" : "password"}
                        aria-invalid={errors.password ? "true" : "false"}
                        {...register("password")}
                        className={`border-border bg-input block w-full rounded-lg border py-3 pr-12 pl-10 text-sm ${
                          errors.password ? "border-red-500" : ""
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">
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
                    <button className="text-grey hover:text-grey/80 text-sm">
                      Forgot password?
                    </button>
                  </div>

                  {formError && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-500">{formError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer login-btn relative flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="ml-2">Authenticating...</span>
                      </div>
                    ) : (
                      "Sign in to your account"
                    )}
                  </button>
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
