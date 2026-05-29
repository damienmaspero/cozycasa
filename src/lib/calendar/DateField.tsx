"use client";

import { formatDate } from "./dates";
import { useLanguage } from "./i18n";
import { styles, colors } from "./styles";

export interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  invalid?: boolean;
}

export default function DateField({
  value,
  onChange,
  minimumDate,
  invalid,
}: DateFieldProps) {
  const { lang } = useLanguage();
  // The native <input type="date"> uses the YYYY-MM-DD string form, matching
  // the rest of the booking modal state. The `lang` attribute tells the
  // browser which locale to use for the calendar popup (month names, weekday
  // headers, Clear/Today).
  const min = minimumDate ? formatDate(minimumDate) : undefined;
  return (
    <input
      type="date"
      value={value}
      min={min}
      lang={lang}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...styles.input,
        ...(invalid ? { borderColor: colors.danger } : null),
      }}
    />
  );
}
