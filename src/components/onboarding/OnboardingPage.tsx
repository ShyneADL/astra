import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";

interface OnboardingStep {
  title: string;
  description: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Astra!",
    description:
      "Your personal mental health companion is here to support you.",
  },
  {
    title: "Tell us about yourself",
    description: "Help us personalize your experience.",
  },
  {
    title: "Your wellness preferences",
    description:
      "Let us know how we can best support your mental health goals.",
  },
];

interface FormData {
  firstName: string;
  lastName: string;
  ageRange: string;
  currentSituation: string;
  primaryConcerns: string[];
  supportGoals: string[];
  communicationStyle: string;
  crisisContact: string;
  preferences: {
    dailyCheckIns: boolean;
    anonymousMode: boolean;
  };
}

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    ageRange: "",
    currentSituation: "",
    primaryConcerns: [],
    supportGoals: [],
    communicationStyle: "supportive",
    crisisContact: "",
    preferences: {
      dailyCheckIns: true,
      anonymousMode: false,
    },
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { completeOnboarding, user } = useAuth();
  const navigate = useNavigate();

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) {
          newErrors.firstName = "First name is required";
        }
        if (!formData.ageRange.trim()) {
          newErrors.ageRange = "Age Range is required";
        }
        break;
      case 2:
        if (formData.primaryConcerns.length === 0) {
          newErrors.primaryConcerns =
            "Please select at least one area of focus";
        }
        if (formData.supportGoals.length === 0) {
          newErrors.supportGoals = "Please select at least one support goal";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      if (validateStep(currentStep)) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      if (validateStep(currentStep)) {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Save onboarding data to user profile
      if (user?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            age_range: formData.ageRange,
            current_situation: formData.currentSituation,
            primary_concerns: formData.primaryConcerns,
            support_goals: formData.supportGoals,
            communication_style: formData.communicationStyle,
            crisis_contact: formData.crisisContact,
            daily_checkins: formData.preferences.dailyCheckIns,
            anonymous_mode: formData.preferences.anonymousMode,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (error) {
          console.error("Error saving onboarding data:", error);
          throw error;
        }
      }

      // Mark onboarding as complete
      await completeOnboarding();

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setErrors({
        general: "Failed to save your information. Please try again.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center">
              <img
                src="/logo-large.png"
                alt="Astra logo"
                className="size-full rounded-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Astra!
              </h2>
              <p className="text-gray-600 leading-relaxed">
                I'm here to provide you with compassionate, evidence-based
                mental health support. Together, we'll work on building coping
                strategies, understanding your emotions, and creating a path
                toward better mental wellness.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your privacy matters:</strong> All conversations are
                confidential and secure. You're in control of what you share.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Tell us about yourself
            </h2>
            <p className="text-gray-600 mb-6">
              This helps me understand how to best support you on your mental
              health journey.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="First Name *"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={`w-full p-3 border rounded-lg ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Last Name (Optional)"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <Select
                value={formData.ageRange}
                onValueChange={(value) =>
                  setFormData({ ...formData, ageRange: value })
                }
              >
                <SelectTrigger
                  className={`w-full p-3 h-12 ${
                    errors.ageRange ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <SelectValue placeholder="Select age range *" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12-18">12-18</SelectItem>
                  <SelectItem value="19-25">19-25</SelectItem>
                  <SelectItem value="26-40">26-40</SelectItem>
                  <SelectItem value="40+">40+</SelectItem>
                </SelectContent>
              </Select>
              {errors.ageRange && (
                <p className="text-red-500 text-sm mt-1">{errors.ageRange}</p>
              )}
            </div>

            <div>
              <Select
                value={formData.currentSituation}
                onValueChange={(value) =>
                  setFormData({ ...formData, currentSituation: value })
                }
              >
                <SelectTrigger className="w-full p-3 h-12 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <SelectValue placeholder="What is your current situation?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <input
                type="text"
                placeholder="Emergency Contact (Optional)"
                value={formData.crisisContact}
                onChange={(e) =>
                  setFormData({ ...formData, crisisContact: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Someone we can contact if you're in crisis (name and phone
                number)
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Your wellness preferences
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What areas would you like to focus on? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Anxiety Management",
                  "Depression Support",
                  "Stress Relief",
                  "Sleep Issues",
                  "Relationship Concerns",
                  "Work-Life Balance",
                  "Self-Esteem",
                  "Grief & Loss",
                  "Addiction",
                ].map((concern) => (
                  <button
                    key={concern}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        primaryConcerns: toggleArrayItem(
                          formData.primaryConcerns,
                          concern
                        ),
                      })
                    }
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.primaryConcerns.includes(concern)
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {concern}
                  </button>
                ))}

                {/* Other option as the last item in the grid */}
                <div className="col-span-1">
                  <input
                    type="text"
                    placeholder="Other (please specify)..."
                    value={
                      formData.primaryConcerns
                        .find((concern) => concern.startsWith("Other:"))
                        ?.replace("Other:", "") || ""
                    }
                    onChange={(e) => {
                      const otherValue = e.target.value;
                      const newConcerns = formData.primaryConcerns.filter(
                        (concern) => !concern.startsWith("Other:")
                      );
                      if (otherValue.trim()) {
                        newConcerns.push(`Other: ${otherValue}`);
                      }
                      setFormData({
                        ...formData,
                        primaryConcerns: newConcerns,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              {errors.primaryConcerns && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.primaryConcerns}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What are your support goals? *
              </label>
              <div className="space-y-2">
                {[
                  "Learn coping strategies",
                  "Improve emotional regulation",
                  "Build self-awareness",
                  "Develop healthy habits",
                  "Process difficult emotions",
                ].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        supportGoals: toggleArrayItem(
                          formData.supportGoals,
                          goal
                        ),
                      })
                    }
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      formData.supportGoals.includes(goal)
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
              {errors.supportGoals && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.supportGoals}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Communication Style
              </label>
              <select
                value={formData.communicationStyle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    communicationStyle: e.target.value,
                  })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="supportive">Supportive and encouraging</option>
                <option value="direct">Direct and solution-focused</option>
                <option value="gentle">Gentle and patient</option>
                <option value="collaborative">
                  Collaborative and exploratory
                </option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.preferences.dailyCheckIns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        dailyCheckIns: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Enable daily mood check-ins
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.preferences.anonymousMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        anonymousMode: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Use anonymous mode (no personal data stored)
                </span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen maxh-[90dvh] overflow-y-auto bg-[#f6fcfe] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
            <span>
              {Math.round(((currentStep + 1) / onboardingSteps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((currentStep + 1) / onboardingSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Error message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Step content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            className={`${
              currentStep === 0 ? "opacity-0 pointer-events-none" : ""
            } px-4 py-2 text-gray-600 disabled:text-gray-400 hover:!bg-transparent disabled:cursor-not-allowed hover:text-gray-800 transition-colors `}
          >
            Back
          </Button>

          <Button
            className="bg-primary rounded-sm whitespace-nowrap px-4 text-sm text-white cursor-pointer hover:bg-primary/90"
            onClick={handleNext}
          >
            {isCompleting
              ? "Completing..."
              : currentStep === onboardingSteps.length - 1
              ? "Complete Setup"
              : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
