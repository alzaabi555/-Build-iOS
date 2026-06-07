export const splitCompoundCommands = (command: string) => {
  return command
    .split(
      /\n+|\s+ثم\s+|\s+بعد ذلك\s+|\s+وبعدين\s+|(?<=\S)\s+و(?=(سجل|اضف|أضف|اعط|أعط|خصم|افتح|انتقل|ابحث|اكتب|غيب|غيّب|حضر|انشئ|أنشئ|اعمل))/
    )
    .map((part) => part.trim())
    .filter(Boolean);
};