interface Step {
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className = "" }: ProgressStepsProps) {
  return (
    <nav className={`w-full ${className}`} aria-label="Voortgang">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li key={step.label} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                      isCompleted || isCurrent ? "bg-primary-500" : "bg-gray-200"
                    }`}
                    style={{ left: "-50%" }}
                  />
                )}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2 ${
                      isCompleted ? "bg-primary-500" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Step circle */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                    isCompleted
                      ? "bg-primary-500 border-primary-500"
                      : isCurrent
                      ? "bg-white border-primary-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        isCurrent ? "text-primary-600" : "text-gray-400"
                      }`}
                    >
                      {stepNumber}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? "text-primary-600" : isCompleted ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default ProgressSteps;
