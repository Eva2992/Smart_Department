export function PasswordStrengthMeter({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let segments = 0;
  let label = "";
  let color = "bg-[#E11D48]";
  let textColor = "text-[#E11D48]";

  if (password.length > 0) {
    if (score <= 1) {
      segments = 1;
      label = "Weak";
      color = "bg-[#E11D48]";
      textColor = "text-[#E11D48]";
    } else if (score === 2 || score === 3) {
      segments = score === 3 ? 3 : 2;
      label = "Fair";
      color = "bg-[#F59E0B]";
      textColor = "text-[#F59E0B]";
    } else if (score === 4) {
      segments = 3;
      label = "Medium";
      color = "bg-[#F59E0B]";
      textColor = "text-[#F59E0B]";
    } else {
      segments = 4;
      label = "Strong";
      color = "bg-[#16A34A]";
      textColor = "text-[#16A34A]";
    }
  }

  return (
    <div className="w-full mt-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-colors duration-300 ${
              index <= segments ? color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-xs mt-1.5 font-medium ${textColor} text-right`}>{label}</p>
      )}
    </div>
  );
}
